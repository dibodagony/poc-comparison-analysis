// ============================================================
// MerchantSelect — Searchable combobox for merchant selection
// ============================================================
// Props:
//   value    — currently selected merchant name (string)
//   onChange — called with selected merchant name
//   disabled — bool
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { MERCHANTS } from '../constants/merchants.js';

const MAX_VISIBLE = 30; // max dropdown items shown at once

export function MerchantSelect({ value, onChange, disabled }) {
  const [query,       setQuery]       = useState(value || '');
  const [open,        setOpen]        = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const rootRef  = useRef(null);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  // Filter merchants by query
  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return MERCHANTS.slice(0, MAX_VISIBLE);
    return MERCHANTS.filter(m => m.toLowerCase().includes(q)).slice(0, MAX_VISIBLE);
  })();

  // Keep highlight in bounds when list changes
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted];
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  // Close dropdown on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  function select(merchant) {
    setQuery(merchant);
    onChange(merchant);
    setOpen(false);
  }

  function clear() {
    setQuery('');
    onChange('');
    setOpen(true);
    inputRef.current?.focus();
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    onChange('');   // clear confirmed selection while typing
    setOpen(true);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return; }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(h => Math.min(h + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(h => Math.max(h - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlighted]) select(filtered[highlighted]);
        break;
      case 'Escape':
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const isSelected = value && value === query;

  return (
    <div ref={rootRef} className="relative">
      {/* Input */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search merchant…"
          disabled={disabled}
          autoComplete="off"
          className={`
            w-full bg-white dark:bg-slate-800
            border rounded-lg pl-9 pr-16 py-2.5
            text-gray-900 dark:text-slate-100
            placeholder-gray-400 dark:placeholder-slate-500
            text-sm focus:outline-none focus:ring-1
            disabled:opacity-50 transition
            ${isSelected
              ? 'border-[#6E3AEB] ring-0'
              : 'border-gray-300 dark:border-slate-600 focus:border-[#6E3AEB] focus:ring-[#6E3AEB]/40'
            }
          `}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); clear(); }}
              className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 p-0.5"
            >
              <X size={13} />
            </button>
          )}
          <ChevronDown
            size={13}
            className={`text-gray-400 dark:text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown list */}
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full
                     bg-white dark:bg-slate-800
                     border border-gray-200 dark:border-slate-600/80
                     rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/60
                     max-h-60 overflow-y-auto"
        >
          {filtered.map((merchant, i) => (
            <li
              key={merchant}
              onMouseDown={e => { e.preventDefault(); select(merchant); }}
              onMouseEnter={() => setHighlighted(i)}
              className={`
                px-4 py-2 text-sm cursor-pointer select-none transition-colors
                ${i === highlighted
                  ? 'bg-[#6E3AEB] text-white'
                  : 'text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700'
                }
                ${i === 0 ? 'rounded-t-xl' : ''}
                ${i === filtered.length - 1 ? 'rounded-b-xl' : ''}
              `}
            >
              {merchant}
            </li>
          ))}
          {MERCHANTS.filter(m => m.toLowerCase().includes(query.toLowerCase())).length > MAX_VISIBLE && (
            <li className="px-4 py-2 text-xs text-gray-400 dark:text-slate-500 text-center rounded-b-xl border-t border-gray-100 dark:border-slate-700">
              Showing first {MAX_VISIBLE} results — refine your search
            </li>
          )}
        </ul>
      )}

      {/* No results */}
      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full
                        bg-white dark:bg-slate-800
                        border border-gray-200 dark:border-slate-600/80
                        rounded-xl shadow-xl px-4 py-3
                        text-sm text-gray-400 dark:text-slate-500">
          No merchants found for "<span className="text-gray-700 dark:text-slate-300">{query}</span>"
        </div>
      )}
    </div>
  );
}
