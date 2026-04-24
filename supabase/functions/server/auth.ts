// Authentication API handlers

import { createServiceClient, createAnonClient } from './supabase_utils.ts';
import { successResponse, errorResponse, badRequestResponse } from './responses.ts';
import * as kv from './kv_store.tsx';
import { logAuditEvent } from './audit.ts';

/**
 * Generate random temporary password
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function getEffectiveRole(email?: string | null, metadataRole?: string | null, kvRole?: string | null): string {
  const normalizedEmail = (email || '').toLowerCase();

  if (normalizedEmail === 'admin@rentify.com') {
    return 'admin';
  }

  if (kvRole) {
    return kvRole;
  }

  if (metadataRole) {
    return metadataRole;
  }

  return 'tenant';
}

/**
 * Initialize the system with default admin account
 * This should only be called once when the system starts
 */
export async function initializeAdminAccount() {
  try {
    const supabase = createServiceClient();
    
    // Check if admin already exists in KV
    const allUsers = await kv.getByPrefix('user:');
    const existingAdmin = allUsers.find(user => user.email === 'admin@rentify.com');
    
    if (existingAdmin) {
      const adminData = {
        ...existingAdmin,
        role: 'admin',
        status: 'active',
        full_name: existingAdmin.full_name || 'System Admin',
        name: existingAdmin.name || 'System Admin',
      };

      await kv.set(`user:${existingAdmin.id}`, adminData);
      console.log('Admin KV record normalized');

      try {
        await supabase.auth.admin.updateUserById(existingAdmin.id, {
          user_metadata: {
            full_name: 'System Admin',
            phone: '+256 774134515',
            role: 'admin',
          },
        });
        console.log('Admin auth metadata normalized');
      } catch (updateError) {
        console.error('Failed to normalize admin auth metadata:', updateError);
      }

      return;
    }

    // Create admin auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@rentify.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'System Admin',
        phone: '+256 774134515',
        role: 'admin',
      },
    });

    if (authError) {
      console.error('Failed to create admin auth user:', authError);
      return;
    }

    // Store admin data in KV
    const adminData = {
      id: authData.user.id,
      name: 'System Admin',
      full_name: 'System Admin',
      email: 'admin@rentify.com',
      phone: '+256 774134515',
      role: 'admin',
      status: 'active',
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await kv.set(`user:${authData.user.id}`, adminData);
    console.log('Admin account initialized successfully');
  } catch (error) {
    console.error('Error initializing admin account:', error);
  }
}

/**
 * Handle user login
 */
export async function handleLogin(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequestResponse('Email and password are required');
    }

    const supabase = createServiceClient();

    // Sign in user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      await logAuditEvent({
        request,
        actorEmail: email,
        action: 'AUTH_LOGIN',
        entityType: 'auth',
        details: `Login failed for ${email}`,
        status: 'failed',
      });
      return errorResponse('Authentication Failed', authError.message, 401);
    }

    const userProfile = await kv.get(`user:${authData.user.id}`);
    const role = getEffectiveRole(
      authData.user.email,
      authData.user.user_metadata?.role,
      userProfile?.role
    );
    const requiresPasswordChange =
      Boolean(authData.user.user_metadata?.requiresPasswordChange) ||
      Boolean(userProfile?.requiresPasswordChange);

    await logAuditEvent({
      request,
      actorUserId: authData.user.id,
      actorEmail: authData.user.email,
      action: 'AUTH_LOGIN',
      entityType: 'auth',
      details: `User logged in as ${role}`,
      status: 'success',
      metadata: { role, requiresPasswordChange },
    });

    // Return user profile from auth metadata
    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
        phone: authData.user.user_metadata?.phone || null,
        role,
        requiresPasswordChange,
        status: 'active',
      },
      session: authData.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Login Failed', 'An error occurred during login', 500);
  }
}

/**
 * Handle user signup
 */
export async function handleSignup(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      full_name,
      phone,
      role = 'tenant',
      occupation,
      workplace,
      occupants,
      nextOfKin,
      nextOfKinContact,
    } = body;

    if (!email || !password) {
      return badRequestResponse('Email and password are required');
    }

    if (!['admin', 'landlord', 'tenant'].includes(role)) {
      return badRequestResponse('Invalid role');
    }

    const supabase = createServiceClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role,
      },
    });

    if (authError) {
      return errorResponse('Signup Failed', authError.message, 400);
    }

    if (role === 'tenant') {
      const { error: tenantDetailsError } = await supabase
        .from('tenant_details')
        .upsert(
          {
            tenant_id: authData.user.id,
            occupation: occupation || workplace || null,
            next_of_kin: nextOfKin || null,
            next_of_kin_contact: nextOfKinContact || null,
          },
          { onConflict: 'tenant_id' }
        );

      if (tenantDetailsError) {
        return errorResponse('Signup Failed', tenantDetailsError.message, 500);
      }
    }

    // Prepare response user data
    const userData = {
      id: authData.user.id,
      email,
      full_name,
      phone,
      role,
      status: 'active',
    };

    // Auth trigger will auto-create profile in profiles table
    // No need to manually insert here - let the DB trigger handle it
    // KV store operations skipped for performance (can be added later if needed)

    return successResponse(
      {
        user: userData,
      },
      'Account created successfully'
    );
  } catch (error) {
    console.error('Signup error:', error);
    return errorResponse('Signup Failed', 'An error occurred during signup', 500);
  }
}

