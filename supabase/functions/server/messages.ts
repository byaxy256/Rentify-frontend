import { createServiceClient } from './supabase_utils.ts';
import { getAuthUser, hasRole } from './supabase_utils.ts';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
} from './responses.ts';
import { logAuditEvent } from './audit.ts';

type ConversationSummary = {
  tenantId: string;
  name: string;
  phone: string;
  unit: string;
  building: string;
  buildingId: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
};

type TenantThread = {
  tenant: {
    id: string;
    name: string;
    unit: string;
    building: string;
    buildingId: string;
  };
  landlord: {
    id: string;
    name: string;
    phone: string;
  };
};

async function getLandlordScope(userId: string) {
  const supabase = createServiceClient();
  const isAdmin = await hasRole(userId, ['admin']);

  if (isAdmin) {
    const { data: allBuildings, error: allBuildingsError } = await supabase
      .from('buildings')
      .select('id, name, landlord_id');

    if (allBuildingsError) {
      throw allBuildingsError;
    }

    return {
      isAdmin,
      buildings: (allBuildings || []).map((building: any) => ({
        id: building.id,
        name: building.name,
        landlordId: building.landlord_id,
      })),
    };
  }

  const { data: buildings, error: buildingsError } = await supabase
    .from('buildings')
    .select('id, name, landlord_id')
    .eq('landlord_id', userId);

  if (buildingsError) {
    throw buildingsError;
  }

  return {
    isAdmin,
    buildings: (buildings || []).map((building: any) => ({
      id: building.id,
      name: building.name,
      landlordId: building.landlord_id,
    })),
  };
}

async function ensureTenantInScope(userId: string, tenantId: string) {
  const supabase = createServiceClient();
  const { buildings } = await getLandlordScope(userId);

  if (buildings.length === 0) {
    return null;
  }

  const buildingIds = buildings.map((building: any) => building.id);

  const { data: unitRow, error: unitError } = await supabase
    .from('units')
    .select('tenant_id, unit_number, building_id')
    .eq('tenant_id', tenantId)
    .in('building_id', buildingIds)
    .limit(1)
    .maybeSingle();

  if (unitError || !unitRow) {
    return null;
  }

  const building = buildings.find((row: any) => row.id === unitRow.building_id);

  return {
    unit: unitRow.unit_number,
    buildingId: unitRow.building_id,
    buildingName: building?.name || 'Unknown Building',
  };
}

