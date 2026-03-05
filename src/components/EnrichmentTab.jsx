// ============================================================
// EnrichmentTab — Tab 2: Enrichment & Risk charts (Justt POC only)
// ============================================================
// Props:
//   data   — enrichment object: { justt_poc[], data_points_coverage }
//            each justt_poc row: { month, high_risk_pct (fraud-only),
//                        merchant_data_rate, avg_enrichment_ratio }
//            data_points_coverage: { overall[], fraud[], non_fraud[] }
//              each item: { month, byDp: { dpName: pct|null } }
//   months — string[]
//
// Only Justt POC is shown — the Justt NOT POC group has been removed.
// ============================================================
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

// ── Palette ────────────────────────────────────────────────────────────────────
const POC_COLOR = '#6E3AEB';   // Justt purple

// Coverage tier colours
const TIER_HIGH   = '#6E3AEB';  // purple  ≥ 70%
const TIER_MID    = '#f59e0b';  // amber   30–69%
const TIER_LOW    = '#ef4444';  // red     < 30%

function tierColor(pct) {
  if (pct == null) return '#94a3b8';
  if (pct >= 70) return TIER_HIGH;
  if (pct >= 30) return TIER_MID;
  return TIER_LOW;
}

// ── Detect dark mode ───────────────────────────────────────────────────────────
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// ── Shared axis / grid props ───────────────────────────────────────────────────
const xAxisDark = {
  dataKey: 'month',
  tick: { fill: '#94a3b8', fontSize: 10 },
  tickLine: false,
  axisLine: { stroke: '#334155' },
};
const xAxisLight = {
  dataKey: 'month',
  tick: { fill: '#6b7280', fontSize: 10 },
  tickLine: false,
  axisLine: { stroke: '#e5e7eb' },
};
const yAxisPctDark = {
  tick: { fill: '#94a3b8', fontSize: 10 },
  tickLine: false,
  axisLine: false,
  tickFormatter: v => `${v}%`,
  width: 40,
  domain: [0, 100],
};
const yAxisPctLight = {
  tick: { fill: '#6b7280', fontSize: 10 },
  tickLine: false,
  axisLine: false,
  tickFormatter: v => `${v}%`,
  width: 40,
  domain: [0, 100],
};
const gridDark  = { stroke: '#1e293b', vertical: false };
const gridLight = { stroke: '#f3f4f6', vertical: false };

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function Tip({ active, payload, label, suffix = '%', digits = 1 }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[160px]">
      <p className="text-gray-700 dark:text-slate-300 font-semibold mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 leading-5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-gray-500 dark:text-slate-400 flex-1">{p.name}</span>
          <span className="text-gray-900 dark:text-white font-medium tabular-nums">
            {typeof p.value === 'number' ? p.value.toFixed(digits) : p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Card wrapper ───────────────────────────────────────────────────────────────
function Card({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4 ${className}`}>
      <div className="mb-3">
        <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
          {title}
        </p>
        {subtitle && (
          <p className="text-gray-400 dark:text-slate-600 text-[10px] mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Single KPI tile (Justt POC value only) ─────────────────────────────────────
function KpiTile({ label, value, suffix = '%', digits = 1 }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
      <div>
        <p className="text-[10px] mb-0.5" style={{ color: POC_COLOR }}>
          Justt
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          {value.toFixed(digits)}<span className="text-sm font-normal text-gray-500 dark:text-slate-400 ml-0.5">{suffix}</span>
        </p>
      </div>
    </div>
  );
}

// ── Helper: avg of a metric across all months ─────────────────────────────────
function avg(arr, metric) {
  const valid = (arr ?? []).filter(r => r[metric] != null);
  if (!valid.length) return 0;
  return valid.reduce((s, r) => s + r[metric], 0) / valid.length;
}

// ── Single-line chart ──────────────────────────────────────────────────────────
function SingleLineChart({ chartData, dataKey, suffix = '%', digits = 1, height = 220 }) {
  const dark    = isDarkMode();
  const xAxis   = dark ? xAxisDark   : xAxisLight;
  const yAxisPct = dark ? yAxisPctDark : yAxisPctLight;
  const grid    = dark ? gridDark    : gridLight;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid {...grid} />
        <XAxis {...xAxis} />
        <YAxis {...yAxisPct} tickFormatter={v => `${v}${suffix}`} />
        <Tooltip content={<Tip suffix={suffix} digits={digits} />} />
        <Line
          type="monotone" dataKey={dataKey}
          stroke={POC_COLOR} strokeWidth={2}
          dot={{ r: 3, fill: POC_COLOR }} activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── High-risk bar chart (fraud cases only) ─────────────────────────────────────
function HighRiskChart({ chartData, dataKey, height = 220 }) {
  const dark    = isDarkMode();
  const xAxis   = dark ? xAxisDark   : xAxisLight;
  const yAxisPct = dark ? yAxisPctDark : yAxisPctLight;
  const grid    = dark ? gridDark    : gridLight;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} barCategoryGap="40%">
        <CartesianGrid {...grid} />
        <XAxis {...xAxis} />
        <YAxis {...yAxisPct} domain={['auto', 'auto']} />
        <Tooltip content={<Tip suffix="%" />} />
        <Bar dataKey={dataKey} fill={POC_COLOR} radius={[3, 3, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── View toggle pills (shared pattern) ────────────────────────────────────────
const VIEW_TABS = [
  { id: 'overall',   label: 'Overall'   },
  { id: 'fraud',     label: 'Fraud'     },
  { id: 'non_fraud', label: 'Non-Fraud' },
];

function ViewToggle({ active, onChange }) {
  return (
    <div className="flex gap-1">
      {VIEW_TABS.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            active === t.id
              ? 'bg-[#6E3AEB] text-white shadow-lg shadow-[#6E3AEB]/30'
              : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Derive category prefix from a data-point name ─────────────────────────────
const CATEGORY_ORDER = [
  'AVS',
  'Billing',
  'Card',
  'Products',
  'Shipping',
  'Refunds',
  'Subscription',
  'Transaction',
  'Other',
];

function getCategory(name) {
  if (name.startsWith('AVS'))          return 'AVS';
  if (name.startsWith('Billing'))      return 'Billing';
  if (name.startsWith('Card'))         return 'Card';
  if (name.startsWith('Products'))     return 'Products';
  if (name.startsWith('Shipping'))     return 'Shipping';
  if (name.startsWith('Refunds'))      return 'Refunds';
  if (name.startsWith('Subscription')) return 'Subscription';
  if (name.startsWith('Transaction'))  return 'Transaction';
  return 'Other';
}

// ── Coverage Rankings view ─────────────────────────────────────────────────────
// Horizontal bar rows sorted by avg coverage, grouped by category.
function CoverageRankings({ seriesData }) {
  // Collect all data-point names and compute avg coverage across months
  const dpAvgs = useMemo(() => {
    const totals = {};
    const counts = {};
    for (const { byDp } of seriesData) {
      for (const [name, pct] of Object.entries(byDp)) {
        if (pct == null) continue;
        totals[name] = (totals[name] ?? 0) + pct;
        counts[name] = (counts[name] ?? 0) + 1;
      }
    }
    return Object.entries(totals)
      .map(([name, total]) => ({ name, avg: Math.round((total / counts[name]) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);
  }, [seriesData]);

  if (!dpAvgs.length) {
    return <p className="text-xs text-gray-400 dark:text-slate-500 py-4">No data point coverage data available.</p>;
  }

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 560 }}>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 px-1 text-[10px] text-gray-500 dark:text-slate-400">
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TIER_HIGH }} />High ≥70%</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TIER_MID }} />Medium 30–69%</span>
        <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: TIER_LOW }} />Low &lt;30%</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {dpAvgs.map(({ name, avg: pct }) => (
          <div key={name} className="flex items-center gap-2 group">
            {/* Name */}
            <span
              className="text-[10px] text-gray-600 dark:text-slate-400 shrink-0 text-right leading-tight"
              style={{ width: 210, minWidth: 210 }}
              title={name}
            >
              {name}
            </span>

            {/* Bar track */}
            <div className="flex-1 relative h-4 bg-gray-100 dark:bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: tierColor(pct),
                  opacity: 0.85,
                }}
              />
            </div>

            {/* Value */}
            <span
              className="text-[10px] font-semibold tabular-nums shrink-0"
              style={{ color: tierColor(pct), width: 38, textAlign: 'right' }}
            >
              {pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Monthly Heatmap view ───────────────────────────────────────────────────────
// Rows = data points (grouped by category), Columns = months.
function CoverageHeatmap({ seriesData, months }) {
  const [tooltip, setTooltip] = useState(null); // { x, y, name, month, pct }

  // Build a lookup: dpName → month → pct
  const lookup = useMemo(() => {
    const map = {};
    for (const { month, byDp } of seriesData) {
      for (const [name, pct] of Object.entries(byDp)) {
        if (!map[name]) map[name] = {};
        map[name][month] = pct;
      }
    }
    return map;
  }, [seriesData]);

  // All dp names, grouped by category
  const grouped = useMemo(() => {
    const allNames = Object.keys(lookup);
    const groups = {};
    for (const name of allNames) {
      const cat = getCategory(name);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(name);
    }
    // Sort names within each category alphabetically
    for (const cat of Object.keys(groups)) groups[cat].sort();
    // Return in category order
    return CATEGORY_ORDER.filter(c => groups[c]).map(c => ({ cat: c, names: groups[c] }));
  }, [lookup]);

  if (!months.length || !grouped.length) {
    return <p className="text-xs text-gray-400 dark:text-slate-500 py-4">No data point coverage data available.</p>;
  }

  const CELL_H = 22;
  const LABEL_W = 210;

  function cellBg(pct) {
    if (pct == null) return 'transparent';
    // Interpolate from a near-white to the brand purple across 0→100%
    const t = pct / 100;
    if (t >= 0.7) {
      // purple range: lighten with opacity
      return `rgba(110,58,235,${0.3 + t * 0.7})`;
    } else if (t >= 0.3) {
      // amber range
      return `rgba(245,158,11,${0.3 + t * 0.5})`;
    } else {
      // red range
      return `rgba(239,68,68,${0.15 + t * 0.6})`;
    }
  }

  function cellTextColor(pct) {
    if (pct == null) return '#94a3b8';
    return pct >= 50 ? '#ffffff' : '#374151';
  }

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 560 }}>
      <table className="text-[9px] border-collapse w-full" style={{ tableLayout: 'fixed' }}>
        {/* Column widths: fixed label + equal share for each month */}
        <colgroup>
          <col style={{ width: LABEL_W }} />
          {months.map(m => <col key={m} />)}
        </colgroup>
        {/* Month header */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white dark:bg-slate-900 text-right pr-2 font-normal text-gray-400 dark:text-slate-500"
                style={{ paddingBottom: 4 }}>
              Data Point
            </th>
            {months.map(m => (
              <th key={m}
                  className="font-semibold text-gray-500 dark:text-slate-400 text-center pb-1">
                {m.slice(5)} {/* MM */}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grouped.map(({ cat, names }) => (
            <>
              {/* Category header row */}
              <tr key={`cat-${cat}`}>
                <td
                  colSpan={months.length + 1}
                  className="sticky left-0 bg-gray-50 dark:bg-slate-800/60 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 px-1 py-0.5"
                >
                  {cat}
                </td>
              </tr>

              {/* Data-point rows */}
              {names.map(name => (
                <tr key={name} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                  {/* Sticky label */}
                  <td
                    className="sticky left-0 z-10 bg-white dark:bg-slate-900 text-right pr-2 text-gray-600 dark:text-slate-400 font-normal leading-tight"
                    style={{ height: CELL_H }}
                    title={name}
                  >
                    {name}
                  </td>

                  {/* Month cells */}
                  {months.map(m => {
                    const pct = lookup[name]?.[m] ?? null;
                    return (
                      <td
                        key={m}
                        className="text-center cursor-default relative"
                        style={{
                          height: CELL_H,
                          background: cellBg(pct),
                          color: cellTextColor(pct),
                          fontWeight: 500,
                          borderRadius: 2,
                          padding: '0 2px',
                        }}
                        onMouseEnter={e => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 6, name, month: m, pct });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                      >
                        {pct != null ? `${pct.toFixed(0)}%` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>

      {/* Floating tooltip (portal-style absolute, fixed to viewport) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-semibold text-gray-800 dark:text-white mb-0.5">{tooltip.name}</p>
          <p className="text-gray-500 dark:text-slate-400">{tooltip.month}</p>
          <p className="font-bold mt-0.5" style={{ color: tierColor(tooltip.pct) }}>
            {tooltip.pct != null ? `${tooltip.pct.toFixed(1)}%` : 'No data'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function EnrichmentTab({ data, months }) {
  const poc = data?.justt_poc ?? [];

  const DATA_KEY = 'Justt';

  // Build chart data arrays
  const highRiskData = useMemo(() =>
    poc.map(row => ({ month: row.month, [DATA_KEY]: row.high_risk_pct ?? null })),
    [data]);

  const merchantDataData = useMemo(() =>
    poc.map(row => ({ month: row.month, [DATA_KEY]: row.merchant_data_rate ?? null })),
    [data]);

  const avgRatioData = useMemo(() =>
    poc.map(row => ({ month: row.month, [DATA_KEY]: row.avg_enrichment_ratio != null ? row.avg_enrichment_ratio * 100 : null })),
    [data]);

  // Average KPI values
  const kpis = useMemo(() => ({
    highRisk:     avg(poc, 'high_risk_pct'),
    merchantData: avg(poc, 'merchant_data_rate'),
    avgRatio:     avg(poc, 'avg_enrichment_ratio') * 100,
  }), [data]);

  // ── Data point coverage state ──────────────────────────────────────────────
  const [dpView,    setDpView]    = useState('overall');    // 'overall' | 'fraud' | 'non_fraud'
  const [dpDisplay, setDpDisplay] = useState('rankings');   // 'rankings' | 'heatmap'

  const dpCoverage     = data?.data_points_coverage ?? null;
  const dpSeriesData   = dpCoverage?.[dpView] ?? [];
  const dpMonths       = dpSeriesData.map(d => d.month);

  if (!poc.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-slate-500">
        <span className="text-3xl">📈</span>
        <p className="text-sm text-gray-500 dark:text-slate-400">Run an analysis to load enrichment data</p>
      </div>
    );
  }

  return (
    <div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-2.5
                      bg-gray-50 dark:bg-slate-900/60
                      border border-gray-200 dark:border-slate-700/50
                      rounded-xl px-4 py-3 mb-5 text-xs
                      text-gray-600 dark:text-slate-400">
        <span className="text-base mt-0.5">🔍</span>
        <p>
          Enrichment & risk metrics are only available for <span className="text-[#a78bfa] font-medium">Justt-handled</span> cases.
          The merchant group is excluded from this tab.
          <span className="text-gray-400 dark:text-slate-500 ml-1">
            High-risk % is calculated on <span className="text-gray-600 dark:text-slate-300">fraud cases only</span> (EKATA&nbsp;&gt;&nbsp;400 or Emailage&nbsp;&gt;&nbsp;490).
          </span>
        </p>
      </div>

      {/* ── KPI summary row — 3 tiles ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiTile label="High-Risk Score % (Fraud)"  value={kpis.highRisk}     />
        <KpiTile label="Merchant Data Available"     value={kpis.merchantData} />
        <KpiTile label="Avg Enrichment Ratio"        value={kpis.avgRatio}     />
      </div>

      {/* ── Charts — 3 in a row ── */}
      <div className="grid grid-cols-3 gap-4">

        <Card
          title="High-Risk Score % (Fraud Cases)"
          subtitle="% of fraud cases flagged as high-risk (EKATA > 400 or Emailage > 490)"
        >
          <HighRiskChart chartData={highRiskData} dataKey={DATA_KEY} />
        </Card>

        <Card
          title="Merchant Data Availability"
          subtitle="% of cases where merchant-provided data was present"
        >
          <SingleLineChart chartData={merchantDataData} dataKey={DATA_KEY} />
        </Card>

        <Card
          title="Avg Enrichment Ratio"
          subtitle="Average enrichment ratio per case (shown as %)"
        >
          <SingleLineChart chartData={avgRatioData} dataKey={DATA_KEY} suffix="%" digits={1} height={220} />
        </Card>

      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── Data Point Coverage section ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {dpCoverage && (
        <div className="mt-8">

          {/* Section header */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Data Point Coverage</p>
              <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                % of chargebacks per month where each requested data point was received
              </p>
            </div>

            {/* View display toggle: Rankings / Heatmap */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-lg p-0.5">
              {[{ id: 'rankings', label: '↕ Rankings' }, { id: 'heatmap', label: '⊞ Heatmap' }].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDpDisplay(opt.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    dpDisplay === opt.id
                      ? 'bg-[#6E3AEB] text-white shadow shadow-[#6E3AEB]/30'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Overall / Fraud / Non-Fraud filter */}
          <div className="flex items-center gap-2 mb-4">
            <ViewToggle active={dpView} onChange={setDpView} />
            <span className="text-[10px] text-gray-400 dark:text-slate-500 ml-1">
              {dpMonths.length} month{dpMonths.length !== 1 ? 's' : ''} · Justt only
            </span>
          </div>

          {/* Visualisation container */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4">
            {dpDisplay === 'rankings' ? (
              <CoverageRankings seriesData={dpSeriesData} />
            ) : (
              <CoverageHeatmap seriesData={dpSeriesData} months={dpMonths} />
            )}
          </div>

        </div>
      )}

    </div>
  );
}
