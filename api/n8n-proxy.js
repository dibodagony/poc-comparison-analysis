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
  // Handle preflight quickly
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const url = new URL(request.url);

    // Strip /n8n prefix → real n8n path
    const targetPath = url.pathname.replace(/^\/n8n/, '') || '/';
    const targetUrl  = `${N8N_ORIGIN}${targetPath}${url.search}`;

    // Read body up-front — edge runtime can't stream request.body to fetch
    let body = undefined;
    if (!['GET', 'HEAD'].includes(request.method)) {
      body = await request.arrayBuffer();
    }

    // Build minimal forwarding headers
    const forwardHeaders = new Headers();
    const contentType = request.headers.get('Content-Type');
    if (contentType) forwardHeaders.set('Content-Type', contentType);
    forwardHeaders.set('host', 'n8n.justt.ai');

    // Inject API key server-side — never exposed to the browser
    const apiKey = process.env.N8N_API_KEY;
    if (apiKey) forwardHeaders.set('X-N8N-API-KEY', apiKey);

    const res = await fetch(targetUrl, {
      method:  request.method,
      headers: forwardHeaders,
      body,
    });

    // Read response body as buffer so we can safely add CORS headers
    const resBody = await res.arrayBuffer();

    const resHeaders = new Headers();
    const ct = res.headers.get('content-type');
    if (ct) resHeaders.set('content-type', ct);
    for (const [k, v] of Object.entries(corsHeaders())) {
      resHeaders.set(k, v);
    }

    return new Response(resBody, { status: res.status, headers: resHeaders });

  } catch (err) {
    console.error('[n8n-proxy] error:', err);
    return new Response(
      JSON.stringify({ error: 'Proxy error', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
    );
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-N8N-API-KEY',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}
