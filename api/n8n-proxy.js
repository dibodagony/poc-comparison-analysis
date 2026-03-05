// ============================================================
// Vercel Edge Function — n8n Proxy
// ============================================================
// Routes all /n8n/* requests to https://n8n.justt.ai,
// injects X-N8N-API-KEY from the server-side env var (N8N_API_KEY),
// and adds permissive CORS headers so the browser never sees a CORS error.
//
// vercel.json rewrites:  /n8n/:path* → /api/n8n-proxy
// ============================================================

export const config = { runtime: 'edge' };

const N8N_ORIGIN = 'https://n8n.justt.ai';

export default async function handler(request) {
  const url = new URL(request.url);

  // Strip the leading /n8n prefix to get the real n8n path
  const targetPath = url.pathname.replace(/^\/n8n/, '') || '/';
  const targetUrl  = `${N8N_ORIGIN}${targetPath}${url.search}`;

  // Handle preflight (OPTIONS) quickly
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // Forward the request to n8n
  const forwardHeaders = new Headers();
  forwardHeaders.set('Content-Type', request.headers.get('Content-Type') || 'application/json');
  forwardHeaders.set('host', 'n8n.justt.ai');

  // Inject the API key (server-side — never exposed to the browser)
  const apiKey = process.env.N8N_API_KEY;
  if (apiKey) forwardHeaders.set('X-N8N-API-KEY', apiKey);

  const res = await fetch(targetUrl, {
    method:  request.method,
    headers: forwardHeaders,
    body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  });

  // Rebuild response with CORS headers added
  const resHeaders = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders())) {
    resHeaders.set(k, v);
  }

  return new Response(res.body, {
    status:  res.status,
    headers: resHeaders,
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-N8N-API-KEY',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}
