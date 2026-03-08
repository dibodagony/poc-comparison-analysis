// ============================================================
// useAnalysis — Webhook call + state machine
// ============================================================
// States:  idle → loading → success | error
// Usage:   const { state, data, error, message, runAnalysis, reset } = useAnalysis();
// ============================================================
// Configuration lives in .env.local (copy from .env.example):
//   VITE_WEBHOOK_URL=https://n8n.justt.ai/webhook/poc-comparison
//   VITE_USE_MOCK=true    ← set to "false" to hit real n8n
//   N8N_API_KEY=xxx       ← n8n REST API key (no VITE_ prefix — server-side only)
// ============================================================
//
// Two execution modes:
//
//  Mode A — "Respond Immediately" (for flows > 60 s):
//    Webhook returns { executionId } at once; the flow continues in
//    the background.  We poll GET /api/v1/executions/{id} every 5 s
//    until status === "success", then extract the response_payload.
//    X-N8N-API-KEY is injected server-side by the Vite proxy.
//    → Immune to nginx 60 s proxy timeout.
//
//  Mode B — "Last Node" / webhook-test:
//    Webhook holds the connection open and returns the full payload
//    when the last node finishes.
//    → Breaks if the flow takes > 60 s (nginx timeout).
//
// Proxy setup (vite.config.js — mirrors n8n_v5/dashboard):
//   '/n8n' → 'https://n8n.justt.ai'
//   All /n8n/* calls (webhook + API) go through one proxy entry.
//   The X-N8N-API-KEY header is injected for every proxied request.
// ============================================================

import { useState } from 'react';
import { MOCK_RESPONSE } from '../mocks/mockResponse.js';

// ─── URL helpers ─────────────────────────────────────────────────────────────
// Dev:  route through Vite's /n8n proxy (injects API key server-side, no CORS)
// Prod: route through /n8n which is handled by:
//       - Vercel edge function (api/n8n-proxy.js) → injects N8N_API_KEY server-side
//       - netlify.toml redirect → (legacy, no longer used)
//
// In both environments all calls use the same /n8n/... relative path —
// no API key is ever exposed to the browser bundle.
function resolveViaProxy(raw) {
  if (!raw || !raw.startsWith('http')) return raw || '';
  try {
    const { pathname, search } = new URL(raw);
    return '/n8n' + pathname + search;    // → /n8n/webhook/poc-comparison
  } catch (_) {
    return raw;
  }
}

const RAW_WEBHOOK_URL    = import.meta.env.VITE_WEBHOOK_URL || 'https://n8n.justt.ai/webhook/poc-comparison';
export const WEBHOOK_URL = resolveViaProxy(RAW_WEBHOOK_URL);
export const USE_MOCK    = import.meta.env.VITE_USE_MOCK !== 'false';  // default true

// n8n REST API base — always via /n8n proxy (Vite in dev, Vercel function in prod)
const API_BASE = '/n8n/api/v1';

function buildHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  return headers;
}

const MOCK_DELAY_MS = 1500;

// ─── Execution-API polling (same approach as n8n_v5) ────────────────────────

