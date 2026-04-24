// Buildings API handlers

import { createServiceClient } from './supabase_utils.ts';
import { getAuthUser, hasRole } from './supabase_utils.ts';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
} from './responses.ts';
import { logAuditEvent } from './audit.ts';

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function enrichUnitsWithTenantDetails(supabase: ReturnType<typeof createServiceClient>, buildings: any[]) {
  const tenantIds = Array.from(new Set(
    (buildings || [])
      .flatMap((building: any) => (building.floors || []).flatMap((floor: any) => floor.units || []))
      .map((unit: any) => unit.tenant_id)
      .filter((tenantId: string | null) => Boolean(tenantId))
  )) as string[];

  if (tenantIds.length === 0) {
    return buildings;
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email')
    .in('id', tenantIds);

  const { data: tenantDetails } = await supabase
    .from('tenant_details')
    .select('tenant_id, occupation, next_of_kin, next_of_kin_contact, assigned_date')
    .in('tenant_id', tenantIds);

  const profileMap = new Map<string, any>((profiles || []).map((profile: any) => [profile.id, profile]));
  const detailsMap = new Map<string, any>((tenantDetails || []).map((detail: any) => [detail.tenant_id, detail]));

  return (buildings || []).map((building: any) => ({
    ...building,
    floors: (building.floors || []).map((floor: any) => ({
      ...floor,
      units: (floor.units || []).map((unit: any) => {
        if (!unit.tenant_id) return unit;
        const profile = profileMap.get(unit.tenant_id);
        const details = detailsMap.get(unit.tenant_id);

        return {
          ...unit,
          tenant_name: profile?.full_name || null,
          tenant_phone: profile?.phone || null,
          tenant_email: profile?.email || null,
          tenant_occupation: details?.occupation || null,
          tenant_next_of_kin: details?.next_of_kin || null,
          tenant_next_of_kin_contact: details?.next_of_kin_contact || null,
          tenant_assigned_date: details?.assigned_date || null,
        };
      }),
    })),
  }));
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

function calculateNextRentDueDate(baseDateInput?: string | null, completedRentPayments = 0): string | null {
  if (!baseDateInput) return null;

  const baseDate = new Date(baseDateInput);
  if (Number.isNaN(baseDate.getTime())) return null;

  if (completedRentPayments <= 0) {
    return baseDate.toISOString().split('T')[0];
  }

  const dueDate = new Date(baseDate);
  const monthsCovered = completedRentPayments + 2;
  dueDate.setMonth(dueDate.getMonth() + monthsCovered);
  return dueDate.toISOString().split('T')[0];
}

/**
 * Get all buildings for the current user
 */
export async function handleGetBuildings(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = createServiceClient();

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('buildings')
      .select('*, floors(*, units(*))')
      .order('created_at', { ascending: false });

    // If not admin, only show user's buildings
    if (profile?.role !== 'admin') {
      query = query.eq('landlord_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse('Query Failed', error.message, 500);
    }

    const enriched = await enrichUnitsWithTenantDetails(supabase, data || []);
    return successResponse(enriched);
  } catch (error) {
    console.error('Get buildings error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

/**
 * Get building by ID
 */
export async function handleGetBuilding(request: Request, id: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('buildings')
      .select('*, floors(*, units(*))')
      .eq('id', id)
      .single();

    if (error || !data) {
      return notFoundResponse('Building');
    }

    // Check permissions
    const isAdmin = await hasRole(user.id, ['admin']);
    if (!isAdmin && data.landlord_id !== user.id) {
      return forbiddenResponse();
    }

    const enriched = await enrichUnitsWithTenantDetails(supabase, [data]);
    return successResponse(enriched[0]);
  } catch (error) {
    console.error('Get building error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

/**
 * Create new building
 */
export async function handleCreateBuilding(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // Only landlords and admins can create buildings
    const canCreate = await hasRole(user.id, ['landlord', 'admin']);
    if (!canCreate) {
      return forbiddenResponse('Only landlords can create buildings');
    }

    const body = await request.json();
    const { name, location, floors } = body;

    if (!name || !location || !floors || !Array.isArray(floors)) {
      return errorResponse('Bad Request', 'Missing required fields', 400);
    }

    const supabase = createServiceClient();

    // Calculate total units
    const totalUnits = floors.reduce((sum: number, floor: any) => sum + floor.units_count, 0);

    // Create building
    const { data: building, error: buildingError } = await supabase
      .from('buildings')
      .insert({
        name,
        location,
        total_units: totalUnits,
        occupied_units: 0,
        landlord_id: user.id,
      })
      .select()
      .single();

    if (buildingError) {
      return errorResponse('Creation Failed', buildingError.message, 500);
    }

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'CREATE_BUILDING',
      entityType: 'building',
      entityId: building.id,
      details: `Created building ${name}`,
      status: 'success',
      metadata: { location, floors: floors.length, totalUnits },
    });

    const toDateString = (date: Date) => date.toISOString().split('T')[0];

    // Create floors and units
    for (const floor of floors) {
      const { data: floorData, error: floorError } = await supabase
        .from('floors')
        .insert({
          building_id: building.id,
          floor_number: floor.floor_number,
          units_count: floor.units_count,
          rent_per_unit: floor.rent_per_unit,
        })
        .select()
        .single();

      if (floorError) {
        console.error('Floor creation error:', floorError);
        continue;
      }

      // Create units for this floor
      const units = Array.from({ length: floor.units_count }, (_, i) => ({
        floor_id: floorData.id,
        building_id: building.id,
        unit_number: floor.unit_numbers?.[i] || `${floor.floor_number}${String(i + 1).padStart(2, '0')}`,
        rent: floor.rent_per_unit,
        is_occupied: false,
      }));

      const { data: createdUnits, error: unitsError } = await supabase
        .from('units')
        .insert(units)
        .select('id');

      if (unitsError) {
        console.error('Units creation error:', unitsError);
        continue;
      }

      const rubbishPerUnit = Number(floor.rubbish_per_unit || 0);
      if (rubbishPerUnit > 0 && createdUnits && createdUnits.length > 0) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + 1);

        const rubbishBills = createdUnits.map((unit: { id: string }) => ({
          building_id: building.id,
          unit_id: unit.id,
          type: 'rubbish',
          amount: rubbishPerUnit,
          due_date: toDateString(dueDate),
          status: 'pending',
        }));

        const { error: billsError } = await supabase
          .from('bills')
          .insert(rubbishBills);

        if (billsError) {
          console.error('Rubbish bills creation error:', billsError);
        }
      }
    }

    return successResponse(building, 'Building created successfully');
  } catch (error) {
    console.error('Create building error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

/**
 * Update building
 */
export async function handleUpdateBuilding(request: Request, id: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = createServiceClient();

    // Check if building exists and user owns it
    const { data: existing } = await supabase
      .from('buildings')
      .select('landlord_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return notFoundResponse('Building');
    }

    const isAdmin = await hasRole(user.id, ['admin']);
    if (!isAdmin && existing.landlord_id !== user.id) {
      return forbiddenResponse();
    }

    const body = await request.json();
    const { name, location, floors } = body;

    const hasFloorPayload = Array.isArray(floors) && floors.length > 0;
    const totalUnits = hasFloorPayload
      ? floors.reduce((sum: number, floor: any) => sum + Number(floor.units_count || 0), 0)
      : undefined;

    const updatePayload: Record<string, unknown> = {
      name,
      location,
    };

    if (typeof totalUnits === 'number') {
      updatePayload.total_units = totalUnits;
      updatePayload.occupied_units = 0;
    }

    const { data, error } = await supabase
      .from('buildings')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse('Update Failed', error.message, 500);
    }

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'UPDATE_BUILDING',
      entityType: 'building',
      entityId: id,
      details: `Updated building ${name || id}`,
      status: 'success',
      metadata: { hasFloorPayload },
    });

    if (hasFloorPayload) {
      const toDateString = (date: Date) => date.toISOString().split('T')[0];

      await supabase
        .from('bills')
        .delete()
        .eq('building_id', id)
        .eq('type', 'rubbish');

      const { error: deleteFloorsError } = await supabase
        .from('floors')
        .delete()
        .eq('building_id', id);

      if (deleteFloorsError) {
        return errorResponse('Update Failed', deleteFloorsError.message, 500);
      }

      for (const floor of floors) {
        const { data: floorData, error: floorError } = await supabase
          .from('floors')
          .insert({
            building_id: id,
            floor_number: floor.floor_number,
            units_count: floor.units_count,
            rent_per_unit: floor.rent_per_unit,
          })
          .select()
          .single();

        if (floorError) {
          return errorResponse('Update Failed', floorError.message, 500);
        }

        const units = Array.from({ length: floor.units_count }, (_, i) => ({
          floor_id: floorData.id,
          building_id: id,
          unit_number: floor.unit_numbers?.[i] || `${floor.floor_number}${String(i + 1).padStart(2, '0')}`,
          rent: floor.rent_per_unit,
          is_occupied: false,
        }));

        const { data: createdUnits, error: unitsError } = await supabase
          .from('units')
          .insert(units)
          .select('id');

        if (unitsError) {
          return errorResponse('Update Failed', unitsError.message, 500);
        }

        const rubbishPerUnit = Number(floor.rubbish_per_unit || 0);
        if (rubbishPerUnit > 0 && createdUnits && createdUnits.length > 0) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);

          const bills = createdUnits.map((unit: { id: string }) => ({
            building_id: id,
            unit_id: unit.id,
            type: 'rubbish',
            amount: rubbishPerUnit,
            due_date: toDateString(dueDate),
            status: 'pending',
          }));

          const { error: billsError } = await supabase
            .from('bills')
            .insert(bills);

          if (billsError) {
            console.error('Rubbish bills creation error:', billsError);
          }
        }
      }
    }

    return successResponse(data, 'Building updated successfully');
  } catch (error) {
    console.error('Update building error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

/**
 * Delete building
 */
export async function handleDeleteBuilding(request: Request, id: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const supabase = createServiceClient();

    // Check if building exists and user owns it
    const { data: existing } = await supabase
      .from('buildings')
      .select('landlord_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return notFoundResponse('Building');
    }

    const isAdmin = await hasRole(user.id, ['admin']);
    if (!isAdmin && existing.landlord_id !== user.id) {
      return forbiddenResponse();
    }

    const { error } = await supabase.from('buildings').delete().eq('id', id);

    if (error) {
      return errorResponse('Deletion Failed', error.message, 500);
    }

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'DELETE_BUILDING',
      entityType: 'building',
      entityId: id,
      details: `Deleted building ${id}`,
      status: 'success',
    });

    return successResponse(null, 'Building deleted successfully');
  } catch (error) {
    console.error('Delete building error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

/**
 * Assign tenant to a unit and create/link tenant account
 */
export async function handleAssignTenantToUnit(request: Request, id: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const canAssign = await hasRole(user.id, ['landlord', 'admin']);
    if (!canAssign) {
      return forbiddenResponse('Only landlords can assign tenants');
    }

    const body = await request.json().catch(() => ({}));
    const {
      tenantId: requestedTenantId,
      name,
      phone,
      email,
      occupation,
      nextOfKin,
      nextOfKinContact,
      securityDeposit,
    } = body;

    if (!requestedTenantId && (!name || !phone || !email)) {
      return badRequestResponse('Provide tenantId or (name, phone, and email)');
    }

    const supabase = createServiceClient();

    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, floor_id, building_id, unit_number, tenant_id, is_occupied, buildings(id, name, landlord_id)')
      .eq('id', id)
      .single();

    if (unitError || !unit) {
      return notFoundResponse('Unit');
    }

    const buildingLandlordId = (unit.buildings as any)?.landlord_id;
    const isAdmin = await hasRole(user.id, ['admin']);
    if (!isAdmin && buildingLandlordId !== user.id) {
      return forbiddenResponse();
    }

    let tenantId: string | null = requestedTenantId || null;
    let temporaryPassword: string | null = null;

    if (tenantId) {
      const { data: existingTenant, error: existingTenantError } = await supabase
        .from('profiles')
        .select('id, role, email, phone, full_name')
        .eq('id', tenantId)
        .maybeSingle();

      if (existingTenantError || !existingTenant) {
        return errorResponse('Invalid Tenant', 'Selected tenant account was not found', 400);
      }

      if (existingTenant.role !== 'tenant') {
        return errorResponse('Invalid Tenant', 'Selected account is not a tenant', 400);
      }

      const { data: alreadyAssignedUnit } = await supabase
        .from('units')
        .select('id, building_id, buildings(id, landlord_id)')
        .eq('tenant_id', tenantId)
        .neq('id', id)
        .maybeSingle();

      if (alreadyAssignedUnit) {
        const assignedLandlordId = (alreadyAssignedUnit.buildings as any)?.landlord_id;
        if (!isAdmin && assignedLandlordId !== buildingLandlordId) {
          return forbiddenResponse('Selected tenant is assigned to another landlord');
        }

        const { error: clearOldUnitError } = await supabase
          .from('units')
          .update({
            tenant_id: null,
            is_occupied: false,
          })
          .eq('id', alreadyAssignedUnit.id);

        if (clearOldUnitError) {
          return errorResponse('Reassignment Failed', clearOldUnitError.message, 500);
        }

        const { count: previousBuildingOccupiedCount } = await supabase
          .from('units')
          .select('id', { count: 'exact', head: true })
          .eq('building_id', alreadyAssignedUnit.building_id)
          .eq('is_occupied', true);

        await supabase
          .from('buildings')
          .update({ occupied_units: previousBuildingOccupiedCount || 0 })
          .eq('id', alreadyAssignedUnit.building_id);
      }
    }

    if (!tenantId) {
      const { data: existingProfileByEmail } = await supabase
        .from('profiles')
        .select('id, role, email')
        .ilike('email', email)
        .maybeSingle();

      if (existingProfileByEmail) {
        if (existingProfileByEmail.role !== 'tenant') {
          return errorResponse('Invalid Tenant', 'A non-tenant account already uses this email', 400);
        }
        tenantId = existingProfileByEmail.id;
      }
    }

    if (!tenantId) {
      const { data: existingProfileByPhone } = await supabase
        .from('profiles')
        .select('id, role, phone')
        .eq('phone', phone)
        .maybeSingle();

      if (existingProfileByPhone) {
        if (existingProfileByPhone.role !== 'tenant') {
          return errorResponse('Invalid Tenant', 'A non-tenant account already uses this phone number', 400);
        }
        tenantId = existingProfileByPhone.id;
      }
    }

    let resolvedName = name || '';
    let resolvedPhone = phone || '';
    let resolvedEmail = email || '';

    if (tenantId && (!resolvedName || !resolvedPhone || !resolvedEmail)) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('full_name, phone, email')
        .eq('id', tenantId)
        .single();

      resolvedName = resolvedName || existingProfile?.full_name || 'Tenant';
      resolvedPhone = resolvedPhone || existingProfile?.phone || '';
      resolvedEmail = resolvedEmail || existingProfile?.email || '';
    }

    if (!tenantId && (!resolvedName || !resolvedPhone || !resolvedEmail)) {
      return badRequestResponse('Name, phone, and email are required');
    }

    if (!tenantId) {
      temporaryPassword = generateTemporaryPassword();
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: resolvedEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: resolvedName,
          phone: resolvedPhone,
          role: 'tenant',
          requiresPasswordChange: true,
        }
      });

      if (authError || !authData?.user) {
        return errorResponse('Account Creation Failed', authError?.message || 'Failed to create tenant account', 400);
      }

      tenantId = authData.user.id;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: tenantId,
          email: resolvedEmail,
          full_name: resolvedName,
          phone: resolvedPhone,
          role: 'tenant',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      return errorResponse('Profile Update Failed', profileError.message, 500);
    }

    const today = new Date().toISOString().split('T')[0];

    const { data: existingTenantDetails } = await supabase
      .from('tenant_details')
      .select('occupation, next_of_kin, next_of_kin_contact, assigned_date, lease_start_date, lease_end_date, security_deposit')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const leaseStartDate = existingTenantDetails?.lease_start_date || today;
    const leaseEndDate = existingTenantDetails?.lease_end_date || (() => {
      const endDate = new Date(leaseStartDate);
      endDate.setMonth(endDate.getMonth() + 3);
      return endDate.toISOString().split('T')[0];
    })();
    const resolvedSecurityDeposit = Number(securityDeposit || existingTenantDetails?.security_deposit || unit.rent || 0);

    const { error: tenantDetailsError } = await supabase
      .from('tenant_details')
      .upsert(
        {
          tenant_id: tenantId,
          occupation: occupation ?? existingTenantDetails?.occupation ?? null,
          next_of_kin: nextOfKin ?? existingTenantDetails?.next_of_kin ?? null,
          next_of_kin_contact: nextOfKinContact ?? existingTenantDetails?.next_of_kin_contact ?? null,
          assigned_date: today,
          lease_start_date: leaseStartDate,
          lease_end_date: leaseEndDate,
          security_deposit: resolvedSecurityDeposit,
        },
        { onConflict: 'tenant_id' }
      );

    if (tenantDetailsError) {
      return errorResponse('Tenant Details Failed', tenantDetailsError.message, 500);
    }

    const { error: unitUpdateError } = await supabase
      .from('units')
      .update({
        tenant_id: tenantId,
        is_occupied: true,
      })
      .eq('id', id);

    if (unitUpdateError) {
      return errorResponse('Assignment Failed', unitUpdateError.message, 500);
    }

    const { count: occupiedCount } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', unit.building_id)
      .eq('is_occupied', true);

    await supabase
      .from('buildings')
      .update({ occupied_units: occupiedCount || 0 })
      .eq('id', unit.building_id);

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'ASSIGN_TENANT',
      entityType: 'unit',
      entityId: id,
      details: `Assigned tenant ${resolvedName} to unit ${unit.unit_number}`,
      status: 'success',
      metadata: {
        tenantId,
        buildingId: unit.building_id,
        unitNumber: unit.unit_number,
        tenantEmail: resolvedEmail,
      },
    });

    return successResponse({
      unitId: id,
      tenantId,
      temporaryPassword,
      assignedDate: today,
      leaseStartDate,
      leaseEndDate,
      securityDeposit: resolvedSecurityDeposit,
    }, 'Tenant assigned successfully');
  } catch (error) {
    console.error('Assign tenant error:', error);
    return errorResponse('Assignment Failed', 'An error occurred while assigning tenant', 500);
  }
}

