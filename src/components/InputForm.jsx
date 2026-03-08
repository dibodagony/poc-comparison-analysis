// ============================================================
// InputForm — Landing form: two modes
//   1. Query mode  — merchant picker + month range → Snowflake
//   2. CSV mode    — file upload + merchant picker → bypass Snowflake
//
// Layout: self-contained two-card flex row.
//   Left card  — always visible (main form)
//   Right card — scope panel, slides in as a second card beside the first
// ============================================================
import { useState, useRef } from 'react';
import {
  PlayCircle, AlertCircle, AlertTriangle, Database, Upload, FileText, X,
  Copy, Check, Code2, Settings2, ChevronRight, ChevronDown,
} from 'lucide-react';
import { MerchantSelect }    from './MerchantSelect.jsx';
import { MultiSearchPicker } from './MultiSearchPicker.jsx';
import { aggregateCsvRows }  from '../utils/aggregateCsv.js';
import { buildExportSql }    from '../utils/buildSql.js';
import {
  REASON_GROUPS,
  PSP_OPTIONS,
  CARD_SCHEME_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
} from '../constants/scopeOptions.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function monthToLastDay(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

function defaultMonths() {
  const now   = new Date();
  const end   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const fmt   = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { start: fmt(start), end: fmt(end) };
}

function defaultScope() {
  return {
    differentiator: 'source_only',
    reasonGroups:   [],
    psps:           [],
    cardSchemes:    [],
    paymentMethods: [],
  };
}

// ── CSV parser — handles quoted multiline fields (RFC 4180) ──────────────────
function parseCsv(text) {
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const records = [];
  let row    = [];
  let field  = '';
  let inQuote = false;

  for (let i = 0; i < src.length; i++) {
    const ch   = src[i];
    const next = src[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"')            { inQuote = false; }
      else                            { field += ch; }
    } else {
      if      (ch === '"')  { inQuote = true; }
      else if (ch === ',')  { row.push(field.trim()); field = ''; }
      else if (ch === '\n') {
        row.push(field.trim()); field = '';
        if (row.some(f => f !== '')) records.push(row);
        row = [];
      } else { field += ch; }
    }
  }
  row.push(field.trim());
  if (row.some(f => f !== '')) records.push(row);

  if (records.length < 2) throw new Error('CSV must have at least a header row and one data row.');

  const headers = records[0].map(h => h.replace(/^["']|["']$/g, ''));
  const rows = records.slice(1).map(vals => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ''; });
    return obj;
  });

  return { headers, rows };
}

// ── Mode tab button ───────────────────────────────────────────────────────────
function ModeTab({ active, onClick, icon: Icon, label, sub }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border transition text-left
        ${active
          ? 'bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15 border-[#6E3AEB]/50 text-gray-900 dark:text-white'
          : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
    >
      <Icon size={16} className={active ? 'text-[#a78bfa]' : 'text-gray-400 dark:text-slate-500'} />
      <div>
        <p className="text-sm font-semibold leading-tight">{label}</p>
        <p className="text-[10px] mt-0.5 leading-tight opacity-70">{sub}</p>
      </div>
    </button>
  );
}

