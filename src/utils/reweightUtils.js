// ============================================================
// reweightUtils.js — Reweighting and dimension analysis helpers
// ============================================================
// Used by ApplesToApplesTab to produce fair apples-to-apples
// comparisons between Justt POC and Merchant POC.
// ============================================================

function round2(v) {
  if (v == null || isNaN(v)) return null;
  return Math.round(v * 100) / 100;
}

/**
 * Average of non-null values in an array.
 * @param {Array<number|null>} arr
 * @returns {number|null}
 */
export function avg(arr) {
  const vals = (arr ?? []).filter(v => v != null);
  if (!vals.length) return null;
  return round2(vals.reduce((s, v) => s + v, 0) / vals.length);
}

/**
 * Volume-weighted average RR across a monthly series.
 * = SUM(amount_won) / SUM(amount_not_pending) × 100
 * Months where either value is null (suppressed / not closed) are skipped.
 *
 * @param {Array<{ amount_won: number|null, amount_not_pending: number|null }>} series
 * @returns {number|null}
 */
export function weightedAvgRR(series) {
  let totalWon = 0, totalNotPending = 0;
  for (const row of (series ?? [])) {
    if (row.amount_won != null && row.amount_not_pending != null) {
      totalWon        += row.amount_won;
      totalNotPending += row.amount_not_pending;
    }
  }
  if (totalNotPending === 0) return null;
  return round2((totalWon / totalNotPending) * 100);
}

/**
 * Volume-weighted average of a reweighted RR series.
 * Each month's synthetic rate is weighted by the merchant's amount_not_pending
 * for that month, so months with more decided volume contribute more.
 *
 * @param {Array<number|null>} rrSeries       - synthetic monthly rates (e.g. reweighted.byReason)
 * @param {Array<{ amount_not_pending: number|null }>} merchantSeries - merchant monthly perf rows
 * @returns {number|null}
 */