async function getTenantScope(userId: string): Promise<TenantThread | null> {
  const supabase = createServiceClient();

  const { data: unitRow, error: unitError } = await supabase
    .from('units')
    .select('tenant_id, unit_number, building_id')
    .eq('tenant_id', userId)
    .limit(1)
    .maybeSingle();

  if (unitError || !unitRow) {
    return null;
  }

  const { data: building, error: buildingError } = await supabase
    .from('buildings')
    .select('id, name, landlord_id')
    .eq('id', unitRow.building_id)
    .single();

  if (buildingError || !building) {
    return null;
  }

  const { data: landlordProfile, error: landlordError } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .eq('id', building.landlord_id)
    .single();

  if (landlordError || !landlordProfile) {
    return null;
  }

  const { data: tenantProfile, error: tenantProfileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', userId)
    .single();

  if (tenantProfileError || !tenantProfile) {
    return null;
  }

  return {
    tenant: {
      id: tenantProfile.id,
      name: tenantProfile.full_name || tenantProfile.email || 'Tenant',
      unit: unitRow.unit_number,
      building: building.name,
      buildingId: building.id,
    },
    landlord: {
      id: landlordProfile.id,
      name: landlordProfile.full_name || 'Property Manager',
      phone: landlordProfile.phone || '',
    },
  };
}

export async function handleGetLandlordConversations(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const userCanUseMessages = await hasRole(user.id, ['landlord', 'admin']);
    if (!userCanUseMessages) {
      return forbiddenResponse('Only landlords can access landlord messages');
    }

    const supabase = createServiceClient();
    const { buildings } = await getLandlordScope(user.id);

    if (buildings.length === 0) {
      return successResponse([]);
    }

    const buildingIdToName = new Map<string, string>(
      buildings.map((building: any) => [building.id, building.name])
    );

    const buildingIds = buildings.map((building: any) => building.id);

    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('tenant_id, unit_number, building_id')
      .in('building_id', buildingIds)
      .not('tenant_id', 'is', null);

    if (unitsError) {
      return errorResponse('Query Failed', unitsError.message, 500);
    }

    const tenantUnitMap = new Map<string, { unit: string; buildingId: string }>();
    for (const unit of units || []) {
      if (!unit.tenant_id) continue;
      if (!tenantUnitMap.has(unit.tenant_id)) {
        tenantUnitMap.set(unit.tenant_id, {
          unit: unit.unit_number,
          buildingId: unit.building_id,
        });
      }
    }

    const tenantIds = Array.from(tenantUnitMap.keys());
    if (tenantIds.length === 0) {
      return successResponse([]);
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('id', tenantIds);

    if (profilesError) {
      return errorResponse('Query Failed', profilesError.message, 500);
    }

    const { data: sentMessages, error: sentError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, message, read, timestamp')
      .eq('sender_id', user.id)
      .in('recipient_id', tenantIds)
      .order('timestamp', { ascending: false });

    if (sentError) {
      return errorResponse('Query Failed', sentError.message, 500);
    }

    const { data: receivedMessages, error: receivedError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, message, read, timestamp')
      .eq('recipient_id', user.id)
      .in('sender_id', tenantIds)
      .order('timestamp', { ascending: false });

    if (receivedError) {
      return errorResponse('Query Failed', receivedError.message, 500);
    }

    const grouped = new Map<string, { last?: any; unreadCount: number }>();

    for (const message of [...(sentMessages || []), ...(receivedMessages || [])]) {
      const tenantId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
      if (!tenantId) continue;

      const current = grouped.get(tenantId) || { unreadCount: 0 };
      if (!current.last || new Date(message.timestamp).getTime() > new Date(current.last.timestamp).getTime()) {
        current.last = message;
      }

      if (message.sender_id === tenantId && message.recipient_id === user.id && message.read === false) {
        current.unreadCount += 1;
      }

      grouped.set(tenantId, current);
    }

    const conversations: ConversationSummary[] = (profiles || []).map((profile: any) => {
      const unitInfo = tenantUnitMap.get(profile.id);
      const messageInfo = grouped.get(profile.id);
      const buildingId = unitInfo?.buildingId || '';

      return {
        tenantId: profile.id,
        name: profile.full_name || profile.email || 'Tenant',
        phone: profile.phone || '',
        unit: unitInfo?.unit || 'N/A',
        buildingId,
        building: buildingIdToName.get(buildingId) || 'Unknown Building',
        lastMessage: messageInfo?.last?.message,
        lastMessageTime: messageInfo?.last?.timestamp,
        unreadCount: messageInfo?.unreadCount || 0,
      };
    });

    conversations.sort((a, b) => {
      if (!a.lastMessageTime && !b.lastMessageTime) return 0;
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
    });

    return successResponse(conversations);
  } catch (error) {
    console.error('Get landlord conversations error:', error);
    return errorResponse('Failed', 'An error occurred while loading conversations', 500);
  }
}

export async function handleGetLandlordThread(request: Request, tenantId: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const userCanUseMessages = await hasRole(user.id, ['landlord', 'admin']);
    if (!userCanUseMessages) {
      return forbiddenResponse('Only landlords can access landlord messages');
    }

    const tenantScope = await ensureTenantInScope(user.id, tenantId);
    if (!tenantScope) {
      return forbiddenResponse('Tenant is not assigned to your buildings');
    }

    const supabase = createServiceClient();

    const { data: threadMessages, error: threadError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, message, read, timestamp')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${tenantId}),and(sender_id.eq.${tenantId},recipient_id.eq.${user.id})`)
      .order('timestamp', { ascending: true });

    if (threadError) {
      return errorResponse('Query Failed', threadError.message, 500);
    }

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', tenantId)
      .eq('recipient_id', user.id)
      .eq('read', false);

    const { data: tenantProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone')
      .eq('id', tenantId)
      .single();

    return successResponse({
      tenant: {
        id: tenantId,
        name: tenantProfile?.full_name || tenantProfile?.email || 'Tenant',
        phone: tenantProfile?.phone || '',
        unit: tenantScope.unit,
        building: tenantScope.buildingName,
        buildingId: tenantScope.buildingId,
      },
      messages: (threadMessages || []).map((message: any) => ({
        id: message.id,
        senderId: message.sender_id,
        recipientId: message.recipient_id,
        message: message.message,
        read: message.read,
        timestamp: message.timestamp,
        senderType: message.sender_id === user.id ? 'landlord' : 'tenant',
      })),
    });
  } catch (error) {
    console.error('Get landlord thread error:', error);
    return errorResponse('Failed', 'An error occurred while loading messages', 500);
  }
}

export async function handleSendLandlordMessage(request: Request, tenantId: string) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const userCanUseMessages = await hasRole(user.id, ['landlord', 'admin']);
    if (!userCanUseMessages) {
      return forbiddenResponse('Only landlords can send landlord messages');
    }

    const tenantScope = await ensureTenantInScope(user.id, tenantId);
    if (!tenantScope) {
      return forbiddenResponse('Tenant is not assigned to your buildings');
    }

    const body = await request.json().catch(() => ({}));
    const messageText = (body?.message || '').trim();

    if (!messageText) {
      return badRequestResponse('Message is required');
    }

    const supabase = createServiceClient();

    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: tenantId,
        message: messageText,
        read: false,
      })
      .select('id, sender_id, recipient_id, message, read, timestamp')
      .single();

    if (insertError) {
      return errorResponse('Creation Failed', insertError.message, 500);
    }

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'SEND_MESSAGE_LANDLORD',
      entityType: 'message',
      entityId: insertedMessage.id,
      details: `Landlord sent message to tenant ${tenantId}`,
      status: 'success',
      metadata: {
        recipientId: tenantId,
        buildingId: tenantScope.buildingId,
      },
    });

    return successResponse({
      id: insertedMessage.id,
      senderId: insertedMessage.sender_id,
      recipientId: insertedMessage.recipient_id,
      message: insertedMessage.message,
      read: insertedMessage.read,
      timestamp: insertedMessage.timestamp,
      senderType: 'landlord',
      tenant: {
        id: tenantId,
        buildingId: tenantScope.buildingId,
        building: tenantScope.buildingName,
        unit: tenantScope.unit,
      },
    }, 'Message sent');
  } catch (error) {
    console.error('Send landlord message error:', error);
    return errorResponse('Failed', 'An error occurred while sending the message', 500);
  }
}

