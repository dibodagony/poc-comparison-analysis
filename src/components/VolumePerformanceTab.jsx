// ============================================================
// VolumePerformanceTab — Tab 1: Volume & Performance charts
// ============================================================
// Props:
//   data       — views object: { overall, fraud, non_fraud }
//   months     — string[]
//   pocPartner — string (e.g. 'Klarna')
//   dimensions — dimensions object from the API response
// ============================================================
import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  justt_poc:    '#6E3AEB',   // Justt purple
  merchant_poc: '#f59e0b',   // Amber
};
const DIM_PALETTE = [
  '#6E3AEB', '#f59e0b', '#10b981', '#3b82f6',
  '#ef4444', '#ec4899', '#8b5cf6', '#f97316',
];

function dimColorMap(keys) {
  const map = {};
  keys.forEach((k, i) => { map[k] = DIM_PALETTE[i % DIM_PALETTE.length]; });
  return map;
}

// ── Recharts shared axis props ─────────────────────────────────────────────────
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
const yAxisDark = (fmt) => ({
  tick: { fill: '#94a3b8', fontSize: 10 },
  tickLine: false,
  axisLine: false,
  tickFormatter: fmt,
  width: 40,
});
const yAxisLight = (fmt) => ({
  tick: { fill: '#6b7280', fontSize: 10 },
  tickLine: false,
  axisLine: false,
  tickFormatter: fmt,
  width: 40,
});
const gridDark  = { stroke: '#1e293b', vertical: false };
const gridLight = { stroke: '#f3f4f6', vertical: false };

