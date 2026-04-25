import { createServiceClient, getAuthUser, hasRole } from './supabase_utils.ts';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  notFoundResponse,
} from './responses.ts';

function generateReceiptNumber(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function calculateMonthlyDueDate(baseDateInput?: string | null): string | null {
  if (!baseDateInput) return null;

  const baseDate = new Date(baseDateInput);
  if (Number.isNaN(baseDate.getTime())) return null;

  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), baseDate.getDate());
  if (due < now) {
    due.setMonth(due.getMonth() + 1);
  }

  return due.toISOString().split('T')[0];
}

function calculateCoveredMonthsFromPayments(payments: Array<{ amount?: number | string }>, rentAmount: number): number {
  if (!Number.isFinite(rentAmount) || rentAmount <= 0) {
    return 0;
  }

  return payments.reduce((total, payment) => {
    const paymentAmount = Number(payment?.amount || 0);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return total;
    }

    const months = Math.max(1, Math.round(paymentAmount / rentAmount));
    return total + months;
  }, 0);
}

function calculateNextRentDueDate(baseDateInput?: string | null, coveredMonths = 0): string | null {
  if (!baseDateInput) return null;

  const baseDate = new Date(baseDateInput);
  if (Number.isNaN(baseDate.getTime())) return null;

  if (coveredMonths <= 0) {
    return baseDate.toISOString().split('T')[0];
  }

  const dueDate = new Date(baseDate);
  dueDate.setMonth(dueDate.getMonth() + coveredMonths);
  return dueDate.toISOString().split('T')[0];
}

function paymentDisplayType(payment: any): string {
  if (typeof payment?.receipt_number === 'string' && payment.receipt_number.startsWith('SEC-')) {
    return 'security_deposit';
  }
  if (typeof payment?.receipt_number === 'string' && payment.receipt_number.startsWith('YAKA-')) {
    return 'electricity_token';
  }
  return payment?.type || 'bill';
}

async function getTenantAssignmentContext(supabase: ReturnType<typeof createServiceClient>, tenantId: string) {
  const { data: unit, error: unitError } = await supabase
    .from('units')
    .select('id, building_id, unit_number, rent, tenant_id, buildings(id, name)')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (unitError) {
    throw new Error(unitError.message);
  }

  if (!unit) {
    return null;
  }

  const { data: details, error: detailsError } = await supabase
    .from('tenant_details')
    .select('assigned_date, lease_start_date, lease_end_date, security_deposit')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (detailsError) {
    throw new Error(detailsError.message);
  }

  const { data: completedRentPayments, error: paymentCountError } = await supabase
    .from('payments')
    .select('amount')
    .eq('tenant_id', tenantId)
    .eq('type', 'rent')
    .eq('status', 'completed');

  if (paymentCountError) {
    throw new Error(paymentCountError.message);
  }

  const completedRentMonths = calculateCoveredMonthsFromPayments(completedRentPayments || [], Number(unit.rent || 0));

  const baseDate = details?.assigned_date || details?.lease_start_date || null;

  return {
    unitId: unit.id,
    unit: unit.unit_number,
    buildingId: unit.building_id,
    building: (unit.buildings as any)?.name || 'Unknown Building',
    rent: Number(unit.rent || 0),
    securityDeposit: Number(details?.security_deposit || unit.rent || 0),
    assignedDate: details?.assigned_date || null,
    leaseStartDate: details?.lease_start_date || null,
    leaseEndDate: details?.lease_end_date || null,
    nextDueDate: calculateNextRentDueDate(baseDate, completedRentMonths),
  };
}

export async function handleGetTenantPayments(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can view this payment history');
    }

    const supabase = createServiceClient();

    const [{ data: payments, error: paymentsError }, assignment] = await Promise.all([
      supabase
        .from('payments')
        .select('id, type, amount, method, status, date, receipt_number, created_at')
        .eq('tenant_id', user.id)
        .order('date', { ascending: false }),
      getTenantAssignmentContext(supabase, user.id),
    ]);

    if (paymentsError) {
      return errorResponse('Query Failed', paymentsError.message, 500);
    }

    return successResponse({
      assignment,
      payments: (payments || []).map((payment: any) => ({
        id: payment.id,
        type: payment.type,
        amount: Number(payment.amount || 0),
        method: payment.method,
        status: payment.status,
        date: payment.date,
        receiptNumber: payment.receipt_number,
        displayType: paymentDisplayType(payment),
        createdAt: payment.created_at,
      })),
    });
  } catch (error) {
    console.error('Get tenant payments error:', error);
    return errorResponse('Failed', 'An error occurred while loading payments', 500);
  }
}

