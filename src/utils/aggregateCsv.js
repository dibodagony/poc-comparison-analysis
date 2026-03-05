// ============================================================
// aggregateCsv.js — Client-side port of 02_poc_aggregate.js
// ============================================================
// Runs entirely in the browser on the parsed CSV rows.
// Produces the same `aggregated` JSON shape that 02_poc_aggregate.js
// returns, so the n8n AI-prompt node (03) can consume it unchanged.
// ============================================================

const HIGH_RISK_EKATA_THRESHOLD    = 400;
const HIGH_RISK_EMAILAGE_THRESHOLD = 490;
const CLOSED_MONTH_PCT_THRESHOLD   = 0.95; // months below this → rate metrics suppressed

// ── Column name → canonical name (mirrors 01_csv_prep.js COL_MAP) ──────────
const COL_MAP = {
  // Time
  posting_month:                'POSTING_MONTH',
  POSTING_MONTH:                'POSTING_MONTH',
  posting_month_trunc:          'POSTING_MONTH',
  POSTING_MONTH_TRUNC:          'POSTING_MONTH',

  // Segmentation
  source:                       'SOURCE',
  SOURCE:                       'SOURCE',
  external_ab_test:             'EXTERNAL_AB_TEST',
  EXTERNAL_AB_TEST:             'EXTERNAL_AB_TEST',

  // Classification
  reason_group:                 'REASON_GROUP',
  REASON_GROUP:                 'REASON_GROUP',

  // Dimensions
  psp:                          'PSP',
  PSP:                          'PSP',
  card_scheme:                  'CARD_SCHEME',
  CARD_SCHEME:                  'CARD_SCHEME',
  payment_method:               'PAYMENT_METHOD',
  PAYMENT_METHOD:               'PAYMENT_METHOD',

  // Performance flags
  handled:                      'HANDLED',
  HANDLED:                      'HANDLED',
  won:                          'WON',
  WON:                          'WON',
  not_pending:                  'NOT_PENDING',
  NOT_PENDING:                  'NOT_PENDING',

  // Amount fields
  amount_handled:               'AMOUNT_HANDLED',
  AMOUNT_HANDLED:               'AMOUNT_HANDLED',
  amount_won:                   'AMOUNT_WON',
  AMOUNT_WON:                   'AMOUNT_WON',
  amount_not_pending:           'AMOUNT_NOT_PENDING',
  AMOUNT_NOT_PENDING:           'AMOUNT_NOT_PENDING',

  // Enrichment scores
  emailage_score:               'EMAILAGE_SCORE',
  EMAILAGE_SCORE:               'EMAILAGE_SCORE',
  emailage_identity_risk_score: 'EMAILAGE_SCORE',
  EMAILAGE_IDENTITY_RISK_SCORE: 'EMAILAGE_SCORE',
  ekata_score:                  'EKATA_SCORE',
  EKATA_SCORE:                  'EKATA_SCORE',
  ekata_identity_risk_score:    'EKATA_SCORE',
  EKATA_IDENTITY_RISK_SCORE:    'EKATA_SCORE',

  // Merchant data
  merchant_data:                'MERCHANT_DATA_AVAILABLE',
  MERCHANT_DATA:                'MERCHANT_DATA_AVAILABLE',
  merchant_data_available:      'MERCHANT_DATA_AVAILABLE',
  MERCHANT_DATA_AVAILABLE:      'MERCHANT_DATA_AVAILABLE',

  // Enrichment ratio
  enrichment_ratio:             'ENRICHMENT_RATIO',
  ENRICHMENT_RATIO:             'ENRICHMENT_RATIO',

  // Data points coverage
  data_points_coverage:         'DATA_POINTS_COVERAGE',
  DATA_POINTS_COVERAGE:         'DATA_POINTS_COVERAGE',

  // Month closure completeness
  month_closed_pct:             'MONTH_CLOSED_PCT',
  MONTH_CLOSED_PCT:             'MONTH_CLOSED_PCT',
  closed_month_pct:             'MONTH_CLOSED_PCT',
  CLOSED_MONTH_PCT:             'MONTH_CLOSED_PCT',
};