/**
 * Unassign tenant from a unit
 */
export async function handleUnassignTenantFromUnit(request: Request, id: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const canManage = await hasRole(user.id, ['landlord', 'admin']);
    if (!canManage) {
      return forbiddenResponse('Only landlords can unassign tenants');
    }

    const supabase = createServiceClient();

    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('id, floor_id, building_id, unit_number, tenant_id, buildings(id, name, landlord_id)')
      .eq('id', id)
      .single();

    if (unitError || !unit) {
      return notFoundResponse('Unit');
    }

    const buildingLandlordId = (unit.buildings as any)?.landlord_id;
    const isAdmin = await hasRole(user.id, ['admin']);
    if (!isAdmin && buildingLandlordId !== user.id) {
      return forbiddenResponse();
    }

    if (!unit.tenant_id) {
      return successResponse({ unassigned: true }, 'Unit is already unassigned');
    }

    const tenantId = unit.tenant_id;

    const { error: unitUpdateError } = await supabase
      .from('units')
      .update({
        tenant_id: null,
        is_occupied: false,
      })
      .eq('id', id);

    if (unitUpdateError) {
      return errorResponse('Unassignment Failed', unitUpdateError.message, 500);
    }

    const { count: occupiedCount } = await supabase
      .from('units')
      .select('id', { count: 'exact', head: true })
      .eq('building_id', unit.building_id)
      .eq('is_occupied', true);

    await supabase
      .from('buildings')
      .update({ occupied_units: occupiedCount || 0 })
      .eq('id', unit.building_id);

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'UNASSIGN_TENANT',
      entityType: 'unit',
      entityId: id,
      details: `Unassigned tenant from unit ${unit.unit_number}`,
      status: 'success',
      metadata: {
        tenantId,
        buildingId: unit.building_id,
        unitNumber: unit.unit_number,
      },
    });

    return successResponse({ unassigned: true }, `Tenant unassigned from unit ${unit.unit_number}`);
  } catch (error) {
    console.error('Unassign tenant error:', error);
    return errorResponse('Failed', 'An error occurred while unassigning tenant', 500);
  }
}

