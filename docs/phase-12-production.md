# Production Architecture & Reliability Manual — Phase 12

This manual details the production-ready architecture, security configurations, and reliability features implemented on the Crude Oil Management & Maritime Corridor Risk Intelligence Platform.

---

## 1. Production Architecture Overview

The platform uses a layered production architecture:
1. **Frontend**: Vite SPA, pre-compiled deterministically and served via a reverse proxy (e.g. Nginx). Resolves API base URL from `import.meta.env.VITE_API_BASE_URL`.
2. **API Gateways**: Nginx or AWS ALB handles TLS termination and rate limit filtering.
3. **Application API**: FastAPI process running ASGI workers via uvicorn. Handles structured logging (JSON-LD format), request tracing (X-Request-ID propagation), and metrics recording.
4. **Model Serving**: Python memory served inference with safety checks (deserialization, type validation, and dummy prediction checks) executing before model activation.
5. **Persistence**: Dual database adapter. SQLite for local staging and PostgreSQL connection pooling (`ThreadedConnectionPool`) for high-concurrency production deployments.

---

## 2. Configurable Security Hardening

- **Payload Size Restriction**: Enforces a strict 5MB limit on request payloads.
- **CORS Whitelist**: Whitelist origins dynamically loaded from `CORS_ORIGINS` config variable.
- **Security Response Headers**:
  - `X-Frame-Options: DENY` (prevents clickjacking)
  - `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
  - `X-XSS-Protection: 1; mode=block` (prevents cross-site scripting)
  - `Content-Security-Policy: default-src 'self'` (prevents malicious payload execution)

---

## 3. Reliability & Fault Tolerance

1. **API Rate Limiting**: sliding-window IP rate limiter built into uvicorn middleware (prevents abuse and denial-of-service).
2. **External Data Feed Resilience**:
   - Timeouts of 15 seconds enforced on all GDELT and IMF PortWatch queries.
   - Exponential backoff retry loop (up to 3 attempts).
   - Graceful stale-data fallback (uses cached raw local JSON payloads if external endpoints fail).
3. **Lifespan Lifecycle Hooks**:
   - Startup hooks initialize database connection pools, setup indexes, and pre-populate model versions.
   - Shutdown hooks close connection pools cleanly, preventing connection leaks.
