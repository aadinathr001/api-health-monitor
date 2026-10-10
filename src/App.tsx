import React, { useState, useEffect, useCallback } from 'react';
import { ApiMonitor } from './types.ts';
import { Header } from './components/Header.tsx';
import { StatsOverview } from './components/StatsOverview.tsx';
import { MonitorCard } from './components/MonitorCard.tsx';
import { MonitorDetailsModal } from './components/MonitorDetailsModal.tsx';
import { AddMonitorModal } from './components/AddMonitorModal.tsx';
import { DebugGuideModal } from './components/DebugGuideModal.tsx';
import { LiveLogsView } from './components/LiveLogsView.tsx';
import {
  Search,
  RefreshCw,
  Plus,
  RotateCcw,
  Activity,
} from 'lucide-react';

export default function App() {
  const [monitors, setMonitors] = useState<ApiMonitor[]>([]);
  const [serverUptime, setServerUptime] = useState(0);
  const [totalChecksAcrossAll, setTotalChecksAcrossAll] = useState(0);
  const [cronActive, setCronActive] = useState(true);

  const [activeTab, setActiveTab] = useState<'monitors' | 'logs'>('monitors');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'degraded' | 'down' | 'paused'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'latency' | 'availability' | 'name'>('default');

  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const selectedMonitor = monitors.find((m) => m.id === selectedMonitorId) || null;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState(false);
  const [isCheckingAll, setIsCheckingAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch monitors from server
  const fetchMonitors = useCallback(async () => {
    try {
      const res = await fetch('/api/monitors');
      if (!res.ok) throw new Error('Failed to load monitors');
      const data = await res.json();
      setMonitors(data.monitors || []);
      setServerUptime(data.serverUptime || 0);
      setTotalChecksAcrossAll(data.totalChecksAcrossAll || 0);
      setCronActive(data.cronActive ?? true);
    } catch (err) {
      console.error('Error fetching monitors:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Periodic polling for live real-time dashboard feel
  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 2500);
    return () => clearInterval(interval);
  }, [fetchMonitors]);

  // Actions
  const handleCheckNow = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}/check`, { method: 'POST' });
      if (res.ok) {
        const { monitor } = await res.json();
        setMonitors((prev) => prev.map((m) => (m.id === id ? monitor : m)));
      }
    } catch (err) {
      console.error('Failed to trigger check:', err);
    }
  };

  const handleRefreshAll = async () => {
    setIsCheckingAll(true);
    try {
      await fetch('/api/monitors/check-all', { method: 'POST' });
      await fetchMonitors();
    } finally {
      setIsCheckingAll(false);
    }
  };

  const handleToggleCron = async () => {
    try {
      const res = await fetch('/api/cron/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: !cronActive }),
      });
      const data = await res.json();
      setCronActive(data.cronRunning);
    } catch (err) {
      console.error('Failed to toggle cron:', err);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      if (res.ok) {
        setMonitors((prev) => prev.map((m) => (m.id === id ? { ...m, active } : m)));
      }
    } catch (err) {
      console.error('Failed to update monitor active state:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/monitors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMonitors((prev) => prev.filter((m) => m.id !== id));
        if (selectedMonitorId === id) {
          setSelectedMonitorId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete monitor:', err);
    }
  };

  const handleAddMonitor = async (monitorData: Partial<ApiMonitor>) => {
    const res = await fetch('/api/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monitorData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add monitor');
    }
    const created = await res.json();
    setMonitors((prev) => [...prev, created]);
    fetchMonitors();
  };

  const handleResetDefaults = async () => {
    try {
      const res = await fetch('/api/monitors/reset-defaults', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setMonitors(data.monitors || []);
      }
    } catch (err) {
      console.error('Failed to reset default monitors:', err);
    }
  };

  // Filter & Sort
  const filteredMonitors = monitors
    .filter((m) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(q);
        const matchesUrl = m.url.toLowerCase().includes(q);
        if (!matchesName && !matchesUrl) return false;
      }

      // Status filter
      if (statusFilter === 'paused') return !m.active;
      if (statusFilter !== 'all') {
        if (!m.active) return false;
        return m.currentStatus === statusFilter;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'latency') {
        const latA = a.lastLatencyMs ?? 99999;
        const latB = b.lastLatencyMs ?? 99999;
        return latA - latB;
      }
      if (sortBy === 'availability') {
        const avA = a.availabilityPct ?? 0;
        const avB = b.availabilityPct ?? 0;
        return avB - avA;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAddClick={() => setIsAddModalOpen(true)}
        onRefreshAll={handleRefreshAll}
        isCheckingAll={isCheckingAll}
        cronActive={cronActive}
        onToggleCron={handleToggleCron}
        serverUptime={serverUptime}
        onOpenDebugGuide={() => setIsDebugModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Telemetry Overview Strip */}
        <StatsOverview
          monitors={monitors}
          serverUptime={serverUptime}
          totalChecksAcrossAll={totalChecksAcrossAll}
        />

        {/* Tab 1: Endpoints Dashboard */}
        {activeTab === 'monitors' && (
          <div className="space-y-4">
            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter endpoints by name or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                />
              </div>

              {/* Segmented Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'up', label: 'Operational' },
                      { id: 'degraded', label: 'Degraded' },
                      { id: 'down', label: 'Outages' },
                      { id: 'paused', label: 'Paused' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatusFilter(item.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        statusFilter === item.id
                          ? 'bg-slate-800 text-white shadow-xs font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Sort selector */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-slate-700 font-mono"
                >
                  <option value="default">Sort: Default</option>
                  <option value="latency">Sort: Fastest Latency</option>
                  <option value="availability">Sort: Highest Availability</option>
                  <option value="name">Sort: Alphabetical</option>
                </select>

                {/* Restore Sample Endpoints */}
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reset to default sample endpoints (GitHub, Weather, Payment 500, etc.)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Monitors Cards List */}
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Loading health monitors...</span>
              </div>
            ) : filteredMonitors.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3">
                <Activity className="w-8 h-8 text-slate-600 mx-auto" />
                <h3 className="text-base font-semibold text-slate-300">No Endpoints Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No endpoints match your current filter criteria. Try clearing filters.'
                    : 'Get started by adding an API endpoint URL to monitor response times and uptime.'}
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                  >
                    + Add New Endpoint
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredMonitors.map((monitor) => (
                  <MonitorCard
                    key={monitor.id}
                    monitor={monitor}
                    onCheckNow={handleCheckNow}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                    onSelect={(m) => setSelectedMonitorId(m.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Logs */}
        {activeTab === 'logs' && (
          <LiveLogsView
            monitorsList={monitors.map((m) => ({ id: m.id, name: m.name }))}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 py-4 px-6 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>API Health Monitor</span>
          <span>·</span>
          <span>Real-time REST Endpoints Telemetry</span>
          <span>·</span>
          <button
            type="button"
            onClick={() => setIsDebugModalOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Localhost &amp; Debugging Guide
          </button>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>Fleet Checks: {totalChecksAcrossAll}</span>
          <span>·</span>
          <span>Server Uptime: {Math.floor(serverUptime)}s</span>
        </div>
      </footer>

      {/* Modals */}
      <MonitorDetailsModal
        monitor={selectedMonitor}
        onClose={() => setSelectedMonitorId(null)}
        onCheckNow={handleCheckNow}
      />

      <AddMonitorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddMonitor={handleAddMonitor}
      />

      <DebugGuideModal
        isOpen={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
      />
    </div>
  );
}