/**
 * Get unassigned tenants (landlord/admin)
 */
export async function handleGetUnassignedTenants(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const canView = await hasRole(user.id, ['landlord', 'admin']);
    if (!canView) {
      return forbiddenResponse();
    }

    const supabase = createServiceClient();

    const { data: allTenantProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .eq('role', 'tenant')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return errorResponse('Query Failed', profilesError.message, 500);
    }

    const { data: assignedUnits, error: assignedError } = await supabase
      .from('units')
      .select('tenant_id, building_id')
      .not('tenant_id', 'is', null);

    if (assignedError) {
      return errorResponse('Query Failed', assignedError.message, 500);
    }

    const assignedTenantIds = new Set<string>(
      (assignedUnits || [])
        .map((row: any) => row.tenant_id)
        .filter((tenantId: string | null) => Boolean(tenantId)) as string[]
    );

    const assignableTenantIds = (allTenantProfiles || [])
      .map((tenant: any) => tenant.id)
      .filter((tenantId: string) => !assignedTenantIds.has(tenantId));

    let tenantDetailsById = new Map<string, any>();
    if (assignableTenantIds.length > 0) {
      const { data: tenantDetails } = await supabase
        .from('tenant_details')
        .select('tenant_id, occupation, next_of_kin, next_of_kin_contact, assigned_date')
        .in('tenant_id', assignableTenantIds);

      tenantDetailsById = new Map((tenantDetails || []).map((row: any) => [row.tenant_id, row]));
    }

    const unassignedTenants = (allTenantProfiles || [])
      .filter((tenant: any) => assignableTenantIds.includes(tenant.id))
      .map((tenant: any) => {
        const details = tenantDetailsById.get(tenant.id);
        return {
          id: tenant.id,
          name: tenant.full_name || tenant.email || 'Tenant',
          email: tenant.email,
          phone: tenant.phone || '',
          occupation: details?.occupation || null,
          nextOfKin: details?.next_of_kin || null,
          nextOfKinContact: details?.next_of_kin_contact || null,
          assignedDate: details?.assigned_date || null,
        };
      });

    return successResponse(unassignedTenants);
  } catch (error) {
    console.error('Get unassigned tenants error:', error);
    return errorResponse('Failed', 'An error occurred while loading unassigned tenants', 500);
  }
}