/**
 * Handle user logout
 */
export async function handleLogout(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return badRequestResponse('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createServiceClient();

    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      console.error('Logout error:', error);
    }

    return successResponse(null, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse('Logout Failed', 'An error occurred during logout', 500);
  }
}

/**
 * Get current user info
 */
export async function handleGetCurrentUser(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const userTokenHeader = request.headers.get('x-user-token');
    const token = userTokenHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return errorResponse('Unauthorized', 'Invalid authorization header', 401);
    }
    const supabase = createAnonClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('Unauthorized', 'Invalid or expired token', 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const role = getEffectiveRole(
      user.email,
      user.user_metadata?.role,
      userProfile?.role
    );
    const requiresPasswordChange =
      Boolean(user.user_metadata?.requiresPasswordChange) ||
      Boolean(userProfile?.requiresPasswordChange);

    // Return user profile from auth metadata (profiles table can be queried later if needed)
    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        phone: user.user_metadata?.phone || null,
        role,
        requiresPasswordChange,
        status: 'active',
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}

/**
 * Change password after first login
 */
export async function handleChangePassword(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const userTokenHeader = request.headers.get('x-user-token');
    const token = userTokenHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return errorResponse('Unauthorized', 'Authentication required', 401);
    }

    const authClient = createAnonClient();
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('Unauthorized', 'Invalid or expired token', 401);
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return badRequestResponse('Password must be at least 8 characters long');
    }

    const serviceSupabase = createServiceClient();

    const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      user_metadata: {
        ...user.user_metadata,
        requiresPasswordChange: false,
      },
    });

    if (updateError) {
      await logAuditEvent({
        request,
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'AUTH_CHANGE_PASSWORD',
        entityType: 'user',
        entityId: user.id,
        details: 'Password change failed',
        status: 'failed',
      });
      return errorResponse('Password Update Failed', updateError.message, 400);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    if (userProfile) {
      await kv.set(`user:${user.id}`, {
        ...userProfile,
        requiresPasswordChange: false,
      });
    }

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'AUTH_CHANGE_PASSWORD',
      entityType: 'user',
      entityId: user.id,
      details: 'Password changed successfully',
      status: 'success',
    });

    return successResponse({ requiresPasswordChange: false }, 'Password changed successfully');
  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse('Password Update Failed', 'An error occurred while changing password', 500);
  }
}

/**
 * Check if email or phone already exists
 */
