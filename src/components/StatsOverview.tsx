import React from 'react';
import { ApiMonitor } from '../types.ts';
import { CheckCircle2, AlertTriangle, XCircle, Clock, ShieldCheck, Zap } from 'lucide-react';

interface StatsOverviewProps {
  monitors: ApiMonitor[];
  serverUptime: number;
  totalChecksAcrossAll: number;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  monitors,
}) => {
  const total = monitors.length;
  const operational = monitors.filter((m) => m.currentStatus === 'up').length;
  const degraded = monitors.filter((m) => m.currentStatus === 'degraded').length;
  const down = monitors.filter((m) => m.currentStatus === 'down').length;

  // Fleet availability calculation
  const totalPings = monitors.reduce((sum, m) => sum + m.totalChecks, 0);
  const totalSuccess = monitors.reduce((sum, m) => sum + m.successfulChecks, 0);
  const fleetAvailability =
    totalPings > 0 ? (Math.round((totalSuccess / totalPings) * 1000) / 10).toFixed(1) : '100.0';

  // Average fleet response time
  const activeLatencies = monitors
    .map((m) => m.lastLatencyMs)
    .filter((l): l is number => typeof l === 'number' && l > 0);
  const avgLatency =
    activeLatencies.length > 0
      ? Math.round(activeLatencies.reduce((a, b) => a + b, 0) / activeLatencies.length)
      : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {/* Total Services */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Monitored APIs</span>
          <Zap className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">{total}</span>
          <span className="text-xs text-slate-500">endpoints</span>
        </div>
      </div>

      {/* Operational */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Operational</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-emerald-400">
            {operational}
          </span>
          <span className="text-xs text-slate-500">healthy</span>
        </div>
      </div>

      {/* Degraded / Down */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Incidents</span>
          <div className="flex items-center gap-1">
            {degraded > 0 && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
            {down > 0 && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold font-mono tabular-nums ${
              down > 0 ? 'text-rose-400' : degraded > 0 ? 'text-amber-400' : 'text-slate-400'
            }`}
          >
            {down + degraded}
          </span>
          <span className="text-xs text-slate-500">
            {down > 0 ? `${down} down` : degraded > 0 ? `${degraded} slow` : 'none'}
          </span>
        </div>
      </div>

      {/* Fleet Availability */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Fleet Availability</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">
            {fleetAvailability}%
          </span>
          <span className="text-xs text-slate-500">uptime</span>
        </div>
      </div>

      {/* Median Latency */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span>Avg Fleet Latency</span>
          <Clock className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums text-white">{avgLatency}</span>
          <span className="text-xs text-slate-500">ms</span>
        </div>
      </div>
    </div>
  );
};