/**
 * Get tenants for landlord dashboard (assigned + unassigned)
 */
export async function handleGetLandlordTenants(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const canView = await hasRole(user.id, ['landlord', 'admin']);
    if (!canView) {
      return forbiddenResponse();
    }

    const supabase = createServiceClient();
    const isAdmin = await hasRole(user.id, ['admin']);

    const { data: tenantProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .eq('role', 'tenant')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return errorResponse('Query Failed', profilesError.message, 500);
    }

    const { data: unitsWithTenants, error: unitsError } = await supabase
      .from('units')
      .select('id, tenant_id, unit_number, rent, building_id, buildings(id, name, landlord_id)')
      .not('tenant_id', 'is', null);

    if (unitsError) {
      return errorResponse('Query Failed', unitsError.message, 500);
    }

    const { data: tenantDetails } = await supabase
      .from('tenant_details')
      .select('tenant_id, occupation, next_of_kin, next_of_kin_contact, assigned_date, lease_start_date, lease_end_date, security_deposit');

    const detailsMap = new Map((tenantDetails || []).map((row: any) => [row.tenant_id, row]));

    const assignmentInScope = new Map<string, any>();

    for (const unit of unitsWithTenants || []) {
      if (!unit.tenant_id) continue;
      const buildingLandlordId = (unit.buildings as any)?.landlord_id;
      if (!isAdmin && buildingLandlordId !== user.id) {
        continue;
      }

      if (!assignmentInScope.has(unit.tenant_id)) {
        assignmentInScope.set(unit.tenant_id, {
          unitId: unit.id,
          unit: unit.unit_number,
          rent: Number(unit.rent || 0),
          buildingId: unit.building_id,
          building: (unit.buildings as any)?.name || 'Unknown Building',
        });
      }
    }

    const assignmentTenantIds = Array.from(assignmentInScope.keys());
    const completedRentCountMap = new Map<string, number>();

    if (assignmentTenantIds.length > 0) {
      const { data: completedRentPayments } = await supabase
        .from('payments')
        .select('tenant_id')
        .in('tenant_id', assignmentTenantIds)
        .eq('type', 'rent')
        .eq('status', 'completed');

      for (const payment of completedRentPayments || []) {
        const tenantId = payment.tenant_id as string;
        completedRentCountMap.set(tenantId, (completedRentCountMap.get(tenantId) || 0) + 1);
      }
    }

    const tenants = (tenantProfiles || [])
      .map((tenant: any) => {
        const assignment = assignmentInScope.get(tenant.id);
        if (!isAdmin && !assignment) {
          return null;
        }

        const details = detailsMap.get(tenant.id);
        const completedRentPayments = completedRentCountMap.get(tenant.id) || 0;
        const nextDueDate = calculateNextRentDueDate(details?.assigned_date || details?.lease_start_date || null, completedRentPayments);

        return {
          id: tenant.id,
          name: tenant.full_name || tenant.email || 'Tenant',
          email: tenant.email,
          phone: tenant.phone || '',
          occupation: details?.occupation || null,
          nextOfKin: details?.next_of_kin || null,
          nextOfKinContact: details?.next_of_kin_contact || null,
          assignedDate: details?.assigned_date || null,
          leaseStartDate: details?.lease_start_date || null,
          leaseEndDate: details?.lease_end_date || null,
          nextDueDate,
          assigned: Boolean(assignment),
          unitId: assignment?.unitId || null,
          unit: assignment?.unit || null,
          buildingId: assignment?.buildingId || null,
          building: assignment?.building || null,
          rent: assignment?.rent || 0,
          createdAt: tenant.created_at,
        };
      })
      .filter(Boolean);

    return successResponse(tenants);
  } catch (error) {
    console.error('Get landlord tenants error:', error);
    return errorResponse('Failed', 'An error occurred while loading tenants', 500);
  }
}