// ── Detect dark mode from DOM ──────────────────────────────────────────────────
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function Tip({ active, payload, label, prefix = '', suffix = '', digits = 1 }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[140px]">
      <p className="text-gray-700 dark:text-slate-300 font-semibold mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 leading-5">
          <span style={{ color: p.color }}>●</span>
          <span className="text-gray-500 dark:text-slate-400 flex-1">{p.name}</span>
          <span className="text-gray-900 dark:text-white font-medium tabular-nums">
            {prefix}{typeof p.value === 'number' ? p.value.toFixed(digits) : p.value}{suffix}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Card wrapper ───────────────────────────────────────────────────────────────
function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4 ${className}`}>
      <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}

// ── Data helpers ───────────────────────────────────────────────────────────────
/**
 * Merge two group arrays into recharts rows keyed by display label.
 * e.g. { month, 'Justt': 61.2, 'Klarna': 47.3 }
 */
function mergeGroups(viewData, metric, justtLabel = 'Justt', merchantLabel = 'Merchant') {
  const base = viewData?.justt_poc ?? [];
  return base.map((row, i) => ({
    month:            row.month,
    // Preserve null so rate line-charts show a gap for suppressed months.
    // Bar charts (volumes) treat null the same as 0 — no bar rendered.
    [justtLabel]:    row[metric]                            ?? null,
    [merchantLabel]: viewData?.merchant_poc?.[i]?.[metric] ?? null,
  }));
}

/**
 * Convert absolute volume rows to % of total across the 2 groups.
 * Each row: { month, [justtLabel]: pct, [merchantLabel]: pct }
 * Works with any key names — operates over all non-month keys.
 */
function toPct(rows) {
  return rows.map(row => {
    const keys  = Object.keys(row).filter(k => k !== 'month');
    const total = keys.reduce((s, k) => s + (row[k] ?? 0), 0);
    if (!total) return row;
    const result = { month: row.month };
    for (const k of keys) {
      result[k] = Math.round(((row[k] ?? 0) / total) * 1000) / 10;
    }
    return result;
  });
}

/**
 * Remove months where every metric value is null.
 * Used for rate charts so that suppressed months don't appear on the X-axis.
 */
function dropNullMonths(rows) {
  return rows.filter(row =>
    Object.entries(row).some(([k, v]) => k !== 'month' && v !== null)
  );
}

/** Format large numbers compactly (e.g. 1200000 → $1.2M) */
function fmtAmount(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Section A: Performance (1×3 grid — Avg Case Amount moved to Dimensions) ───
function PerformanceSection({ viewData, volMode, volDisplay, pocPartner }) {
  const JUSTT_LABEL    = 'Justt';
  const MERCHANT_LABEL = pocPartner ?? 'Merchant';
  const GROUPS         = [JUSTT_LABEL, MERCHANT_LABEL];
  const groupColors    = { [JUSTT_LABEL]: C.justt_poc, [MERCHANT_LABEL]: C.merchant_poc };
  const legendStyle    = { fontSize: 11, color: '#94a3b8' };

  const dark   = isDarkMode();
  const xAxis  = dark ? xAxisDark  : xAxisLight;
  const yAxis  = dark ? yAxisDark  : yAxisLight;
  const grid   = dark ? gridDark   : gridLight;

  // Volume data: cases or amount, then optionally convert to pct
  const rawVolData = useMemo(
    () => mergeGroups(viewData, volMode === 'amount' ? 'amount' : 'cases', JUSTT_LABEL, MERCHANT_LABEL),
    [viewData, volMode, MERCHANT_LABEL]
  );
  const volData = useMemo(
    () => volDisplay === 'pct' ? toPct(rawVolData) : rawVolData,
    [rawVolData, volDisplay]
  );

  const wrData  = useMemo(() => dropNullMonths(mergeGroups(viewData, 'win_rate', JUSTT_LABEL, MERCHANT_LABEL)), [viewData, MERCHANT_LABEL]);
  const rrData  = useMemo(() => dropNullMonths(mergeGroups(viewData, 'rr',       JUSTT_LABEL, MERCHANT_LABEL)), [viewData, MERCHANT_LABEL]);

  const isPct    = volDisplay === 'pct';
  const isAmount = volMode === 'amount';

  const volTitle  = isPct
    ? `Volume — % of Total (${isAmount ? 'Amount' : 'Cases'})`
    : `Volume — ${isAmount ? 'Amount ($)' : 'Cases'}`;

  const volYFmt   = isPct ? (v => `${v}%`) : isAmount ? fmtAmount : (v => v);
  const volSuffix = isPct ? '%' : isAmount ? '' : ' cases';
  const volPrefix = (!isPct && isAmount) ? '$' : '';
  const volDigits = isPct ? 1 : isAmount ? 0 : 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">

      {/* Volume — grouped bars */}
      <Card title={volTitle}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={volData} barGap={3} barCategoryGap="28%">
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis(volYFmt)} />
            <Tooltip content={<Tip prefix={volPrefix} suffix={volSuffix} digits={volDigits} />} cursor={{ fill: 'rgba(100,100,100,0.06)' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            {GROUPS.map(g => (
              <Bar key={g} dataKey={g} fill={groupColors[g]} radius={[3, 3, 0, 0]} maxBarSize={14} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Win Rate — lines */}
      <Card title="Win Rate (%)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={wrData}>
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis(v => `${v}%`)} domain={['auto', 'auto']} />
            <Tooltip content={<Tip suffix="%" />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            {GROUPS.map(g => (
              <Line key={g} type="monotone" dataKey={g} stroke={groupColors[g]}
                    strokeWidth={2} dot={{ r: 3, fill: groupColors[g] }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Recovery Rate — lines */}
      <Card title="Recovery Rate (%)">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rrData}>
            <CartesianGrid {...grid} />
            <XAxis {...xAxis} />
            <YAxis {...yAxis(v => `${v}%`)} domain={['auto', 'auto']} />
            <Tooltip content={<Tip suffix="%" />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={legendStyle} />
            {GROUPS.map(g => (
              <Line key={g} type="monotone" dataKey={g} stroke={groupColors[g]}
                    strokeWidth={2} dot={{ r: 3, fill: groupColors[g] }} activeDot={{ r: 5 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>

    </div>
  );
}

// ── Section B: Dimension breakdown ────────────────────────────────────────────
const DIM_TABS = [
  { id: 'by_psp',            label: 'PSP'              },
  { id: 'by_card_scheme',    label: 'Card Scheme'       },
  { id: 'by_payment_method', label: 'Payment Method'    },
  { id: 'by_reason',         label: 'Fraud / Non-Fraud' },
];

/**
 * Convert per-category breakdown object to % of group total per month.
 * Input rows: [{ month, breakdown: { cat: value, ... } }, ...]
 * Returns new rows with breakdown values as % of their month total.
 */
function dimToPct(rows, field) {
  return rows.map(r => {
    const src    = r[field] ?? {};
    const total  = Object.values(src).reduce((s, v) => s + (v ?? 0), 0);
    const result = {};
    for (const [k, v] of Object.entries(src)) {
      result[k] = total > 0 ? Math.round(((v ?? 0) / total) * 1000) / 10 : 0;
    }
    return { ...r, [field]: result };
  });
}

// globalColors is a pre-built { category: color } map shared across all groups
// so the same category always gets the same color regardless of which group renders it.
function DimGroupChart({ rows, title, type, globalColors, volMode, volDisplay, domain }) {
  if (!rows?.length) {
    return (
      <Card title={title}>
        <p className="text-gray-400 dark:text-slate-600 text-xs italic">
          {rows === undefined ? 'No data for this group' : 'No data'}
        </p>
      </Card>
    );
  }

  const dark      = isDarkMode();
  const xAxisSm   = dark
    ? { dataKey: 'month', tick: { fill: '#94a3b8', fontSize: 9 }, tickLine: false, axisLine: { stroke: '#334155' } }
    : { dataKey: 'month', tick: { fill: '#6b7280', fontSize: 9 }, tickLine: false, axisLine: { stroke: '#e5e7eb' } };
  const yAxisSmFn = dark
    ? (fmt, w = 36, d) => ({ tick: { fill: '#94a3b8', fontSize: 9 }, tickLine: false, axisLine: false, width: w, tickFormatter: fmt, ...(d ? { domain: d } : {}) })
    : (fmt, w = 36, d) => ({ tick: { fill: '#6b7280', fontSize: 9 }, tickLine: false, axisLine: false, width: w, tickFormatter: fmt, ...(d ? { domain: d } : {}) });
  const gridSm    = dark ? gridDark : gridLight;
  const legendSm  = { fontSize: 10, color: dark ? '#94a3b8' : '#6b7280' };

  const isPct    = volDisplay === 'pct';
  const isAmount = volMode === 'amount';

  if (type === 'volume') {
    // Choose source field: 'breakdown' (cases) or 'amounts' (total amount)
    const srcField  = isAmount ? 'amounts' : 'breakdown';
    // Apply pct normalization if needed
    const chartRows = isPct ? dimToPct(rows, srcField) : rows;
    const keys      = Object.keys(rows[0]?.[srcField] ?? {});
    const colors    = globalColors ?? dimColorMap(keys);
    const chartData = chartRows.map(r => ({ month: r.month, ...(r[srcField] ?? {}) }));

    const yFmt   = isPct ? (v => `${v}%`) : isAmount ? fmtAmount : (v => v);
    const suffix = isPct ? '%' : isAmount ? '' : ' cases';
    const prefix = (!isPct && isAmount) ? '$' : '';
    const digits = isPct ? 1 : 0;

    return (
      <Card title={title}>
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid {...gridSm} />
            <XAxis {...xAxisSm} />
            <YAxis {...yAxisSmFn(yFmt, 36, domain ?? [0, 'auto'])} />
            <Tooltip content={<Tip prefix={prefix} suffix={suffix} digits={digits} />} cursor={{ fill: 'rgba(100,100,100,0.06)' }} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={legendSm} />
            {keys.map((k, idx) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="a"
                fill={colors[k]}
                radius={idx === keys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (type === 'avg') {
    // avg_amounts lines — use the same global colors so legend is consistent
    const amtKeys   = Object.keys(rows[0]?.avg_amounts ?? {});
    const amtColors = globalColors ?? dimColorMap(amtKeys);
    const chartData = rows.map(r => ({ month: r.month, ...r.avg_amounts }));
    return (
      <Card title={title}>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData}>
            <CartesianGrid {...gridSm} />
            <XAxis {...xAxisSm} />
            <YAxis {...yAxisSmFn(v => `$${v}`, 36, domain ?? [0, 'auto'])} />
            <Tooltip content={<Tip prefix="$" />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={legendSm} />
            {amtKeys.map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke={amtColors[k]}
                    strokeWidth={1.5} dot={{ r: 2.5, fill: amtColors[k] }} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  if (type === 'rr') {
    // recovery_rates lines — drop months where all categories are null
    const rrKeys   = Object.keys(rows[0]?.recovery_rates ?? {});
    const rrColors = globalColors ?? dimColorMap(rrKeys);
    const chartData = dropNullMonths(rows.map(r => ({ month: r.month, ...r.recovery_rates })));
    return (
      <Card title={title}>
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={chartData}>
            <CartesianGrid {...gridSm} />
            <XAxis {...xAxisSm} />
            <YAxis {...yAxisSmFn(v => `${v}%`, 36, domain ?? ['auto', 'auto'])} />
            <Tooltip content={<Tip suffix="%" />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={legendSm} />
            {rrKeys.map(k => (
              <Line key={k} type="monotone" dataKey={k} stroke={rrColors[k]}
                    strokeWidth={1.5} dot={{ r: 2.5, fill: rrColors[k] }} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    );
  }

  return null;
}

function DimensionSection({ dimensions, pocPartner, view, volMode, volDisplay }) {
  const [dimKey, setDimKey] = useState('by_psp');

  const groups = [
    { key: 'justt_poc',    label: 'Justt'      },
    { key: 'merchant_poc', label: pocPartner   },
  ];

  // ── Global color map: collect every category value across ALL groups,
  //    sort alphabetically so the same name always gets the same color. ──────
  const globalColors = useMemo(() => {
    const keySet = new Set();
    for (const g of groups) {
      const series = dimensions?.[g.key]?.[view]?.[dimKey] ?? [];
      for (const row of series) {
        Object.keys(row.breakdown ?? {}).forEach(k => keySet.add(k));
      }
    }
    return dimColorMap(Array.from(keySet).sort());
  }, [dimensions, view, dimKey]);

  // ── Shared Y-axis domains so both columns in the same row scale identically ──
  const sharedVolDomain = useMemo(() => {
    const srcField = volMode === 'amount' ? 'amounts' : 'breakdown';
    if (volDisplay === 'pct') return [0, 100];
    let max = 0;
    for (const g of groups) {
      const series = dimensions?.[g.key]?.[view]?.[dimKey] ?? [];
      for (const row of series) {
        const rowSum = Object.values(row[srcField] ?? {}).reduce((s, v) => s + (v ?? 0), 0);
        if (rowSum > max) max = rowSum;
      }
    }
    return [0, max === 0 ? 'auto' : Math.ceil(max * 1.05)];
  }, [dimensions, view, dimKey, volMode, volDisplay]);

  const sharedAvgDomain = useMemo(() => {
    let max = 0;
    for (const g of groups) {
      const series = dimensions?.[g.key]?.[view]?.[dimKey] ?? [];
      for (const row of series) {
        Object.values(row.avg_amounts ?? {}).forEach(v => { if ((v ?? 0) > max) max = v; });
      }
    }
    return [0, max === 0 ? 'auto' : Math.ceil(max * 1.1)];
  }, [dimensions, view, dimKey]);

  const sharedRrDomain = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const g of groups) {
      const series = dimensions?.[g.key]?.[view]?.[dimKey] ?? [];
      for (const row of series) {
        Object.values(row.recovery_rates ?? {}).filter(v => v != null).forEach(v => {
          if (v < min) min = v;
          if (v > max) max = v;
        });
      }
    }
    if (min === Infinity) return ['auto', 'auto'];
    const pad = (max - min) * 0.1 || 2;
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  }, [dimensions, view, dimKey]);

  if (dimensions == null) {
    return (
      <div className="py-8 flex flex-col items-center gap-2 text-center">
        <span className="text-2xl">📊</span>
        <p className="text-gray-500 dark:text-slate-400 text-sm">Dimension data not included in this response.</p>
        <p className="text-gray-400 dark:text-slate-600 text-xs max-w-md">
          Update the n8n <span className="text-gray-600 dark:text-slate-400 font-mono">04 Assemble Response</span> code node
          with the latest version to include dimension breakdowns.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Dimension sub-tabs */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-gray-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-widest mr-1">
          Dimension
        </p>
        {DIM_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setDimKey(t.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition border ${
              dimKey === t.id
                ? 'bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15 text-[#6E3AEB] dark:text-[#a78bfa] border-[#6E3AEB]/40'
                : 'text-gray-500 dark:text-slate-500 hover:text-gray-800 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border-transparent'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Recovery Rate lines — 2 groups */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {groups.map(g => (
          <DimGroupChart
            key={g.key}
            rows={dimensions?.[g.key]?.[view]?.[dimKey]}
            title={`${g.label} — Recovery Rate (%)`}
            type="rr"
            globalColors={globalColors}
            volMode={volMode}
            volDisplay={volDisplay}
            domain={sharedRrDomain}
          />
        ))}
      </div>

      {/* Volume stacked bars — 2 groups */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {groups.map(g => (
          <DimGroupChart
            key={g.key}
            rows={dimensions?.[g.key]?.[view]?.[dimKey]}
            title={`${g.label} — Volume`}
            type="volume"
            globalColors={globalColors}
            volMode={volMode}
            volDisplay={volDisplay}
            domain={sharedVolDomain}
          />
        ))}
      </div>

      {/* Avg amount lines — 2 groups */}
      <div className="grid grid-cols-2 gap-4">
        {groups.map(g => (
          <DimGroupChart
            key={g.key}
            rows={dimensions?.[g.key]?.[view]?.[dimKey]}
            title={`${g.label} — Avg Case Amount ($)`}
            type="avg"
            globalColors={globalColors}
            volMode={volMode}
            volDisplay={volDisplay}
            domain={sharedAvgDomain}
          />
        ))}
      </div>
    </div>
  );
}

// ── View toggle ────────────────────────────────────────────────────────────────
const VIEW_TABS = [
  { id: 'overall',   label: 'Overall'    },
  { id: 'fraud',     label: 'Fraud'      },
  { id: 'non_fraud', label: 'Non-Fraud'  },
];

// ── Main export ────────────────────────────────────────────────────────────────
export function VolumePerformanceTab({ data, months, pocPartner, dimensions }) {
  const [view,       setView]       = useState('overall');
  const [volMode,    setVolMode]    = useState('cases');   // 'cases' | 'amount'
  const [volDisplay, setVolDisplay] = useState('sum');     // 'sum' | 'pct'

  const viewData = data?.[view] ?? {};

  return (
    <div>

      {/* ── Top bar: view toggle + volume mode + display mode ── */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">

        {/* Overall / Fraud / Non-Fraud */}
        <div className="flex gap-1">
          {VIEW_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
                view === t.id
                  ? 'bg-[#6E3AEB] text-white shadow-lg shadow-[#6E3AEB]/30'
                  : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Cases / Amount toggle */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-lg p-0.5">
          {[{ id: 'cases', label: 'Cases' }, { id: 'amount', label: 'Amount' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => setVolMode(opt.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                volMode === opt.id
                  ? 'bg-[#6E3AEB] text-white shadow shadow-[#6E3AEB]/30'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sum / % of Total toggle */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-lg p-0.5">
          {[{ id: 'sum', label: 'Sum' }, { id: 'pct', label: '% of Total' }].map(opt => (
            <button
              key={opt.id}
              onClick={() => setVolDisplay(opt.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                volDisplay === opt.id
                  ? 'bg-[#6E3AEB] text-white shadow shadow-[#6E3AEB]/30'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <span className="text-gray-400 dark:text-slate-600 text-xs ml-1">
          3 groups · {months?.length ?? 0} months
        </span>
      </div>

      {/* ── Section A: Performance KPIs ── */}
      <PerformanceSection
        viewData={viewData}
        volMode={volMode}
        volDisplay={volDisplay}
        pocPartner={pocPartner}
      />

      {/* ── Section B: Dimension breakdown ── */}
      <div className="border-t border-gray-100 dark:border-slate-800/80 pt-6">
        <DimensionSection
          dimensions={dimensions}
          pocPartner={pocPartner ?? 'Merchant'}
          view={view}
          volMode={volMode}
          volDisplay={volDisplay}
        />
      </div>

    </div>
  );
}
