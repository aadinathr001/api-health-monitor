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
  avgLatencyMs?: number | null;
  p95LatencyMs?: number | null;
  availabilityPct?: number;
}

export interface LogEntry extends PingResult {
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
}

export interface TestProbeResult {
  ping: PingResult;
  headers: Record<string, string>;
  bodyPreview?: string;
}
