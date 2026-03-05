// ============================================================
// ApplesToApplesTab — Tab 4: Apples-to-Apples Comparison
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
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  computeReweightedSeries,
  buildDimDistribution,
  buildDimHeadToHead,
  avg,
  weightedAvgRR,
  weightedAvgReweighted,
} from '../utils/reweightUtils.js';

// ── Brand palette ──────────────────────────────────────────────────────────────
const C = {
  justt:      '#6E3AEB',
  justtLight: '#a78bfa',
  merchant:   '#f59e0b',
};

// ── Detect dark mode ───────────────────────────────────────────────────────────
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

const gridDark  = { stroke: '#1e293b', vertical: false };
const gridLight = { stroke: '#f3f4f6', vertical: false };

// ── Helpers ────────────────────────────────────────────────────────────────────
function round1(v) {
  return v == null ? null : Math.round(v * 10) / 10;
}

function fmtPct(v, d = 1) {
  return v == null ? '—' : `${Number(v).toFixed(d)}%`;
}

function fmtDelta(v) {
  if (v == null) return '—';
  const sign = v >= 0 ? '+' : '';
  return `${sign}${v.toFixed(1)}pp`;
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl min-w-[180px]">
      <p className="text-gray-700 dark:text-slate-300 font-semibold mb-1.5">{label}</p>
      {payload.map(p =>
        p.value != null ? (
          <div key={p.name} className="flex items-center gap-2 leading-5">
            <span style={{ color: p.color }}>●</span>
            <span className="text-gray-500 dark:text-slate-400 flex-1">{p.name}</span>
            <span className="text-gray-900 dark:text-white font-medium tabular-nums">
              {Number(p.value).toFixed(1)}%
            </span>
          </div>
        ) : null
      )}
    </div>
  );
}

