// ============================================================
// MOCK RESPONSE — POC Comparison Dashboard
// ============================================================
// Simulates the full JSON payload returned by n8n's "Respond to Webhook" node.
// Used when USE_MOCK=true in useAnalysis.js.
// Shape matches GUIDE.md §8 data contract.
// ============================================================

const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];

export const MOCK_RESPONSE = {
  merchant_id:  '61c49e6280c2812d68bf1d53',
  start_date:   '2025-10-01',
  end_date:     '2026-02-28',
  generated_at: '2026-03-01T10:00:00.000Z',
  poc_partner:  'Klarna',
  months,

  // ── Views ──────────────────────────────────────────────────────────────────
  views: {
    overall: {
      justt_poc: [
        { month: '2025-10', cases: 112, win_rate: 61.2, rr: 71.4, amount: 8750.50,  avg_amount: 78.13 },
        { month: '2025-11', cases: 128, win_rate: 63.5, rr: 73.1, amount: 10240.80, avg_amount: 80.01 },
        { month: '2025-12', cases: 119, win_rate: 62.0, rr: 72.5, amount: 9500.00,  avg_amount: 79.83 },
        { month: '2026-01', cases: 134, win_rate: 64.2, rr: 74.3, amount: 10950.20, avg_amount: 81.72 },
        { month: '2026-02', cases: 141, win_rate: 65.1, rr: 75.0, amount: 11600.40, avg_amount: 82.27 },
      ],
      merchant_poc: [
        { month: '2025-10', cases: 88,  win_rate: 47.3, rr: 54.1, amount: 6200.00, avg_amount: 70.45 },
        { month: '2025-11', cases: 95,  win_rate: 49.1, rr: 56.0, amount: 6800.00, avg_amount: 71.58 },
        { month: '2025-12', cases: 91,  win_rate: 48.5, rr: 55.2, amount: 6450.00, avg_amount: 70.88 },
        { month: '2026-01', cases: 103, win_rate: 50.2, rr: 57.4, amount: 7300.00, avg_amount: 70.87 },
        { month: '2026-02', cases: 98,  win_rate: 51.0, rr: 58.1, amount: 7000.00, avg_amount: 71.43 },
      ],
      justt_not_poc: [
        { month: '2025-10', cases: 285, win_rate: 59.8, rr: 69.2, amount: 22000.00, avg_amount: 77.19 },
        { month: '2025-11', cases: 310, win_rate: 60.5, rr: 70.1, amount: 24100.00, avg_amount: 77.74 },
        { month: '2025-12', cases: 298, win_rate: 60.0, rr: 69.8, amount: 23200.00, avg_amount: 77.85 },
        { month: '2026-01', cases: 321, win_rate: 61.0, rr: 70.5, amount: 25000.00, avg_amount: 77.88 },
        { month: '2026-02', cases: 335, win_rate: 61.5, rr: 71.2, amount: 26100.00, avg_amount: 77.91 },
      ],
    },
    fraud: {
      justt_poc: [
        { month: '2025-10', cases: 72, win_rate: 65.8, rr: 76.2, amount: 6100.00, avg_amount: 84.72 },
        { month: '2025-11', cases: 82, win_rate: 67.4, rr: 77.5, amount: 7000.00, avg_amount: 85.37 },
        { month: '2025-12', cases: 76, win_rate: 66.5, rr: 76.8, amount: 6500.00, avg_amount: 85.53 },
        { month: '2026-01', cases: 88, win_rate: 68.0, rr: 78.1, amount: 7600.00, avg_amount: 86.36 },
        { month: '2026-02', cases: 93, win_rate: 69.0, rr: 79.0, amount: 8100.00, avg_amount: 87.10 },
      ],
      merchant_poc: [
        { month: '2025-10', cases: 55, win_rate: 50.2, rr: 57.3, amount: 4100.00, avg_amount: 74.55 },
        { month: '2025-11', cases: 61, win_rate: 52.1, rr: 59.0, amount: 4600.00, avg_amount: 75.41 },
        { month: '2025-12', cases: 58, win_rate: 51.5, rr: 58.2, amount: 4300.00, avg_amount: 74.14 },
        { month: '2026-01', cases: 65, win_rate: 53.0, rr: 60.5, amount: 4900.00, avg_amount: 75.38 },
        { month: '2026-02', cases: 62, win_rate: 54.0, rr: 61.0, amount: 4700.00, avg_amount: 75.81 },
      ],
      justt_not_poc: [
        { month: '2025-10', cases: 185, win_rate: 62.0, rr: 71.5, amount: 15200.00, avg_amount: 82.16 },
        { month: '2025-11', cases: 200, win_rate: 63.1, rr: 72.4, amount: 16500.00, avg_amount: 82.50 },
        { month: '2025-12', cases: 192, win_rate: 62.5, rr: 71.9, amount: 15800.00, avg_amount: 82.29 },
        { month: '2026-01', cases: 208, win_rate: 63.5, rr: 72.8, amount: 17100.00, avg_amount: 82.21 },
        { month: '2026-02', cases: 218, win_rate: 64.0, rr: 73.5, amount: 17900.00, avg_amount: 82.11 },
      ],
    },
    non_fraud: {
      justt_poc: [
        { month: '2025-10', cases: 40, win_rate: 52.0, rr: 61.5, amount: 2650.50, avg_amount: 66.26 },
        { month: '2025-11', cases: 46, win_rate: 54.0, rr: 63.0, amount: 3240.80, avg_amount: 70.45 },
        { month: '2025-12', cases: 43, win_rate: 53.0, rr: 62.2, amount: 3000.00, avg_amount: 69.77 },
        { month: '2026-01', cases: 46, win_rate: 55.0, rr: 64.0, amount: 3350.20, avg_amount: 72.83 },
        { month: '2026-02', cases: 48, win_rate: 56.0, rr: 65.0, amount: 3500.40, avg_amount: 72.93 },
      ],
      merchant_poc: [
        { month: '2025-10', cases: 33, win_rate: 42.0, rr: 49.0, amount: 2100.00, avg_amount: 63.64 },
        { month: '2025-11', cases: 34, win_rate: 43.5, rr: 50.5, amount: 2200.00, avg_amount: 64.71 },
        { month: '2025-12', cases: 33, win_rate: 43.0, rr: 50.0, amount: 2150.00, avg_amount: 65.15 },
        { month: '2026-01', cases: 38, win_rate: 44.5, rr: 51.5, amount: 2400.00, avg_amount: 63.16 },
        { month: '2026-02', cases: 36, win_rate: 45.0, rr: 52.0, amount: 2300.00, avg_amount: 63.89 },
      ],
      justt_not_poc: [
        { month: '2025-10', cases: 100, win_rate: 55.0, rr: 64.0, amount: 6800.00,  avg_amount: 68.00 },
        { month: '2025-11', cases: 110, win_rate: 55.5, rr: 65.0, amount: 7600.00,  avg_amount: 69.09 },
        { month: '2025-12', cases: 106, win_rate: 55.0, rr: 64.5, amount: 7400.00,  avg_amount: 69.81 },
        { month: '2026-01', cases: 113, win_rate: 56.0, rr: 65.5, amount: 7900.00,  avg_amount: 69.91 },
        { month: '2026-02', cases: 117, win_rate: 56.5, rr: 66.0, amount: 8200.00,  avg_amount: 70.09 },
      ],
    },
  },

  // ── Enrichment ─────────────────────────────────────────────────────────────
  enrichment: {
    justt_poc: [
      { month: '2025-10', emailage_rate: 87.5, ekata_rate: 44.6, high_risk_pct: 18.1, merchant_data_rate: 90.2, avg_enrichment_ratio: 0.72 },
      { month: '2025-11', emailage_rate: 88.3, ekata_rate: 45.3, high_risk_pct: 19.5, merchant_data_rate: 91.4, avg_enrichment_ratio: 0.74 },
      { month: '2025-12', emailage_rate: 87.0, ekata_rate: 44.0, high_risk_pct: 17.1, merchant_data_rate: 90.8, avg_enrichment_ratio: 0.71 },
      { month: '2026-01', emailage_rate: 89.0, ekata_rate: 46.0, high_risk_pct: 18.8, merchant_data_rate: 92.5, avg_enrichment_ratio: 0.75 },
      { month: '2026-02', emailage_rate: 89.5, ekata_rate: 46.5, high_risk_pct: 20.0, merchant_data_rate: 93.0, avg_enrichment_ratio: 0.76 },
    ],
    justt_not_poc: [
      { month: '2025-10', emailage_rate: 84.0, ekata_rate: 41.5, high_risk_pct: 15.7, merchant_data_rate: 87.5, avg_enrichment_ratio: 0.65 },
      { month: '2025-11', emailage_rate: 85.1, ekata_rate: 42.0, high_risk_pct: 16.5, merchant_data_rate: 88.2, avg_enrichment_ratio: 0.67 },
      { month: '2025-12', emailage_rate: 84.5, ekata_rate: 41.8, high_risk_pct: 15.9, merchant_data_rate: 87.8, avg_enrichment_ratio: 0.66 },
      { month: '2026-01', emailage_rate: 85.5, ekata_rate: 42.5, high_risk_pct: 16.8, merchant_data_rate: 88.7, avg_enrichment_ratio: 0.68 },
      { month: '2026-02', emailage_rate: 86.0, ekata_rate: 43.0, high_risk_pct: 17.5, merchant_data_rate: 89.1, avg_enrichment_ratio: 0.69 },
    ],
  },

  // ── Dimensions ─────────────────────────────────────────────────────────────
  dimensions: {
    justt_poc: {
      by_reason: months.map((m, i) => ({
        month: m,
        breakdown:   { fraud: [72,82,76,88,93][i], 'non-fraud': [40,46,43,46,48][i] },
        avg_amounts: { fraud: [84.72,85.37,85.53,86.36,87.10][i], 'non-fraud': [66.26,70.45,69.77,72.83,72.93][i] },
      })),
      by_psp: months.map((m, i) => ({
        month: m,
        breakdown:   { adyen: [85,95,88,100,108][i], stripe: [27,33,31,34,33][i] },
        avg_amounts: { adyen: [79.5,80.8,80.2,82.1,82.9][i], stripe: [74.1,77.2,76.5,79.3,79.8][i] },
      })),
      by_card_scheme: months.map((m, i) => ({
        month: m,
        breakdown:   { visa: [55,62,58,65,70][i], mastercard: [42,48,44,50,52][i], amex: [15,18,17,19,19][i] },
        avg_amounts: { visa: [77.3,78.9,78.1,80.5,81.0][i], mastercard: [81.2,82.1,81.9,83.5,83.8][i], amex: [95.1,97.2,96.5,98.1,98.5][i] },
      })),
    },
    merchant_poc: {
      by_reason: months.map((m, i) => ({
        month: m,
        breakdown:   { fraud: [55,61,58,65,62][i], 'non-fraud': [33,34,33,38,36][i] },
        avg_amounts: { fraud: [74.55,75.41,74.14,75.38,75.81][i], 'non-fraud': [63.64,64.71,65.15,63.16,63.89][i] },
      })),
      by_psp: months.map((m, i) => ({
        month: m,
        breakdown:   { stripe: [55,60,57,64,61][i], checkout: [33,35,34,39,37][i] },
        avg_amounts: { stripe: [71.2,72.1,71.5,71.9,72.3][i], checkout: [69.1,70.5,69.8,69.3,70.1][i] },
      })),
      by_card_scheme: months.map((m, i) => ({
        month: m,
        breakdown:   { visa: [50,54,52,59,56][i], mastercard: [38,41,39,44,42][i] },
        avg_amounts: { visa: [70.5,71.3,70.8,71.0,71.5][i], mastercard: [70.2,71.8,71.0,70.7,71.3][i] },
      })),
    },
    justt_not_poc: {
      by_reason: months.map((m, i) => ({
        month: m,
        breakdown:   { fraud: [185,200,192,208,218][i], 'non-fraud': [100,110,106,113,117][i] },
        avg_amounts: { fraud: [82.16,82.50,82.29,82.21,82.11][i], 'non-fraud': [68.00,69.09,69.81,69.91,70.09][i] },
      })),
      by_psp: months.map((m, i) => ({
        month: m,
        breakdown:   { adyen: [195,213,204,220,230][i], braintree: [50,55,52,58,62][i], stripe: [40,42,42,43,43][i] },
        avg_amounts: { adyen: [78.2,78.8,78.5,78.9,79.1][i], braintree: [74.5,75.1,74.8,75.3,75.5][i], stripe: [72.1,73.0,72.8,73.5,74.0][i] },
      })),
      by_card_scheme: months.map((m, i) => ({
        month: m,
        breakdown:   { visa: [130,142,136,148,155][i], mastercard: [105,115,110,118,123][i], amex: [35,38,37,40,42][i], discover: [15,15,15,15,15][i] },
        avg_amounts: { visa: [76.5,77.1,76.8,77.3,77.5][i], mastercard: [79.8,80.2,80.0,80.5,80.7][i], amex: [92.3,93.1,92.8,93.5,93.8][i], discover: [65.0,65.5,65.2,65.8,66.0][i] },
      })),
    },
  },

  // ── AI outputs ─────────────────────────────────────────────────────────────
  ai: {
    conclusion: `• **Justt clearly outperforms Klarna** across all 5 months: +13–14pp win rate and +16–17pp recovery rate on fraud cases, with a consistent and widening trend. This is a strong positive signal for the POC outcome.
• **Justt POC is representative of overall Justt performance** — diverging by <3pp win rate vs Justt NOT POC — confirming no scope bias or cherry-picking in the POC group.
• **Enrichment is marginally higher in POC cases** (+3–4pp EMAILAGE, +2–3pp EKATA vs NOT POC), slightly favoring Justt POC, but insufficient to explain the 13pp gap over Klarna. Adyen's higher avg case amounts (~$80 vs Stripe's ~$74) contribute a modest RR uplift.`,

    narration: `### 1. Overview
This POC evaluation covers merchant 61c49e6280c2812d68bf1d53 operating with POC partner Klarna across 5 months (Oct 2025–Feb 2026). Justt POC handled 634 cases totaling ~$51K, Klarna POC handled 475 cases (~$33.7K), and Justt NOT POC processed 1,549 reference cases (~$120K). Volume was balanced between the two POC groups, with Klarna running ~25% fewer cases per month — a minor imbalance that should not materially affect the comparison.

### 2. Performance Comparison — Justt POC vs Klarna POC
Justt consistently outperformed Klarna across all 5 months. Overall win rates ranged from 61.2% to 65.1% for Justt POC vs 47.3% to 51.0% for Klarna — a persistent gap of 13–14pp. Recovery rates showed a similar pattern: Justt 71.4–75.0% vs Klarna 54.1–58.1%, a sustained gap of ~17pp. On fraud cases specifically, the gap widens: Justt POC fraud win rate averaged 67.3% vs 52.2% for Klarna (+15pp). Non-fraud win rates were lower for both groups (52–56% Justt vs 42–45% Klarna), with Justt maintaining a consistent 10pp advantage. Performance improved modestly each month for both groups, but Justt's trajectory is steeper.

### 3. Consistency Check — Justt POC vs Justt NOT POC
Justt POC win rates (61.2–65.1%) closely track Justt NOT POC (59.8–61.5%), with a divergence of 1.4–3.6pp — well within the 5pp threshold. Recovery rates are similarly aligned (+1.7–3.8pp). This confirms that Justt POC cases are not cherry-picked or scope-biased; the POC selection is representative of Justt's standard case quality and performance.

### 4. Enrichment & Data Quality
Justt POC has marginally higher enrichment vs NOT POC: EMAILAGE 87–89.5% vs 84–86% (+3–4pp), EKATA 44–46.5% vs 41–43% (+2–3pp). High-risk score % is slightly elevated in POC cases (11–12.8% vs 10.2–11.5%), suggesting POC cases are marginally higher-risk. Merchant data availability is strong in both groups (90–93% POC, 87–89% NOT POC). These small enrichment differences do not explain the 13pp gap over Klarna.

### 5. Dimension Mix & Avg Case Amount Analysis
Fraud/non-fraud splits are comparable: ~64% fraud for Justt POC vs ~62% for Klarna — no material skew. PSP distribution differs: Justt POC is dominated by Adyen (76%), while Klarna uses Stripe (63%) and Checkout (37%). Adyen cases carry higher avg amounts ($79.5–82.9) vs Stripe ($74.1–79.8) and Checkout ($69.1–70.5), contributing a modest RR uplift for Justt. Card scheme coverage differs: Klarna has no Amex or Discover, while Justt handles Amex ($95–98 avg) and Discover ($65 avg) — Amex cases provide a small RR boost exclusive to Justt. After adjusting for PSP and scheme mix differences, the core 13pp win rate gap remains, confirming Justt's operational performance advantage over Klarna.`,
  },
};