/**
 * Get tenant assignment/profile details for tenant dashboard
 */
export async function handleGetTenantAssignment(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can access tenant assignment details');
    }

    const supabase = createServiceClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return errorResponse('Failed', 'Tenant profile not found', 404);
    }

    let { data: tenantDetails } = await supabase
      .from('tenant_details')
      .select('occupation, next_of_kin, next_of_kin_contact, assigned_date, lease_start_date, lease_end_date, security_deposit')
      .eq('tenant_id', user.id)
      .maybeSingle();

    const { data: assignedUnit } = await supabase
      .from('units')
      .select('id, unit_number, rent, building_id, buildings(id, name)')
      .eq('tenant_id', user.id)
      .maybeSingle();

    if (assignedUnit && (!tenantDetails?.assigned_date || !tenantDetails?.lease_start_date || !tenantDetails?.lease_end_date)) {
      const today = new Date().toISOString().split('T')[0];
      const assignedDate = tenantDetails?.assigned_date || today;
      const leaseStartDate = tenantDetails?.lease_start_date || assignedDate;
      const leaseEndDate = tenantDetails?.lease_end_date || (() => {
        const endDate = new Date(leaseStartDate);
        endDate.setMonth(endDate.getMonth() + 3);
        return endDate.toISOString().split('T')[0];
      })();

      await supabase
        .from('tenant_details')
        .upsert(
          {
            tenant_id: user.id,
            occupation: tenantDetails?.occupation || null,
            next_of_kin: tenantDetails?.next_of_kin || null,
            next_of_kin_contact: tenantDetails?.next_of_kin_contact || null,
            assigned_date: assignedDate,
            lease_start_date: leaseStartDate,
            lease_end_date: leaseEndDate,
          },
          { onConflict: 'tenant_id' }
        );

      tenantDetails = {
        ...(tenantDetails || {}),
        assigned_date: assignedDate,
        lease_start_date: leaseStartDate,
        lease_end_date: leaseEndDate,
      } as any;
    }

    let completedRentPayments = 0;
    if (assignedUnit) {
      const { count } = await supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.id)
        .eq('type', 'rent')
        .eq('status', 'completed');
      completedRentPayments = count || 0;
    }

    const nextDueDate = calculateNextRentDueDate(
      tenantDetails?.assigned_date || tenantDetails?.lease_start_date || null,
      completedRentPayments,
    );

    return successResponse({
      id: profile.id,
      name: profile.full_name || profile.email || 'Tenant',
      email: profile.email,
      phone: profile.phone || '',
      occupation: tenantDetails?.occupation || null,
      nextOfKin: tenantDetails?.next_of_kin || null,
      nextOfKinContact: tenantDetails?.next_of_kin_contact || null,
      assignedDate: tenantDetails?.assigned_date || null,
      leaseStartDate: tenantDetails?.lease_start_date || null,
      leaseEndDate: tenantDetails?.lease_end_date || null,
      securityDeposit: Number(tenantDetails?.security_deposit || assignedUnit?.rent || 0),
      nextDueDate,
      assigned: Boolean(assignedUnit),
      unit: assignedUnit?.unit_number || null,
      rent: assignedUnit ? Number(assignedUnit.rent || 0) : 0,
      buildingId: assignedUnit?.building_id || null,
      building: (assignedUnit?.buildings as any)?.name || null,
      unitId: assignedUnit?.id || null,
    });
  } catch (error) {
    console.error('Get tenant assignment error:', error);
    return errorResponse('Failed', 'An error occurred while loading assignment', 500);
  }
}

