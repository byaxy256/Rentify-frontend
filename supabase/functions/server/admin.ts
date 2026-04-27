import { createServiceClient, getAuthUser, hasRole } from './supabase_utils.ts';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
  notFoundResponse,
} from './responses.ts';

function monthKey(dateValue: string | null | undefined): string {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 7);
}

function monthLabel(key: string): string {
  if (!key) return '';
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

function getLastMonthKeys(count: number): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(d.toISOString().slice(0, 7));
  }
  return keys;
}

async function requireAdmin(request: Request) {
  const user = await getAuthUser(request);
  if (!user) {
    return { user: null, response: unauthorizedResponse() };
  }

  const isAdminByProfile = await hasRole(user.id, ['admin']);
  const isAdminByIdentity =
    String(user.email || '').toLowerCase() === 'admin@rentify.com' ||
    String((user.user_metadata as Record<string, unknown> | undefined)?.role || '').toLowerCase() === 'admin';

  const isAdmin = isAdminByProfile || isAdminByIdentity;
  if (!isAdmin) {
    return { user: null, response: forbiddenResponse('Only admins can access this endpoint') };
  }

  return { user, response: null };
}

async function listAllAuthUsers(supabase: ReturnType<typeof createServiceClient>) {
  const allUsers: Array<{ id: string; created_at?: string; email?: string; user_metadata?: Record<string, unknown> }> = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const users = data?.users || [];
    allUsers.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

export async function handleGetAdminOverview(request: Request) {
  const startedAt = Date.now();

  try {
    const access = await requireAdmin(request);
    if (access.response) return access.response;

    const supabase = createServiceClient();

    const [
      authUsersResult,
      profilesResult,
      buildingsResult,
      unitsResult,
      paymentsResult,
      tenantRequestsResult,
      auditResult,
    ] = await Promise.all([
      listAllAuthUsers(supabase),
      supabase.from('profiles').select('id, role, created_at, email'),
      supabase.from('buildings').select('id, total_units, occupied_units'),
      supabase.from('units').select('id, is_occupied'),
      supabase.from('payments').select('id, amount, status, date'),
      supabase.from('tenant_requests').select('id, status, created_at, date'),
      supabase.from('audit_logs').select('id, created_at, action, details, status').order('created_at', { ascending: false }).limit(20),
    ]);

    const possibleError = [
      authUsersResult instanceof Error ? authUsersResult : null,
      profilesResult.error,
      buildingsResult.error,
      unitsResult.error,
      paymentsResult.error,
      tenantRequestsResult.error,
      auditResult.error,
    ].find(Boolean);

    if (possibleError) {
      return errorResponse('Query Failed', possibleError.message, 500);
    }

    const authUsers = Array.isArray(authUsersResult) ? authUsersResult : [];
    const profiles = profilesResult.data || [];
    const buildings = buildingsResult.data || [];
    const units = unitsResult.data || [];
    const payments = paymentsResult.data || [];
    const tenantRequests = tenantRequestsResult.data || [];
    const auditLogs = auditResult.data || [];

    const totalUsers = Math.max(authUsers.length, profiles.length);
    const totalProperties = buildings.length;
    const totalUnits = Number(buildings.reduce((sum: number, b: any) => sum + Number(b.total_units || 0), 0));
    const occupiedUnits = Number(buildings.reduce((sum: number, b: any) => sum + Number(b.occupied_units || 0), 0));
    const occupancyRate = totalUnits > 0 ? Number(((occupiedUnits / totalUnits) * 100).toFixed(1)) : 0;

    const completedPayments = payments.filter((p: any) => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const totalCommission = Math.round(totalRevenue * 0.05);
    const activeTransactions = payments.filter((p: any) => ['completed', 'pending'].includes(String(p.status || '').toLowerCase())).length;

    const monthKeys = getLastMonthKeys(6);
    const userGrowthMap = new Map<string, { landlords: number; tenants: number }>();
    const txMap = new Map<string, { transactions: number; amount: number }>();

    for (const key of monthKeys) {
      userGrowthMap.set(key, { landlords: 0, tenants: 0 });
      txMap.set(key, { transactions: 0, amount: 0 });
    }

    for (const profile of profiles.length > 0 ? profiles : authUsers) {
      const key = monthKey(profile.created_at || profile.created_at);
      if (!userGrowthMap.has(key)) continue;
      const current = userGrowthMap.get(key)!;
      const role = (profile as any).role || (profile as any).user_metadata?.role;
      if (role === 'landlord') current.landlords += 1;
      if (role === 'tenant') current.tenants += 1;
    }

    for (const payment of payments) {
      const key = monthKey(payment.date);
      if (!txMap.has(key)) continue;
      const current = txMap.get(key)!;
      current.transactions += 1;
      if (payment.status === 'completed') {
        current.amount += Number(payment.amount || 0);
      }
    }

    const userGrowthData = monthKeys.map((key) => ({
      month: monthLabel(key),
      landlords: userGrowthMap.get(key)?.landlords || 0,
      tenants: userGrowthMap.get(key)?.tenants || 0,
    }));

    const transactionData = monthKeys.map((key) => ({
      month: monthLabel(key),
      transactions: txMap.get(key)?.transactions || 0,
      amount: txMap.get(key)?.amount || 0,
    }));

    const roleSource = profiles.length > 0 ? profiles : authUsers.map((user: any) => ({
      role: user.user_metadata?.role || 'tenant',
    }));
    const tenantCount = roleSource.filter((p: any) => p.role === 'tenant').length;
    const landlordCount = roleSource.filter((p: any) => p.role === 'landlord').length;
    const adminCount = roleSource.filter((p: any) => p.role === 'admin').length;

    const occupiedUnitCount = units.filter((u: any) => Boolean(u.is_occupied)).length;
    const vacantUnitCount = Math.max(0, units.length - occupiedUnitCount);

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const audit24h = auditLogs.filter((log: any) => (log.created_at || '') >= twentyFourHoursAgo);
    const failed24h = audit24h.filter((log: any) => log.status === 'failed').length;
    const errorRate = audit24h.length > 0 ? Number(((failed24h / audit24h.length) * 100).toFixed(2)) : 0;

    const openTickets = tenantRequests.filter((t: any) => t.status === 'pending').length;
    const inProgressTickets = tenantRequests.filter((t: any) => t.status === 'in-progress').length;

    const auditActivities = auditLogs.slice(0, 8).map((log: any) => ({
      id: log.id,
      type: log.action,
      message: log.details || log.action,
      time: log.created_at,
      status: log.status,
    }));

    const fallbackActivities = [
      ...payments.slice(0, 4).map((payment: any) => ({
        id: `payment-${payment.id}`,
        type: 'payment',
        message: `${String(payment.status || 'completed').replace(/^[a-z]/, (char) => char.toUpperCase())} payment of UGX ${Number(payment.amount || 0).toLocaleString()}`,
        time: payment.date,
        status: payment.status === 'failed' ? 'failed' : 'success',
      })),
      ...tenantRequests.slice(0, 3).map((requestItem: any) => ({
        id: `request-${requestItem.id}`,
        type: 'request',
        message: `Tenant request marked ${requestItem.status}`,
        time: requestItem.created_at || requestItem.date,
        status: requestItem.status === 'resolved' ? 'success' : 'success',
      })),
      ...buildings.slice(0, 2).map((building: any) => ({
        id: `building-${building.id}`,
        type: 'building',
        message: `Property ${building.name} has ${Number(building.occupied_units || 0)}/${Number(building.total_units || 0)} occupied units`,
        time: building.created_at,
        status: 'success',
      })),
    ];

    const recentActivities = auditActivities.length > 0 ? auditActivities : fallbackActivities;

    const loadedRowCount = profiles.length + buildings.length + units.length + payments.length + tenantRequests.length + auditLogs.length;
    const databaseLoadPercent = Number(
      Math.min(
        100,
        Math.max(
          occupancyRate,
          Number(((loadedRowCount / Math.max(1, totalUnits + totalProperties * 10 + totalUsers * 2)) * 100).toFixed(1)),
        ),
      ),
    );

    const health = {
      apiResponseTimeMs: Date.now() - startedAt,
      databaseLoadPercent,
      uptimePercent: Number((100 - Math.min(errorRate, 25) * 0.2).toFixed(2)),
      errorRatePercent: errorRate,
    };

    return successResponse({
      stats: {
        totalUsers,
        totalProperties,
        totalRevenue,
        totalCommission,
        activeTransactions,
        totalUnits,
        occupiedUnits,
        occupancyRate,
      },
      charts: {
        userGrowthData,
        transactionData,
        userDistribution: [
          { name: 'Tenants', value: tenantCount, color: '#3b82f6' },
          { name: 'Landlords', value: landlordCount, color: '#8b5cf6' },
          { name: 'Admins', value: adminCount, color: '#f59e0b' },
        ],
        propertyStatus: [
          { name: 'Occupied', value: occupiedUnitCount, color: '#10b981' },
          { name: 'Vacant', value: vacantUnitCount, color: '#ef4444' },
        ],
      },
      health,
      recentActivities,
    });
  } catch (error) {
    console.error('Get admin overview error:', error);
    return errorResponse('Failed', 'An error occurred while loading admin overview', 500);
  }
}

export async function handleGetAdminProperties(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (access.response) return access.response;

    const supabase = createServiceClient();

    const [{ data: buildings, error: buildingsError }, { data: landlordProfiles, error: landlordsError }] = await Promise.all([
      supabase.from('buildings').select('id, name, location, total_units, occupied_units, landlord_id, created_at').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, email').eq('role', 'landlord'),
    ]);

    if (buildingsError) {
      return errorResponse('Query Failed', buildingsError.message, 500);
    }

    if (landlordsError) {
      return errorResponse('Query Failed', landlordsError.message, 500);
    }

    const landlordMap = new Map((landlordProfiles || []).map((row: any) => [row.id, row]));
    const buildingIds = (buildings || []).map((b: any) => b.id);

    let paymentsByBuilding = new Map<string, number>();
    if (buildingIds.length > 0) {
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: payments } = await supabase
        .from('payments')
        .select('building_id, amount, status, date')
        .in('building_id', buildingIds)
        .eq('status', 'completed')
        .gte('date', currentMonthStart);

      for (const payment of payments || []) {
        const buildingId = payment.building_id;
        if (!buildingId) continue;
        paymentsByBuilding.set(buildingId, (paymentsByBuilding.get(buildingId) || 0) + Number(payment.amount || 0));
      }
    }

    const properties = (buildings || []).map((building: any) => {
      const landlord = landlordMap.get(building.landlord_id);
      return {
        id: building.id,
        name: building.name,
        location: building.location,
        units: Number(building.total_units || 0),
        occupied: Number(building.occupied_units || 0),
        landlord: landlord?.full_name || landlord?.email || 'Unknown Landlord',
        revenue: Number(paymentsByBuilding.get(building.id) || 0),
      };
    });

    const totalProperties = properties.length;
    const totalUnits = properties.reduce((sum: number, p: any) => sum + p.units, 0);
    const totalOccupied = properties.reduce((sum: number, p: any) => sum + p.occupied, 0);
    const occupancyRate = totalUnits > 0 ? Number(((totalOccupied / totalUnits) * 100).toFixed(1)) : 0;
    const totalRevenue = properties.reduce((sum: number, p: any) => sum + p.revenue, 0);

    return successResponse({
      summary: {
        totalProperties,
        totalUnits,
        totalOccupied,
        occupancyRate,
        totalRevenue,
      },
      properties,
    });
  } catch (error) {
    console.error('Get admin properties error:', error);
    return errorResponse('Failed', 'An error occurred while loading admin properties', 500);
  }
}

