/**
 * Netlify Edge Function — n8n proxy
 *
 * Mirrors the Vite dev-server proxy so that production builds on Netlify
 * work identically to local dev:
 *
 *   Browser → GET/POST /n8n/<path>
 *   Edge function → GET/POST https://n8n.justt.ai/<path>
 *                   (with X-N8N-API-KEY injected from Netlify env)
 *
 * Required Netlify env variable (set in Site → Environment variables):
 *   N8N_API_KEY = <your n8n API key>
 *
 * Handles both:
 *   - POST /n8n/webhook/poc-comparison   (initial trigger)
 *   - GET  /n8n/api/v1/executions/{id}   (polling)
 */

export default async function handler(request, context) {
  const url = new URL(request.url);

  // Strip the /n8n prefix; forward the rest to the real n8n host
  const targetPath = url.pathname.replace(/^\/n8n/, '') || '/';
  const targetUrl  = `https://n8n.justt.ai${targetPath}${url.search}`;

  // Forward the original request headers, inject the API key
  const headers = new Headers(request.headers);
  headers.set('X-N8N-API-KEY', Netlify.env.get('N8N_API_KEY') || '');
  headers.set('host', 'n8n.justt.ai');

  const proxyRes = await fetch(targetUrl, {
    method:  request.method,
    headers,
    body:    ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    // Required so the request body stream is forwarded correctly
    duplex:  'half',
  });

  // Return the upstream response as-is, but add CORS headers so the
  // browser doesn't block the response when called from the Netlify domain.
  const resHeaders = new Headers(proxyRes.headers);
  resHeaders.set('Access-Control-Allow-Origin',  '*');
  resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  return new Response(proxyRes.body, {
    status:  proxyRes.status,
    headers: resHeaders,
  });
}

export const config = { path: '/n8n/*' };
