# API Health Monitor

A real-time API uptime, response latency, and availability monitoring dashboard built with **React**, **Vite**, and a **Node.js/Express** backend probe engine.

---

## 🚀 Quickstart & Localhost Setup

### 1. Prerequisites
- Node.js 18+ or 20+ installed
- npm or yarn

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install

# use if needed
npm install-scripts approve @google/genai@2.27.0 esbuild@0.28.2 protobufjs@7.6.6
```

### 3. Environment Configuration
Create your local environment override file by copying `.env.example`:
```bash
cp .env.example .env.local
```

### 4. Start the Unified Dev Server
Run the full-stack Express server with Vite middleware:
```bash
npm run dev
```

Open your browser at:
```text
http://localhost:3000
```

---

## ⚙️ Environment Variables Reference (`.env.local` / `.env`)

The server automatically loads `.env.local` first (for local overrides), falling back to `.env` and default values.

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the Express + Vite server. |
| `NODE_ENV` | `development` | Runtime mode (`development` or `production`). |
| `LOG_LEVEL` | `debug` | Logging level (`debug`, `info`, `warn`, `error`). In `debug`, all probe latencies, URLs, and errors are printed to stdout. |
| `DEFAULT_TIMEOUT_MS` | `5000` | Global default probe timeout in milliseconds before triggering an `AbortError`. |
| `CRON_SCHEDULER_INTERVAL_MS`| `2000` | Background scheduler check frequency in milliseconds. |
| `DEFAULT_LATENCY_THRESHOLD_MS` | `800` | Response latency boundary in ms before status is marked as amber/degraded. |
| `APP_URL` | `http://localhost:3000` | Self-referential base URL for the server. |

Example `.env.local`:
```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
DEFAULT_TIMEOUT_MS=5000
CRON_SCHEDULER_INTERVAL_MS=2000
DEFAULT_LATENCY_THRESHOLD_MS=800
APP_URL=http://localhost:3000
```

---

## 🧪 Localhost Testing Guide

### 1. Probing Your Other Local Services
Since health checks are executed server-side in Node.js rather than the client browser, there are **no browser CORS limitations**. You can monitor any local service running on your machine:
- FastAPI / Flask: `http://127.0.0.1:8000/health`
- Express / Nest: `http://localhost:4000/api/status`
- Go / Gin: `http://localhost:8080/ping`
- Django: `http://localhost:8000/api/v1/health`

### 2. Built-in Sandbox Mock Endpoints
For testing without external internet access or to test failure scenarios, use the built-in mock endpoints:
- `http://localhost:3000/api/mock/users` — Nominal 200 OK fast microservice (~90ms).
- `http://localhost:3000/api/mock/payment` — Failing 500 Internal Server Error gateway (~780ms).
- `http://localhost:3000/api/mock/slow-search` — Degraded 200 OK endpoint exceeding the 800ms threshold (~1200ms).

### 3. Testing via Terminal (cURL)
Test an endpoint directly through the backend probe engine:
```bash
# One-off test probe via API:
curl -X POST http://localhost:3000/api/test-endpoint \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:3000/api/mock/users","method":"GET"}'
```

Trigger immediate check on all active monitors:
```bash
curl -X POST http://localhost:3000/api/monitors/check-all
```

---

## 🔍 Debugging & Troubleshooting

### 1. View Live Probe Debug Traces
With `LOG_LEVEL=debug` in your `.env.local`, your terminal displays real-time high-resolution probe logs:
```text
[DEBUG 09:15:30] [PROBE] GET https://api.github.com/zen -> HTTP 200 (184.2ms) [UP]
[DEBUG 09:15:32] [PROBE] GET http://127.0.0.1:3000/api/mock/payment -> HTTP 500 (792.1ms) [DOWN]
[DEBUG 09:15:35] [PROBE_ERROR] GET https://invalid.domain.test FAILED after 14.1ms: getaddrinfo ENOTFOUND
```

### 2. Inspect Runtime Telemetry
Visit the debug endpoint to view active Node memory, event loop PID, active monitors, and in-flight probes:
```bash
curl -s http://localhost:3000/api/debug/info | json_pp
```

Or view it inside the web app by clicking the **Debug & Localhost** button in the header navigation bar.

### 3. Common Local Issues & Solutions
- **Connection Refused (`ECONNREFUSED`)**:
  Verify the target local server is running on the specified port. Use `127.0.0.1` instead of `localhost` if your OS has IPv6 loopback binding quirks (`::1`).
- **Timeout Errors (`AbortError`)**:
  If a local database or external API is slow, increase the monitor's timeout limit (e.g., 10,000ms) in the endpoint settings.
- **Port In Use (`EADDRINUSE`)**:
  Change `PORT=3001` in your `.env.local` and restart with `npm run dev`.

---

## 🛠️ Scripts

- `npm run dev` — Starts the unified Express + Vite full-stack server on `http://localhost:3000`.
- `npm run build` — Compiles the React frontend into `dist/`.
- `npm run lint` — Runs TypeScript compiler checks without emitting files (`tsc --noEmit`).
- `npm start` — Starts the production Node.js server.


test free apis
API	
JSONPlaceholder	N
httpbin	
HTTPBin s
DummyJSON
REST Countries	
PokéAPI	 https://pokeapi.co/api/v2
Open-Meteo	
Dog CEO API	  https://dog.ceo/api/breeds/image/random
Cat Facts	