async function fetchExecution(executionId) {
  // API key is injected server-side by the proxy (Vite in dev, Vercel edge fn in prod).
  // No client-side key needed.
  const res = await fetch(`${API_BASE}/executions/${executionId}?includeData=true`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch execution ${executionId} (${res.status}): ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * Walk the execution's runData and return the first node output that
 * contains a response_payload with the expected shape (months + views).
 */
function extractResponsePayload(execution) {
  const runData = execution.data?.resultData?.runData || {};

  for (const [, outputs] of Object.entries(runData)) {
    const json = outputs?.[0]?.data?.main?.[0]?.[0]?.json;
    if (json?.response_payload?.months && json?.response_payload?.views) {
      return json.response_payload;
    }
    // payload assembled directly at the top level of a node's output
    if (json?.months && json?.views) {
      return json;
    }
  }

  throw new Error(
    'Payload not found in execution output. ' +
    'Make sure the "04 Assemble Response" node ran successfully. ' +
    `Nodes executed: ${Object.keys(runData).join(', ') || 'none'}`
  );
}

/**
 * Poll GET /api/v1/executions/{id} every intervalMs until the execution
 * finishes, fails, or times out.  Mirrors n8n_v5's pollUntilComplete.
 */
async function pollUntilComplete(executionId, { intervalMs = 5000, timeoutMs = 600000, onTick } = {}) {
  const start = Date.now();

  while (true) {
    const execution = await fetchExecution(executionId);
    const elapsed   = Date.now() - start;

    if (onTick) onTick(elapsed);

    if (execution.status === 'success') {
      return extractResponsePayload(execution);
    }

    if (['error', 'crashed', 'canceled'].includes(execution.status)) {
      const msg = execution.data?.resultData?.error?.message || execution.status;
      throw new Error(`n8n flow failed: ${msg}`);
    }

    if (elapsed >= timeoutMs) {
      throw new Error(
        'Analysis timed out after 10 minutes. ' +
        'The flow may still be running — check the n8n executions panel.'
      );
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useAnalysis() {
  const [state,   setState]   = useState('idle');
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState(null);
  const [message, setMessage] = useState('');

  async function runAnalysis({ mode = 'query', merchant_id, start_date, end_date, aggregated, scope }) {
    setState('loading');
    setData(null);
    setError(null);
    setMessage('Running analysis…');

    try {
      // ── Mock mode ──────────────────────────────────────────────────────────
      if (USE_MOCK) {
        await new Promise(resolve => setTimeout(resolve, MOCK_DELAY_MS));
        setData(MOCK_RESPONSE);
        setState('success');
        return;
      }

      // ── Build request body ─────────────────────────────────────────────────
      // scope is forwarded in both modes so n8n can apply the same filters
      // on the Snowflake path (query mode) or have it available for reference.
      const body = mode === 'csv'
        ? { mode: 'csv',   merchant_id, start_date, end_date, aggregated, scope }
        : { mode: 'query', merchant_id, start_date, end_date,             scope };

      // ── POST to webhook ────────────────────────────────────────────────────
      let res;
      try {
        res = await fetch(WEBHOOK_URL, {
          method:  'POST',
          headers: buildHeaders(),
          body:    JSON.stringify(body),
        });
      } catch (networkErr) {
        const isTestUrl = WEBHOOK_URL.includes('/webhook-test/');
        const hint = isTestUrl
          ? 'The webhook URL is a test URL (/webhook-test/). Make sure n8n is open and listening.'
          : `Could not reach n8n at: ${WEBHOOK_URL}. Check the instance is running and the URL is correct.`;
        throw new Error(`Network error — ${hint}`);
      }

      if (!res.ok) {
        let detail = '';
        try { detail = await res.text(); } catch (_) { /* ignore */ }
        throw new Error(`n8n returned HTTP ${res.status} ${res.statusText}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
      }

      const json = await res.json();

      // ── Mode A: webhook returned { executionId } immediately ──────────────
      if (json?.executionId) {
        console.log('[useAnalysis] polling executionId:', json.executionId, '— via', API_BASE);
        const payload = await pollUntilComplete(json.executionId, {
          intervalMs: 5000,
          timeoutMs:  600000,
          onTick: (elapsedMs) => {
            const s = Math.floor(elapsedMs / 1000);
            const m = Math.floor(s / 60);
            const label = m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
            setMessage(`Running analysis… (${label})`);
          },
        });
        setData(payload);
        setState('success');
        return;
      }

      // ── Mode B: full payload returned directly (Last Node / webhook-test) ──
      if (!json.months || !json.views) {
        throw new Error('Invalid response from n8n — missing required fields (months, views).');
      }

      setData(json);
      setState('success');

    } catch (err) {
      console.error('[useAnalysis] runAnalysis error:', err);
      setError(err.message || 'An unknown error occurred.');
      setState('error');
    }
  }

  function reset() {
    setState('idle');
    setData(null);
    setError(null);
    setMessage('');
  }

  return { state, data, error, message, runAnalysis, reset };
}