export async function handleGetTenantThread(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const userCanUseMessages = await hasRole(user.id, ['tenant']);
    if (!userCanUseMessages) {
      return forbiddenResponse('Only tenants can access tenant messages');
    }

    const scope = await getTenantScope(user.id);
    if (!scope) {
      return successResponse({ tenant: null, landlord: null, messages: [] });
    }

    const supabase = createServiceClient();
    const requestUrl = new URL(request.url);
    const shouldMarkRead = requestUrl.searchParams.get('markRead') === 'true';

    const { data: threadMessages, error: threadError } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, message, read, timestamp')
      .or(`and(sender_id.eq.${scope.tenant.id},recipient_id.eq.${scope.landlord.id}),and(sender_id.eq.${scope.landlord.id},recipient_id.eq.${scope.tenant.id})`)
      .order('timestamp', { ascending: true });

    if (threadError) {
      return errorResponse('Query Failed', threadError.message, 500);
    }

    if (shouldMarkRead) {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('sender_id', scope.landlord.id)
        .eq('recipient_id', scope.tenant.id)
        .eq('read', false);
    }

    return successResponse({
      tenant: scope.tenant,
      landlord: scope.landlord,
      messages: (threadMessages || []).map((message: any) => ({
        id: message.id,
        senderId: message.sender_id,
        recipientId: message.recipient_id,
        message: message.message,
        read: message.read,
        timestamp: message.timestamp,
        senderType: message.sender_id === scope.tenant.id ? 'tenant' : 'landlord',
      })),
    });
  } catch (error) {
    console.error('Get tenant thread error:', error);
    return errorResponse('Failed', 'An error occurred while loading tenant messages', 500);
  }
}

export async function handleSendTenantMessage(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const userCanUseMessages = await hasRole(user.id, ['tenant']);
    if (!userCanUseMessages) {
      return forbiddenResponse('Only tenants can send tenant messages');
    }

    const scope = await getTenantScope(user.id);
    if (!scope) {
      return errorResponse('Not Assigned', 'Your unit has not been assigned yet', 400);
    }

    const body = await request.json().catch(() => ({}));
    const messageText = (body?.message || '').trim();

    if (!messageText) {
      return badRequestResponse('Message is required');
    }

    const supabase = createServiceClient();

    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        sender_id: scope.tenant.id,
        recipient_id: scope.landlord.id,
        message: messageText,
        read: false,
      })
      .select('id, sender_id, recipient_id, message, read, timestamp')
      .single();

    if (insertError) {
      return errorResponse('Creation Failed', insertError.message, 500);
    }

    await logAuditEvent({
      request,
      actorUserId: scope.tenant.id,
      actorEmail: user.email,
      action: 'SEND_MESSAGE_TENANT',
      entityType: 'message',
      entityId: insertedMessage.id,
      details: `Tenant sent message to landlord ${scope.landlord.id}`,
      status: 'success',
      metadata: {
        recipientId: scope.landlord.id,
        buildingId: scope.tenant.buildingId,
      },
    });

    return successResponse({
      id: insertedMessage.id,
      senderId: insertedMessage.sender_id,
      recipientId: insertedMessage.recipient_id,
      message: insertedMessage.message,
      read: insertedMessage.read,
      timestamp: insertedMessage.timestamp,
      senderType: 'tenant',
      landlord: scope.landlord,
      tenant: scope.tenant,
    }, 'Message sent');
  } catch (error) {
    console.error('Send tenant message error:', error);
    return errorResponse('Failed', 'An error occurred while sending the message', 500);
  }
}
