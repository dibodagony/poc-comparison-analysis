// ============================================================
// buildSql.js — Generate the CTE-based Snowflake export query
// ============================================================
// Used by the "Get SQL" panel in both CSV and Query modes to
// produce a copyable SQL query that the user can run directly
// in Snowflake to export the CSV needed for analysis.
//
// Template source: JUSTTAI_ANALYTICS.CONFORMED.CONFORMED_CHARGEBACKS
// (the raw conformed table, as opposed to the reporting view used
//  by n8n's 01_poc_sql.js in query mode)
//
// Scope params shape:
// {
//   differentiator: 'source_only' | 'source_ab_test',
//   reasonGroups:   string[]  // [] = all included
//   psps:           string[]  // [] = all included
//   cardSchemes:    string[]  // [] = all included
//   paymentMethods: string[]  // [] = all included
// }
// ============================================================

const SOURCE_TABLE_CHARGEBACKS   = 'JUSTTAI_ANALYTICS.CONFORMED.CONFORMED_CHARGEBACKS';
const SOURCE_TABLE_MONGO_CB      = 'JUSTTAI_ANALYTICS.LANDING.LANDING_MONGODB_PRODUCTION_CHARGEBACKS';
const SOURCE_TABLE_FIELD_DPS     = 'JUSTTAI_ANALYTICS.CONFORMED.REFERENCE_FIELD_DATA_POINTS';

/**
 * Escape a SQL string literal (single-quote escaping).
 */
function sqlStr(val) {
  return `'${String(val).replace(/'/g, "''")}'`;
}

/**
 * Build an IN clause from an array of values, e.g.:
 *   IN ('visa', 'mastercard')
 * Returns null if the array is empty (meaning "all included").
 */
function buildInClause(column, values) {
  if (!values || values.length === 0) return null;
  const list = values.map(sqlStr).join(', ');
  return `${column} IN (${list})`;
}

/**
 * Build the Snowflake CTE export SQL.
 *
 * @param {object} params
 * @param {string} params.merchant_id
 * @param {string} params.start_date  — YYYY-MM-DD
 * @param {string} params.end_date    — YYYY-MM-DD
 * @param {object} params.scope
 */
