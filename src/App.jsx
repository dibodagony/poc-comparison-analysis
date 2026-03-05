// ============================================================
// App — Root component + state machine
// ============================================================
// States:
//   idle    → LandingScreen (form)
//   loading → LandingScreen (spinner inside card)
//   error   → LandingScreen (error banner below form)
//   success → DashboardScreen (tabs)
// ============================================================
import { useState, Component } from 'react';
import { Loader2, AlertTriangle, RotateCcw, Sun, Moon } from 'lucide-react';

// ── Error boundary — catches React render crashes (blank-page prevention) ─────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-8">
          <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/60
                          rounded-2xl p-8 max-w-2xl w-full shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-700 dark:text-red-300">Render error</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {this.state.error.message}
                </p>
              </div>
            </div>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 text-xs text-gray-600
                            dark:text-slate-300 overflow-auto max-h-64 whitespace-pre-wrap">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-800
                         dark:hover:text-white transition"
            >
              ← Back
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useAnalysis }          from './hooks/useAnalysis.js';
import { useTheme }             from './hooks/useTheme.js';
import { InputForm }            from './components/InputForm.jsx';
import { TabBar }               from './components/TabBar.jsx';
import { VolumePerformanceTab } from './components/VolumePerformanceTab.jsx';
import { EnrichmentTab }        from './components/EnrichmentTab.jsx';
import { AIConclusions }        from './components/AIConclusions.jsx';
import { ApplesToApplesTab }    from './components/ApplesToApplesTab.jsx';

// ── Theme toggle button ───────────────────────────────────────────────────────
function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center justify-center w-8 h-8 rounded-lg
                 text-gray-500 hover:text-gray-900 hover:bg-gray-100
                 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800
                 transition"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

// ── Landing screen ────────────────────────────────────────────────────────────
function LandingScreen({ state, error, message, onSubmit, isDark, onToggleTheme }) {
  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12">

      {/* Theme toggle — top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
      </div>

      {/* Logo + title */}
      <div className="mb-8 text-center select-none">
        <img
          src="/logo.svg"
          alt="Justt"
          className="h-9 w-auto mx-auto mb-4 opacity-90"
        />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POC Comparison</h1>
        <p className="text-gray-500 dark:text-slate-400 text-sm mt-1.5 max-w-xs mx-auto">
          Compare Justt's POC performance against a merchant partner, month by month.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700/80
                      rounded-2xl p-8 w-full max-w-lg shadow-lg dark:shadow-2xl">
        {state === 'loading' ? (
          <LoadingState message={message} />
        ) : (
          <>
            <InputForm onSubmit={onSubmit} isLoading={state === 'loading'} />

            {/* Error banner */}
            {state === 'error' && error && (
              <div className="mt-5 flex items-start gap-2.5
                              bg-red-50 dark:bg-red-950/50
                              border border-red-200 dark:border-red-800/60
                              rounded-xl px-4 py-3
                              text-red-700 dark:text-red-300 text-sm">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500 dark:text-red-400" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-300">Analysis failed</p>
                  <p className="text-red-600 dark:text-red-400 mt-0.5 text-xs leading-relaxed">{error}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <p className="mt-6 text-gray-400 dark:text-slate-600 text-xs">
        Powered by Justt - Product Analytics Team
      </p>
    </div>
  );
}

// ── Loading state (inside card) ───────────────────────────────────────────────
function LoadingState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-4">
      <Loader2 size={38} className="text-[#a78bfa] animate-spin" />
      <div className="text-center">
        <p className="text-gray-900 dark:text-white font-semibold">
          {message || 'Running analysis…'}
        </p>
        <p className="text-gray-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
          Fetching Snowflake data · Processing metrics · Generating AI insights
        </p>
      </div>
      <p className="text-gray-400 dark:text-slate-600 text-xs mt-1">This might take a few minutes…</p>
    </div>
  );
}

// ── Dashboard screen ─────────────────────────────────────────────────────────
function DashboardScreen({ data, onReset, isDark, onToggleTheme }) {
  const [activeTab, setActiveTab] = useState('performance');
  const { poc_partner, months = [], views, enrichment, dimensions, ai } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="bg-white dark:bg-slate-900
                         border-b border-gray-200 dark:border-slate-700/70
                         px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="Justt" className="h-5 w-auto opacity-90" />
          <div className="h-5 w-px bg-gray-200 dark:bg-slate-700" />
          <div>
            <p className="text-gray-600 dark:text-slate-300 text-xs leading-tight">
              Justt
              <span className="mx-1.5 text-gray-400 dark:text-slate-600">vs</span>
              <span className="text-[#a78bfa] font-semibold">{poc_partner}</span>
              <span className="mx-1.5 text-gray-400 dark:text-slate-600">·</span>
              {months[0]} → {months[months.length - 1]}
              <span className="mx-1.5 text-gray-400 dark:text-slate-600">·</span>
              {months.length} months
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          <button
            onClick={onReset}
            className="flex items-center gap-1.5
                       text-gray-500 hover:text-gray-900
                       dark:text-slate-400 dark:hover:text-white
                       text-xs px-3 py-1.5 rounded-lg
                       hover:bg-gray-100 dark:hover:bg-slate-800 transition"
          >
            <RotateCcw size={12} />
            New Analysis
          </button>
        </div>
      </header>

      {/* Tab navigation */}
      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'performance' && (
          <VolumePerformanceTab
            data={views}
            months={months}
            pocPartner={poc_partner}
            dimensions={dimensions}
          />
        )}
        {activeTab === 'enrichment' && (
          <EnrichmentTab data={enrichment} months={months} />
        )}
        {activeTab === 'ai' && (
          <AIConclusions
            conclusion={ai?.conclusion}
            narration={ai?.narration}
            pocPartner={poc_partner}
            views={views}
            enrichment={enrichment}
            months={months}
          />
        )}
        {activeTab === 'apples' && (
          <ApplesToApplesTab
            data={views}
            months={months}
            pocPartner={poc_partner}
            dimensions={dimensions}
          />
        )}
      </main>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
function AppInner() {
  const { state, data, error, message, runAnalysis, reset } = useAnalysis();
  const { isDark, toggleTheme } = useTheme();

  if (state === 'success' && data) {
    return <DashboardScreen data={data} onReset={reset} isDark={isDark} onToggleTheme={toggleTheme} />;
  }

  return <LandingScreen state={state} error={error} message={message} onSubmit={runAnalysis} isDark={isDark} onToggleTheme={toggleTheme} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