export async function handleUpdateTenantProfile(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isTenant = await hasRole(user.id, ['tenant']);
    if (!isTenant) {
      return forbiddenResponse('Only tenants can update this profile');
    }

    const body = await request.json().catch(() => ({}));
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : undefined;
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : undefined;
    const occupation = typeof body?.occupation === 'string' ? body.occupation.trim() : undefined;
    const nextOfKin = typeof body?.nextOfKin === 'string' ? body.nextOfKin.trim() : undefined;
    const nextOfKinContact = typeof body?.nextOfKinContact === 'string' ? body.nextOfKinContact.trim() : undefined;

    const supabase = createServiceClient();

    if (typeof fullName === 'string' || typeof phone === 'string') {
      const profilePatch: Record<string, string> = {};
      if (typeof fullName === 'string') profilePatch.full_name = fullName;
      if (typeof phone === 'string') profilePatch.phone = phone;

      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update(profilePatch)
        .eq('id', user.id);

      if (profileUpdateError) {
        return errorResponse('Update Failed', profileUpdateError.message, 500);
      }
    }

    const { data: existingTenantDetails } = await supabase
      .from('tenant_details')
      .select('occupation, next_of_kin, next_of_kin_contact, assigned_date, lease_start_date, lease_end_date, security_deposit')
      .eq('tenant_id', user.id)
      .maybeSingle();

    const { error: detailsError } = await supabase
      .from('tenant_details')
      .upsert(
        {
          tenant_id: user.id,
          occupation: occupation ?? existingTenantDetails?.occupation ?? null,
          next_of_kin: nextOfKin ?? existingTenantDetails?.next_of_kin ?? null,
          next_of_kin_contact: nextOfKinContact ?? existingTenantDetails?.next_of_kin_contact ?? null,
          assigned_date: existingTenantDetails?.assigned_date ?? null,
          lease_start_date: existingTenantDetails?.lease_start_date ?? null,
          lease_end_date: existingTenantDetails?.lease_end_date ?? null,
          security_deposit: existingTenantDetails?.security_deposit ?? null,
        },
        { onConflict: 'tenant_id' }
      );

    if (detailsError) {
      return errorResponse('Update Failed', detailsError.message, 500);
    }

    return successResponse({
      updated: true,
      fullName,
      phone,
      occupation: occupation ?? existingTenantDetails?.occupation ?? null,
      nextOfKin: nextOfKin ?? existingTenantDetails?.next_of_kin ?? null,
      nextOfKinContact: nextOfKinContact ?? existingTenantDetails?.next_of_kin_contact ?? null,
    }, 'Profile updated successfully');
  } catch (error) {
    console.error('Update tenant profile error:', error);
    return errorResponse('Failed', 'An error occurred while updating profile', 500);
  }
}