// ── Scope card content ────────────────────────────────────────────────────────
function ScopeCardContent({ scope, onChange, onClose, disabled }) {
  function updateScope(patch) {
    onChange({ ...scope, ...patch });
  }

  const hasFilters =
    scope.differentiator !== 'source_only' ||
    scope.reasonGroups.length > 0 ||
    scope.psps.length > 0 ||
    scope.cardSchemes.length > 0 ||
    scope.paymentMethods.length > 0;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings2 size={15} className="text-[#a78bfa]" />
          <span className="font-semibold text-gray-800 dark:text-white text-sm">Customize Scope</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500
                     hover:text-gray-700 dark:hover:text-white
                     hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-0.5">

        {/* ── Section A: Differentiator ──────────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-500
                         uppercase tracking-widest mb-2.5">
            A · Differentiator
            <span className="ml-1.5 text-red-400 font-normal normal-case tracking-normal">required</span>
          </p>
          <div className="flex flex-col gap-2">
            {[
              {
                value: 'source_only',
                label: 'Source only',
                sub:   'All Justt cases — no AB test filter',
              },
              {
                value: 'source_ab_test',
                label: 'Source + AB Test',
                sub:   'Limit Justt to EXTERNAL_AB_TEST = test',
              },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateScope({ differentiator: opt.value })}
                disabled={disabled}
                className={`text-left px-3 py-2.5 rounded-lg border text-xs transition
                  ${scope.differentiator === opt.value
                    ? 'bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15 border-[#6E3AEB]/50 text-gray-900 dark:text-white'
                    : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                  }`}
              >
                <p className="font-semibold leading-tight">{opt.label}</p>
                <p className="mt-0.5 leading-tight opacity-70">{opt.sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Section B: Dimension Filters ──────────────────────────── */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 dark:text-slate-500
                         uppercase tracking-widest mb-2.5">
            B · Dimension Filters
            <span className="ml-1.5 text-gray-400 dark:text-slate-600 font-normal normal-case tracking-normal">optional</span>
          </p>
          <div className="space-y-4">

            {/* Reason group */}
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1.5">
                Reason group
                <span className="ml-1 text-gray-400 dark:text-slate-600 font-normal">(empty = all)</span>
              </p>
              <div className="flex gap-2">
                {REASON_GROUPS.map(rg => {
                  const checked = scope.reasonGroups.includes(rg.value);
                  return (
                    <label
                      key={rg.value}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition select-none
                        ${checked
                          ? 'bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15 border-[#6E3AEB]/50 text-gray-900 dark:text-white'
                          : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => {
                          const next = checked
                            ? scope.reasonGroups.filter(v => v !== rg.value)
                            : [...scope.reasonGroups, rg.value];
                          updateScope({ reasonGroups: next });
                        }}
                      />
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0
                        ${checked
                          ? 'bg-[#6E3AEB] border-[#6E3AEB]'
                          : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600'
                        }`}
                      >
                        {checked && <Check size={8} className="text-white" strokeWidth={3} />}
                      </span>
                      {rg.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <MultiSearchPicker
              label="PSP"
              options={PSP_OPTIONS}
              selected={scope.psps}
              onChange={psps => updateScope({ psps })}
              placeholder="Search PSP…"
              disabled={disabled}
            />

            <MultiSearchPicker
              label="Card scheme"
              options={CARD_SCHEME_OPTIONS}
              selected={scope.cardSchemes}
              onChange={cardSchemes => updateScope({ cardSchemes })}
              placeholder="Search card scheme…"
              disabled={disabled}
            />

            <MultiSearchPicker
              label="Payment method"
              options={PAYMENT_METHOD_OPTIONS}
              selected={scope.paymentMethods}
              onChange={paymentMethods => updateScope({ paymentMethods })}
              placeholder="Search payment method…"
              disabled={disabled}
            />

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => onChange(defaultScope())}
          disabled={disabled || !hasFilters}
          className="w-full text-xs text-gray-400 dark:text-slate-600
                     hover:text-gray-600 dark:hover:text-slate-400
                     disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

// ── SQL panel component ───────────────────────────────────────────────────────
function SqlPanel({ merchant, startMonth, endMonth, scope, isLoading }) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);

  const canGenerate = !!merchant && !!startMonth && !!endMonth;

  function getSql() {
    if (!canGenerate) return null;
    return buildExportSql({
      merchant_id: merchant,
      start_date:  startMonth + '-01',
      end_date:    monthToLastDay(endMonth),
      scope,
    });
  }

  function handleCopy() {
    const sql = getSql();
    if (!sql) return;
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border border-gray-200 dark:border-slate-700/60 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5
                      bg-white dark:bg-slate-900/40">
        <button
          type="button"
          onClick={() => canGenerate && !isLoading && setOpen(v => !v)}
          disabled={isLoading || !canGenerate}
          className={`flex items-center gap-2 text-sm font-medium transition
            ${canGenerate && !isLoading
              ? 'text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white cursor-pointer'
              : 'text-gray-400 dark:text-slate-600 cursor-not-allowed'
            }`}
        >
          <Code2 size={14} className={canGenerate ? 'text-[#a78bfa]' : 'text-gray-400 dark:text-slate-600'} />
          Get SQL for CSV export
          {open
            ? <ChevronDown  size={14} className="text-gray-400 dark:text-slate-500" />
            : <ChevronRight size={14} className="text-gray-400 dark:text-slate-500" />
          }
        </button>

        {open && canGenerate && (
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition
              ${copied
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700/50'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>

      {open && canGenerate && (
        <div className="border-t border-gray-200 dark:border-slate-700/60">
          <pre className="px-4 py-3 text-[11px] leading-relaxed
                          font-mono text-gray-700 dark:text-slate-300
                          bg-gray-50 dark:bg-slate-900/60
                          overflow-x-auto max-h-72 overflow-y-auto
                          whitespace-pre">
            {getSql()}
          </pre>
        </div>
      )}

      {!canGenerate && (
        <p className="px-4 pb-2.5 text-[10px] text-gray-400 dark:text-slate-600">
          Select a merchant and date range to generate the SQL.
        </p>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function InputForm({ onSubmit, isLoading, analysisError }) {
  const defaults = defaultMonths();

  // Shared
  const [mode,            setMode]            = useState('query');
  const [merchant,        setMerchant]        = useState('');
  const [validationError, setValidationError] = useState(null);

  // Query mode
  const [startMonth, setStartMonth] = useState(defaults.start);
  const [endMonth,   setEndMonth]   = useState(defaults.end);

  // CSV mode
  const [csvFile,    setCsvFile]    = useState(null);
  const [csvRows,    setCsvRows]    = useState(null);
  const [csvError,   setCsvError]   = useState(null);
  const [csvParsing, setCsvParsing] = useState(false);
  const fileInputRef = useRef(null);

  // Scope + side panel
  const [scope,     setScope]     = useState(defaultScope());
  const [scopeOpen, setScopeOpen] = useState(false);

  const hasFilters =
    scope.differentiator !== 'source_only' ||
    scope.reasonGroups.length > 0 ||
    scope.psps.length > 0 ||
    scope.cardSchemes.length > 0 ||
    scope.paymentMethods.length > 0;

  // ── CSV file handling ───────────────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setCsvError('Only .csv files are supported.');
      setCsvFile(null); setCsvRows(null);
      return;
    }

    setCsvFile(file); setCsvError(null); setCsvRows(null); setCsvParsing(true);
    try {
      const text     = await file.text();
      const { rows } = parseCsv(text);
      setCsvRows(rows);
    } catch (err) {
      setCsvError(`Could not parse CSV: ${err.message}`);
      setCsvFile(null); setCsvRows(null);
    } finally {
      setCsvParsing(false);
    }
  }

  function clearCsv() {
    setCsvFile(null); setCsvRows(null); setCsvError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Validation ──────────────────────────────────────────────────────────
  function validate() {
    if (!merchant.trim())         return 'Please select a merchant.';
    if (mode === 'query') {
      if (!startMonth)            return 'Start month is required.';
      if (!endMonth)              return 'End month is required.';
      if (startMonth >= endMonth) return 'Start month must be before end month.';
    }
    if (mode === 'csv') {
      if (!csvFile)               return 'Please upload a CSV file.';
      if (!csvRows)               return 'CSV file could not be parsed. Check the file and try again.';
      if (csvRows.length === 0)   return 'CSV file has no data rows.';
    }
    return null;
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setValidationError(err); return; }
    setValidationError(null);

    if (mode === 'query') {
      onSubmit({ mode: 'query', merchant_id: merchant.trim(), start_date: startMonth + '-01', end_date: monthToLastDay(endMonth), scope });
    } else {
      let aggregated;
      try { aggregated = aggregateCsvRows(csvRows, merchant.trim()); }
      catch (err) { setValidationError(`CSV aggregation failed: ${err.message}`); return; }
      onSubmit({ mode: 'csv', ...aggregated, scope });
    }
  }

  // ── Card shared style ────────────────────────────────────────────────────
  const cardCls = 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80 rounded-2xl shadow-lg dark:shadow-2xl';

  return (
    // Outer flex row — both cards sit side by side and are centred together
    <div className="flex items-start gap-5 w-full"
         style={{ maxWidth: scopeOpen ? '69rem' : '32rem', transition: 'max-width 0.3s ease-in-out' }}>

      {/* ── LEFT CARD — main form ──────────────────────────────────────── */}
      <div className={`${cardCls} p-8 w-full flex-shrink-0`} style={{ maxWidth: '32rem' }}>
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Mode toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Data Source
            </label>
            <div className="flex gap-2">
              <ModeTab active={mode === 'query'} onClick={() => { setMode('query'); setValidationError(null); }} icon={Database} label="Query Snowflake" sub="Fetch data by merchant + date range" />
              <ModeTab active={mode === 'csv'}   onClick={() => { setMode('csv');   setValidationError(null); }} icon={Upload}   label="Upload CSV"       sub="Skip Snowflake, use local file" />
            </div>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Merchant</label>
            <MerchantSelect value={merchant} onChange={setMerchant} disabled={isLoading} />
          </div>

          {/* Query mode: date range */}
          {mode === 'query' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">From</label>
                <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)} disabled={isLoading}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#6E3AEB] focus:ring-1 focus:ring-[#6E3AEB]/40 disabled:opacity-50 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">To</label>
                <input type="month" value={endMonth}   onChange={e => setEndMonth(e.target.value)}   disabled={isLoading}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-gray-900 dark:text-slate-100 text-sm focus:outline-none focus:border-[#6E3AEB] focus:ring-1 focus:ring-[#6E3AEB]/40 disabled:opacity-50 transition" />
              </div>
            </div>
          )}

          {/* Customize Scope button */}
          <button
            type="button"
            onClick={() => setScopeOpen(v => !v)}
            disabled={isLoading}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition
              ${hasFilters
                ? 'bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/15 border-[#6E3AEB]/50 text-gray-900 dark:text-white'
                : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'
              }
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2">
              <Settings2 size={14} className={hasFilters ? 'text-[#a78bfa]' : 'text-gray-400 dark:text-slate-500'} />
              <span className="font-medium">Customize Scope</span>
              {hasFilters && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/20 text-[#5b2fd6] dark:text-[#a78bfa] font-medium">
                  active
                </span>
              )}
            </div>
            <ChevronRight size={14} className={`text-gray-400 dark:text-slate-500 transition-transform duration-300 ${scopeOpen ? 'rotate-90' : ''}`} />
          </button>

          {/* CSV mode: file upload */}
          {mode === 'csv' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">CSV File</label>

              {!csvFile ? (
                <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition
                  ${csvError
                    ? 'border-red-400/60 dark:border-red-700/60 bg-red-50 dark:bg-red-950/20'
                    : 'border-gray-300 dark:border-slate-600/60 bg-gray-50 dark:bg-slate-800/30 hover:border-[#6E3AEB]/60 hover:bg-[#6E3AEB]/5'
                  }`}>
                  <Upload size={22} className="text-gray-400 dark:text-slate-500" />
                  <div className="text-center">
                    <p className="text-gray-700 dark:text-slate-300 text-sm font-medium">Click to upload CSV</p>
                    <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">Same columns as Snowflake export · POSTING_MONTH, SOURCE, EXTERNAL_AB_TEST …</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} disabled={isLoading} />
                </label>
              ) : (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition
                  ${csvRows
                    ? 'border-emerald-400/50 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-gray-200 dark:border-slate-600/50 bg-gray-50 dark:bg-slate-800/30'
                  }`}>
                  <FileText size={16} className={csvRows ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-slate-200 text-sm font-medium truncate">{csvFile.name}</p>
                    {csvParsing && <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Parsing…</p>}
                    {csvRows   && <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">{csvRows.length.toLocaleString()} rows ready</p>}
                  </div>
                  <button type="button" onClick={clearCsv} className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition" title="Remove file">
                    <X size={14} />
                  </button>
                </div>
              )}

              {csvError && (
                <div className="mt-2 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
                  <AlertCircle size={13} className="shrink-0" />{csvError}
                </div>
              )}
            </div>
          )}

          {/* Get SQL panel */}
          <SqlPanel merchant={merchant} startMonth={startMonth} endMonth={endMonth} scope={scope} isLoading={isLoading} />

          {/* Form validation error */}
          {validationError && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-lg px-3 py-2">
              <AlertCircle size={15} className="shrink-0" />{validationError}
            </div>
          )}

          {/* Analysis error (from parent) */}
          {analysisError && (
            <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">Analysis failed</p>
                <p className="text-red-600 dark:text-red-400 mt-0.5 text-xs leading-relaxed">{analysisError}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || (mode === 'csv' && csvParsing)}
            className="w-full flex items-center justify-center gap-2 bg-[#6E3AEB] hover:bg-[#5b2fd6] active:bg-[#4a25b3] disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition text-sm"
          >
            <PlayCircle size={17} />
            {isLoading ? 'Running analysis…' : mode === 'csv' ? 'Run Analysis from CSV' : 'Run Analysis'}
          </button>
        </form>
      </div>

      {/* ── RIGHT CARD — scope panel ───────────────────────────────────── */}
      {/* Wrapper handles the reveal animation via overflow + width transition */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          width:      scopeOpen ? '32rem' : '0',
          opacity:    scopeOpen ? 1 : 0,
          transition: 'width 0.3s ease-in-out, opacity 0.25s ease-in-out',
        }}
      >
        <div className={`${cardCls} p-6 w-[32rem]`}>
          <ScopeCardContent
            scope={scope}
            onChange={setScope}
            onClose={() => setScopeOpen(false)}
            disabled={isLoading}
          />
        </div>
      </div>

    </div>
  );
}
