// Authentication API handlers

import { createServiceClient } from '../utils/supabase.ts';
import { successResponse, errorResponse, badRequestResponse } from '../utils/responses.ts';

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
      return errorResponse('Authentication Failed', authError.message, 401);
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    const fallbackProfile = {
      id: authData.user.id,
      email: authData.user.email,
      full_name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'User',
      phone: authData.user.user_metadata?.phone || null,
      role: authData.user.user_metadata?.role || 'tenant',
    };

    return successResponse({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        ...(profile || fallbackProfile),
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
    const { email, password, full_name, phone, role = 'tenant' } = body;

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
      email_confirm: true, // Auto-confirm since we don't have email server
      user_metadata: {
        full_name,
        phone,
        role,
      },
    });

    if (authError) {
      return errorResponse('Signup Failed', authError.message, 400);
    }

    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name,
        phone,
        role,
      })
      .select()
      .single();

    if (profileError) {
      console.warn('Profile table unavailable or insert failed; continuing with auth metadata fallback:', profileError.message);
    }

    const user = profile || {
      id: authData.user.id,
      email,
      full_name,
      phone,
      role,
    };

    return successResponse(
      {
        user: {
          id: authData.user.id,
          email,
          ...user,
        },
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
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized', 'Invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    const supabase = createServiceClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('Unauthorized', 'Invalid or expired token', 401);
    }

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const fallbackProfile = {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      phone: user.user_metadata?.phone || null,
      role: user.user_metadata?.role || 'tenant',
    };

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        ...(profile || fallbackProfile),
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}
