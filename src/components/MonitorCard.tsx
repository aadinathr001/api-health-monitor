import React, { useState } from 'react';
import { ApiMonitor } from '../types.ts';
import { UptimeBar } from './UptimeBar.tsx';
import {
  Play,
  Pause,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Trash2,
  AlertCircle,
} from 'lucide-react';

interface MonitorCardProps {
  monitor: ApiMonitor;
  onCheckNow: (id: string) => Promise<void>;
  onToggleActive: (id: string, active: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSelect: (monitor: ApiMonitor) => void;
}

export const MonitorCard: React.FC<MonitorCardProps> = ({
  monitor,
  onCheckNow,
  onToggleActive,
  onDelete,
  onSelect,
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    try {
      await onCheckNow(monitor.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(monitor.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formatLastChecked = (ts: number | null) => {
    if (!ts) return 'Never checked';
    const secondsAgo = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minsAgo = Math.floor(secondsAgo / 60);
    return `${minsAgo}m ago (${new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
  };

  // Status badge styling
  let statusBadge = (
    <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-400">
      <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
      <span>PENDING</span>
    </div>
  );

  if (!monitor.active) {
    statusBadge = (
      <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-slate-400">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
        <span>PAUSED</span>
      </div>
    );
  } else if (monitor.currentStatus === 'up') {
    statusBadge = (
      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-emerald-400">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>{monitor.lastStatusCode || 200} OK</span>
      </div>
    );
  } else if (monitor.currentStatus === 'degraded') {
    statusBadge = (
      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-amber-400">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span>{monitor.lastStatusCode || 'SLOW'} DEGRADED</span>
      </div>
    );
  } else if (monitor.currentStatus === 'down') {
    statusBadge = (
      <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-rose-400">
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
        <span>{monitor.lastStatusCode ? `${monitor.lastStatusCode} ERROR` : 'DOWN'}</span>
      </div>
    );
  }

  const availability =
    monitor.availabilityPct !== undefined
      ? `${monitor.availabilityPct.toFixed(1)}%`
      : monitor.totalChecks > 0
      ? `${Math.round((monitor.successfulChecks / monitor.totalChecks) * 1000) / 10}%`
      : '100.0%';

  return (
    <div
      onClick={() => onSelect(monitor)}
      className="p-5 rounded-xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group flex flex-col gap-4"
    >
      {/* Top row: Name, URL, Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase tracking-wider bg-slate-800 text-slate-300 shrink-0">
            {monitor.method}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-white truncate group-hover:text-emerald-400 transition-colors">
                {monitor.name}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span className="truncate max-w-[260px] sm:max-w-md">{monitor.url}</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors cursor-pointer"
                title="Copy URL"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Status Badge & Latency Summary */}
        <div className="flex items-center gap-4 shrink-0 sm:self-center">
          {statusBadge}

          {/* Response Latency (tabular-nums font-mono) */}
          <div className="text-right min-w-[70px]">
            <span
              className={`font-mono font-semibold tabular-nums text-sm ${
                monitor.currentStatus === 'down'
                  ? 'text-rose-400'
                  : monitor.currentStatus === 'degraded'
                  ? 'text-amber-400'
                  : 'text-slate-200'
              }`}
            >
              {monitor.lastLatencyMs !== null ? `${monitor.lastLatencyMs} ms` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Uptime Sparkline Bar */}
      <div className="w-full">
        <UptimeBar history={monitor.history} maxBars={36} />
      </div>

      {/* Bottom Metadata & Actions */}
      <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        {/* Zero-pill metadata with subtle separators */}
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            Availability{' '}
            <strong className="text-slate-200 font-mono tabular-nums font-medium">
              {availability}
            </strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>
            Every <strong className="text-slate-200 font-mono">{monitor.intervalSeconds}s</strong>
          </span>
          <span aria-hidden="true" className="text-slate-600">
            ·
          </span>
          <span>Checked {formatLastChecked(monitor.lastChecked)}</span>
          {monitor.lastError && (
            <>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-rose-400 font-mono flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span className="truncate max-w-[200px]" title={monitor.lastError}>
                  {monitor.lastError}
                </span>
              </span>
            </>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={handlePing}
            disabled={isChecking || !monitor.active}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
            title="Ping endpoint now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onToggleActive(monitor.id, !monitor.active)}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={monitor.active ? 'Pause automated health checks' : 'Resume automated health checks'}
          >
            {monitor.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onDelete(monitor.id)}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete monitor"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSelect(monitor)}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
          >
            <span>Inspect</span>
            <ChevronRight className="w-3 h-3 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
