// ============================================================
// TabBar — 4-tab navigation bar for the dashboard
// ============================================================
import { BarChart2, TrendingUp, BrainCircuit, GitCompare } from 'lucide-react';

const TABS = [
  { id: 'performance',   label: 'Volume & Performance',    icon: BarChart2    },
  { id: 'apples',        label: 'Apples-to-Apples',        icon: GitCompare   },
  { id: 'enrichment',    label: 'Enrichment & Risk',       icon: TrendingUp   },
  { id: 'ai',            label: 'AI Conclusions',          icon: BrainCircuit },
];

export function TabBar({ activeTab, onChange }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 dark:border-slate-700/70
                    px-6 bg-white/80 dark:bg-slate-900/50">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`
            flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px
            ${activeTab === id
              ? 'border-[#6E3AEB] text-[#6E3AEB] dark:text-[#a78bfa]'
              : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600'
            }
          `}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}