export async function handleUpdateTenantDueDate(request: Request, tenantId: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const canManage = await hasRole(user.id, ['landlord', 'admin']);
    if (!canManage) {
      return forbiddenResponse('Only landlords or admins can manage tenant due dates');
    }

    const body = await request.json().catch(() => ({}));
    const nextDueDateRaw = typeof body?.nextDueDate === 'string' ? body.nextDueDate : '';

    if (!nextDueDateRaw) {
      return badRequestResponse('nextDueDate is required');
    }

    const parsed = new Date(nextDueDateRaw);
    if (Number.isNaN(parsed.getTime())) {
      return badRequestResponse('nextDueDate must be a valid date');
    }

    const normalizedNextDueDate = parsed.toISOString().split('T')[0];
    const supabase = createServiceClient();

    const isAdmin = await hasRole(user.id, ['admin']);
    const { data: tenantUnit, error: unitError } = await supabase
      .from('units')
      .select('id, tenant_id, building_id, buildings(id, landlord_id)')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (unitError) {
      return errorResponse('Query Failed', unitError.message, 500);
    }

    if (!tenantUnit) {
      return notFoundResponse('Tenant assignment');
    }

    const landlordId = (tenantUnit.buildings as any)?.landlord_id;
    if (!isAdmin && landlordId !== user.id) {
      return forbiddenResponse();
    }

    const { data: existingTenantDetails } = await supabase
      .from('tenant_details')
      .select('occupation, next_of_kin, next_of_kin_contact, assigned_date, lease_start_date, lease_end_date')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const leaseStartDate = existingTenantDetails?.lease_start_date || normalizedNextDueDate;
    const leaseEndDate = existingTenantDetails?.lease_end_date || (() => {
      const endDate = new Date(leaseStartDate);
      endDate.setMonth(endDate.getMonth() + 3);
      return endDate.toISOString().split('T')[0];
    })();

    const { error: upsertError } = await supabase
      .from('tenant_details')
      .upsert(
        {
          tenant_id: tenantId,
          occupation: existingTenantDetails?.occupation || null,
          next_of_kin: existingTenantDetails?.next_of_kin || null,
          next_of_kin_contact: existingTenantDetails?.next_of_kin_contact || null,
          assigned_date: normalizedNextDueDate,
          lease_start_date: leaseStartDate,
          lease_end_date: leaseEndDate,
        },
        { onConflict: 'tenant_id' }
      );

    if (upsertError) {
      return errorResponse('Update Failed', upsertError.message, 500);
    }

    const { count: completedRentPayments } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'rent')
      .eq('status', 'completed');

    const nextDueDate = calculateNextRentDueDate(normalizedNextDueDate, completedRentPayments || 0);

    return successResponse({
      tenantId,
      assignedDate: normalizedNextDueDate,
      nextDueDate,
      leaseStartDate,
      leaseEndDate,
    }, 'Tenant due date updated successfully');
  } catch (error) {
    console.error('Update tenant due date error:', error);
    return errorResponse('Failed', 'An error occurred while updating tenant due date', 500);
  }
}