export async function handleCheckDuplicate(request: Request) {
  try {
    const body = await request.json();
    const { email, phone } = body;

    if (!email && !phone) {
      return badRequestResponse('Email or phone is required');
    }

    const supabase = createServiceClient();

    let emailExists = false;
    let phoneExists = false;

    if (email) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .ilike('email', email);
      emailExists = (count || 0) > 0;
    }

    if (phone) {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('phone', phone);
      phoneExists = (count || 0) > 0;
    }

    return successResponse({
      emailExists,
      phoneExists,
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    return errorResponse('Failed', 'An error occurred while checking duplicates', 500);
  }
}

/**
 * Create landlord account (Admin only)
 */
export async function handleCreateLandlord(request: Request) {
  try {
    // Verify admin authorization
    const userTokenHeader = request.headers.get('x-user-token');
    const authHeader = request.headers.get('Authorization');

    let token: string | null = null;
    if (userTokenHeader) {
      token = userTokenHeader;
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return errorResponse('Unauthorized', 'Invalid authorization header', 401);
    }

    const supabase = createAnonClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return errorResponse('Unauthorized', 'Invalid or expired token', 401);
    }

    const adminSupabase = createServiceClient();

    // Check if user is admin
    const userProfile = await kv.get(`user:${user.id}`);
    const role = getEffectiveRole(user.email, user.user_metadata?.role, userProfile?.role);
    if (role !== 'admin') {
      return errorResponse('Forbidden', 'Only admins can create landlord accounts', 403);
    }

    const body = await request.json();
    const { name, email, phone, numberOfBuildings, buildings } = body;

    if (!name || !email || !phone) {
      return badRequestResponse('Name, email, and phone are required');
    }

    // Check for duplicates in real DB
    const { count: duplicateEmailCount } = await adminSupabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('email', email);

    if ((duplicateEmailCount || 0) > 0) {
      return errorResponse('Duplicate Email', 'This email address is already registered!', 400);
    }

    const { count: duplicatePhoneCount } = await adminSupabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone);

    if ((duplicatePhoneCount || 0) > 0) {
      return errorResponse('Duplicate Phone', 'This phone number is already registered!', 400);
    }

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();

    // Create auth user with Supabase
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        phone,
        role: 'landlord',
        requiresPasswordChange: true,
      },
    });

    if (authError) {
      return errorResponse('Account Creation Failed', authError.message, 400);
    }

    // Ensure profile is persisted as landlord in database
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name: name,
          phone,
          role: 'landlord',
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      return errorResponse('Profile Creation Failed', profileError.message, 500);
    }

    const buildingNames: string[] = Array.isArray(buildings)
      ? buildings.filter((value: unknown) => typeof value === 'string' && value.trim().length > 0)
      : [];

    if (buildingNames.length > 0) {
      const buildingRows = buildingNames.map((buildingName) => ({
        name: buildingName.trim(),
        location: 'Not set',
        total_units: 0,
        occupied_units: 0,
        landlord_id: authData.user.id,
      }));

      const { error: buildingsError } = await adminSupabase
        .from('buildings')
        .insert(buildingRows);

      if (buildingsError) {
        return errorResponse('Building Registration Failed', buildingsError.message, 500);
      }
    }

    // Store user data in KV store
    const landlordData = {
      id: authData.user.id,
      name,
      email,
      phone,
      role: 'landlord',
      status: 'active',
      joinDate: new Date().toISOString(),
      lastActive: 'Never',
      properties: numberOfBuildings || buildingNames.length || 0,
      buildings: buildingNames,
      requiresPasswordChange: true,
      createdAt: new Date().toISOString(),
      createdBy: user.id,
    };

    await kv.set(`user:${authData.user.id}`, landlordData);

    await logAuditEvent({
      request,
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'CREATE_LANDLORD',
      entityType: 'user',
      entityId: authData.user.id,
      details: `Created landlord ${name} (${email}) with ${buildingNames.length} initial building(s)`,
      status: 'success',
      metadata: { role: 'landlord', buildings: buildingNames },
    });

    return successResponse(
      {
        user: landlordData,
        temporaryPassword,
      },
      'Landlord account created successfully'
    );
  } catch (error) {
    console.error('Create landlord error:', error);
    return errorResponse('Failed', 'An error occurred while creating landlord account', 500);
  }
}

/**
 * Get all users (Admin only)
 */
export async function handleGetAllUsers(request: Request) {
  try {
    // Verify admin authorization
    const userTokenHeader = request.headers.get('x-user-token');
    const authHeader = request.headers.get('Authorization');
    const token = userTokenHeader || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (!token) {
      return errorResponse('Unauthorized', 'Invalid authorization header', 401);
    }

    const supabase = createAnonClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return errorResponse('Unauthorized', 'Invalid or expired token', 401);
    }

    // Check if user is admin
    const userProfile = await kv.get(`user:${user.id}`);
    const role = getEffectiveRole(user.email, user.user_metadata?.role, userProfile?.role);
    if (role !== 'admin') {
      return errorResponse('Forbidden', 'Only admins can view all users', 403);
    }

    const adminSupabase = createServiceClient();

    const { data: profiles, error: profilesError } = await adminSupabase
      .from('profiles')
      .select('id, email, full_name, phone, role, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      return errorResponse('Failed', profilesError.message, 500);
    }

    const { data: buildings, error: buildingsError } = await adminSupabase
      .from('buildings')
      .select('id, landlord_id, name');

    if (buildingsError) {
      return errorResponse('Failed', buildingsError.message, 500);
    }

    const propertyCountByLandlord = new Map<string, number>();
    for (const building of buildings || []) {
      const landlordId = building.landlord_id as string | null;
      if (!landlordId) continue;
      propertyCountByLandlord.set(landlordId, (propertyCountByLandlord.get(landlordId) || 0) + 1);
    }

    const allUsers = (profiles || []).map((profile: any) => ({
      id: profile.id,
      name: profile.full_name || (profile.email || 'User').split('@')[0],
      email: profile.email,
      phone: profile.phone || '',
      role: profile.role,
      status: 'active',
      joinDate: profile.created_at,
      lastActive: profile.created_at,
      properties: profile.role === 'landlord' ? (propertyCountByLandlord.get(profile.id) || 0) : undefined,
    }));

    return successResponse({
      users: allUsers,
      total: allUsers.length,
    });
  } catch (error) {
    console.error('Get all users error:', error);
    return errorResponse('Failed', 'An error occurred while fetching users', 500);
  }
}