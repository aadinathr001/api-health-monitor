import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env.local first, then fallback to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface PingResult {
  id: string;
  timestamp: number;
  latencyMs: number;
  statusCode: number | null;
  statusText?: string;
  status: 'up' | 'down' | 'degraded';
  error?: string;
  responseSize?: number;
  contentType?: string;
}

export interface ApiMonitor {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'HEAD' | 'POST';
  intervalSeconds: number;
  expectedStatus: number;
  timeoutMs: number;
  latencyThresholdMs: number;
  headers?: Record<string, string>;
  body?: string;
  active: boolean;
  createdAt: number;
  lastChecked: number | null;
  currentStatus: 'up' | 'down' | 'degraded' | 'pending';
  lastStatusCode: number | null;
  lastLatencyMs: number | null;
  lastError?: string;
  totalChecks: number;
  successfulChecks: number;
  history: PingResult[];
  incidentCount: number;
  lastStatusChange: number;
}

const PORT = Number(process.env.PORT) || 3000;
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
const DEFAULT_TIMEOUT_MS = Number(process.env.DEFAULT_TIMEOUT_MS) || 5000;
const CRON_SCHEDULER_INTERVAL_MS = Number(process.env.CRON_SCHEDULER_INTERVAL_MS) || 2000;
const DEFAULT_LATENCY_THRESHOLD_MS = Number(process.env.DEFAULT_LATENCY_THRESHOLD_MS) || 800;

const inFlightChecks = new Set<string>();

// Structured debug logger for localhost testing
function debugLog(section: string, message: string, meta?: unknown) {
  if (LOG_LEVEL === 'debug') {
    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    if (meta !== undefined) {
      console.log(`[DEBUG ${time}] [${section}] ${message}`, meta);
    } else {
      console.log(`[DEBUG ${time}] [${section}] ${message}`);
    }
  }
}

// Global in-memory storage of monitors
let monitors: ApiMonitor[] = [];
let recentLogs: (PingResult & { monitorId: string; monitorName: string; monitorUrl: string })[] = [];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Seed initial default monitors matching user concept
function initializeDefaultMonitors() {
  const now = Date.now();
  monitors = [
    {
      id: 'github-api',
      name: 'GitHub API',
      url: 'https://api.github.com/zen',
      method: 'GET',
      intervalSeconds: 30,
      expectedStatus: 200,
      timeoutMs: 5000,
      latencyThresholdMs: 800,
      headers: { 'User-Agent': 'API-Health-Monitor/1.0' },
      active: true,
      createdAt: now - 3600000,
      lastChecked: null,
      currentStatus: 'pending',
      lastStatusCode: null,
      lastLatencyMs: null,
      totalChecks: 0,
      successfulChecks: 0,
      history: [],
      incidentCount: 0,
      lastStatusChange: now,
    },
    {
      id: 'weather-api',
      name: 'Weather API',
      url: 'https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.00&current_weather=true',
      method: 'GET',
      intervalSeconds: 30,
      expectedStatus: 200,
      timeoutMs: 5000,
      latencyThresholdMs: 800,
      active: true,
      createdAt: now - 3600000,
      lastChecked: null,
      currentStatus: 'pending',
      lastStatusCode: null,
      lastLatencyMs: null,
      totalChecks: 0,
      successfulChecks: 0,
      history: [],
      incidentCount: 0,
      lastStatusChange: now,
    },
    {
      id: 'Poke-api',
      name: 'PokéAPI',
      url: `https://pokeapi.co/api/v2`,
      method: 'GET',
      intervalSeconds: 15,
      expectedStatus: 200,
      timeoutMs: 5000,
      latencyThresholdMs: 600,
      active: true,
      createdAt: now - 3600000,
      lastChecked: null,
      currentStatus: 'pending',
      lastStatusCode: null,
      lastLatencyMs: null,
      totalChecks: 0,
      successfulChecks: 0,
      history: [],
      incidentCount: 0,
      lastStatusChange: now,
    },
    {
      id: 'Dog-ceo-api',
      name: 'Dog.ceo API',
      url: `https://dog.ceo/api/breeds/image/random`,
      method: 'GET',
      intervalSeconds: 20,
      expectedStatus: 200,
      timeoutMs: 5000,
      latencyThresholdMs: 800,
      active: true,
      createdAt: now - 3600000,
      lastChecked: null,
      currentStatus: 'pending',
      lastStatusCode: null,
      lastLatencyMs: null,
      totalChecks: 0,
      successfulChecks: 0,
      history: [],
      incidentCount: 0,
      lastStatusChange: now,
    },
  ];
}