export function weightedAvgReweighted(rrSeries, merchantSeries) {
  let weightedSum = 0, totalWeight = 0;
  for (let i = 0; i < (rrSeries ?? []).length; i++) {
    const rr     = rrSeries[i];
    const weight = merchantSeries?.[i]?.amount_not_pending;
    if (rr != null && weight != null && weight > 0) {
      weightedSum += rr * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) return null;
  return round2(weightedSum / totalWeight);
}

/**
 * Compute three reweighted Recovery Rate series for Justt POC,
 * each using Merchant POC's dimensional share as weights.
 *
 * @param {object}   views      - { overall, fraud, non_fraud } × { justt_poc, merchant_poc }
 * @param {object}   dimensions - dimensions[group][view][dimKey][monthIdx]
 * @param {string[]} months     - sorted month strings
 * @returns {{ byReason: (number|null)[], byPsp: (number|null)[], byCardScheme: (number|null)[] }}
 */
export function computeReweightedSeries(views, dimensions, months) {
  // ── 1. By fraud / non-fraud ────────────────────────────────────────────────
  const byReason = months.map((_, i) => {
    const mTotal = views?.overall?.merchant_poc?.[i]?.cases ?? 0;
    if (!mTotal) return null;

    const mFraudCases    = views?.fraud?.merchant_poc?.[i]?.cases    ?? 0;
    const mNonFraudCases = views?.non_fraud?.merchant_poc?.[i]?.cases ?? 0;
    const fraudShare    = mFraudCases    / mTotal;
    const nonFraudShare = mNonFraudCases / mTotal;

    const jFraudRR    = views?.fraud?.justt_poc?.[i]?.rr;
    const jNonFraudRR = views?.non_fraud?.justt_poc?.[i]?.rr;

    if (jFraudRR == null && jNonFraudRR == null) return null;

    let rr = 0, usedWeight = 0;
    if (jFraudRR    != null) { rr += fraudShare    * jFraudRR;    usedWeight += fraudShare; }
    if (jNonFraudRR != null) { rr += nonFraudShare * jNonFraudRR; usedWeight += nonFraudShare; }

    return usedWeight > 0 ? round2(rr / usedWeight) : null;
  });

  // ── 2. By PSP ──────────────────────────────────────────────────────────────
  const byPsp = months.map((_, i) => {
    const mRow = dimensions?.merchant_poc?.overall?.by_psp?.[i];
    const jRow = dimensions?.justt_poc?.overall?.by_psp?.[i];
    if (!mRow || !jRow) return null;

    const mBreakdown = mRow.breakdown ?? {};
    const mTotal     = Object.values(mBreakdown).reduce((s, v) => s + v, 0);
    if (!mTotal) return null;

    const jRR = jRow.recovery_rates ?? {};
    let rr = 0, usedWeight = 0;

    for (const [psp, cnt] of Object.entries(mBreakdown)) {
      const rate = jRR[psp];
      if (rate == null) continue;
      const share = cnt / mTotal;
      rr += share * rate;
      usedWeight += share;
    }

    return usedWeight > 0 ? round2(rr / usedWeight) : null;
  });

  // ── 3. By card scheme ──────────────────────────────────────────────────────
  const byCardScheme = months.map((_, i) => {
    const mRow = dimensions?.merchant_poc?.overall?.by_card_scheme?.[i];
    const jRow = dimensions?.justt_poc?.overall?.by_card_scheme?.[i];
    if (!mRow || !jRow) return null;

    const mBreakdown = mRow.breakdown ?? {};
    const mTotal     = Object.values(mBreakdown).reduce((s, v) => s + v, 0);
    if (!mTotal) return null;

    const jRR = jRow.recovery_rates ?? {};
    let rr = 0, usedWeight = 0;

    for (const [scheme, cnt] of Object.entries(mBreakdown)) {
      const rate = jRR[scheme];
      if (rate == null) continue;
      const share = cnt / mTotal;
      rr += share * rate;
      usedWeight += share;
    }

    return usedWeight > 0 ? round2(rr / usedWeight) : null;
  });

  // ── 4. By payment method ───────────────────────────────────────────────────
  const byPaymentMethod = months.map((_, i) => {
    const mRow = dimensions?.merchant_poc?.overall?.by_payment_method?.[i];
    const jRow = dimensions?.justt_poc?.overall?.by_payment_method?.[i];
    if (!mRow || !jRow) return null;

    const mBreakdown = mRow.breakdown ?? {};
    const mTotal     = Object.values(mBreakdown).reduce((s, v) => s + v, 0);
    if (!mTotal) return null;

    const jRR = jRow.recovery_rates ?? {};
    let rr = 0, usedWeight = 0;

    for (const [method, cnt] of Object.entries(mBreakdown)) {
      const rate = jRR[method];
      if (rate == null) continue;
      const share = cnt / mTotal;
      rr += share * rate;
      usedWeight += share;
    }

    return usedWeight > 0 ? round2(rr / usedWeight) : null;
  });

  return { byReason, byPsp, byCardScheme, byPaymentMethod };
}

/**
 * Build a distribution table for a dimension (PSP or card scheme).
 * Returns one row per distinct value across both groups, sorted by
 * total case volume (descending).
 *
 * @param {object} dimensions
 * @param {string} dimKey - 'by_psp' | 'by_card_scheme'
 * @returns {Array<{
 *   name: string,
 *   jpCases: number, jpShare: number,
 *   mCases: number,  mShare: number,
 *   status: 'both' | 'low_n' | 'jp_only' | 'm_only'
 * }>}
 */
export function buildDimDistribution(dimensions, dimKey) {
  const jpSeries = dimensions?.justt_poc?.overall?.[dimKey]    ?? [];
  const mSeries  = dimensions?.merchant_poc?.overall?.[dimKey] ?? [];

  const jpTotals = {};
  const mTotals  = {};

  for (const row of jpSeries) {
    for (const [val, cnt] of Object.entries(row.breakdown ?? {})) {
      jpTotals[val] = (jpTotals[val] ?? 0) + cnt;
    }
  }
  for (const row of mSeries) {
    for (const [val, cnt] of Object.entries(row.breakdown ?? {})) {
      mTotals[val] = (mTotals[val] ?? 0) + cnt;
    }
  }

  const jpTotal = Object.values(jpTotals).reduce((s, v) => s + v, 0);
  const mTotal  = Object.values(mTotals).reduce((s, v) => s + v, 0);

  const allNames = Array.from(new Set([...Object.keys(jpTotals), ...Object.keys(mTotals)]));

  return allNames
    .map(name => {
      const jpCases = jpTotals[name] ?? 0;
      const mCases  = mTotals[name]  ?? 0;
      const jpShare = jpTotal > 0 ? round2((jpCases / jpTotal) * 100) : 0;
      const mShare  = mTotal  > 0 ? round2((mCases  / mTotal)  * 100) : 0;

      let status;
      if      (jpCases >= 100 && mCases >= 100) status = 'both';
      else if (jpCases >    0 && mCases >    0) status = 'low_n';
      else if (jpCases >    0)                  status = 'jp_only';
      else                                      status = 'm_only';

      return { name, jpCases, jpShare, mCases, mShare, status };
    })
    .sort((a, b) => (b.jpCases + b.mCases) - (a.jpCases + a.mCases));
}

/**
 * Build monthly head-to-head RR data for one specific dimension value.
 *
 * @param {object}   dimensions
 * @param {string}   dimKey   - 'by_psp' | 'by_card_scheme'
 * @param {string}   dimValue - e.g. 'adyen'
 * @param {string[]} months
 * @returns {Array<{ month: string, jp: number|null, merchant: number|null }>}
 */
export function buildDimHeadToHead(dimensions, dimKey, dimValue, months) {
  const jpSeries = dimensions?.justt_poc?.overall?.[dimKey]    ?? [];
  const mSeries  = dimensions?.merchant_poc?.overall?.[dimKey] ?? [];

  return months.map((month, i) => ({
    month,
    jp:       jpSeries[i]?.recovery_rates?.[dimValue] ?? null,
    merchant: mSeries[i]?.recovery_rates?.[dimValue]  ?? null,
  }));
}