export function buildExportSql({ merchant_id, start_date, end_date, scope = {} }) {
  const {
    differentiator  = 'source_only',
    reasonGroups    = [],
    psps            = [],
    cardSchemes     = [],
    paymentMethods  = [],
  } = scope;

  // ── Inner WHERE extra filters (dimension-level) ───────────────────────────
  const innerFilters = [];

  // PSP filter — applied before COALESCE so we match the raw column
  const pspClause = buildInClause('PSP', psps);
  if (pspClause) innerFilters.push(pspClause);

  const cardClause = buildInClause('CARD_SCHEME', cardSchemes);
  if (cardClause) innerFilters.push(cardClause);

  const pmClause = buildInClause('PAYMENT_METHOD', paymentMethods);
  if (pmClause) innerFilters.push(pmClause);

  // reason_group filter — applied after the CASE expression
  // We need it in the outer WHERE; mark it for later
  const reasonGroupFilter = (() => {
    if (!reasonGroups || reasonGroups.length === 0) return null;
    if (reasonGroups.length === 1) {
      return `reason_group = ${sqlStr(reasonGroups[0])}`;
    }
    const list = reasonGroups.map(sqlStr).join(', ');
    return `reason_group IN (${list})`;
  })();

  // ── Final WHERE (after CTEs) ──────────────────────────────────────────────
  // source_ab_test: limit to test group only (Justt 'test' + merchant 'test')
  // source_only:    all rows (Justt has all cases, merchant always test)
  const finalWhereConditions = [];
  if (differentiator === 'source_ab_test') {
    finalWhereConditions.push("EXTERNAL_AB_TEST = 'test'");
  }
  if (reasonGroupFilter) {
    finalWhereConditions.push(reasonGroupFilter);
  }

  const finalWhere = finalWhereConditions.length > 0
    ? `WHERE ${finalWhereConditions.join('\n    AND ')}`
    : '-- no final filter (source_only, all reason groups)';

  // ── Inner extra filters block ─────────────────────────────────────────────
  const innerFilterBlock = innerFilters.length > 0
    ? '\n            AND ' + innerFilters.join('\n            AND ')
    : '';

  // ── Assemble ──────────────────────────────────────────────────────────────
  const sql = `
-- ============================================================
-- POC COMPARISON — CHARGEBACK EXPORT QUERY
-- ============================================================
-- Merchant:      ${merchant_id}
-- Date range:    ${start_date} → ${end_date}
-- Differentiator: ${differentiator === 'source_ab_test' ? 'Source + AB Test (EXTERNAL_AB_TEST = test)' : 'Source only (all Justt cases)'}
-- Scope filters:
--   Reason groups : ${reasonGroups.length > 0 ? reasonGroups.join(', ') : 'all'}
--   PSP           : ${psps.length > 0 ? psps.join(', ') : 'all'}
--   Card scheme   : ${cardSchemes.length > 0 ? cardSchemes.join(', ') : 'all'}
--   Payment method: ${paymentMethods.length > 0 ? paymentMethods.join(', ') : 'all'}
-- Generated:     ${new Date().toISOString()}
-- ============================================================

WITH main AS (
    SELECT *,
           SUM(not_pending) OVER (PARTITION BY source, POSTING_MONTH_TRUNC)
             / NULLIF(SUM(handled) OVER (PARTITION BY source, POSTING_MONTH_TRUNC), 0)
               AS month_closed_pct,
           SUM(handled)        OVER (PARTITION BY source, POSTING_MONTH_TRUNC)                AS total_month_cases,
           SUM(handled)        OVER (PARTITION BY source, reason_group, POSTING_MONTH_TRUNC)  AS total_reason_cases,
           SUM(amount_handled) OVER (PARTITION BY source, POSTING_MONTH_TRUNC)                AS total_month_cases_amount,
           SUM(amount_handled) OVER (PARTITION BY source, reason_group, POSTING_MONTH_TRUNC)  AS total_reason_cases_amount
    FROM (
        SELECT
            INTERNAL_ID,
            CHARGEBACK_ID,
            CASE
                WHEN ASSIGNED_TO_JUSTT = 1
                     AND EXTERNAL_AB_TEST IS NOT NULL
                     AND EXTERNAL_AB_TEST != 'false'  THEN 'test'
                WHEN ASSIGNED_TO_JUSTT = 0            THEN 'test'
                ELSE 'non-test'
            END AS EXTERNAL_AB_TEST,
            PSP_CREATED_DATE,
            POSTING_MONTH_TRUNC,
            MERCHANT_DATA,
            INTERNAL_REASON_GROUP,
            ENRICHMENT_RATIO,
            CASE WHEN ASSIGNED_TO_JUSTT = 1 THEN 'Justt' ELSE MERCHANT_ID END AS source,
            COALESCE(PSP,            'unknown') AS PSP,
            COALESCE(CARD_SCHEME,    'unknown') AS CARD_SCHEME,
            COALESCE(PAYMENT_METHOD, 'unknown') AS PAYMENT_METHOD,
            CASE WHEN REASON_GROUP = 'fraud' THEN 'fraud' ELSE 'non-fraud' END AS reason_group,
            CASE
                WHEN ASSIGNED_TO_JUSTT = 1 AND HANDLED = 1        THEN 1
                WHEN ASSIGNED_TO_JUSTT = 0 AND PSP_STATUS IN ('won', 'lost') THEN 1
                ELSE 0
            END AS handled,
            CASE WHEN PSP_STATUS = 'won'                    THEN 1 ELSE 0 END AS won,
            CASE WHEN PSP_STATUS IN ('won', 'lost')         THEN 1 ELSE 0 END AS not_pending,
            CASE
                WHEN ASSIGNED_TO_JUSTT = 1 AND HANDLED = 1        THEN AMOUNT_TOTAL_USD
                WHEN ASSIGNED_TO_JUSTT = 0 AND PSP_STATUS IN ('won', 'lost') THEN AMOUNT_TOTAL_USD
                ELSE 0
            END AS amount_handled,
            CASE WHEN PSP_STATUS = 'won'              THEN AMOUNT_TOTAL_USD ELSE 0 END AS amount_won,
            CASE WHEN PSP_STATUS IN ('won', 'lost')   THEN AMOUNT_TOTAL_USD ELSE 0 END AS amount_not_pending
        FROM ${SOURCE_TABLE_CHARGEBACKS}
        WHERE MERCHANT_ID = ${sqlStr(merchant_id)}
            AND POSTING_MONTH_TRUNC >= ${sqlStr(start_date)}
            AND POSTING_MONTH_TRUNC <= ${sqlStr(end_date)}
            AND (
                CASE
                    WHEN ASSIGNED_TO_JUSTT = 1 AND HANDLED = 1        THEN 1
                    WHEN ASSIGNED_TO_JUSTT = 0 AND PSP_STATUS IN ('won', 'lost') THEN 1
                    ELSE 0
                END = 1
            )${innerFilterBlock}
    ) AS a
    LEFT JOIN (
        SELECT
            INTERNAL_ID,
            CAST(INTERNAL:identityCheck:ekata:accountOpening:identityRiskScore AS INT)  AS ekata_identity_risk_score,
            CAST(INTERNAL:identityCheck:emailage:risk:score AS INT)                     AS emailage_identity_risk_score
        FROM ${SOURCE_TABLE_MONGO_CB}
    ) AS b USING (INTERNAL_ID)
),

data_points_dict AS (
    SELECT
        id            AS data_point_id,
        NAME          AS data_point_name,
        DESCRIPTION   AS data_point_description,
        REPLACE(FIELD_PATH, '.', ':') AS data_point_path
    FROM ${SOURCE_TABLE_FIELD_DPS}
),

data_points AS (
    SELECT
        INTERNAL_ID,
        OBJECT_AGG(data_point_name, is_dp_received) AS data_points_coverage
    FROM (
        SELECT *
        FROM (
            SELECT
                INTERNAL_ID,
                f.value::INT                                                              AS requestedDataPointId,
                AC_METADATA:enrichment:receivedDataPointIds                               AS receivedDataPointIds,
                ARRAY_CONTAINS(f.value, PARSE_JSON(AC_METADATA:enrichment:receivedDataPointIds))
                                                                                         AS is_dp_received
            FROM ${SOURCE_TABLE_MONGO_CB},
                 LATERAL FLATTEN(INPUT => AC_METADATA:enrichment:requestedDataPointIds) f
            WHERE MERCHANT_ID = ${sqlStr(merchant_id)}
                AND PSP_CREATED_DATE >= ${sqlStr(start_date)}
                AND PSP_CREATED_DATE <= ${sqlStr(end_date)}
        ) AS d
        JOIN (
            SELECT data_point_id, data_point_name
            FROM data_points_dict
        ) AS d1 ON d.requestedDataPointId = d1.data_point_id
    ) AS dp
    GROUP BY 1
),

final AS (
    SELECT *
    FROM main
    LEFT JOIN data_points USING (INTERNAL_ID)
)

SELECT *
FROM final
${finalWhere}
;
`.trim();

  return sql;
}