// ── Card wrapper ───────────────────────────────────────────────────────────────
function Card({ title, badge, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4 ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
            {title}
          </p>
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

// ── Delta badge ────────────────────────────────────────────────────────────────
function DeltaBadge({ value }) {
  if (value == null) return null;
  const pos = value >= 0;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap
      ${pos ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
             : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'}`}>
      {fmtDelta(value)} {pos ? 'Justt' : 'Merchant'}
    </span>
  );
}

// ── Gap chip ───────────────────────────────────────────────────────────────────
function GapChip({ label, value }) {
  if (value == null) return null;
  const pos = value >= 0;
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
      <span className="text-gray-500 dark:text-slate-400 text-[10px]">{label}:</span>
      <span className={`text-[10px] font-semibold tabular-nums ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {fmtDelta(value)}
      </span>
    </div>
  );
}

// ── Accordion ─────────────────────────────────────────────────────────────────
function Accordion({ title, subtitle, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4
                   hover:bg-gray-50 dark:hover:bg-slate-800/50 transition text-left"
      >
        <div className="flex items-baseline gap-2">
          <span className="text-gray-800 dark:text-slate-100 font-semibold text-sm">{title}</span>
          {subtitle && (
            <span className="text-gray-400 dark:text-slate-500 text-xs">{subtitle}</span>
          )}
        </div>
        {open
          ? <ChevronUp   size={16} className="text-gray-400 dark:text-slate-400 shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 dark:text-slate-400 shrink-0" />
        }
      </button>
      {open && <div className="px-5 pb-5">{children}</div>}
    </div>
  );
}

// ── Matchability badge for distribution table ──────────────────────────────────
function MatchBadge({ status }) {
  const MAP = {
    both:     { label: '✓ Both',          cls: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' },
    low_n:    { label: '⚠ Low-N',         cls: 'bg-yellow-100 dark:bg-yellow-950  text-yellow-700 dark:text-yellow-400'  },
    jp_only:  { label: '✗ Justt only',     cls: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'     },
    m_only:   { label: '✗ Merchant only', cls: 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400'     },
  };
  const cfg = MAP[status] ?? MAP.jp_only;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Distribution table (PSP / Card Scheme) ─────────────────────────────────────
function DistributionTable({ rows, pocPartner }) {
  return (
    <div className="overflow-x-auto mb-5">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="text-left   text-gray-500 dark:text-slate-400 font-semibold py-2 pr-4">Name</th>
            <th className="text-right  text-gray-500 dark:text-slate-400 font-semibold py-2 px-3">Justt Cases</th>
            <th className="text-right  text-gray-500 dark:text-slate-400 font-semibold py-2 px-3">Justt Share %</th>
            <th className="text-right  text-gray-500 dark:text-slate-400 font-semibold py-2 px-3">{pocPartner} Cases</th>
            <th className="text-right  text-gray-500 dark:text-slate-400 font-semibold py-2 px-3">{pocPartner} Share %</th>
            <th className="text-right  text-gray-500 dark:text-slate-400 font-semibold py-2 pl-4">Matchable?</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name} className="border-b border-gray-100 dark:border-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800/30">
              <td className="py-2 pr-4 text-gray-800 dark:text-slate-200 font-medium capitalize">{r.name}</td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-slate-300">
                {r.jpCases > 0 ? r.jpCases.toLocaleString() : <span className="text-gray-300 dark:text-slate-600">—</span>}
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-slate-300">
                {r.jpCases > 0 ? fmtPct(r.jpShare) : <span className="text-gray-300 dark:text-slate-600">—</span>}
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-slate-300">
                {r.mCases > 0 ? r.mCases.toLocaleString() : <span className="text-gray-300 dark:text-slate-600">—</span>}
              </td>
              <td className="py-2 px-3 text-right tabular-nums text-gray-700 dark:text-slate-300">
                {r.mCases > 0 ? fmtPct(r.mShare) : <span className="text-gray-300 dark:text-slate-600">—</span>}
              </td>
              <td className="py-2 pl-4 text-right">
                <MatchBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mini horizontal bar comparing JP vs Merchant share for one label ───────────
function DistroBar({ label, jpShare, mShare }) {
  const diff = jpShare != null && mShare != null ? round1(jpShare - mShare) : null;
  const bigDiff = Math.abs(diff ?? 0) > 5;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-700 dark:text-slate-300 text-[11px] font-medium capitalize">{label}</span>
        {diff != null && (
          <span className={`text-[10px] tabular-nums ${bigDiff ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-slate-500'}`}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}pp
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <div className="text-[9px] text-gray-400 dark:text-slate-500 mb-0.5">Justt {fmtPct(jpShare, 0)}</div>
          <div className="bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#6E3AEB]"
              style={{ width: `${Math.min(jpShare ?? 0, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="text-[9px] text-gray-400 dark:text-slate-500 mb-0.5">Merchant {fmtPct(mShare, 0)}</div>
          <div className="bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#f59e0b]"
              style={{ width: `${Math.min(mShare ?? 0, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Head-to-head line chart (generic: takes {month, jp, merchant} rows) ─────────
function HeadToHeadChart({ data, title, pocPartner, jpCases, mCases, lowN = false, className = '' }) {
  const dark      = isDarkMode();
  const grid      = dark ? gridDark : gridLight;
  const tickColor = dark ? '#94a3b8' : '#6b7280';
  const axisColor = dark ? '#334155' : '#e5e7eb';
  const legendStyle = { fontSize: 10, color: tickColor };

  const chartData = (data ?? []).filter(d => d.jp != null || d.merchant != null);
  if (!chartData.length) return null;

  const jpAvg = avg(data.map(d => d.jp));
  const mAvg  = avg(data.map(d => d.merchant));
  const delta = jpAvg != null && mAvg != null ? round1(jpAvg - mAvg) : null;

  return (
    <Card
      title={title}
      badge={
        <div className="flex flex-wrap items-center gap-1.5">
          <DeltaBadge value={delta} />
          {(jpCases != null && mCases != null) && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">
              Justt: {jpCases.toLocaleString()} | {pocPartner}: {mCases.toLocaleString()}
            </span>
          )}
          {lowN && (
            <span className="text-[10px] text-yellow-600 dark:text-yellow-500 font-medium">⚠ Low-N</span>
          )}
        </div>
      }
      className={className}
    >
      <ResponsiveContainer width="100%" height={170}>
        <LineChart data={chartData}>
          <CartesianGrid {...grid} />
          <XAxis
            dataKey="month"
            tick={{ fill: tickColor, fontSize: 9 }}
            tickLine={false}
            axisLine={{ stroke: axisColor }}
          />
          <YAxis
            tick={{ fill: tickColor, fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={v => `${v}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<Tip />} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={legendStyle} />
          <Line
            type="monotone" dataKey="jp" name="Justt"
            stroke={C.justt} strokeWidth={2}
            dot={{ r: 2.5, fill: C.justt }} activeDot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone" dataKey="merchant" name={pocPartner}
            stroke={C.merchant} strokeWidth={2}
            dot={{ r: 2.5, fill: C.merchant }} activeDot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── Top KPI summary strip ──────────────────────────────────────────────────────
function SummaryStrip({ data, months, reweighted }) {
  const mSeries          = data?.overall?.merchant_poc;
  const jpActual         = weightedAvgRR(data?.overall?.justt_poc);
  const mActual          = weightedAvgRR(mSeries);
  const jpRwReason         = weightedAvgReweighted(reweighted.byReason,        mSeries);
  const jpRwPsp            = weightedAvgReweighted(reweighted.byPsp,           mSeries);
  const jpRwScheme         = weightedAvgReweighted(reweighted.byCardScheme,    mSeries);
  const jpRwPaymentMethod  = weightedAvgReweighted(reweighted.byPaymentMethod, mSeries);

  const chips = [
    { label: 'Actual gap',              value: round1((jpActual          ?? 0) - (mActual ?? 0)), sub: 'unadjusted'                       },
    { label: 'F/NF adjusted',           value: round1((jpRwReason        ?? 0) - (mActual ?? 0)), sub: 'after fraud/non-fraud reweight'    },
    { label: 'PSP adjusted',            value: round1((jpRwPsp           ?? 0) - (mActual ?? 0)), sub: 'after PSP reweight'                },
    { label: 'Scheme adjusted',         value: round1((jpRwScheme        ?? 0) - (mActual ?? 0)), sub: 'after card scheme reweight'        },
    { label: 'Payment method adjusted', value: round1((jpRwPaymentMethod ?? 0) - (mActual ?? 0)), sub: 'after payment method reweight'     },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {chips.map(c => {
        const hasValue = c.value != null;
        const pos      = (c.value ?? 0) >= 0;
        return (
          <div
            key={c.label}
            className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4"
          >
            <p className="text-gray-400 dark:text-slate-500 text-[10px] uppercase tracking-widest mb-1">{c.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${
              !hasValue ? 'text-gray-300 dark:text-slate-600'
              : pos     ? 'text-emerald-600 dark:text-emerald-400'
              :            'text-red-600 dark:text-red-400'
            }`}>
              {hasValue ? fmtDelta(c.value) : '—'}
            </p>
            <p className="text-gray-400 dark:text-slate-600 text-[10px] mt-0.5">{c.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 1 ─────────────────────────────────────────────────────────────────
function Section1({ data, months, dimensions, pocPartner, reweighted }) {
  const dark      = isDarkMode();
  const grid      = dark ? gridDark : gridLight;
  const tickColor = dark ? '#94a3b8' : '#6b7280';
  const axisColor = dark ? '#334155' : '#e5e7eb';
  const legendStyle = { fontSize: 10, color: tickColor };

  // Chart data: 3 lines
  const chartData = useMemo(() => {
    const rows = months.map((month, i) => ({
      month,
      'Justt (actual)':    data?.overall?.justt_poc?.[i]?.rr    ?? null,
      'Justt (reweighted)': reweighted.byReason[i],
      [pocPartner]:         data?.overall?.merchant_poc?.[i]?.rr ?? null,
    }));
    // Drop months where both actual lines are null
    return rows.filter(r =>
      r['Justt (actual)'] != null || r[pocPartner] != null
    );
  }, [data, months, reweighted, pocPartner]);

  // Gap decomposition averages
  const mSeries_           = data?.overall?.merchant_poc;
  const mAvg               = weightedAvgRR(mSeries_);
  const jpActualGap        = round1((weightedAvgRR(data?.overall?.justt_poc)                           ?? 0) - (mAvg ?? 0));
  const byReasonGap        = round1((weightedAvgReweighted(reweighted.byReason,        mSeries_)       ?? 0) - (mAvg ?? 0));
  const byPspGap           = round1((weightedAvgReweighted(reweighted.byPsp,           mSeries_)       ?? 0) - (mAvg ?? 0));
  const byPaymentMethodGap = round1((weightedAvgReweighted(reweighted.byPaymentMethod, mSeries_)       ?? 0) - (mAvg ?? 0));

  // Left panel distribution data
  const fraudDist = useMemo(() => {
    let jpFraud = 0, jpTot = 0, mFraud = 0, mTot = 0;
    for (const r of (data?.fraud?.justt_poc       ?? [])) { jpFraud += r.cases ?? 0; }
    for (const r of (data?.overall?.justt_poc      ?? [])) { jpTot   += r.cases ?? 0; }
    for (const r of (data?.fraud?.merchant_poc     ?? [])) { mFraud  += r.cases ?? 0; }
    for (const r of (data?.overall?.merchant_poc   ?? [])) { mTot    += r.cases ?? 0; }
    return {
      fraud:    { jp: jpTot > 0 ? round1((jpFraud / jpTot) * 100) : 0,           m: mTot > 0 ? round1((mFraud / mTot) * 100) : 0 },
      nonFraud: { jp: jpTot > 0 ? round1(((jpTot - jpFraud) / jpTot) * 100) : 0, m: mTot > 0 ? round1(((mTot - mFraud) / mTot) * 100) : 0 },
    };
  }, [data]);

  const pspDist           = useMemo(() => buildDimDistribution(dimensions, 'by_psp').slice(0, 5),            [dimensions]);
  const schemeDist        = useMemo(() => buildDimDistribution(dimensions, 'by_card_scheme').slice(0, 5),   [dimensions]);
  const paymentMethodDist = useMemo(() => buildDimDistribution(dimensions, 'by_payment_method').slice(0, 5), [dimensions]);

  return (
    <div>
      <h2 className="text-gray-800 dark:text-slate-200 font-semibold text-base mb-3">
        Resampled Comparison
      </h2>

      <div className="grid gap-4 items-stretch" style={{ gridTemplateColumns: '30% 1fr' }}>
        {/* ── Left: distribution panel (30%) ── */}
        <div>
          <Card title="How the sample was constructed" className="max-h-[480px] overflow-y-auto">
            <p className="text-gray-400 dark:text-slate-500 text-[10px] mb-4 leading-relaxed">
              The reweighted line applies the merchant's case mix (fraud/non-fraud, PSP, card scheme)
              as weights to Justt's own per-segment rates — equalising difficulty for a fair comparison.
            </p>

            <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest mb-2.5">
              Fraud / Non-Fraud
            </p>
            <DistroBar label="Fraud"     jpShare={fraudDist.fraud.jp}    mShare={fraudDist.fraud.m} />
            <DistroBar label="Non-Fraud" jpShare={fraudDist.nonFraud.jp} mShare={fraudDist.nonFraud.m} />

            <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-4 mb-2.5">
              PSP Mix (top {pspDist.length})
            </p>
            {pspDist.map(r => (
              <DistroBar key={r.name} label={r.name} jpShare={r.jpShare} mShare={r.mShare} />
            ))}

            <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-4 mb-2.5">
              Card Scheme (top {schemeDist.length})
            </p>
            {schemeDist.map(r => (
              <DistroBar key={r.name} label={r.name} jpShare={r.jpShare} mShare={r.mShare} />
            ))}

            <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest mt-4 mb-2.5">
              Payment Method (top {paymentMethodDist.length})
            </p>
            {paymentMethodDist.map(r => (
              <DistroBar key={r.name} label={r.name} jpShare={r.jpShare} mShare={r.mShare} />
            ))}
          </Card>
        </div>

        {/* ── Right: 3-line chart + gap chips (70%) ── */}
        <div className="flex flex-col">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-col flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <p className="text-gray-500 dark:text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
                Monthly Recovery Rate — Reweighted Comparison
              </p>
            </div>
            <div className="flex-1" style={{ minHeight: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid {...grid} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: tickColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: axisColor }}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tickFormatter={v => `${v}%`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<Tip />} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={legendStyle}
                  />
                  <Line
                    type="monotone" dataKey="Justt (actual)"
                    stroke={C.justt} strokeWidth={2.5}
                    dot={{ r: 3, fill: C.justt }} activeDot={{ r: 5 }}
                    connectNulls
                  />
                  <Line
                    type="monotone" dataKey="Justt (reweighted)"
                    stroke={C.justtLight} strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 2, fill: C.justtLight }} activeDot={{ r: 4 }}
                    connectNulls
                  />
                  <Line
                    type="monotone" dataKey={pocPartner}
                    stroke={C.merchant} strokeWidth={2.5}
                    dot={{ r: 3, fill: C.merchant }} activeDot={{ r: 5 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Gap decomposition chips — inside the card at the bottom */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-slate-700/60">
              <span className="text-gray-400 dark:text-slate-500 text-[10px] font-medium">Gap decomposition (avg RR):</span>
              <GapChip label="Actual gap"                    value={jpActualGap} />
              <span className="text-gray-300 dark:text-slate-600 text-[10px]">→</span>
              <GapChip label="After F/NF reweight"           value={byReasonGap} />
              <span className="text-gray-300 dark:text-slate-600 text-[10px]">→</span>
              <GapChip label="After PSP reweight"            value={byPspGap} />
              <span className="text-gray-300 dark:text-slate-600 text-[10px]">→</span>
              <GapChip label="After payment method reweight" value={byPaymentMethodGap} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PSP / Card Scheme head-to-head mini chart ──────────────────────────────────
function DimHeadToHead({ dimKey, dimValue, row, dimensions, months, pocPartner }) {
  const data = useMemo(
    () => buildDimHeadToHead(dimensions, dimKey, dimValue, months),
    [dimensions, dimKey, dimValue, months]
  );

  return (
    <HeadToHeadChart
      data={data}
      title={dimValue}
      pocPartner={pocPartner}
      jpCases={row.jpCases}
      mCases={row.mCases}
      lowN={row.status === 'low_n'}
    />
  );
}

// ── Section 2 ─────────────────────────────────────────────────────────────────
function Section2({ data, months, dimensions, pocPartner }) {
  // 2A: fraud / non-fraud series
  const fraudData = useMemo(() =>
    months.map((month, i) => ({
      month,
      jp:       data?.fraud?.justt_poc?.[i]?.rr      ?? null,
      merchant: data?.fraud?.merchant_poc?.[i]?.rr   ?? null,
    })), [data, months]);

  const nonFraudData = useMemo(() =>
    months.map((month, i) => ({
      month,
      jp:       data?.non_fraud?.justt_poc?.[i]?.rr    ?? null,
      merchant: data?.non_fraud?.merchant_poc?.[i]?.rr ?? null,
    })), [data, months]);

  const fraudJpCases    = useMemo(() => (data?.fraud?.justt_poc     ?? []).reduce((s, r) => s + (r.cases ?? 0), 0), [data]);
  const fraudMCases     = useMemo(() => (data?.fraud?.merchant_poc  ?? []).reduce((s, r) => s + (r.cases ?? 0), 0), [data]);
  const nfJpCases       = useMemo(() => (data?.non_fraud?.justt_poc    ?? []).reduce((s, r) => s + (r.cases ?? 0), 0), [data]);
  const nfMCases        = useMemo(() => (data?.non_fraud?.merchant_poc ?? []).reduce((s, r) => s + (r.cases ?? 0), 0), [data]);

  // 2B: PSP
  const pspRows = useMemo(() => buildDimDistribution(dimensions, 'by_psp'), [dimensions]);
  const pspChartable = pspRows.filter(r => r.status === 'both' || r.status === 'low_n');

  // 2C: Card scheme
  const schemeRows = useMemo(() => buildDimDistribution(dimensions, 'by_card_scheme'), [dimensions]);
  const schemeChartable = schemeRows.filter(r => r.status === 'both' || r.status === 'low_n');

  // 2D: Payment method
  const paymentMethodRows = useMemo(() => buildDimDistribution(dimensions, 'by_payment_method'), [dimensions]);
  const paymentMethodChartable = paymentMethodRows.filter(r => r.status === 'both' || r.status === 'low_n');

  return (
    <div className="space-y-4">
      <h2 className="text-gray-800 dark:text-slate-200 font-semibold text-base">
        Dimension Head-to-Head
      </h2>

      {/* ── 2A: Fraud vs Non-Fraud ── */}
      <Accordion title="Fraud vs Non-Fraud" subtitle="same dispute type, fair comparison">
        <div className="grid grid-cols-2 gap-4 mt-2">
          <HeadToHeadChart
            data={fraudData}
            title="Fraud Cases — Recovery Rate"
            pocPartner={pocPartner}
            jpCases={fraudJpCases}
            mCases={fraudMCases}
          />
          <HeadToHeadChart
            data={nonFraudData}
            title="Non-Fraud Cases — Recovery Rate"
            pocPartner={pocPartner}
            jpCases={nfJpCases}
            mCases={nfMCases}
          />
        </div>
      </Accordion>

      {/* ── 2B: PSP ── */}
      <Accordion
        title="PSP"
        subtitle={`${pspRows.length} PSP${pspRows.length !== 1 ? 's' : ''} found`}
      >
        <div className="mt-2">
          <DistributionTable rows={pspRows} pocPartner={pocPartner} />
        </div>
        {pspChartable.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {pspChartable.map(r => (
              <DimHeadToHead
                key={r.name}
                dimKey="by_psp"
                dimValue={r.name}
                row={r}
                dimensions={dimensions}
                months={months}
                pocPartner={pocPartner}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-6">
            No PSPs present in both groups with sufficient data.
          </p>
        )}
      </Accordion>

      {/* ── 2C: Card Scheme ── */}
      <Accordion
        title="Card Scheme"
        subtitle={`${schemeRows.length} scheme${schemeRows.length !== 1 ? 's' : ''} found`}
      >
        <div className="mt-2">
          <DistributionTable rows={schemeRows} pocPartner={pocPartner} />
        </div>
        {schemeChartable.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {schemeChartable.map(r => (
              <DimHeadToHead
                key={r.name}
                dimKey="by_card_scheme"
                dimValue={r.name}
                row={r}
                dimensions={dimensions}
                months={months}
                pocPartner={pocPartner}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-6">
            No card schemes present in both groups with sufficient data.
          </p>
        )}
      </Accordion>

      {/* ── 2D: Payment Method ── */}
      <Accordion
        title="Payment Method"
        subtitle={`${paymentMethodRows.length} method${paymentMethodRows.length !== 1 ? 's' : ''} found`}
      >
        <div className="mt-2">
          <DistributionTable rows={paymentMethodRows} pocPartner={pocPartner} />
        </div>
        {paymentMethodChartable.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {paymentMethodChartable.map(r => (
              <DimHeadToHead
                key={r.name}
                dimKey="by_payment_method"
                dimValue={r.name}
                row={r}
                dimensions={dimensions}
                months={months}
                pocPartner={pocPartner}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-slate-500 text-sm text-center py-6">
            No payment methods present in both groups with sufficient data.
          </p>
        )}
      </Accordion>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function ApplesToApplesTab({ data, months, pocPartner, dimensions }) {
  const reweighted = useMemo(
    () => computeReweightedSeries(data, dimensions, months),
    [data, dimensions, months]
  );

  return (
    <div className="space-y-6">
      <SummaryStrip data={data} months={months} reweighted={reweighted} pocPartner={pocPartner} />
      <Section1
        data={data}
        months={months}
        dimensions={dimensions}
        pocPartner={pocPartner}
        reweighted={reweighted}
      />
      <Section2
        data={data}
        months={months}
        dimensions={dimensions}
        pocPartner={pocPartner}
      />
    </div>
  );
}
