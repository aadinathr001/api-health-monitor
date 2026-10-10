import React, { useState, useEffect } from 'react';
import { ApiMonitor, PingResult } from '../types.ts';
import { UptimeBar } from './UptimeBar.tsx';
import {
  X,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';

interface MonitorDetailsModalProps {
  monitor: ApiMonitor | null;
  onClose: () => void;
  onCheckNow: (id: string) => Promise<void>;
}

export const MonitorDetailsModal: React.FC<MonitorDetailsModalProps> = ({
  monitor,
  onClose,
  onCheckNow,
}) => {
  const [isPinging, setIsPinging] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!monitor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [monitor, onClose]);

  if (!monitor) return null;

  const handlePing = async () => {
    setIsPinging(true);
    try {
      await onCheckNow(monitor.id);
    } finally {
      setIsPinging(false);
    }
  };

  const getCurlCommand = () => {
    let cmd = `curl -i -X ${monitor.method} "${monitor.url}"`;
    if (monitor.headers) {
      Object.entries(monitor.headers).forEach(([k, v]) => {
        cmd += ` -H "${k}: ${v}"`;
      });
    }
    if (monitor.method === 'POST' && monitor.body) {
      cmd += ` -d '${monitor.body}'`;
    }
    return cmd;
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(getCurlCommand());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const availability =
    monitor.availabilityPct !== undefined
      ? `${monitor.availabilityPct.toFixed(1)}%`
      : monitor.totalChecks > 0
      ? `${Math.round((monitor.successfulChecks / monitor.totalChecks) * 1000) / 10}%`
      : '100.0%';

  const latencies = monitor.history
    .map((h) => h.latencyMs)
    .filter((l): l is number => typeof l === 'number' && l > 0);
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const avgLatency =
    latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  // Compute SVG sparkline coordinates
  const svgWidth = 500;
  const svgHeight = 100;
  const points = monitor.history.slice(-30);
  const maxVal = Math.max(maxLatency * 1.2, 50);

  const polylineCoords = points
    .map((p, i) => {
      const x = (i / Math.max(1, points.length - 1)) * svgWidth;
      const y = svgHeight - (Math.min(p.latencyMs, maxVal) / maxVal) * (svgHeight - 15) - 8;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/90">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-slate-300">
              {monitor.method}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">{monitor.name}</h2>
              <p className="text-xs text-slate-400 font-mono truncate">{monitor.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePing}
              disabled={isPinging}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>Ping Now</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close details"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Status</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    monitor.currentStatus === 'up'
                      ? 'bg-emerald-400 animate-pulse'
                      : monitor.currentStatus === 'degraded'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="font-mono font-semibold text-sm text-white">
                  {monitor.lastStatusCode ? `HTTP ${monitor.lastStatusCode}` : 'NO RESPONSE'}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Availability</div>
              <div className="mt-1 font-mono font-semibold text-sm tabular-nums text-emerald-400">
                {availability}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Current Latency</div>
              <div className="mt-1 font-mono font-semibold text-sm tabular-nums text-white">
                {monitor.lastLatencyMs !== null ? `${monitor.lastLatencyMs} ms` : '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="text-slate-400 text-xs font-medium">Avg / p95 Latency</div>
              <div className="mt-1 font-mono font-semibold text-sm tabular-nums text-white">
                {avgLatency} / {monitor.p95LatencyMs || avgLatency} ms
              </div>
            </div>
          </div>

          {/* Response Time Graph */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Response Time History (Recent Probes)
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>Min: {minLatency}ms</span>
                <span>Avg: {avgLatency}ms</span>
                <span>Max: {maxLatency}ms</span>
              </div>
            </div>

            {points.length > 1 ? (
              <div className="relative w-full h-28 bg-slate-900/50 rounded-lg p-2 overflow-hidden flex items-end">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="gradientLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Grid lines */}
                  <line
                    x1="0"
                    y1={svgHeight / 2}
                    x2={svgWidth}
                    y2={svgHeight / 2}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                  />
                  <line x1="0" y1={svgHeight - 8} x2={svgWidth} y2={svgHeight - 8} stroke="#1e293b" />
                  {/* Area fill */}
                  <polygon
                    points={`0,${svgHeight} ${polylineCoords} ${svgWidth},${svgHeight}`}
                    fill="url(#gradientLatency)"
                  />
                  {/* Line */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylineCoords}
                  />
                </svg>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-xs text-slate-500 font-mono">
                Gathering telemetry points...
              </div>
            )}

            <UptimeBar history={monitor.history} maxBars={48} />
          </div>

          {/* Configuration Inspector */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              Monitoring Configuration
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Check Interval</span>
                <span className="font-mono text-slate-200">{monitor.intervalSeconds} seconds</span>
              </div>
              <div>
                <span className="text-slate-500 block">Expected Status</span>
                <span className="font-mono text-slate-200">HTTP {monitor.expectedStatus}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timeout</span>
                <span className="font-mono text-slate-200">{monitor.timeoutMs} ms</span>
              </div>
              <div>
                <span className="text-slate-500 block">Degraded Threshold</span>
                <span className="font-mono text-slate-200">&gt; {monitor.latencyThresholdMs} ms</span>
              </div>
            </div>

            {/* cURL Command Helper */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  Terminal Test Command (cURL)
                </span>
                <button
                  onClick={handleCopyCurl}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                {getCurlCommand()}
              </pre>
            </div>
          </div>

          {/* Recent Probe History Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-300">Recent Health Probes</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-mono border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Response Time</th>
                    <th className="py-2.5 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {monitor.history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-500">
                        No probe records yet
                      </td>
                    </tr>
                  ) : (
                    monitor.history
                      .slice()
                      .reverse()
                      .slice(0, 10)
                      .map((h, i) => (
                        <tr key={h.id || i} className="hover:bg-slate-900/40">
                          <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                            {new Date(h.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                h.status === 'up'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : h.status === 'degraded'
                                  ? 'text-amber-400 bg-amber-500/10'
                                  : 'text-rose-400 bg-rose-500/10'
                              }`}
                            >
                              {h.statusCode ? `HTTP ${h.statusCode}` : 'FAILED'}
                            </span>
                          </td>
                          <td className="py-2 px-3 tabular-nums text-slate-200">
                            {h.latencyMs} ms
                          </td>
                          <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                            {h.error ? (
                              <span className="text-rose-400">{h.error}</span>
                            ) : (
                              <span>{h.statusText || 'OK'}</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
