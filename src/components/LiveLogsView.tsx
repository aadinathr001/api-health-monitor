import React, { useState, useEffect } from 'react';
import { LogEntry } from '../types.ts';
import { Terminal, RefreshCw, Filter, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface LiveLogsViewProps {
  monitorsList: { id: string; name: string }[];
}

export const LiveLogsView: React.FC<LiveLogsViewProps> = ({ monitorsList }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'up' | 'degraded' | 'down'>('all');
  const [filterMonitor, setFilterMonitor] = useState<string>('all');
  const [isLive, setIsLive] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (!isLive) return;
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, [isLive]);

  const filteredLogs = logs.filter((log) => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterMonitor !== 'all' && log.monitorId !== filterMonitor) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Live Health Probe Stream</span>
          <span className="flex items-center gap-1.5 ml-2 text-xs text-slate-400 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {isLive ? 'Streaming' : 'Paused'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter segmented button */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            {(['all', 'up', 'degraded', 'down'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  filterStatus === st
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all'
                  ? 'All Statuses'
                  : st === 'up'
                  ? 'Nominal'
                  : st === 'degraded'
                  ? 'Degraded'
                  : 'Errors'}
              </button>
            ))}
          </div>

          {/* Endpoint Selector */}
          <select
            value={filterMonitor}
            onChange={(e) => setFilterMonitor(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-slate-700"
          >
            <option value="all">All Endpoints</option>
            {monitorsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          {/* Toggle Live */}
          <button
            type="button"
            onClick={() => setIsLive(!isLive)}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {isLive ? 'Pause Stream' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900/90 text-slate-400 font-mono border-b border-slate-800 text-[11px] uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Timestamp</th>
              <th className="py-2.5 px-4">Endpoint</th>
              <th className="py-2.5 px-4">Status</th>
              <th className="py-2.5 px-4">Latency</th>
              <th className="py-2.5 px-4">Message / Response Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No log entries matched your filter. Probes run every few seconds.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap tabular-nums">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-4 font-semibold text-white whitespace-nowrap">
                    {log.monitorName}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        log.status === 'up'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : log.status === 'degraded'
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {log.status === 'up' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : log.status === 'degraded' ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      {log.statusCode ? `HTTP ${log.statusCode}` : 'FAILED'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 tabular-nums text-slate-200 whitespace-nowrap">
                    <span
                      className={
                        log.status === 'degraded'
                          ? 'text-amber-400'
                          : log.status === 'down'
                          ? 'text-rose-400'
                          : 'text-slate-200'
                      }
                    >
                      {log.latencyMs} ms
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 truncate max-w-sm">
                    {log.error ? (
                      <span className="text-rose-400">{log.error}</span>
                    ) : (
                      <span className="text-slate-400">{log.statusText || 'OK'}</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