export async function handlePayRent(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can pay rent');
    }

    const body = await request.json().catch(() => ({}));
    const method = String(body?.method || '').toLowerCase();
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : null;
    const requestedMonths = Number.parseInt(String(body?.monthsCovered || ''), 10);

    const methodMap: Record<string, 'MTN' | 'Airtel' | 'Bank'> = {
      mtn: 'MTN',
      airtel: 'Airtel',
      bank: 'Bank',
    };

    if (!methodMap[method]) {
      return badRequestResponse('Invalid payment method');
    }

    const supabase = createServiceClient();
    const assignment = await getTenantAssignmentContext(supabase, user.id);

    if (!assignment || assignment.rent <= 0) {
      return badRequestResponse('Tenant rent assignment not found');
    }

    const { data: completedRentPayments, error: rentCountError } = await supabase
      .from('payments')
      .select('amount')
      .eq('tenant_id', user.id)
      .eq('type', 'rent')
      .eq('status', 'completed');

    if (rentCountError) {
      return errorResponse('Query Failed', rentCountError.message, 500);
    }

    const firstPayment = (completedRentPayments || []).length === 0;
    const completedRentMonths = calculateCoveredMonthsFromPayments(completedRentPayments || [], assignment.rent);
    const monthsCovered = firstPayment
      ? 3
      : Number.isFinite(requestedMonths) && requestedMonths > 0
        ? Math.min(Math.max(requestedMonths, 1), 12)
        : 1;
    const amount = assignment.rent * monthsCovered;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: user.id,
        unit_id: assignment.unitId,
        building_id: assignment.buildingId,
        amount,
        method: methodMap[method],
        status: 'completed',
        type: 'rent',
        phone_number: phoneNumber,
        receipt_number: generateReceiptNumber('RENT'),
      })
      .select('id, amount, method, status, type, date, receipt_number')
      .single();

    if (paymentError) {
      return errorResponse('Payment Failed', paymentError.message, 500);
    }

    const nextDueDate = calculateNextRentDueDate(
      assignment.assignedDate || assignment.leaseStartDate || null,
      completedRentMonths + monthsCovered,
    );

    return successResponse({
      id: payment.id,
      amount: Number(payment.amount || 0),
      method: payment.method,
      status: payment.status,
      type: payment.type,
      date: payment.date,
      receiptNumber: payment.receipt_number,
      firstPayment,
      monthsCovered,
      nextDueDate,
    }, firstPayment ? 'First rent payment received (3 months)' : 'Monthly rent payment received');
  } catch (error) {
    console.error('Pay rent error:', error);
    return errorResponse('Failed', 'An error occurred while processing rent payment', 500);
  }
}

function generateElectricityToken(): string {
  let token = '';
  for (let i = 0; i < 20; i++) {
    token += Math.floor(Math.random() * 10).toString();
  }
  return token;
}

