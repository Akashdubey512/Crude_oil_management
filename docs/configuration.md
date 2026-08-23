# Configuration Guide

This document covers all configuration and environment variables required to run the India Energy Supply Chain Resilience Platform.

---

## Backend Environment Variables

Copy `.env.example` to `.env` and populate values before starting the API server.

```bash
cp .env.example .env
```

| Variable | Default | Description |
|:---|:---|:---|
| `ENVIRONMENT` | `development` | Runtime environment (`development`, `production`) |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warning`, `error`) |
| `DATA_DIR` | `data/` | Path to the project data directory |
| `MODELS_DIR` | `models/` | Path to trained model pickle artifacts |
| `GFW_API_TOKEN` | *(empty)* | **GFW AIS token** — required only if enabling live AIS vessel tracking |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins for CORS |

---

## AIS Configuration (GFW Token)

The platform currently marks AIS as **UNAVAILABLE** because no GFW API token is configured.

To enable live AIS vessel tracking:

1. Apply for API access at [https://globalfishingwatch.org/our-apis/](https://globalfishingwatch.org/our-apis/).
2. Once approved, set your token in `.env`:
   ```
   GFW_API_TOKEN=your_actual_token_here
   ```
3. The AIS client in [`src/maritime/ais_client.py`](src/maritime/ais_client.py) reads `os.getenv("GFW_API_TOKEN")` at startup.
4. Restart the API server to pick up the new token.
5. The `/api/data-status` endpoint will then reflect `status: FRESH` for the GFW AIS source.

> ⚠️ **Never commit your GFW token** to source control. Ensure `.env` is listed in `.gitignore` (it is by default).

---

## Frontend Environment Variables

The Vite frontend uses the proxy configured in `vite.config.ts` to forward `/api/*` calls to the backend.

| Variable | Default | Description |
|:---|:---|:---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | Backend API base URL (optional override) |

---

## Security Checklist

- [x] No API keys or tokens committed to source control
- [x] `.env` is in `.gitignore`
- [x] `.env.example` documents all required variables without values
- [x] CORS is configured to restrict allowed origins
- [x] No filesystem paths leak in API responses
- [x] No secrets are logged at `info` level