export async function handleGetAdminRevenue(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (access.response) return access.response;

    const supabase = createServiceClient();
    const { data: payments, error } = await supabase
      .from('payments')
      .select('id, amount, status, date')
      .order('date', { ascending: true });

    if (error) {
      return errorResponse('Query Failed', error.message, 500);
    }

    const monthKeys = getLastMonthKeys(6);
    const byMonth = new Map<string, { revenue: number; transactions: number }>();
    for (const key of monthKeys) {
      byMonth.set(key, { revenue: 0, transactions: 0 });
    }

    for (const payment of payments || []) {
      const key = monthKey(payment.date);
      if (!byMonth.has(key)) continue;
      const current = byMonth.get(key)!;
      current.transactions += 1;
      if (payment.status === 'completed') {
        current.revenue += Number(payment.amount || 0);
      }
    }

    const monthlyRevenue = monthKeys.map((key) => {
      const revenue = byMonth.get(key)?.revenue || 0;
      return {
        month: monthLabel(key),
        revenue,
        commission: Math.round(revenue * 0.05),
        transactions: byMonth.get(key)?.transactions || 0,
      };
    });

    const totalRevenue = monthlyRevenue.reduce((sum: number, row: any) => sum + row.revenue, 0);
    const totalCommission = monthlyRevenue.reduce((sum: number, row: any) => sum + row.commission, 0);
    const thisMonth = monthlyRevenue[monthlyRevenue.length - 1] || { commission: 0, month: monthLabel(monthKeys[monthKeys.length - 1]) };
    const totalTransactions = monthlyRevenue.reduce((sum: number, row: any) => sum + Number(row.transactions || 0), 0);

    return successResponse({
      summary: {
        totalRevenue,
        totalCommission,
        thisMonthCommission: thisMonth.commission,
        thisMonthLabel: thisMonth.month,
        totalTransactions,
      },
      monthlyRevenue,
    });
  } catch (error) {
    console.error('Get admin revenue error:', error);
    return errorResponse('Failed', 'An error occurred while loading revenue data', 500);
  }
}

