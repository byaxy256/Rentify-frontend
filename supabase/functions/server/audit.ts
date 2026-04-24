import { createServiceClient, getAuthUser, hasRole } from './supabase_utils.ts';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from './responses.ts';

type AuditStatus = 'success' | 'failed';

type LogAuditParams = {
  request?: Request;
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details: string;
  status?: AuditStatus;
  metadata?: Record<string, unknown>;
};

function extractIpAddress(request?: Request): string | null {
  if (!request) return null;

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.headers.get('cf-connecting-ip') || null;
}

export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  try {
    const supabase = createServiceClient();

    await supabase.from('audit_logs').insert({
      actor_user_id: params.actorUserId || null,
      actor_email: params.actorEmail || null,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId || null,
      details: params.details,
      ip_address: extractIpAddress(params.request),
      status: params.status || 'success',
      metadata: params.metadata || {},
    });
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
}

export async function handleGetAuditLogs(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    const isAdmin = await hasRole(user.id, ['admin']);
    if (!isAdmin) {
      return forbiddenResponse('Only admins can view audit logs');
    }

    const supabase = createServiceClient();

    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('id, created_at, actor_user_id, actor_email, action, entity_type, entity_id, details, ip_address, status, metadata')
      .order('created_at', { ascending: false })
      .limit(500);

    if (logsError) {
      return errorResponse('Query Failed', logsError.message, 500);
    }

    const actorIds = Array.from(new Set((logs || [])
      .map((log: any) => log.actor_user_id)
      .filter((value: string | null) => Boolean(value)))) as string[];

    const actorMap = new Map<string, { full_name?: string; email?: string }>();
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', actorIds);

      for (const profile of profiles || []) {
        actorMap.set(profile.id, {
          full_name: profile.full_name,
          email: profile.email,
        });
      }
    }

    const normalizedLogs = (logs || []).map((log: any) => {
      const actorProfile = log.actor_user_id ? actorMap.get(log.actor_user_id) : null;
      const actorName = actorProfile?.full_name || log.actor_email || actorProfile?.email || 'System';

      return {
        id: log.id,
        timestamp: log.created_at,
        user: actorName,
        action: log.action,
        details: log.details,
        entityType: log.entity_type,
        entityId: log.entity_id,
        ipAddress: log.ip_address || 'N/A',
        status: log.status,
        metadata: log.metadata || {},
      };
    });

    return successResponse({ logs: normalizedLogs, total: normalizedLogs.length });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return errorResponse('Failed', 'An error occurred while loading audit logs', 500);
  }
}
