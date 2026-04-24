// Standard response helpers

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

export function successResponse(data: any, message?: string) {
  return jsonResponse({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error: string, message: string, status = 400) {
  return jsonResponse(
    {
      success: false,
      error,
      message,
    },
    status
  );
}

export function notFoundResponse(resource: string) {
  return errorResponse('Not Found', `${resource} not found`, 404);
}

export function unauthorizedResponse(message = 'Authentication required') {
  return errorResponse('Unauthorized', message, 401);
}

export function forbiddenResponse(message = 'Insufficient permissions') {
  return errorResponse('Forbidden', message, 403);
}

export function badRequestResponse(message: string) {
  return errorResponse('Bad Request', message, 400);
}

export function serverErrorResponse(message = 'Internal server error') {
  return errorResponse('Internal Server Error', message, 500);
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

export function handleCors(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  return null;
}
