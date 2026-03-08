// ============================================================
// AIConclusions — Tab 3: Executive conclusion card + narration
// ============================================================
// Props:
//   conclusion — string  (3–5 bullet lines, **bold** markdown)
//   narration  — string  (3-section markdown: ### headers + paragraphs)
//   pocPartner — string  (e.g. 'Klarna')
//   views      — object  (views.overall.justt_poc / merchant_poc)
//   enrichment — object  (enrichment.justt_poc)
//   months     — string[]
// ============================================================
import { useState } from 'react';
import { ChevronDown, ChevronRight, BrainCircuit, FileText, Copy, Check } from 'lucide-react';

// ── Inline markdown renderer (handles **bold** only) ──────────────────────────
function Inline({ text }) {
  if (!text) return null;
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="text-gray-900 dark:text-white font-semibold">{part}</strong>
          : <MetricHighlight key={i} text={part} />
      )}
    </>
  );
}

// ── Metric highlighter — wraps % and $ figures in colored chips ───────────────
function MetricHighlight({ text }) {
  if (!text) return null;
  // Split on percentages like "61.2%" and dollar amounts like "$1,727.23"
  const parts = text.split(/(\$[\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\$[\d,]+(?:\.\d+)?$/.test(part)) {
          return (
            <span key={i}
              className="inline-block mx-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono
                         bg-emerald-100 dark:bg-emerald-950/60
                         border border-emerald-300 dark:border-emerald-800/50
                         text-emerald-700 dark:text-emerald-300">
              {part}
            </span>
          );
        }
        if (/^\d+(?:\.\d+)?%$/.test(part)) {
          return (
            <span key={i}
              className="inline-block mx-0.5 px-1.5 py-0.5 rounded text-[11px] font-mono
                         bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15
                         border border-[#6E3AEB]/30
                         text-[#6E3AEB] dark:text-[#c4b5fd]">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Text-to-bullets parser ─────────────────────────────────────────────────────
const SENT_SPLIT_RE = /(?<=\w{3,}[.!?]|[)][.!?])\s+(?=[A-Z])/;

function splitSentences(paragraph) {
  return paragraph
    .split(SENT_SPLIT_RE)
    .map(s => s.trim())
    .filter(Boolean);
}

function BulletList({ text }) {
  if (!text) return null;

  const byLine = text
    .split(/\n+/)
    .map(s => s.replace(/^[-•*]\s+|^\d+\.\s+/, '').trim())
    .filter(Boolean);

  const sentences = byLine.flatMap(line => splitSentences(line));

  if (sentences.length <= 1) {
    return (
      <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
        <Inline text={text.trim()} />
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sentences.map((s, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
          <span className="mt-[5px] shrink-0 w-1.5 h-1.5 rounded-full bg-[#6E3AEB]/60" />
          <span className="text-gray-700 dark:text-slate-300">
            <Inline text={s} />
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Copy-to-clipboard button ───────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="flex items-center gap-1.5
                 text-gray-400 dark:text-slate-500
                 hover:text-gray-700 dark:hover:text-slate-300
                 transition text-xs px-2.5 py-1 rounded-lg
                 hover:bg-gray-100 dark:hover:bg-slate-800"
    >
      {copied ? <Check size={12} className="text-emerald-500 dark:text-emerald-400" /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Section 1: Stat cards ─────────────────────────────────────────────────────
function StatCards({ views, pocPartner }) {
  if (!views?.overall) return null;
  const { justt_poc, merchant_poc } = views.overall;

  const totalCases  = arr => arr?.reduce((s, r) => s + (r.cases  ?? 0), 0) ?? 0;
  const totalAmount = arr => arr?.reduce((s, r) => s + (r.amount ?? 0), 0) ?? 0;

  const groups = [
    { label: 'Justt',                  key: 'jp', data: justt_poc,    color: 'border-[#6E3AEB]/50 bg-[#6E3AEB]/5 dark:bg-[#6E3AEB]/8'  },
    { label: pocPartner ?? 'Partner', key: 'kl', data: merchant_poc, color: 'border-gray-200 dark:border-slate-600/50 bg-gray-50 dark:bg-slate-800/40' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      {groups.map(g => {
        const cases  = totalCases(g.data);
        const amount = totalAmount(g.data);
        return (
          <div key={g.key}
               className={`rounded-xl border px-4 py-3 ${g.color}`}>
            <p className="text-gray-500 dark:text-slate-400 text-[10px] uppercase tracking-wider font-semibold mb-2">
              {g.label}
            </p>
            <p className="text-gray-900 dark:text-white text-xl font-bold">{cases.toLocaleString()}</p>
            <p className="text-gray-400 dark:text-slate-500 text-[10px] mt-0.5">cases</p>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold mt-2">
              ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-gray-400 dark:text-slate-500 text-[10px] mt-0.5">total amount</p>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 2: Win rate + Recovery rate table ─────────────────────────────────
function PerformanceTable({ views, months, pocPartner }) {
  if (!views?.overall || !months?.length) return null;
  const { justt_poc, merchant_poc } = views.overall;

  const jp  = month => justt_poc?.find(r => r.month === month);
  const kl  = month => merchant_poc?.find(r => r.month === month);

  const delta = (a, b) => {
    if (a == null || b == null) return null;
    const d = (a - b).toFixed(1);
    return d > 0 ? `+${d}pp` : `${d}pp`;
  };

  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            <th className="px-3 py-2.5 text-left font-semibold">Month</th>
            <th className="px-3 py-2.5 text-right font-semibold">Justt Win%</th>
            <th className="px-3 py-2.5 text-right font-semibold">{pocPartner} Win%</th>
            <th className="px-3 py-2.5 text-right font-semibold text-[#6E3AEB] dark:text-[#a78bfa]">Δ</th>
            <th className="px-3 py-2.5 text-right font-semibold">Justt RR%</th>
            <th className="px-3 py-2.5 text-right font-semibold">{pocPartner} RR%</th>
            <th className="px-3 py-2.5 text-right font-semibold text-[#6E3AEB] dark:text-[#a78bfa]">Δ</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => {
            const j = jp(m);
            const k = kl(m);
            const wDelta = delta(j?.win_rate, k?.win_rate);
            const rDelta = delta(j?.rr, k?.rr);
            const isPos  = d => d && d.startsWith('+');
            return (
              <tr key={m}
                  className={`border-t border-gray-100 dark:border-slate-800/60 ${i % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-900/30' : ''}`}>
                <td className="px-3 py-2 text-gray-500 dark:text-slate-400 font-mono">{m}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold">
                  {j?.win_rate?.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">
                  {k?.win_rate?.toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${isPos(wDelta) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {wDelta ?? '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold">
                  {j?.rr?.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">
                  {k?.rr?.toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${isPos(rDelta) ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {rDelta ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 3: Justt vs JNP consistency table ────────────────────────────────────
function ConsistencyTable({ views, months }) {
  if (!views?.overall || !months?.length) return null;
  const { justt_poc, justt_not_poc } = views.overall;

  const jp  = month => justt_poc?.find(r => r.month === month);
  const jnp = month => justt_not_poc?.find(r => r.month === month);

  const delta = (a, b) => {
    if (a == null || b == null) return null;
    const d = (a - b).toFixed(1);
    return d > 0 ? `+${d}pp` : `${d}pp`;
  };

  return (
    <div className="mb-4 overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
            <th className="px-3 py-2.5 text-left font-semibold">Month</th>
            <th className="px-3 py-2.5 text-right font-semibold">Justt Win%</th>
            <th className="px-3 py-2.5 text-right font-semibold">JNP Win%</th>
            <th className="px-3 py-2.5 text-right font-semibold text-[#6E3AEB] dark:text-[#a78bfa]">Δ Win</th>
            <th className="px-3 py-2.5 text-right font-semibold">Justt RR%</th>
            <th className="px-3 py-2.5 text-right font-semibold">JNP RR%</th>
            <th className="px-3 py-2.5 text-right font-semibold text-[#6E3AEB] dark:text-[#a78bfa]">Δ RR</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m, i) => {
            const j  = jp(m);
            const n  = jnp(m);
            const wD = delta(j?.win_rate, n?.win_rate);
            const rD = delta(j?.rr, n?.rr);
            const absDelta = d => d ? Math.abs(parseFloat(d)) : 999;
            const wAlert = absDelta(wD) > 5;
            return (
              <tr key={m}
                  className={`border-t border-gray-100 dark:border-slate-800/60 ${i % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-900/30' : ''}`}>
                <td className="px-3 py-2 text-gray-500 dark:text-slate-400 font-mono">{m}</td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold">
                  {j?.win_rate?.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">
                  {n?.win_rate?.toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${wAlert ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-400'}`}>
                  {wD ?? '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold">
                  {j?.rr?.toFixed(1)}%
                </td>
                <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">
                  {n?.rr?.toFixed(1)}%
                </td>
                <td className={`px-3 py-2 text-right font-semibold ${absDelta(rD) > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-slate-400'}`}>
                  {rD ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-3 py-1.5 text-gray-400 dark:text-slate-600 text-[10px] bg-gray-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-800/60">
        Δ &gt; 5pp highlighted — cherry-picking signal threshold
      </p>
    </div>
  );
}

// ── Section 4: Enrichment tables (split into two focused sub-tables) ─────────
function EnrichmentTable({ enrichment, months }) {
  if (!enrichment || !months?.length) return null;
  const jp  = month => enrichment.justt_poc?.find(r => r.month === month);
  const jnp = month => enrichment.justt_not_poc?.find(r => r.month === month);

  const SubLabel = ({ children }) => (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[#6E3AEB] dark:text-[#a78bfa] text-[10px] font-semibold uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-[#6E3AEB]/20" />
    </div>
  );

  return (
    <div className="mb-4 space-y-4">

      {/* ── Sub-table A: Merchant Data Availability ─────────────────────── */}
      <div>
        <SubLabel>Merchant Data Availability</SubLabel>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
                <th className="px-3 py-2.5 text-left font-semibold">Month</th>
                <th className="px-3 py-2.5 text-right font-semibold">Justt Merch%</th>
                <th className="px-3 py-2.5 text-right font-semibold">JNP Merch%</th>
                <th className="px-3 py-2.5 text-right font-semibold text-[#6E3AEB] dark:text-[#a78bfa]">Δ</th>
                <th className="px-3 py-2.5 text-right font-semibold">Justt Email%</th>
                <th className="px-3 py-2.5 text-right font-semibold">JNP Email%</th>
                <th className="px-3 py-2.5 text-right font-semibold">Justt EKATA%</th>
                <th className="px-3 py-2.5 text-right font-semibold">JNP EKATA%</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const j = jp(m);
                const n = jnp(m);
                const mDiff = (j?.merchant_data_rate != null && n?.merchant_data_rate != null)
                  ? (j.merchant_data_rate - n.merchant_data_rate).toFixed(1)
                  : null;
                const mDiffStr = mDiff != null ? (mDiff > 0 ? `+${mDiff}pp` : `${mDiff}pp`) : '—';
                const mDiffPos = mDiff != null && parseFloat(mDiff) > 0;
                return (
                  <tr key={m} className={`border-t border-gray-100 dark:border-slate-800/60 ${i % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-900/30' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400 font-mono">{m}</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold">{j?.merchant_data_rate?.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{n?.merchant_data_rate?.toFixed(1)}%</td>
                    <td className={`px-3 py-2 text-right font-semibold text-xs ${mDiffPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400'}`}>
                      {mDiffStr}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{j?.emailage_rate?.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{n?.emailage_rate?.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white">{j?.ekata_rate?.toFixed(1)}%</td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300">{n?.ekata_rate?.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sub-table B: Avg Enrichment Ratio ───────────────────────────── */}
      <div>
        <SubLabel>Avg Enrichment Ratio (0.0 – 1.0)</SubLabel>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
                <th className="px-3 py-2.5 text-left font-semibold">Month</th>
                <th className="px-3 py-2.5 text-right font-semibold">Justt Ratio</th>
                <th className="px-3 py-2.5 text-right font-semibold">JNP Ratio</th>
                <th className="px-3 py-2.5 text-right font-semibold text-[#6E3AEB] dark:text-[#a78bfa]">Δ</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const j = jp(m);
                const n = jnp(m);
                const rDiff = (j?.avg_enrichment_ratio != null && n?.avg_enrichment_ratio != null)
                  ? (j.avg_enrichment_ratio - n.avg_enrichment_ratio).toFixed(2)
                  : null;
                const rDiffStr = rDiff != null ? (rDiff > 0 ? `+${rDiff}` : `${rDiff}`) : '—';
                const rDiffPos = rDiff != null && parseFloat(rDiff) > 0;
                return (
                  <tr key={m} className={`border-t border-gray-100 dark:border-slate-800/60 ${i % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-900/30' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 dark:text-slate-400 font-mono">{m}</td>
                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-semibold font-mono">
                      {j?.avg_enrichment_ratio?.toFixed(2) ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-slate-300 font-mono">
                      {n?.avg_enrichment_ratio?.toFixed(2) ?? '—'}
                    </td>
                    <td className={`px-3 py-2 text-right font-semibold font-mono ${rDiffPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400'}`}>
                      {rDiffStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-100 dark:border-slate-800/60 bg-gray-50 dark:bg-slate-800/40">
                <td colSpan={4} className="px-3 py-1.5 text-gray-400 dark:text-slate-600 text-[10px]">
                  Higher ratio = richer dispute evidence available
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
}

// ── Helper: strip markdown table lines from text (for deduplication) ─────────
function stripMarkdownTables(text) {
  if (!text) return text;
  return text
    .split('\n')
    .filter(line => !line.trim().startsWith('|'))
    .join('\n')
    .trim();
}

// ── Markdown table parser ─────────────────────────────────────────────────────
function parseMarkdownTable(lines) {
  const tableLines = lines.filter(l => l.trim().startsWith('|'));
  if (tableLines.length < 2) return null;

  const parseRow = line =>
    line.split('|').slice(1, -1).map(c => c.trim());

  const sep = tableLines[1];
  if (!sep.includes('---')) return null;

  const headers = parseRow(tableLines[0]);
  const rows = tableLines.slice(2).map(parseRow);
  return { headers, rows };
}

// ── TextWithTables — renders text that may contain markdown tables ────────────
// Tables are extracted and rendered as styled HTML tables (same look as PerformanceTable).
// Non-table text is rendered through BulletList as usual.
function TextWithTables({ text }) {
  if (!text) return null;

  const lines  = text.split('\n');
  const segs   = [];
  let textBuf  = [];
  let tableBuf = [];
  let inTable  = false;

  for (const line of lines) {
    const isTableLine = line.trim().startsWith('|');
    if (isTableLine) {
      if (!inTable && textBuf.length) {
        const t = textBuf.join('\n').trim();
        if (t) segs.push({ type: 'text', content: t });
        textBuf = [];
      }
      inTable = true;
      tableBuf.push(line);
    } else {
      if (inTable) {
        segs.push({ type: 'table', lines: tableBuf });
        tableBuf = [];
        inTable  = false;
      }
      textBuf.push(line);
    }
  }
  if (inTable) segs.push({ type: 'table', lines: tableBuf });
  if (textBuf.length) {
    const t = textBuf.join('\n').trim();
    if (t) segs.push({ type: 'text', content: t });
  }

  return (
    <div className="space-y-4">
      {segs.map((seg, i) => {
        if (seg.type === 'text') {
          return <BulletList key={i} text={seg.content} />;
        }

        const table = parseMarkdownTable(seg.lines);
        if (!table) {
          return <BulletList key={i} text={seg.lines.join('\n')} />;
        }

        return (
          <div key={i} className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 uppercase tracking-wide text-[10px]">
                  {table.headers.map((h, j) => (
                    <th key={j} className={`px-3 py-2.5 font-semibold ${j === 0 ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri}
                      className={`border-t border-gray-100 dark:border-slate-800/60 ${ri % 2 === 0 ? 'bg-gray-50/50 dark:bg-slate-900/30' : ''}`}>
                    {row.map((cell, ci) => {
                      const isDelta    = /^[+\-]\d+(\.\d+)?pp$/.test(cell.trim());
                      const isPositive = isDelta && cell.trim().startsWith('+');
                      const colorCls   = isDelta
                        ? isPositive
                          ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                          : 'text-red-600 dark:text-red-400 font-semibold'
                        : ci === 0
                          ? 'text-gray-500 dark:text-slate-400'
                          : 'text-gray-700 dark:text-slate-300 font-semibold';
                      return (
                        <td key={ci}
                            className={`px-3 py-2 ${ci === 0 ? '' : 'text-right'} ${colorCls}`}>
                          <Inline text={cell} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 5: Dimension sub-sections ────────────────────────────────────────
function DimensionBullets({ text }) {
  if (!text) return null;

  const subSectionPattern = /\*\*([^*]+?):\*\*/g;
  const subSections = [];
  let currentLabel = null;
  let lastIndex = 0;
  let match;

  while ((match = subSectionPattern.exec(text)) !== null) {
    const body = text.slice(lastIndex, match.index).trim();
    subSections.push({ label: currentLabel, text: body });
    currentLabel = match[1];
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex).trim();
  subSections.push({ label: currentLabel, text: remaining });

  if (!subSections.some(s => s.label)) {
    return <BulletList text={text} />;
  }

  const rendered = subSections.filter(
    (s, i) => !(i === 0 && !s.label && !s.text)
  );

  return (
    <div className="space-y-4">
      {rendered.map((sub, i) => (
        <div key={i}>
          {sub.label && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#6E3AEB] dark:text-[#a78bfa] text-xs font-semibold uppercase tracking-wider">
                {sub.label}
              </span>
              <div className="flex-1 h-px bg-[#6E3AEB]/20" />
            </div>
          )}
          {sub.text && <BulletList text={sub.text} />}
        </div>
      ))}
    </div>
  );
}

// ── Executive conclusion card ──────────────────────────────────────────────────
function ConclusionCard({ conclusion, pocPartner }) {
  if (!conclusion) return null;

  const bullets = conclusion
    .split('\n')
    .map(s => s.replace(/^[-•*]\s+|^\d+\.\s+/, '').trim())
    .filter(Boolean);

  return (
    <div className="relative rounded-2xl border border-[#6E3AEB]/40 bg-white dark:bg-slate-900 overflow-hidden mb-6 shadow-sm dark:shadow-none">
      <div className="h-1 w-full bg-gradient-to-r from-[#6E3AEB] via-[#9c6ff7] to-[#6E3AEB]" />

      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="bg-[#6E3AEB]/15 rounded-lg p-1.5">
            <BrainCircuit size={15} className="text-[#a78bfa]" />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white text-sm font-semibold">Executive Conclusion</p>
            <p className="text-gray-400 dark:text-slate-500 text-[10px] mt-0.5">
              Generated by AI · Justt vs {pocPartner}
            </p>
          </div>
        </div>
        <CopyButton text={conclusion} />
      </div>

      <ul className="px-5 py-4 space-y-3.5">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-[#6E3AEB]/15 border border-[#6E3AEB]/40
                             flex items-center justify-center text-[10px] font-bold text-[#6E3AEB] dark:text-[#a78bfa]">
              {i + 1}
            </span>
            <p className="text-gray-700 dark:text-slate-300">
              <Inline text={bullet} />
            </p>
          </li>
        ))}
      </ul>

      <div className="px-5 pb-4">
        <span className="inline-flex items-center gap-1.5 text-[10px]
                         text-gray-400 dark:text-slate-600
                         bg-gray-100 dark:bg-slate-800/60
                         border border-gray-200 dark:border-slate-700/50
                         rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI-generated · Review before sharing externally
        </span>
      </div>
    </div>
  );
}

// ── Section body router — picks the right structured renderer per section ──────
function SectionBody({ index, body, views, enrichment, months, pocPartner }) {
  const idx = parseInt(index, 10);

  return (
    <div className="space-y-0">
      {/* Section 1: Overview — stat cards + bullets */}
      {idx === 1 && (
        <>
          <StatCards views={views} pocPartner={pocPartner} />
          <BulletList text={body} />
        </>
      )}

      {/* Section 2: Performance — comparison table + bullets (AI markdown table stripped — duplicate) */}
      {idx === 2 && (
        <>
          <PerformanceTable views={views} months={months} pocPartner={pocPartner} />
          <BulletList text={stripMarkdownTables(body)} />
        </>
      )}

      {/* Section 3: Dimensions — sub-sectioned bullets */}
      {idx === 3 && (
        <DimensionBullets text={body} />
      )}

      {/* Fallback for unlabelled sections (e.g. section 5 Apples-to-Apples) — tables rendered nicely */}
      {(idx < 1 || idx > 3) && (
        <TextWithTables text={body} />
      )}
    </div>
  );
}

// ── Narration section accordion item ──────────────────────────────────────────
function NarrationSection({ index, title, body, views, enrichment, months, pocPartner }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5
                   bg-white dark:bg-slate-900
                   hover:bg-gray-50 dark:hover:bg-slate-800/80
                   transition text-left"
      >
        <span className="shrink-0 w-6 h-6 rounded-md bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15 border border-[#6E3AEB]/30
                         flex items-center justify-center text-[10px] font-bold text-[#6E3AEB] dark:text-[#a78bfa]">
          {index}
        </span>
        <span className="text-gray-800 dark:text-slate-200 text-sm font-medium flex-1">{title}</span>
        {open
          ? <ChevronDown size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 py-4 bg-gray-50/50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-800">
          <SectionBody
            index={index}
            body={body}
            views={views}
            enrichment={enrichment}
            months={months}
            pocPartner={pocPartner}
          />
        </div>
      )}
    </div>
  );
}

// ── Narration document ─────────────────────────────────────────────────────────
function NarrationPanel({ narration, views, enrichment, months, pocPartner }) {
  if (!narration) return null;

  const sections = [];
  const lines = narration.split('\n');
  let current = null;

  for (const line of lines) {
    const headingMatch = line.match(/^###\s+(\d+)\.\s+(.+)/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { index: headingMatch[1], title: headingMatch[2], bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    }
  }
  if (current) sections.push(current);

  const parsed = sections.map(s => ({
    index: s.index,
    title: s.title,
    body:  s.bodyLines.join('\n').trim(),
  }));

  if (!parsed.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/60 rounded-xl px-5 py-4
                      text-gray-700 dark:text-slate-300 text-sm leading-relaxed">
        <BulletList text={narration} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parsed.map(s => (
        <NarrationSection
          key={s.index}
          index={s.index}
          title={s.title}
          body={s.body}
          views={views}
          enrichment={enrichment}
          months={months}
          pocPartner={pocPartner}
        />
      ))}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
export function AIConclusions({ conclusion, narration, pocPartner, views, enrichment, months, aiSkipped }) {

  if (!conclusion && !narration) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400 dark:text-slate-500">
        <BrainCircuit size={32} className="text-gray-300 dark:text-slate-700" />
        {aiSkipped ? (
          <div className="text-center max-w-sm">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">AI insights timed out</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">
              The n8n workflow took too long to respond (gateway timeout). All other tabs show your full data.
              Re-run the analysis or check the n8n execution log.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-slate-400">Run an analysis to generate AI insights</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Executive conclusion ── */}
      <ConclusionCard conclusion={conclusion} pocPartner={pocPartner ?? 'Merchant'} />

      {/* ── Detailed narration ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400 dark:text-slate-500" />
          <p className="text-gray-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Detailed Narration
          </p>
        </div>
        <CopyButton text={narration ?? ''} />
      </div>

      <NarrationPanel
        narration={narration}
        views={views}
        enrichment={enrichment}
        months={months}
        pocPartner={pocPartner ?? 'Merchant'}
      />

    </div>
  );
}
