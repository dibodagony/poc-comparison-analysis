// ============================================================
// Vercel Serverless Function (Node.js) — n8n Proxy
// ============================================================
// Routes all /n8n/* requests to https://n8n.justt.ai,
// injects X-N8N-API-KEY from the server-side env var (N8N_API_KEY),
// and adds permissive CORS headers so the browser never sees a CORS error.
//
// vercel.json rewrites:
//   /n8n/:path* → /api/n8n-proxy?proxyPath=:path*
//
// WHY the query-param approach:
//   When Vercel rewrites a request, the serverless function receives req.url
//   as the DESTINATION path (/api/n8n-proxy), NOT the original source path
//   (/n8n/webhook/poc-comparison).  Passing the matched segment as a query
//   param is the reliable way to recover the original path inside the function.
// ============================================================

export const maxDuration = 60; // seconds (max for Vercel hobby plan)

const N8N_ORIGIN = 'https://n8n.justt.ai';

export default async function handler(req, res) {
  // ── CORS headers on every response ──────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-N8N-API-KEY');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  // Handle preflight quickly
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    // ── Reconstruct target URL ───────────────────────────────────────────
    // proxyPath  = the :path* wildcard captured by vercel.json, e.g.:
    //   "webhook/poc-comparison"
    //   "api/v1/executions/123"
    //
    // Any other query params (e.g. ?includeData=true) come from the
    // original request and are forwarded as-is.
    const { proxyPath, ...passthroughQuery } = req.query || {};

    const pathSegment = Array.isArray(proxyPath)
      ? proxyPath.join('/')
      : (proxyPath || '');

    const search = new URLSearchParams(passthroughQuery).toString();
    const targetUrl = `${N8N_ORIGIN}/${pathSegment}${search ? '?' + search : ''}`;

    // ── Read request body ────────────────────────────────────────────────
    let body = undefined;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      if (chunks.length) body = Buffer.concat(chunks);
    }

    // ── Build forwarding headers ─────────────────────────────────────────
    const forwardHeaders = {
      'host':         'n8n.justt.ai',
      'content-type': req.headers['content-type'] || 'application/json',
    };

    // Inject API key server-side — never exposed to the browser bundle
    const apiKey = process.env.N8N_API_KEY;
    if (apiKey) forwardHeaders['X-N8N-API-KEY'] = apiKey;

    // ── Forward to n8n ───────────────────────────────────────────────────
    const upstream = await fetch(targetUrl, {
      method:  req.method,
      headers: forwardHeaders,
      body,
    });

    // Forward response status + content-type
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);

    // Stream response body back to browser
    const responseBody = await upstream.arrayBuffer();
    res.end(Buffer.from(responseBody));

  } catch (err) {
    console.error('[n8n-proxy] error:', err);
    res.status(502).json({
      error:  'Proxy error',
      detail: err.message,
      cause:  err.cause?.message || err.cause?.code || String(err.cause ?? ''),
    });
  }
}
