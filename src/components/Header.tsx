import React from 'react';
import { Activity, Plus, RefreshCw, Play, Pause, Terminal } from 'lucide-react';

interface HeaderProps {
  activeTab: 'monitors' | 'logs';
  setActiveTab: (tab: 'monitors' | 'logs') => void;
  onAddClick: () => void;
  onRefreshAll: () => void;
  isCheckingAll: boolean;
  cronActive: boolean;
  onToggleCron: () => void;
  serverUptime: number;
  onOpenDebugGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onAddClick,
  onRefreshAll,
  isCheckingAll,
  cronActive,
  onToggleCron,
  onOpenDebugGuide,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Brand title, single element */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            API Health Monitor
          </span>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('monitors')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'monitors'
                ? 'text-white border-b-2 border-emerald-400 pb-0.5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Endpoints
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'logs'
                ? 'text-white border-b-2 border-emerald-400 pb-0.5'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Logs
          </button>
        </nav>

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenDebugGuide}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Localhost testing, environment setup, and debugging guide"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Debug &amp; Localhost</span>
          </button>

          <button
            type="button"
            onClick={onToggleCron}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              cronActive
                ? 'bg-slate-900 border-slate-700 text-emerald-400 hover:bg-slate-800'
                : 'bg-slate-900 border-slate-700 text-amber-400 hover:bg-slate-800'
            }`}
            title={cronActive ? 'Cron checking enabled (every 2-30s)' : 'Cron checking paused'}
          >
            {cronActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Check On</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Auto-Check Paused</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onRefreshAll}
            disabled={isCheckingAll}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            title="Probe all active endpoints immediately"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingAll ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Check All</span>
          </button>

          <button
            type="button"
            onClick={onAddClick}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Endpoint</span>
          </button>
        </div>
      </div>
    </header>
  );
};
