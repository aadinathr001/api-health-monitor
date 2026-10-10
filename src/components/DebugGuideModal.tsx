import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Settings,
  Cpu,
  Layers,
  FileCode,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface DebugGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebugGuideModal: React.FC<DebugGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'env' | 'debug' | 'mocks'>('quickstart');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any | null>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);

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

  // Fetch runtime debug info when debug tab is opened
  useEffect(() => {
    if (!isOpen) return;
    setLoadingDebug(true);
    fetch('/api/debug/info')
      .then((res) => res.json())
      .then((data) => setDebugInfo(data))
      .catch((err) => console.error('Failed to load debug info:', err))
      .finally(() => setLoadingDebug(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const envSample = `# .env.local - Local Development Overrides
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
DEFAULT_TIMEOUT_MS=5000
CRON_SCHEDULER_INTERVAL_MS=2000
DEFAULT_LATENCY_THRESHOLD_MS=800
APP_URL=http://localhost:3000`;

  const curlTestLocal = `# Test the local health monitor endpoint directly in terminal:
curl -i http://localhost:3000/api/mock/users

# Test one-off probe via the server's probe engine:
curl -X POST http://localhost:3000/api/test-endpoint \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://api.github.com/zen","method":"GET"}'`;

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
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Localhost Testing &amp; Debugging Guide</h2>
              <p className="text-xs text-slate-400 font-mono">
                Environment configuration, local probe execution, and telemetry diagnosis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close debug guide"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('quickstart')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'quickstart'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Local Quickstart</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'env'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>.env &amp; .env.local Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debug')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'debug'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Live Debug Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mocks')}
            className={`pb-2.5 px-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mocks'
                ? 'border-emerald-400 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Built-in Mock Endpoints</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* TAB 1: Local Quickstart */}
          {activeTab === 'quickstart' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">
                    1
                  </span>
                  Running on Localhost
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  The API Health Monitor uses an integrated <strong>Node.js Express + Vite</strong> full-stack architecture.
                  The backend conducts asynchronous network probes server-side to bypass browser CORS limitations, while Vite renders the React dashboard.
                </p>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto leading-relaxed">
{`# 1. Install dependencies
npm install

# 2. Setup your local environment
cp .env.example .env.local

# 3. Start unified Express + Vite dev server
npm run dev

# 4. Open in browser
http://localhost:3000`}
                  </pre>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        'npm install\ncp .env.example .env.local\nnpm run dev',
                        'quickstart'
                      )
                    }
                    className="absolute top-2.5 right-2.5 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Copy commands"
                  >
                    {copiedKey === 'quickstart' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">
                    2
                  </span>
                  Monitoring Other Local Services
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  You can monitor any local service running on your machine (e.g. Django, Flask, Go, Express, or FastAPI apps):
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
                  <li><code>http://localhost:8080/api/users</code></li>
                  <li><code>http://127.0.0.1:5000/health</code></li>
                  <li><code>http://localhost:4000/graphql</code></li>
                </ul>
                <p className="text-slate-500 text-[11px]">
                  Probes originate from the Node.js server process, so standard loopback networking applies.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: .env & .env.local Setup */}
          {activeTab === 'env' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Recommended .env.local Template</h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(envSample, 'env')}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'env' ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy .env.local</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {envSample}
                </pre>
              </div>

              {/* Environment Variable Descriptions */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 font-mono border-b border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Variable</th>
                      <th className="py-2.5 px-3">Default</th>
                      <th className="py-2.5 px-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    <tr>
                      <td className="py-2 px-3 text-emerald-400">PORT</td>
                      <td className="py-2 px-3 text-slate-400">3000</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Port where the Express + Vite server listens.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400">LOG_LEVEL</td>
                      <td className="py-2 px-3 text-slate-400">debug</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Set to <code>debug</code> to log high-resolution probe latencies and error traces in terminal.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400">DEFAULT_TIMEOUT_MS</td>
                      <td className="py-2 px-3 text-slate-400">5000</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Timeout threshold before marking probe as AbortError (ms).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400">CRON_SCHEDULER_INTERVAL_MS</td>
                      <td className="py-2 px-3 text-slate-400">2000</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Frequency of the background check scheduler loop (ms).
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-emerald-400">DEFAULT_LATENCY_THRESHOLD_MS</td>
                      <td className="py-2 px-3 text-slate-400">800</td>
                      <td className="py-2 px-3 text-slate-300 font-sans">
                        Response time boundary in ms before status turns amber/degraded.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Live Debug Telemetry */}
          {activeTab === 'debug' && (
            <div className="space-y-4">
              {loadingDebug ? (
                <div className="p-8 text-center text-slate-500 font-mono">
                  Loading runtime telemetry...
                </div>
              ) : debugInfo ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[11px] block">Node Version</span>
                      <span className="font-mono text-sm text-emerald-400 font-bold">
                        {debugInfo.system.nodeVersion}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[11px] block">Memory (RSS / Heap)</span>
                      <span className="font-mono text-sm text-white font-bold tabular-nums">
                        {debugInfo.system.memoryRssMb}MB / {debugInfo.system.memoryHeapUsedMb}MB
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[11px] block">Process Uptime</span>
                      <span className="font-mono text-sm text-white font-bold tabular-nums">
                        {debugInfo.system.uptimeSeconds}s
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 text-[11px] block">Active Monitors</span>
                      <span className="font-mono text-sm text-white font-bold tabular-nums">
                        {debugInfo.monitors.active} / {debugInfo.monitors.total}
                      </span>
                    </div>
                  </div>

                  {/* Terminal cURL debugging snippet */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 font-mono text-xs flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                        Terminal Diagnostic Commands
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(curlTestLocal, 'curl')}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        {copiedKey === 'curl' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>Copy cURL</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed">
                      {curlTestLocal}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-400">
                  Could not load server runtime stats. Ensure server is running.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Built-in Mock Endpoints */}
          {activeTab === 'mocks' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-1">
                <span className="font-semibold text-emerald-400 text-xs block">
                  Built-in Sandbox Test Endpoints
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">
                  To test error handling, slow responses, and status codes on localhost without needing external services, the backend includes three realistic mock endpoints:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                        GET
                      </span>
                      <code className="text-white font-mono text-xs">/api/mock/users</code>
                      <span className="text-[11px] text-emerald-400 font-semibold font-mono">
                        🟢 HTTP 200 (~90ms)
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Simulates a nominal, fast microservice returning sample JSON users.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold">
                        GET
                      </span>
                      <code className="text-white font-mono text-xs">/api/mock/payment</code>
                      <span className="text-[11px] text-rose-400 font-semibold font-mono">
                        🔴 HTTP 500 (~780ms)
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Simulates a failing third-party gateway returning 500 Internal Error with timeout.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold">
                        GET
                      </span>
                      <code className="text-white font-mono text-xs">/api/mock/slow-search</code>
                      <span className="text-[11px] text-amber-400 font-semibold font-mono">
                        🟡 HTTP 200 (~1200ms)
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] mt-1">
                      Simulates a degraded, high-latency search query exceeding the 800ms alert threshold.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex justify-end">
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