initializeDefaultMonitors();

// Resolve target URL (handling relative URLs against local express server)
function resolveTargetUrl(targetUrl: string): string {
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    return targetUrl;
  }
  const cleanPath = targetUrl.startsWith('/') ? targetUrl : `/${targetUrl}`;
  return `http://127.0.0.1:${PORT}${cleanPath}`;
}

// Perform an actual HTTP probe
async function probeEndpoint(
  url: string,
  method: 'GET' | 'HEAD' | 'POST' = 'GET',
  expectedStatus: number = 200,
  timeoutMs: number = 5000,
  latencyThresholdMs: number = 800,
  customHeaders?: Record<string, string>,
  body?: string
): Promise<{
  ping: PingResult;
  headers: Record<string, string>;
  bodyPreview?: string;
}> {
  const fullUrl = resolveTargetUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const reqHeaders: Record<string, string> = {
    'User-Agent': 'API-Health-Monitor/1.0 (Node.js)',
    Accept: '*/*',
    ...(customHeaders || {}),
  };

  const startTime = performance.now();
  try {
    const response = await fetch(fullUrl, {
      method,
      headers: reqHeaders,
      body: method === 'POST' ? body || '{}' : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });

    const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
    clearTimeout(timer);

    const headersRecord: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    let bodyPreview: string | undefined;
    let responseSize = 0;
    const contentType = headersRecord['content-type'] || '';

    try {
      if (method !== 'HEAD') {
        const text = await response.text();
        responseSize = Buffer.byteLength(text, 'utf8');
        bodyPreview = text.length > 2000 ? text.substring(0, 2000) + '... [truncated]' : text;
      }
    } catch {
      // Ignore body read issues
    }

    const isStatusOk = response.status === expectedStatus;
    let status: 'up' | 'down' | 'degraded' = 'up';

    if (!isStatusOk) {
      status = 'down';
    } else if (elapsed >= latencyThresholdMs) {
      status = 'degraded';
    }

    debugLog('PROBE', `${method} ${fullUrl} -> HTTP ${response.status} (${elapsed}ms) [${status.toUpperCase()}]`);

    const ping: PingResult = {
      id: generateId(),
      timestamp: Date.now(),
      latencyMs: elapsed,
      statusCode: response.status,
      statusText: response.statusText || `${response.status}`,
      status,
      error: !isStatusOk ? `Expected ${expectedStatus}, got ${response.status} ${response.statusText}` : undefined,
      responseSize,
      contentType,
    };

    return { ping, headers: headersRecord, bodyPreview };
  } catch (err: unknown) {
    clearTimeout(timer);
    const elapsed = Math.round((performance.now() - startTime) * 10) / 10;
    const errorObj = err as Error & { name?: string; code?: string };
    let errorMessage = 'Network request failed';

    if (errorObj.name === 'AbortError') {
      errorMessage = `Request timed out after ${timeoutMs}ms`;
    } else if (errorObj.code) {
      errorMessage = `Connection error: ${errorObj.code}`;
    } else if (errorObj.message) {
      errorMessage = errorObj.message;
    }

    debugLog('PROBE_ERROR', `${method} ${fullUrl} FAILED after ${elapsed}ms: ${errorMessage}`);

    const ping: PingResult = {
      id: generateId(),
      timestamp: Date.now(),
      latencyMs: elapsed,
      statusCode: null,
      statusText: 'Connection Failed',
      status: 'down',
      error: errorMessage,
      responseSize: 0,
    };

    return { ping, headers: {} };
  }
}

