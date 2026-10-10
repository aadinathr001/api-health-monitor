import React, { useState } from 'react';
import { PingResult } from '../types.ts';

interface UptimeBarProps {
  history: PingResult[];
  maxBars?: number;
}

export const UptimeBar: React.FC<UptimeBarProps> = ({ history, maxBars = 36 }) => {
  const [hoveredPing, setHoveredPing] = useState<PingResult | null>(null);

  // Fill in empty slots if we have fewer history points than maxBars
  const filledBars: (PingResult | null)[] = [];
  const emptySlots = Math.max(0, maxBars - history.length);

  for (let i = 0; i < emptySlots; i++) {
    filledBars.push(null);
  }

  for (const ping of history.slice(-maxBars)) {
    filledBars.push(ping);
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="relative flex flex-col gap-1 w-full">
      <div className="flex items-center gap-[3px] h-6 w-full">
        {filledBars.map((item, idx) => {
          if (!item) {
            return (
              <div
                key={`empty-${idx}`}
                className="flex-1 h-full min-w-[3px] rounded-xs bg-slate-800/40 opacity-40"
                title="Awaiting probe data"
              />
            );
          }

          let barColor = 'bg-emerald-500 hover:bg-emerald-400';
          if (item.status === 'down') {
            barColor = 'bg-rose-500 hover:bg-rose-400';
          } else if (item.status === 'degraded') {
            barColor = 'bg-amber-500 hover:bg-amber-400';
          }

          return (
            <div
              key={item.id || idx}
              className={`flex-1 h-full min-w-[3px] rounded-xs transition-colors cursor-pointer ${barColor}`}
              onMouseEnter={() => setHoveredPing(item)}
              onMouseLeave={() => setHoveredPing(null)}
            />
          );
        })}
      </div>

      {/* Floating or fixed hover info */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 h-4">
        {hoveredPing ? (
          <div className="flex items-center gap-2 font-mono text-slate-200">
            <span
              className={
                hoveredPing.status === 'up'
                  ? 'text-emerald-400'
                  : hoveredPing.status === 'degraded'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }
            >
              {hoveredPing.statusCode ? `HTTP ${hoveredPing.statusCode}` : 'ERR'}
            </span>
            <span>·</span>
            <span className="tabular-nums">{hoveredPing.latencyMs}ms</span>
            <span>·</span>
            <span>{formatTime(hoveredPing.timestamp)}</span>
            {hoveredPing.error && (
              <span className="text-rose-300 truncate max-w-[200px]" title={hoveredPing.error}>
                ({hoveredPing.error})
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-500">
            <span>Older</span>
            <span>Uptime History ({Math.min(history.length, maxBars)} checks)</span>
            <span>Latest</span>
          </div>
        )}
      </div>
    </div>
  );
};