export async function handlePurchaseElectricityToken(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can buy electricity tokens');
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body?.amount || 0);
    const meterNumber = String(body?.meterNumber || '').trim();
    const phoneNumber = String(body?.phoneNumber || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequestResponse('Enter a valid amount');
    }

    if (!meterNumber) {
      return badRequestResponse('Meter number is required');
    }

    if (!phoneNumber) {
      return badRequestResponse('Phone number is required');
    }

    const supabase = createServiceClient();
    const assignment = await getTenantAssignmentContext(supabase, user.id);

    if (!assignment) {
      return badRequestResponse('Tenant rent assignment not found');
    }

    const tokenNumber = generateElectricityToken();
    const receiptNumber = `YAKA-${tokenNumber}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: user.id,
        unit_id: assignment.unitId,
        building_id: assignment.buildingId,
        amount,
        method: 'MTN',
        status: 'completed',
        type: 'bill',
        phone_number: phoneNumber,
        receipt_number: receiptNumber,
      })
      .select('id, amount, method, status, type, date, receipt_number')
      .single();

    if (paymentError) {
      return errorResponse('Purchase Failed', paymentError.message, 500);
    }

    return successResponse({
      id: payment.id,
      amount: Number(payment.amount || 0),
      method: payment.method,
      status: payment.status,
      type: 'electricity_token',
      displayType: 'electricity_token',
      date: payment.date,
      receiptNumber: payment.receipt_number,
      tokenNumber,
      meterNumber,
      phoneNumber,
    }, 'Electricity token purchased successfully');
  } catch (error) {
    console.error('Purchase electricity token error:', error);
    return errorResponse('Failed', 'An error occurred while purchasing electricity token', 500);
  }
}

export async function handlePaySecurityDeposit(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can pay security deposit');
    }

    const body = await request.json().catch(() => ({}));
    const method = String(body?.method || '').toLowerCase();
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : null;

    const methodMap: Record<string, 'MTN' | 'Airtel' | 'Bank'> = {
      mtn: 'MTN',
      airtel: 'Airtel',
      bank: 'Bank',
    };

    if (!methodMap[method]) {
      return badRequestResponse('Invalid payment method');
    }

    const supabase = createServiceClient();
    const assignment = await getTenantAssignmentContext(supabase, user.id);

    if (!assignment || assignment.securityDeposit <= 0) {
      return badRequestResponse('Security deposit not set for this tenant');
    }

    const { data: existingSecurityPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('tenant_id', user.id)
      .like('receipt_number', 'SEC%')
      .maybeSingle();

    if (existingSecurityPayment) {
      return badRequestResponse('Security deposit already paid');
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: user.id,
        unit_id: assignment.unitId,
        building_id: assignment.buildingId,
        amount: assignment.securityDeposit,
        method: methodMap[method],
        status: 'completed',
        type: 'bill',
        phone_number: phoneNumber,
        receipt_number: generateReceiptNumber('SEC'),
      })
      .select('id, amount, method, status, type, date, receipt_number, created_at')
      .single();

    if (paymentError) {
      return errorResponse('Payment Failed', paymentError.message, 500);
    }

    return successResponse({
      id: payment.id,
      amount: Number(payment.amount || 0),
      method: payment.method,
      status: payment.status,
      type: 'security_deposit',
      displayType: 'security_deposit',
      date: payment.date,
      receiptNumber: payment.receipt_number,
      refundable: true,
      refundPolicy: 'Refunded after move-out inspection if no damages are found.',
    }, 'Security deposit payment successful');
  } catch (error) {
    console.error('Pay security deposit error:', error);
    return errorResponse('Failed', 'An error occurred while processing security deposit payment', 500);
  }
}

export async function handlePayBill(request: Request, billId: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can pay bills');
    }

    const body = await request.json().catch(() => ({}));
    const method = String(body?.method || '').toLowerCase();
    const phoneNumber = body?.phoneNumber ? String(body.phoneNumber) : null;

    const methodMap: Record<string, 'MTN' | 'Airtel' | 'Bank'> = {
      mtn: 'MTN',
      airtel: 'Airtel',
      bank: 'Bank',
    };

    if (!methodMap[method]) {
      return badRequestResponse('Invalid payment method');
    }

    const supabase = createServiceClient();

    const { data: tenantUnit } = await supabase
      .from('units')
      .select('id, building_id')
      .eq('tenant_id', user.id)
      .maybeSingle();

    if (!tenantUnit) {
      return badRequestResponse('Tenant unit assignment not found');
    }

    const { data: bill, error: billError } = await supabase
      .from('bills')
      .select('id, amount, status, type, unit_id, building_id, due_date')
      .eq('id', billId)
      .maybeSingle();

    if (billError) {
      return errorResponse('Query Failed', billError.message, 500);
    }

    if (!bill) {
      return notFoundResponse('Bill');
    }

    if (bill.unit_id !== tenantUnit.id) {
      return forbiddenResponse('You can only pay your own bills');
    }

    const { error: billUpdateError } = await supabase
      .from('bills')
      .update({
        status: 'paid',
        paid_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', bill.id);

    if (billUpdateError) {
      return errorResponse('Update Failed', billUpdateError.message, 500);
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        tenant_id: user.id,
        unit_id: tenantUnit.id,
        building_id: tenantUnit.building_id,
        amount: Number(bill.amount || 0),
        method: methodMap[method],
        status: 'completed',
        type: 'bill',
        phone_number: phoneNumber,
        receipt_number: generateReceiptNumber('BILL'),
      })
      .select('id, amount, method, status, type, date, receipt_number')
      .single();

    if (paymentError) {
      return errorResponse('Payment Failed', paymentError.message, 500);
    }

    return successResponse({
      id: payment.id,
      amount: Number(payment.amount || 0),
      method: payment.method,
      status: payment.status,
      type: payment.type,
      displayType: paymentDisplayType(payment),
      date: payment.date,
      receiptNumber: payment.receipt_number,
      billType: bill.type,
    }, 'Bill payment successful');
  } catch (error) {
    console.error('Pay bill error:', error);
    return errorResponse('Failed', 'An error occurred while processing bill payment', 500);
  }
}

export async function handleCreatePaymentPlanRequest(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can create payment plan requests');
    }

    const body = await request.json().catch(() => ({}));
    const amount = Number(body?.amount || 0);
    const installments = Number(body?.installments || 0);
    const reason = String(body?.reason || '').trim();

    if (!amount || amount <= 0 || !installments || installments <= 0 || !reason) {
      return badRequestResponse('amount, installments and reason are required');
    }

    const supabase = createServiceClient();

    const { data: tenantUnit } = await supabase
      .from('units')
      .select('id, building_id')
      .eq('tenant_id', user.id)
      .maybeSingle();

    if (!tenantUnit) {
      return badRequestResponse('Tenant unit assignment not found');
    }

    const payload = {
      kind: 'payment_plan',
      amount,
      installments,
      reason,
      requested_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tenant_requests')
      .insert({
        tenant_id: user.id,
        unit_id: tenantUnit.id,
        building_id: tenantUnit.building_id,
        message: `PAYMENT_PLAN:${JSON.stringify(payload)}`,
        status: 'pending',
      })
      .select('id, status, date, created_at')
      .single();

    if (error) {
      return errorResponse('Create Failed', error.message, 500);
    }

    return successResponse({
      id: data.id,
      amount,
      installments,
      reason,
      status: 'pending',
      requestDate: data.date || data.created_at,
    }, 'Payment plan request submitted');
  } catch (error) {
    console.error('Create payment plan request error:', error);
    return errorResponse('Failed', 'An error occurred while creating payment plan request', 500);
  }
}

export async function handleGetPaymentPlanRequests(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can view payment plan requests');
    }

    const supabase = createServiceClient();

    const { data: rows, error } = await supabase
      .from('tenant_requests')
      .select('id, message, status, response, date, created_at, updated_at')
      .eq('tenant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return errorResponse('Query Failed', error.message, 500);
    }

    const plans = (rows || [])
      .filter((row: any) => typeof row.message === 'string' && row.message.startsWith('PAYMENT_PLAN:'))
      .map((row: any) => {
        const raw = String(row.message).slice('PAYMENT_PLAN:'.length);
        let payload: any = {};

        try {
          payload = JSON.parse(raw);
        } catch {
          payload = {};
        }

        const normalizedStatus = row.status === 'resolved'
          ? 'approved'
          : row.status === 'in-progress'
            ? 'pending'
            : row.status === 'pending'
              ? 'pending'
              : 'rejected';

        const installments = Number(payload.installments || 0);
        const amount = Number(payload.amount || 0);

        return {
          id: row.id,
          amount,
          reason: String(payload.reason || ''),
          installments,
          installmentAmount: installments > 0 ? amount / installments : amount,
          requestDate: row.date || row.created_at,
          status: normalizedStatus,
          response: row.response || null,
        };
      });

    return successResponse(plans);
  } catch (error) {
    console.error('Get payment plan requests error:', error);
    return errorResponse('Failed', 'An error occurred while loading payment plan requests', 500);
  }
}