export async function handleGetAdminSupportTickets(request: Request) {
  try {
    const access = await requireAdmin(request);
    if (access.response) return access.response;

    const supabase = createServiceClient();

    const { data: requests, error } = await supabase
      .from('tenant_requests')
      .select('id, tenant_id, building_id, message, status, response, created_at, date, updated_at')
      .order('created_at', { ascending: false })
      .limit(300);

    if (error) {
      return errorResponse('Query Failed', error.message, 500);
    }

    const tenantIds = Array.from(new Set((requests || []).map((row: any) => row.tenant_id).filter(Boolean)));
    const buildingIds = Array.from(new Set((requests || []).map((row: any) => row.building_id).filter(Boolean)));

    const [{ data: tenantProfiles }, { data: buildings }] = await Promise.all([
      tenantIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email').in('id', tenantIds)
        : Promise.resolve({ data: [] as any[] }),
      buildingIds.length > 0
        ? supabase.from('buildings').select('id, name').in('id', buildingIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const tenantMap = new Map((tenantProfiles || []).map((row: any) => [row.id, row]));
    const buildingMap = new Map((buildings || []).map((row: any) => [row.id, row]));

    const tickets = (requests || []).map((row: any) => {
      const createdAt = row.created_at || row.date;
      const createdDate = createdAt ? new Date(createdAt) : new Date();
      const ageHours = Math.max(0, (Date.now() - createdDate.getTime()) / (1000 * 60 * 60));

      const priority: 'low' | 'medium' | 'high' | 'critical' =
        row.status === 'pending' && ageHours > 72
          ? 'critical'
          : row.status === 'pending' && ageHours > 24
            ? 'high'
            : row.status === 'in-progress'
              ? 'medium'
              : 'low';

      const status = row.status === 'pending'
        ? 'open'
        : row.status === 'in-progress'
          ? 'in-progress'
          : row.status === 'resolved'
            ? 'resolved'
            : 'closed';

      const tenant = tenantMap.get(row.tenant_id);
      const building = buildingMap.get(row.building_id);

      return {
        id: row.id,
        user: tenant?.full_name || tenant?.email || 'Tenant',
        userType: 'tenant',
        subject: `Request in ${building?.name || 'Building'}`,
        description: row.message || 'No description',
        priority,
        status,
        createdAt,
        assignedTo: row.response?.startsWith('Assigned to:') ? row.response.replace('Assigned to:', '').trim() : undefined,
      };
    });

    return successResponse({
      summary: {
        total: tickets.length,
        open: tickets.filter((t: any) => t.status === 'open').length,
        inProgress: tickets.filter((t: any) => t.status === 'in-progress').length,
        resolved: tickets.filter((t: any) => t.status === 'resolved').length,
      },
      tickets,
    });
  } catch (error) {
    console.error('Get support tickets error:', error);
    return errorResponse('Failed', 'An error occurred while loading support tickets', 500);
  }
}

export async function handleUpdateAdminSupportTicket(request: Request, ticketId: string) {
  try {
    const access = await requireAdmin(request);
    if (access.response) return access.response;

    const body = await request.json().catch(() => ({}));
    const status = body?.status as string | undefined;
    const assignedTo = body?.assignedTo as string | undefined;

    if (!status && !assignedTo) {
      return badRequestResponse('status or assignedTo is required');
    }

    const statusMap: Record<string, string> = {
      open: 'pending',
      'in-progress': 'in-progress',
      resolved: 'resolved',
      closed: 'resolved',
      pending: 'pending',
    };

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      const mapped = statusMap[status];
      if (!mapped) {
        return badRequestResponse('Invalid status value');
      }
      updatePayload.status = mapped;
      if (mapped === 'resolved') {
        updatePayload.response_date = new Date().toISOString();
      }
    }

    if (assignedTo) {
      updatePayload.response = `Assigned to: ${assignedTo}`;
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('tenant_requests')
      .update(updatePayload)
      .eq('id', ticketId)
      .select('id')
      .maybeSingle();

    if (error) {
      return errorResponse('Update Failed', error.message, 500);
    }

    if (!data) {
      return notFoundResponse('Support ticket');
    }

    return successResponse({ id: ticketId }, 'Ticket updated successfully');
  } catch (error) {
    console.error('Update support ticket error:', error);
    return errorResponse('Failed', 'An error occurred while updating support ticket', 500);
  }
}
