// ============================================================
// InputForm — Landing form: two modes
//   1. Query mode  — merchant picker + month range → Snowflake
//   2. CSV mode    — file upload + merchant picker → bypass Snowflake
// ============================================================
import { useState, useRef } from 'react';
import { PlayCircle, AlertCircle, Database, Upload, FileText, X } from 'lucide-react';
import { MerchantSelect } from './MerchantSelect.jsx';
import { aggregateCsvRows } from '../utils/aggregateCsv.js';

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

// ── CSV parser — handles quoted multiline fields (RFC 4180) ──────────────────
// Returns { headers: string[], rows: object[] }
// A single-pass character-level approach is required because some fields
// (e.g. data_points_coverage) contain embedded newlines inside quoted cells.
// Pre-splitting on \n would shatter those fields across multiple "lines".
function parseCsv(text) {
  // Normalise line endings
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Parse the entire source into a flat array of records (arrays of field strings)
  const records = [];
  let row    = [];
  let field  = '';
  let inQuote = false;

  for (let i = 0; i < src.length; i++) {
    const ch   = src[i];
    const next = src[i + 1];

    if (inQuote) {
      if (ch === '"' && next === '"') {
        // Escaped quote inside a quoted field
        field += '"';
        i++;
      } else if (ch === '"') {
        // End of quoted field
        inQuote = false;
      } else {
        field += ch;   // includes embedded newlines — this is the key fix
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n') {
        row.push(field.trim());
        field = '';
        if (row.some(f => f !== '')) records.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
  }
  // Flush the last field / row
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

// ── Component ─────────────────────────────────────────────────────────────────
export function InputForm({ onSubmit, isLoading }) {
  const defaults = defaultMonths();

  // Shared
  const [mode,            setMode]            = useState('query'); // 'query' | 'csv'
  const [merchant,        setMerchant]        = useState('');
  const [validationError, setValidationError] = useState(null);

  // Query mode
  const [startMonth, setStartMonth] = useState(defaults.start);
  const [endMonth,   setEndMonth]   = useState(defaults.end);

  // CSV mode
  const [csvFile,     setCsvFile]     = useState(null);   // File object
  const [csvRows,     setCsvRows]     = useState(null);   // parsed rows array
  const [csvError,    setCsvError]    = useState(null);
  const [csvParsing,  setCsvParsing]  = useState(false);
  const fileInputRef = useRef(null);

  // ── CSV file handling ───────────────────────────────────────────────────
  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setCsvError('Only .csv files are supported.');
      setCsvFile(null);
      setCsvRows(null);
      return;
    }

    setCsvFile(file);
    setCsvError(null);
    setCsvRows(null);
    setCsvParsing(true);

    try {
      const text    = await file.text();
      const { rows } = parseCsv(text);
      setCsvRows(rows);
    } catch (err) {
      setCsvError(`Could not parse CSV: ${err.message}`);
      setCsvFile(null);
      setCsvRows(null);
    } finally {
      setCsvParsing(false);
    }
  }

  function clearCsv() {
    setCsvFile(null);
    setCsvRows(null);
    setCsvError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Validation ──────────────────────────────────────────────────────────
  function validate() {
    if (!merchant.trim()) return 'Please select a merchant.';

    if (mode === 'query') {
      if (!startMonth)                  return 'Start month is required.';
      if (!endMonth)                    return 'End month is required.';
      if (startMonth >= endMonth)       return 'Start month must be before end month.';
    }

    if (mode === 'csv') {
      if (!csvFile)  return 'Please upload a CSV file.';
      if (!csvRows)  return 'CSV file could not be parsed. Check the file and try again.';
      if (csvRows.length === 0) return 'CSV file has no data rows.';
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
      onSubmit({
        mode:        'query',
        merchant_id: merchant.trim(),
        start_date:  startMonth + '-01',
        end_date:    monthToLastDay(endMonth),
      });
    } else {
      // Aggregate client-side so we only send a compact summary to n8n
      // (sending raw rows hits nginx's 413 Request Entity Too Large limit)
      let aggregated;
      try {
        aggregated = aggregateCsvRows(csvRows, merchant.trim());
      } catch (err) {
        setValidationError(`CSV aggregation failed: ${err.message}`);
        return;
      }
      onSubmit({
        mode: 'csv',
        ...aggregated,  // { merchant_id, start_date, end_date, aggregated }
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">

      {/* ── Mode toggle ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Data Source
        </label>
        <div className="flex gap-2">
          <ModeTab
            active={mode === 'query'}
            onClick={() => { setMode('query'); setValidationError(null); }}
            icon={Database}
            label="Query Snowflake"
            sub="Fetch data by merchant + date range"
          />
          <ModeTab
            active={mode === 'csv'}
            onClick={() => { setMode('csv'); setValidationError(null); }}
            icon={Upload}
            label="Upload CSV"
            sub="Skip Snowflake, use local file"
          />
        </div>
      </div>

      {/* ── Merchant (both modes) ───────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
          Merchant
        </label>
        <MerchantSelect
          value={merchant}
          onChange={setMerchant}
          disabled={isLoading}
        />
      </div>

      {/* ── Query mode: month range ─────────────────────────────────────── */}
      {mode === 'query' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">From</label>
            <input
              type="month"
              value={startMonth}
              onChange={e => setStartMonth(e.target.value)}
              className="w-full bg-white dark:bg-slate-800
                         border border-gray-300 dark:border-slate-600
                         rounded-lg px-4 py-2.5
                         text-gray-900 dark:text-slate-100 text-sm
                         focus:outline-none focus:border-[#6E3AEB] focus:ring-1 focus:ring-[#6E3AEB]/40
                         disabled:opacity-50 transition"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">To</label>
            <input
              type="month"
              value={endMonth}
              onChange={e => setEndMonth(e.target.value)}
              className="w-full bg-white dark:bg-slate-800
                         border border-gray-300 dark:border-slate-600
                         rounded-lg px-4 py-2.5
                         text-gray-900 dark:text-slate-100 text-sm
                         focus:outline-none focus:border-[#6E3AEB] focus:ring-1 focus:ring-[#6E3AEB]/40
                         disabled:opacity-50 transition"
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* ── CSV mode: file upload ───────────────────────────────────────── */}
      {mode === 'csv' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
            CSV File
          </label>

          {/* Drop zone / file picker */}
          {!csvFile ? (
            <label
              className={`flex flex-col items-center justify-center gap-2
                          border-2 border-dashed rounded-xl px-4 py-6 cursor-pointer transition
                          ${csvError
                            ? 'border-red-400/60 dark:border-red-700/60 bg-red-50 dark:bg-red-950/20'
                            : 'border-gray-300 dark:border-slate-600/60 bg-gray-50 dark:bg-slate-800/30 hover:border-[#6E3AEB]/60 hover:bg-[#6E3AEB]/5'
                          }`}
            >
              <Upload size={22} className="text-gray-400 dark:text-slate-500" />
              <div className="text-center">
                <p className="text-gray-700 dark:text-slate-300 text-sm font-medium">Click to upload CSV</p>
                <p className="text-gray-400 dark:text-slate-500 text-xs mt-0.5">
                  Same columns as Snowflake export · POSTING_MONTH, SOURCE, EXTERNAL_AB_TEST …
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
              />
            </label>
          ) : (
            /* File selected */
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition
              ${csvRows
                ? 'border-emerald-400/50 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-gray-200 dark:border-slate-600/50 bg-gray-50 dark:bg-slate-800/30'
              }`}>
              <FileText size={16} className={csvRows ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-slate-400'} />
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 dark:text-slate-200 text-sm font-medium truncate">{csvFile.name}</p>
                {csvParsing && (
                  <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">Parsing…</p>
                )}
                {csvRows && (
                  <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                    {csvRows.length.toLocaleString()} rows ready
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearCsv}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition"
                title="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* CSV parse error */}
          {csvError && (
            <div className="mt-2 flex items-center gap-2
                            text-red-600 dark:text-red-400 text-xs
                            bg-red-50 dark:bg-red-950/30
                            border border-red-200 dark:border-red-800/40
                            rounded-lg px-3 py-2">
              <AlertCircle size={13} className="shrink-0" />
              {csvError}
            </div>
          )}

          {/* Expected columns hint */}
          {!csvFile && (
            <p className="mt-2 text-gray-400 dark:text-slate-600 text-[10px] leading-relaxed">
              Required columns: POSTING_MONTH · SOURCE · EXTERNAL_AB_TEST · REASON_GROUP ·
              PSP · CARD_SCHEME · PAYMENT_METHOD · HANDLED · WON · NOT_PENDING · AMOUNT_HANDLED ·
              AMOUNT_WON · AMOUNT_NOT_PENDING · EMAILAGE_SCORE · EKATA_SCORE ·
              MERCHANT_DATA_AVAILABLE · ENRICHMENT_RATIO
            </p>
          )}
        </div>
      )}

      {/* ── Validation error ────────────────────────────────────────────── */}
      {validationError && (
        <div className="flex items-center gap-2
                        text-red-600 dark:text-red-400 text-sm
                        bg-red-50 dark:bg-red-950/40
                        border border-red-200 dark:border-red-800/50
                        rounded-lg px-3 py-2">
          <AlertCircle size={15} className="shrink-0" />
          {validationError}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isLoading || (mode === 'csv' && csvParsing)}
        className="w-full flex items-center justify-center gap-2
                   bg-[#6E3AEB] hover:bg-[#5b2fd6] active:bg-[#4a25b3]
                   disabled:bg-gray-200 dark:disabled:bg-slate-700
                   disabled:text-gray-400 dark:disabled:text-slate-500
                   disabled:cursor-not-allowed
                   text-white font-semibold py-3 rounded-lg transition text-sm"
      >
        <PlayCircle size={17} />
        {isLoading
          ? 'Running analysis…'
          : mode === 'csv'
            ? 'Run Analysis from CSV'
            : 'Run Analysis'
        }
      </button>
    </form>
  );
}