const NUMERIC_FIELDS = [
  'HANDLED', 'WON', 'NOT_PENDING',
  'AMOUNT_HANDLED', 'AMOUNT_WON', 'AMOUNT_NOT_PENDING',
  'EMAILAGE_SCORE', 'EKATA_SCORE',
  'MERCHANT_DATA_AVAILABLE', 'ENRICHMENT_RATIO',
  'MONTH_CLOSED_PCT',
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function round2(val) {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Math.round(val * 100) / 100;
}

function safePct(numerator, denominator) {
  if (!denominator) return null;
  return round2((numerator / denominator) * 100);
}

function assignGroup(row) {
  const isJustt = row.SOURCE === 'Justt';
  const isTest  = row.EXTERNAL_AB_TEST === 'test';
  if ( isJustt && isTest)  return 'justt_poc';
  if (!isJustt && isTest)  return 'merchant_poc';
  if ( isJustt && !isTest) return 'justt_not_poc';
  return null;  // non-Justt non-test → skip
}

// ── Main export ──────────────────────────────────────────────────────────────
/**
 * Aggregates raw CSV rows into the same shape as 02_poc_aggregate.js output.
 *
 * @param {object[]} rows       - Parsed CSV rows (object per row, any case headers)
 * @param {string}   merchantId - Merchant ID to embed in the result
 * @returns {{ merchant_id, start_date, end_date, aggregated }}
 */
export function aggregateCsvRows(rows, merchantId) {
  // ── 1. Normalise column names & coerce numerics ──────────────────────────
  const normRows = rows.map(row => {
    const n = {};
    for (const [k, v] of Object.entries(row)) {
      const canon = COL_MAP[k];
      if (canon) n[canon] = v;
    }

    // Truncate POSTING_MONTH datetime → YYYY-MM
    if (n.POSTING_MONTH && /^\d{4}-\d{2}-\d{2}/.test(n.POSTING_MONTH)) {
      n.POSTING_MONTH = n.POSTING_MONTH.slice(0, 7);
    }

    // Coerce numeric fields
    for (const f of NUMERIC_FIELDS) {
      if (n[f] !== undefined && n[f] !== null && n[f] !== '') {
        const num = parseFloat(n[f]);
        n[f] = isNaN(num) ? null : num;
      } else {
        n[f] = null;
      }
    }
    return n;
  });

  // ── 2. Initialise buckets ────────────────────────────────────────────────
  const GROUPS       = ['justt_poc', 'merchant_poc'];
  const JUSTT_GROUPS = ['justt_poc'];
  const VIEWS        = ['overall', 'fraud', 'non_fraud'];

  const perfBuckets   = {};
  const enrichBuckets = {};
  const dimBuckets    = {};

  for (const g of GROUPS) {
    perfBuckets[g] = {};
    dimBuckets[g]  = {};
    for (const v of VIEWS) {
      perfBuckets[g][v] = {};
      dimBuckets[g][v]  = { by_reason: {}, by_psp: {}, by_card_scheme: {}, by_payment_method: {} };
    }
  }
  for (const g of JUSTT_GROUPS) enrichBuckets[g] = {};

  // dpBuckets[view][month][dpName] = { received, total }  — Justt POC only
  const dpBuckets = {};
  for (const v of VIEWS) dpBuckets[v] = {};

  // ── 3. Fill buckets ──────────────────────────────────────────────────────
  const monthSet       = new Set();
  const monthClosedPct = {};  // month → highest MONTH_CLOSED_PCT seen for that month
  let   poc_partner    = null;

  for (const row of normRows) {
    const group = assignGroup(row);
    if (!group) continue;

    if (!poc_partner && row.SOURCE && row.SOURCE !== 'Justt') {
      poc_partner = row.SOURCE;
    }

    const month = row.POSTING_MONTH;
    if (!month) continue;
    monthSet.add(month);

    // Track MONTH_CLOSED_PCT — Justt rows only.
    // MONTH_CLOSED_PCT is calculated per source; using merchant rows would
    // inflate the value and suppress the filter for months that Justt hasn't closed.
    if (row.SOURCE === 'Justt') {
      const closedPct = row.MONTH_CLOSED_PCT;
      if (closedPct !== null && closedPct !== undefined) {
        monthClosedPct[month] = Math.max(monthClosedPct[month] ?? 0, closedPct);
      }
    }

    const subView = row.REASON_GROUP === 'fraud' ? 'fraud' : 'non_fraud';

    for (const view of ['overall', subView]) {
      if (!perfBuckets[group][view][month]) {
        perfBuckets[group][view][month] = {
          cases: 0, won: 0, not_pending: 0,
          amount_handled: 0, amount_won: 0, amount_not_pending: 0,
        };
      }
      const b = perfBuckets[group][view][month];
      b.cases              += 1;
      b.won                += (row.WON             || 0);
      b.not_pending        += (row.NOT_PENDING      || 0);
      b.amount_handled     += (row.AMOUNT_HANDLED   || 0);
      b.amount_won         += (row.AMOUNT_WON       || 0);
      b.amount_not_pending += (row.AMOUNT_NOT_PENDING || 0);
    }

    // Enrichment (Justt groups only)
    if (group !== 'merchant_poc') {
      if (!enrichBuckets[group][month]) {
        enrichBuckets[group][month] = {
          total: 0, fraud_total: 0,
          emailage_present: 0, ekata_present: 0,
          high_risk: 0, merchant_data: 0,
          enrichment_ratio_sum: 0, enrichment_ratio_cnt: 0,
        };
      }
      const e = enrichBuckets[group][month];
      e.total += 1;
      if (subView === 'fraud') e.fraud_total += 1;

      const emailageScore = row.EMAILAGE_SCORE;
      const ekataScore    = row.EKATA_SCORE;
      const enrichRatio   = row.ENRICHMENT_RATIO;

      if (emailageScore !== null && emailageScore !== undefined) e.emailage_present += 1;
      if (ekataScore    !== null && ekataScore    !== undefined) e.ekata_present    += 1;
      if (enrichRatio   !== null && enrichRatio   !== undefined) {
        e.enrichment_ratio_sum += parseFloat(enrichRatio) || 0;
        e.enrichment_ratio_cnt += 1;
      }

      // High-risk is only meaningful for fraud cases
      if (subView === 'fraud') {
        const isHighRisk =
          (ekataScore    != null && Number(ekataScore)    > HIGH_RISK_EKATA_THRESHOLD) ||
          (emailageScore != null && Number(emailageScore) > HIGH_RISK_EMAILAGE_THRESHOLD);
        if (isHighRisk) e.high_risk += 1;
      }

      e.merchant_data += (row.MERCHANT_DATA_AVAILABLE || 0);

      // Data-point coverage — parse JSON and accumulate per view
      const rawDp = row.DATA_POINTS_COVERAGE;
      if (rawDp && typeof rawDp === 'string' && rawDp.trim().length > 2) {
        let dpObj = null;
        try { dpObj = JSON.parse(rawDp); } catch (_) { /* malformed — skip */ }
        if (dpObj && typeof dpObj === 'object') {
          for (const view of ['overall', subView]) {
            if (!dpBuckets[view][month]) dpBuckets[view][month] = {};
            for (const [dpName, received] of Object.entries(dpObj)) {
              if (!dpBuckets[view][month][dpName]) {
                dpBuckets[view][month][dpName] = { received: 0, total: 0 };
              }
              dpBuckets[view][month][dpName].total    += 1;
              dpBuckets[view][month][dpName].received += (received === true || received === 'true') ? 1 : 0;
            }
          }
        }
      }
    }

    // Dimension buckets (split by view — overall + subView)
    const dimDefs = [
      { key: 'by_reason',         value: (row.REASON_GROUP   || 'unknown').toLowerCase() },
      { key: 'by_psp',            value: (row.PSP            || 'unknown').toLowerCase() },
      { key: 'by_card_scheme',    value: (row.CARD_SCHEME    || 'unknown').toLowerCase() },
      { key: 'by_payment_method', value: (row.PAYMENT_METHOD || 'unknown').toLowerCase() },
    ];
    for (const view of ['overall', subView]) {
      for (const { key, value } of dimDefs) {
        if (!dimBuckets[group][view][key][month]) dimBuckets[group][view][key][month] = {};
        if (!dimBuckets[group][view][key][month][value]) {
          dimBuckets[group][view][key][month][value] = { count: 0, amount: 0, amount_won: 0, amount_not_pending: 0 };
        }
        dimBuckets[group][view][key][month][value].count              += 1;
        dimBuckets[group][view][key][month][value].amount             += (row.AMOUNT_HANDLED     || 0);
        dimBuckets[group][view][key][month][value].amount_won         += (row.AMOUNT_WON         || 0);
        dimBuckets[group][view][key][month][value].amount_not_pending += (row.AMOUNT_NOT_PENDING || 0);
      }
    }
  }

  // ── 4. Sort months ───────────────────────────────────────────────────────
  const months = Array.from(monthSet).sort();
  if (!months.length) {
    throw new Error(
      'No valid months found in CSV. ' +
      'Ensure POSTING_MONTH or POSTING_MONTH_TRUNC is present.'
    );
  }

  // ── 5. Build series ──────────────────────────────────────────────────────
  function buildPerfSeries(group, view) {
    return months.map(month => {
      const b       = perfBuckets[group][view][month];
      const ratesOk = (monthClosedPct[month] ?? 1) >= CLOSED_MONTH_PCT_THRESHOLD;
      if (!b || b.cases === 0) return { month, cases: 0, win_rate: null, rr: null, amount: 0, avg_amount: null, amount_won: null, amount_not_pending: null };
      return {
        month,
        cases:              b.cases,
        win_rate:           ratesOk ? safePct(b.won,        b.not_pending)        : null,
        rr:                 ratesOk ? safePct(b.amount_won, b.amount_not_pending) : null,
        amount:             round2(b.amount_handled),
        avg_amount:         round2(b.amount_handled / b.cases),
        // Raw totals for volume-weighted avg on the frontend (only when month is closed):
        amount_won:         ratesOk ? round2(b.amount_won)         : null,
        amount_not_pending: ratesOk ? round2(b.amount_not_pending) : null,
      };
    });
  }

  function buildEnrichmentSeries(group) {
    return months.map(month => {
      const e = enrichBuckets[group][month];
      if (!e || e.total === 0) {
        return { month, emailage_rate: null, ekata_rate: null, high_risk_pct: null, merchant_data_rate: null, avg_enrichment_ratio: null };
      }
      return {
        month,
        emailage_rate:        safePct(e.emailage_present, e.total),
        ekata_rate:           safePct(e.ekata_present,    e.total),
        high_risk_pct:        safePct(e.high_risk,        e.fraud_total),  // fraud cases only
        merchant_data_rate:   safePct(e.merchant_data,    e.total),
        avg_enrichment_ratio: e.enrichment_ratio_cnt > 0
          ? round2(e.enrichment_ratio_sum / e.enrichment_ratio_cnt)
          : null,
      };
    });
  }

  function buildCoverageSeries(view) {
    return months.map(month => {
      const bucket = dpBuckets[view]?.[month] ?? {};
      const byDp   = {};
      for (const [dpName, counts] of Object.entries(bucket)) {
        byDp[dpName] = counts.total > 0
          ? round2((counts.received / counts.total) * 100)
          : null;
      }
      return { month, byDp };
    });
  }

  function buildDimSeries(group, view, dimKey) {
    return months.map(month => {
      const bucket         = (dimBuckets[group][view][dimKey] || {})[month] || {};
      const ratesOk        = (monthClosedPct[month] ?? 1) >= CLOSED_MONTH_PCT_THRESHOLD;
      const breakdown      = {};   // case counts
      const amounts        = {};   // total amount handled
      const avg_amounts    = {};   // avg amount per case
      const recovery_rates = {};   // amount-based recovery rate (suppressed if month not closed)
      for (const [val, data] of Object.entries(bucket)) {
        breakdown[val]      = data.count;
        amounts[val]        = round2(data.amount);
        avg_amounts[val]    = data.count > 0 ? round2(data.amount / data.count) : null;
        recovery_rates[val] = ratesOk ? safePct(data.amount_won, data.amount_not_pending) : null;
      }
      return { month, breakdown, amounts, avg_amounts, recovery_rates };
    });
  }

  // ── 6. Assemble ──────────────────────────────────────────────────────────
  const views = {};
  for (const view of VIEWS) {
    views[view] = {};
    for (const group of GROUPS) views[view][group] = buildPerfSeries(group, view);
  }

  const enrichment = {
    justt_poc: buildEnrichmentSeries('justt_poc'),
    data_points_coverage: {
      overall:   buildCoverageSeries('overall'),
      fraud:     buildCoverageSeries('fraud'),
      non_fraud: buildCoverageSeries('non_fraud'),
    },
  };

  const dimensions = {};
  for (const group of GROUPS) {
    dimensions[group] = {};
    for (const view of VIEWS) {
      dimensions[group][view] = {};
      for (const dimKey of ['by_reason', 'by_psp', 'by_card_scheme', 'by_payment_method']) {
        dimensions[group][view][dimKey] = buildDimSeries(group, view, dimKey);
      }
    }
  }

  // Derive date range from the sorted months
  const startDate = months[0] + '-01';
  const [ey, em]  = months[months.length - 1].split('-').map(Number);
  const endDate   = `${months[months.length - 1]}-${String(new Date(ey, em, 0).getDate()).padStart(2, '0')}`;

  return {
    merchant_id: merchantId,
    start_date:  startDate,
    end_date:    endDate,
    aggregated: {
      poc_partner: poc_partner || 'Unknown',
      months,
      views,
      enrichment,
      dimensions,
    },
  };
}