// Perform check and update monitor state
async function executeCheck(monitor: ApiMonitor): Promise<PingResult> {
  if (inFlightChecks.has(monitor.id)) {
    return monitor.history[monitor.history.length - 1];
  }
  inFlightChecks.add(monitor.id);

  try {
    const { ping } = await probeEndpoint(
      monitor.url,
      monitor.method,
      monitor.expectedStatus,
      monitor.timeoutMs,
      monitor.latencyThresholdMs,
      monitor.headers,
      monitor.body
    );

    const prevStatus = monitor.currentStatus;
    monitor.lastChecked = ping.timestamp;
    monitor.lastLatencyMs = ping.latencyMs;
    monitor.lastStatusCode = ping.statusCode;
    monitor.lastError = ping.error;
    monitor.currentStatus = ping.status;
    monitor.totalChecks += 1;

    if (ping.status !== 'down') {
      monitor.successfulChecks += 1;
    }

    if (prevStatus !== 'pending' && prevStatus !== ping.status) {
      monitor.lastStatusChange = ping.timestamp;
      if (ping.status === 'down') {
        monitor.incidentCount += 1;
      }
    }

    // Retain last 60 data points for sparkline/timeline charts
    monitor.history = [...monitor.history.slice(-59), ping];

    // Push into global event log
    recentLogs = [
      {
        ...ping,
        monitorId: monitor.id,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
      },
      ...recentLogs.slice(0, 99),
    ];

    return ping;
  } finally {
    inFlightChecks.delete(monitor.id);
  }
}

// Background Cron Loop (running every 2 seconds to check overdue monitors)
let cronRunning = true;
const cronInterval = setInterval(async () => {
  if (!cronRunning) return;
  const now = Date.now();

  for (const monitor of monitors) {
    if (!monitor.active) continue;
    const needsCheck =
      !monitor.lastChecked || now - monitor.lastChecked >= monitor.intervalSeconds * 1000;

    if (needsCheck && !inFlightChecks.has(monitor.id)) {
      // Execute asynchronously without blocking next monitor
      executeCheck(monitor).catch(console.error);
    }
  }
}, 2000);

