// Supabase client utilities for backend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Create Supabase client with service role key (full access)
 * Use this for admin operations that bypass RLS
 */
export function createServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Create Supabase client with anon key (RLS enforced)
 * Use this for operations that should respect row-level security
 */
export function createAnonClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = createAnonClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Get user profile with role
 */
export async function getUserProfile(userId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Check if user has required role
 */
export async function hasRole(userId: string, allowedRoles: string[]) {
  try {
    const profile = await getUserProfile(userId);
    return allowedRoles.includes(profile.role);
  } catch {
    return false;
  }
}

/**
 * Require authentication middleware
 */
export async function requireAuth(request: Request) {
  const user = await getAuthUser(request);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}

/**
 * Require specific role
 */
export async function requireRole(request: Request, allowedRoles: string[]) {
  const user = await getAuthUser(request);

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const hasRequiredRole = await hasRole(user.id, allowedRoles);

  if (!hasRequiredRole) {
    return new Response(
      JSON.stringify({ error: 'Forbidden', message: 'Insufficient permissions' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return user;
}
