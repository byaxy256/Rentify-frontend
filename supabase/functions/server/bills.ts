import { createServiceClient } from './supabase_utils.ts';
import { getAuthUser, hasRole } from './supabase_utils.ts';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from './responses.ts';
import { logAuditEvent } from './audit.ts';

export async function handleGetBills(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = createServiceClient();
    const isAdmin = await hasRole(user.id, ['admin']);
    const isTenant = await hasRole(user.id, ['tenant']);

    if (isTenant) {
      const { data: tenantUnitRows, error: tenantUnitsError } = await supabase
        .from('units')
        .select('id, building_id')
        .eq('tenant_id', user.id);

      if (tenantUnitsError) {
        return errorResponse('Query Failed', tenantUnitsError.message, 500);
      }

      const unitIds = (tenantUnitRows || []).map((row: any) => row.id);
      if (unitIds.length === 0) {
        return successResponse([]);
      }

      const { data: tenantBills, error: tenantBillsError } = await supabase
        .from('bills')
        .select('id, type, amount, due_date, status, paid_date, building_id, unit_id, buildings(name)')
        .in('unit_id', unitIds)
        .order('due_date', { ascending: true });

      if (tenantBillsError) {
        return errorResponse('Query Failed', tenantBillsError.message, 500);
      }

      const bills = (tenantBills || []).map((bill: any) => ({
        id: bill.id,
        type: bill.type,
        amount: Number(bill.amount || 0),
        dueDate: bill.due_date,
        status: bill.status,
        paidDate: bill.paid_date || null,
        buildingId: bill.building_id,
        unitId: bill.unit_id,
        building: bill.buildings?.name || 'Unknown Building',
      }));

      return successResponse(bills);
    }

    let allowedBuildingIds: string[] = [];
    if (!isAdmin) {
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id')
        .eq('landlord_id', user.id);

      if (buildingsError) {
        return errorResponse('Query Failed', buildingsError.message, 500);
      }

      allowedBuildingIds = (buildings || []).map((row: any) => row.id);
      if (allowedBuildingIds.length === 0) {
        return successResponse([]);
      }
    }

    let query = supabase
      .from('bills')
      .select('id, type, amount, due_date, status, paid_date, building_id, unit_id, buildings(name)')
      .order('due_date', { ascending: true });

    if (!isAdmin) {
      query = query.in('building_id', allowedBuildingIds);
    }

    const { data, error } = await query;
    if (error) {
      return errorResponse('Query Failed', error.message, 500);
    }

    const bills = (data || []).map((bill: any) => ({
      id: bill.id,
      type: bill.type,
      amount: Number(bill.amount || 0),
      dueDate: bill.due_date,
      status: bill.status,
      paidDate: bill.paid_date || null,
      buildingId: bill.building_id,
      unitId: bill.unit_id,
      building: bill.buildings?.name || 'Unknown Building',
    }));

    return successResponse(bills);
  } catch (error) {
    console.error('Get bills error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

export async function handleUpdateBill(request: Request, id: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = createServiceClient();
    const isAdmin = await hasRole(user.id, ['admin']);

    const { data: existingBill, error: existingBillError } = await supabase
      .from('bills')
      .select('id, building_id, status')
      .eq('id', id)
      .single();

    if (existingBillError || !existingBill) {
      return notFoundResponse('Bill');
    }

    if (!isAdmin) {
      const { data: ownedBuilding } = await supabase
        .from('buildings')
        .select('id')
        .eq('id', existingBill.building_id)
        .eq('landlord_id', user.id)
        .single();

      if (!ownedBuilding) {
        return forbiddenResponse();
      }
    }

    const body = await request.json().catch(() => ({}));
    const nextStatus = body?.status;

    if (!nextStatus || !['paid', 'pending', 'overdue'].includes(nextStatus)) {
      return errorResponse('Bad Request', 'Invalid bill status', 400);
    }

    const paidDate = nextStatus === 'paid' ? new Date().toISOString().split('T')[0] : null;

    const { data, error } = await supabase
      .from('bills')
      .update({
        status: nextStatus,
        paid_date: paidDate,
      })
      .eq('id', id)
      .select('id, type, amount, due_date, status, paid_date, building_id, unit_id')
      .single();

    if (error) {
      return errorResponse('Update Failed', error.message, 500);
    }

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'UPDATE_BILL_STATUS',
      entityType: 'bill',
      entityId: id,
      details: `Updated bill status from ${existingBill.status} to ${nextStatus}`,
      status: 'success',
      metadata: {
        previousStatus: existingBill.status,
        nextStatus,
        buildingId: existingBill.building_id,
      },
    });

    return successResponse(
      {
        id: data.id,
        type: data.type,
        amount: Number(data.amount || 0),
        dueDate: data.due_date,
        status: data.status,
        paidDate: data.paid_date || null,
        buildingId: data.building_id,
        unitId: data.unit_id,
      },
      'Bill updated successfully'
    );
  } catch (error) {
    console.error('Update bill error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}
