import React, { useState, useEffect } from 'react';
import { ApiMonitor, TestProbeResult } from '../types.ts';
import { X, Play, Plus, CheckCircle, AlertTriangle, XCircle, Sparkles, Code } from 'lucide-react';

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMonitor: (monitorData: Partial<ApiMonitor>) => Promise<void>;
}

const PRESETS = [
  {
    name: 'GitHub API (Zen)',
    url: 'https://api.github.com/zen',
    method: 'GET' as const,
    intervalSeconds: 30,
    expectedStatus: 200,
    headers: { 'User-Agent': 'API-Health-Monitor/1.0' },
  },
  {
    name: 'Open-Meteo Weather API',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.00&current_weather=true',
    method: 'GET' as const,
    intervalSeconds: 30,
    expectedStatus: 200,
  },
  {
    name: 'JSONPlaceholder Users',
    url: 'https://jsonplaceholder.typicode.com/users/1',
    method: 'GET' as const,
    intervalSeconds: 30,
    expectedStatus: 200,
  },
  {
    name: 'CoinGecko Ping API',
    url: 'https://api.coingecko.com/api/v3/ping',
    method: 'GET' as const,
    intervalSeconds: 30,
    expectedStatus: 200,
  },
  {
    name: 'Simulated Payment Gateway (500 Error)',
    url: '/api/mock/payment',
    method: 'GET' as const,
    intervalSeconds: 20,
    expectedStatus: 200,
  },
  {
    name: 'Simulated Slow Service (Degraded)',
    url: '/api/mock/slow-search',
    method: 'GET' as const,
    intervalSeconds: 20,
    expectedStatus: 200,
  },
];

export const AddMonitorModal: React.FC<AddMonitorModalProps> = ({
  isOpen,
  onClose,
  onAddMonitor,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'HEAD' | 'POST'>('GET');
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [latencyThresholdMs, setLatencyThresholdMs] = useState(800);
  const [headersStr, setHeadersStr] = useState('');
  const [bodyStr, setBodyStr] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestProbeResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setName(preset.name);
    setUrl(preset.url);
    setMethod(preset.method);
    setIntervalSeconds(preset.intervalSeconds);
    setExpectedStatus(preset.expectedStatus);
    setHeadersStr(preset.headers ? JSON.stringify(preset.headers, null, 2) : '');
    setTestResult(null);
    setErrorMsg(null);
  };

  const handleRunTestProbe = async () => {
    if (!url.trim()) {
      setErrorMsg('Please enter an API URL to probe.');
      return;
    }
    setErrorMsg(null);
    setIsTesting(true);
    setTestResult(null);

    let parsedHeaders: Record<string, string> | undefined;
    if (headersStr.trim()) {
      try {
        parsedHeaders = JSON.parse(headersStr);
      } catch {
        setErrorMsg('Invalid JSON in Request Headers field.');
        setIsTesting(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          method,
          expectedStatus,
          timeoutMs,
          latencyThresholdMs,
          headers: parsedHeaders,
          body: method === 'POST' ? bodyStr : undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Probe execution failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      setErrorMsg('Please provide both an Endpoint Name and a Target URL.');
      return;
    }

    let parsedHeaders: Record<string, string> | undefined;
    if (headersStr.trim()) {
      try {
        parsedHeaders = JSON.parse(headersStr);
      } catch {
        setErrorMsg('Invalid JSON in Request Headers field.');
        return;
      }
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await onAddMonitor({
        name: name.trim(),
        url: url.trim(),
        method,
        intervalSeconds,
        expectedStatus,
        timeoutMs,
        latencyThresholdMs,
        headers: parsedHeaders,
        body: method === 'POST' ? bodyStr : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create monitor');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h2 className="text-lg font-semibold text-white">Add Monitored Endpoint</h2>
            <p className="text-xs text-slate-400">
              Configure health checks, intervals, and expected response parameters.
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close add dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5">
          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Name & Method */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Endpoint Name <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Users Service API"
                required
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">HTTP Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'GET' | 'HEAD' | 'POST')}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors font-mono"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
                <option value="POST">POST</option>
              </select>
            </div>
          </div>

          {/* Target URL */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-300">
                Target URL <span className="text-emerald-400">*</span>
              </label>
              <span className="text-[11px] text-slate-500">Supports relative (/head) or full HTTPS</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/v1/health"
                required
                className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={handleRunTestProbe}
                disabled={isTesting || !url.trim()}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? 'Testing...' : 'Test Probe'}</span>
              </button>
            </div>
          </div>

          {/* Test Probe Live Result Feedback */}
          {testResult && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Test Probe Result:</span>
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`flex items-center gap-1 font-semibold ${
                      testResult.ping.status === 'up'
                        ? 'text-emerald-400'
                        : testResult.ping.status === 'degraded'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {testResult.ping.status === 'up' ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : testResult.ping.status === 'degraded' ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {testResult.ping.statusCode ? `HTTP ${testResult.ping.statusCode}` : 'FAILED'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-200 tabular-nums">{testResult.ping.latencyMs} ms</span>
                </div>
              </div>
              {testResult.ping.error && (
                <p className="text-xs text-rose-400 font-mono">{testResult.ping.error}</p>
              )}
              {testResult.bodyPreview && (
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 block mb-0.5">Response Snippet:</span>
                  <pre className="text-[11px] font-mono text-slate-300 bg-slate-900 p-2 rounded max-h-24 overflow-y-auto">
                    {testResult.bodyPreview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Intervals & Thresholds */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Check Interval</label>
              <select
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value={10}>10s (High frequency)</option>
                <option value={15}>15s (Recommended)</option>
                <option value={30}>30s (Standard)</option>
                <option value={60}>60s (1 minute)</option>
                <option value={300}>300s (5 minutes)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Expected Status</label>
              <input
                type="number"
                value={expectedStatus}
                onChange={(e) => setExpectedStatus(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Timeout (ms)</label>
              <input
                type="number"
                value={timeoutMs}
                step={500}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Slow Alert (&gt; ms)</label>
              <input
                type="number"
                value={latencyThresholdMs}
                step={100}
                onChange={(e) => setLatencyThresholdMs(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Optional Headers */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
              <span>Custom Headers (JSON Object)</span>
              <span className="text-[11px] text-slate-500">Optional</span>
            </label>
            <textarea
              value={headersStr}
              onChange={(e) => setHeadersStr(e.target.value)}
              placeholder='{ "Authorization": "Bearer token", "X-Custom": "val" }'
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* POST Body */}
          {method === 'POST' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Request Payload (Body)</label>
              <textarea
                value={bodyStr}
                onChange={(e) => setBodyStr(e.target.value)}
                placeholder='{ "query": "status" }'
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{isSaving ? 'Saving...' : 'Add Monitor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
