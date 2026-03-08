// ============================================================
// MultiSearchPicker — Searchable multi-select with chips
// ============================================================
// Props:
//   label        — field label string
//   options      — string[] of available values
//   selected     — string[] of currently selected values
//   onChange     — (newSelected: string[]) => void
//   placeholder  — input placeholder text
//   disabled     — boolean
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';

export function MultiSearchPicker({ label, options = [], selected = [], onChange, placeholder = 'Search…', disabled = false }) {
  const [open,   setOpen]   = useState(false);
  const [query,  setQuery]  = useState('');
  const containerRef        = useRef(null);
  const inputRef            = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter(opt =>
    opt.toLowerCase().includes(query.toLowerCase()) && !selected.includes(opt)
  );

  function addItem(val) {
    onChange([...selected, val]);
    setQuery('');
    inputRef.current?.focus();
  }

  function removeItem(val) {
    onChange(selected.filter(v => v !== val));
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      removeItem(selected[selected.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
          {label}
          <span className="ml-1 text-gray-400 dark:text-slate-600 font-normal">(optional — empty = all)</span>
        </label>
      )}

      {/* Trigger / chips area */}
      <div
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
        className={`
          min-h-[38px] flex flex-wrap gap-1.5 items-center
          bg-white dark:bg-slate-800
          border rounded-lg px-2.5 py-1.5 cursor-text transition
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${open
            ? 'border-[#6E3AEB] ring-1 ring-[#6E3AEB]/40'
            : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
          }
        `}
      >
        {/* Selected chips */}
        {selected.map(val => (
          <span
            key={val}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                       bg-[#6E3AEB]/10 dark:bg-[#6E3AEB]/20
                       text-[#5b2fd6] dark:text-[#a78bfa]
                       text-xs font-medium border border-[#6E3AEB]/25 dark:border-[#6E3AEB]/30"
          >
            {val}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeItem(val); }}
              disabled={disabled}
              className="hover:text-[#4a25b3] dark:hover:text-white transition"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Search input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[80px] bg-transparent outline-none
                     text-gray-900 dark:text-slate-100 text-xs placeholder-gray-400
                     dark:placeholder-slate-600"
        />

        {/* Chevron */}
        <ChevronDown
          size={14}
          className={`ml-auto shrink-0 text-gray-400 dark:text-slate-500 transition-transform
                      ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full
                        bg-white dark:bg-slate-800
                        border border-gray-200 dark:border-slate-700
                        rounded-lg shadow-lg overflow-hidden">
          {/* Search box inside dropdown if no inline input */}
          {filtered.length === 0 && query === '' && options.filter(o => !selected.includes(o)).length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500">
              All options selected
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-400 dark:text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.map(opt => (
                <li key={opt}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); addItem(opt); }}
                    className="w-full text-left px-3 py-1.5 text-xs
                               text-gray-800 dark:text-slate-200
                               hover:bg-[#6E3AEB]/10 dark:hover:bg-[#6E3AEB]/15
                               hover:text-[#5b2fd6] dark:hover:text-[#a78bfa]
                               transition"
                  >
                    {opt}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* "X clear all" link — only show if something is selected */}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={disabled}
          className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-600
                     hover:text-gray-600 dark:hover:text-slate-400 transition"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
