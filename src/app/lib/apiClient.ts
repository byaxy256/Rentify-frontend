// HTTP client for calling backend API

// Get Supabase project info
let projectId = '';
let publicAnonKey = '';

try {
  const info = await import('/utils/supabase/info.tsx');
  projectId = info.projectId;
  publicAnonKey = info.publicAnonKey;
} catch (e) {
  console.warn('Supabase not connected, using mock data');
}

const API_BASE_URL = projectId
  ? `https://${projectId}.supabase.co/functions/v1/make-server-28aab74c`
  : '';

const LEGACY_PREFIX = '/make-server-28aab74c';

function buildFallbackEndpoint(endpoint: string): string | null {
  if (endpoint.startsWith(`${LEGACY_PREFIX}/`)) {
    return endpoint.slice(LEGACY_PREFIX.length);
  }

  if (endpoint.startsWith('/')) {
    return `${LEGACY_PREFIX}${endpoint}`;
  }

  return `${LEGACY_PREFIX}/${endpoint}`;
}

async function parseErrorResponse(response: Response): Promise<{ error: string; message: string }> {
  return response.json().catch(() => ({
    error: 'Unknown Error',
    message: response.statusText,
  }));
}

/**
 * Make API request to backend
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Backend not configured. Please connect Supabase in Make settings.');
  }

  const userToken = localStorage.getItem('accessToken');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    ...options.headers,
  };

  if (userToken) {
    headers['x-user-token'] = userToken;
  }

  const fetchWithEndpoint = (targetEndpoint: string) => fetch(`${API_BASE_URL}${targetEndpoint}`, {
    ...options,
    headers,
  });

  let response = await fetchWithEndpoint(endpoint);

  if (response.status === 404) {
    const fallbackEndpoint = buildFallbackEndpoint(endpoint);
    if (fallbackEndpoint && fallbackEndpoint !== endpoint) {
      response = await fetchWithEndpoint(fallbackEndpoint);
    }
  }

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.message || error.error);
  }

  const data = await response.json();

  // Extract data from success response format
  if (data.success && data.data !== undefined) {
    return data.data;
  }

  return data;
}

/**
 * GET request
 */
export async function get<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Check if backend is configured
 */
export function isBackendConfigured(): boolean {
  return !!API_BASE_URL;
}
