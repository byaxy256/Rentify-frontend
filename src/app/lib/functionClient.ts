import { projectId, publicAnonKey } from '../../utils/supabase/info';

function normalizePath(path: string): string {
  if (!path.startsWith('/')) {
    return `/${path}`;
  }
  return path;
}

export async function requestFunction(path: string, options: RequestInit = {}): Promise<Response> {
  const userToken = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
    ...(userToken ? { 'x-user-token': userToken } : {}),
    ...(options.headers || {}),
  };

  const requestOptions: RequestInit = {
    ...options,
    headers,
  };

  const normalized = normalizePath(path);
  const url = `https://${projectId}.supabase.co/functions/v1/server${normalized}`;
  return fetch(url, requestOptions);
}
