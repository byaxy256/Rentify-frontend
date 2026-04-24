// Buildings API handlers

import { createServiceClient } from '../utils/supabase.ts';
import { getAuthUser, hasRole } from '../utils/supabase.ts';
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
} from '../utils/responses.ts';

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

    let query = supabase.from('buildings').select('*');

    // If not admin, only show user's buildings
    if (profile?.role !== 'admin') {
      query = query.eq('landlord_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse('Query Failed', error.message, 500);
    }

    return successResponse(data);
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

    return successResponse(data);
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

      await supabase.from('units').insert(units);
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
    const { name, location } = body;

    const { data, error } = await supabase
      .from('buildings')
      .update({ name, location })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return errorResponse('Update Failed', error.message, 500);
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

    return successResponse(null, 'Building deleted successfully');
  } catch (error) {
    console.error('Delete building error:', error);
    return errorResponse('Failed', 'An error occurred', 500);
  }
}