process.on('SIGINT', () => {
  clearInterval(cronInterval);
});

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoints
  app.head('/head', (_req: Request, res: Response) => {
    res
      .status(200)
      .set({
        'Content-Type': 'application/json',
        'X-Health-Check': 'OK',
        'X-Uptime-Seconds': Math.floor(process.uptime()).toString(),
        'X-Monitors-Total': monitors.length.toString(),
      })
      .end();
  });

  app.get('/head', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'api-health-monitor',
      uptimeSeconds: Math.floor(process.uptime()),
      activeMonitors: monitors.filter((m) => m.active).length,
      totalMonitors: monitors.length,
      totalChecksAcrossAll: monitors.reduce((acc, m) => acc + m.totalChecks, 0),
      timestamp: new Date().toISOString(),
    });
  });

  // Standard root and /api/health probes
  app.head('/', (_req: Request, res: Response) => {
    res.status(200).end();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  // -------------------------------------------------------------
  // Built-in Mock Endpoints for Demonstration & Testing Failure Modes
  // -------------------------------------------------------------
  app.get('/api/mock/users', async (_req: Request, res: Response) => {
    // Fast reliable endpoint (~80-110ms)
    await new Promise((r) => setTimeout(r, 85 + Math.random() * 30));
    res.status(200).json({
      users: [
        { id: 1, name: 'Alice Chen', role: 'DevOps Lead', email: 'alice@example.com' },
        { id: 2, name: 'Marcus Vance', role: 'Backend Engineer', email: 'marcus@example.com' },
      ],
      total: 2,
      latencyReport: 'nominal',
    });
  });

  app.get('/api/mock/payment', async (_req: Request, res: Response) => {
    // Failing endpoint with high response time (~750-850ms) matching prompt mockup
    await new Promise((r) => setTimeout(r, 780 + Math.random() * 80));
    res.status(500).json({
      error: 'Internal Server Error: Payment Processor Gateway Timeout',
      service: 'stripe_mock_bridge',
      code: 'GATEWAY_500_TIMEOUT',
      incident_ref: `inc_${Math.floor(Math.random() * 90000 + 10000)}`,
    });
  });

  app.get('/api/mock/slow-search', async (_req: Request, res: Response) => {
    // Degraded endpoint (high latency ~1200ms)
    await new Promise((r) => setTimeout(r, 1150 + Math.random() * 150));
    res.status(200).json({
      query: 'global_index',
      resultsCount: 1420,
      tookMs: 1200,
      warning: 'High cache miss rate',
    });
  });

  // -------------------------------------------------------------
  // REST API for Monitor Management
  // -------------------------------------------------------------

  // GET all monitors with computed stats
  app.get('/api/monitors', (_req: Request, res: Response) => {
    const list = monitors.map((m) => {
      const validPoints = m.history.filter((h) => h.latencyMs > 0);
      const avgLatency =
        validPoints.length > 0
          ? Math.round(validPoints.reduce((acc, h) => acc + h.latencyMs, 0) / validPoints.length)
          : null;

      const sortedLatencies = [...validPoints.map((h) => h.latencyMs)].sort((a, b) => a - b);
      const p95Latency =
        sortedLatencies.length > 0
          ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
          : null;

      const availability =
        m.totalChecks > 0
          ? Math.round((m.successfulChecks / m.totalChecks) * 1000) / 10
          : 100;

      return {
        ...m,
        avgLatencyMs: avgLatency,
        p95LatencyMs: p95Latency,
        availabilityPct: availability,
      };
    });

    res.json({
      monitors: list,
      serverUptime: Math.floor(process.uptime()),
      cronActive: cronRunning,
      totalChecksAcrossAll: monitors.reduce((acc, m) => acc + m.totalChecks, 0),
    });
  });

  // POST create monitor
  app.post('/api/monitors', async (req: Request, res: Response) => {
    const {
      name,
      url,
      method = 'GET',
      intervalSeconds = 30,
      expectedStatus = 200,
      timeoutMs = 5000,
      latencyThresholdMs = 800,
      headers,
      body,
    } = req.body;

    if (!name || !url) {
      res.status(400).json({ error: 'Name and URL are required' });
      return;
    }

    const now = Date.now();
    const newMonitor: ApiMonitor = {
      id: generateId(),
      name: name.trim(),
      url: url.trim(),
      method: (method.toUpperCase() as 'GET' | 'HEAD' | 'POST') || 'GET',
      intervalSeconds: Math.max(5, Math.min(3600, Number(intervalSeconds) || 30)),
      expectedStatus: Number(expectedStatus) || 200,
      timeoutMs: Math.max(1000, Math.min(30000, Number(timeoutMs) || 5000)),
      latencyThresholdMs: Math.max(100, Math.min(10000, Number(latencyThresholdMs) || 800)),
      headers: headers && typeof headers === 'object' ? headers : undefined,
      body: body ? String(body) : undefined,
      active: true,
      createdAt: now,
      lastChecked: null,
      currentStatus: 'pending',
      lastStatusCode: null,
      lastLatencyMs: null,
      totalChecks: 0,
      successfulChecks: 0,
      history: [],
      incidentCount: 0,
      lastStatusChange: now,
    };

    monitors.push(newMonitor);

    // Run first immediate probe so user doesn't wait
    executeCheck(newMonitor).catch(console.error);

    res.status(201).json(newMonitor);
  });

  // PUT update monitor
  app.put('/api/monitors/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const monitor = monitors.find((m) => m.id === id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const {
      name,
      url,
      method,
      intervalSeconds,
      expectedStatus,
      timeoutMs,
      latencyThresholdMs,
      headers,
      body,
      active,
    } = req.body;

    if (name !== undefined) monitor.name = name.trim();
    if (url !== undefined) monitor.url = url.trim();
    if (method !== undefined) monitor.method = method.toUpperCase();
    if (intervalSeconds !== undefined) monitor.intervalSeconds = Math.max(5, Number(intervalSeconds));
    if (expectedStatus !== undefined) monitor.expectedStatus = Number(expectedStatus);
    if (timeoutMs !== undefined) monitor.timeoutMs = Math.max(1000, Number(timeoutMs));
    if (latencyThresholdMs !== undefined) monitor.latencyThresholdMs = Number(latencyThresholdMs);
    if (headers !== undefined) monitor.headers = headers;
    if (body !== undefined) monitor.body = body;
    if (active !== undefined) monitor.active = Boolean(active);

    res.json(monitor);
  });

  // DELETE monitor
  app.delete('/api/monitors/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const index = monitors.findIndex((m) => m.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }
    monitors.splice(index, 1);
    res.json({ success: true, message: 'Monitor deleted' });
  });

  // POST trigger check now on specific monitor
  app.post('/api/monitors/:id/check', async (req: Request, res: Response) => {
    const { id } = req.params;
    const monitor = monitors.find((m) => m.id === id);
    if (!monitor) {
      res.status(404).json({ error: 'Monitor not found' });
      return;
    }

    const ping = await executeCheck(monitor);
    res.json({ monitor, ping });
  });

  // POST trigger check on all monitors
  app.post('/api/monitors/check-all', async (_req: Request, res: Response) => {
    const promises = monitors.filter((m) => m.active).map((m) => executeCheck(m));
    await Promise.allSettled(promises);
    res.json({ success: true, checkedCount: promises.length });
  });

  // POST instant one-off test endpoint (without saving)
  app.post('/api/test-endpoint', async (req: Request, res: Response) => {
    const {
      url,
      method = 'GET',
      expectedStatus = 200,
      timeoutMs = 5000,
      latencyThresholdMs = 800,
      headers,
      body,
    } = req.body;

    if (!url) {
      res.status(400).json({ error: 'URL is required for test probe' });
      return;
    }

    const result = await probeEndpoint(
      url,
      method,
      Number(expectedStatus) || 200,
      Number(timeoutMs) || 5000,
      Number(latencyThresholdMs) || 800,
      headers,
      body
    );

    res.json(result);
  });

  // GET recent audit logs
  app.get('/api/logs', (_req: Request, res: Response) => {
    res.json({ logs: recentLogs.slice(0, 50) });
  });

  // GET localhost debugging and runtime telemetry
  app.get('/api/debug/info', (_req: Request, res: Response) => {
    const memory = process.memoryUsage();
    res.json({
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT,
        LOG_LEVEL,
        DEFAULT_TIMEOUT_MS,
        CRON_SCHEDULER_INTERVAL_MS,
        DEFAULT_LATENCY_THRESHOLD_MS,
        APP_URL: process.env.APP_URL || `http://localhost:${PORT}`,
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        pid: process.pid,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryRssMb: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
        memoryHeapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
      },
      monitors: {
        total: monitors.length,
        active: monitors.filter((m) => m.active).length,
        cronActive: cronRunning,
        totalChecks: monitors.reduce((sum, m) => sum + m.totalChecks, 0),
        inFlightChecks: Array.from(inFlightChecks),
      },
      mockEndpoints: [
        { path: '/api/mock/users', method: 'GET', description: 'Returns 200 OK fast (~80-110ms)' },
        { path: '/api/mock/payment', method: 'GET', description: 'Returns 500 Internal Error (~780ms)' },
        { path: '/api/mock/slow-search', method: 'GET', description: 'Returns 200 OK degraded (~1200ms)' },
      ],
    });
  });

  // POST reset monitors to defaults
  app.post('/api/monitors/reset-defaults', async (_req: Request, res: Response) => {
    initializeDefaultMonitors();
    // Run immediate check on all
    for (const m of monitors) {
      executeCheck(m).catch(console.error);
    }
    res.json({ success: true, monitors });
  });

  // POST toggle background cron
  app.post('/api/cron/toggle', (req: Request, res: Response) => {
    const { enable } = req.body;
    cronRunning = enable !== undefined ? Boolean(enable) : !cronRunning;
    res.json({ cronRunning });
  });

  // -------------------------------------------------------------
  // Vite Integration (Dev) or Static Serving (Production)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Pre-trigger initial probes for seed monitors immediately so initial load has real live telemetry
  setTimeout(() => {
    monitors.forEach((m) => executeCheck(m).catch(console.error));
  }, 500);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Health Monitor running on http://127.0.0.1:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
