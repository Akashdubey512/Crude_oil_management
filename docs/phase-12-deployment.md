# Production Deployment Runbook & CI/CD Hardening — Phase 12

This document provides guidelines, check-lists, and instructions for safely building, testing, deploying, and maintaining the Crude Oil Management & Maritime Corridor Risk Intelligence Platform in production.

---

## 1. CI/CD Verification Checklist

Before any code is merged to `main` or pushed to the production environment, the CI/CD pipeline (e.g. GitHub Actions) must execute the following steps:

1. **Linting & Code Quality**:
   - Python: Run `flake8 src/ tests/` or `black --check src/ tests/`
   - Frontend: Run `npm run lint` (using oxlint / eslint)
2. **Type Checking**:
   - Frontend: Run `npm run build` (tsc type compilation)
3. **Backend Test Suite**:
   - Run: `conda run -n project python -m unittest discover -s tests -p "test_*.py"`
   - Ensure all **253+ backend tests** pass (0 failures).
4. **Reliability & Integration Tests**:
   - Run: `conda run -n project python -m unittest tests/test_phase12_production.py`
   - Validates healthchecks, correlation IDs, Prometheus metric schemas, and security headers.
5. **Serving Safety Validation**:
   - Executes unit tests in `tests/test_phase11_governance.py` to ensure serving safety checks validate model artifacts, feature counts, and run test predictions successfully before promoting candidate models.
6. **Docker Build & Vulnerability Scan**:
   - Build production image: `docker build -t energy-resilience-api:latest .`
   - Run vulnerability scan (e.g. using `Trivy` or `Snyk`): `trivy image energy-resilience-api:latest`
   - Enforce: Zero high-severity vulnerabilities in base libraries.

---

## 2. Configuration & Secrets Management

Production settings are managed strictly via environment variables. Do **NOT** hardcode passwords or database URIs in source code.

| Environment Variable | Description | Recommended Production Value |
| --- | --- | --- |
| `ENVIRONMENT` | Target environment mode | `production` |
| `LOG_LEVEL` | Logging verbosity | `INFO` |
| `DATABASE_URL` | PostgreSQL connection pool URI | `postgresql://user:secure_pwd@postgres-host:5432/db` |
| `CORS_ORIGINS` | Allowed client origins | `https://resilience.energy-india.gov.in` |
| `API_RATE_LIMIT` | Max requests per client IP per min | `120` |
| `REQUEST_TIMEOUT` | External feed fetch timeout in seconds | `15` |

---

## 3. Database Migration & Schema Setup

When deploying to a PostgreSQL production environment:
1. Initialize the tables and database indices by executing the FastAPI server startup.
2. The lifespan system in `src/api/main.py` automatically detects the `DATABASE_URL` and calls `init_database()` in `src/api/database.py`.
3. If PostgreSQL is active:
   - It initializes `model_versions` and `predictions` tables.
   - It creates indices `idx_predictions_corridor`, `idx_predictions_timestamp`, and `idx_predictions_model_version`.
   - It pre-populates model versions by parsing `data/manifests/model_registry.json`.

---

## 4. Serving Security & Hardening

1. **Non-Root Execution**:
   - The production container executes under user ID `10001` (`appuser`). Do not override `USER appuser` in `Dockerfile`.
2. **Allowed CORS Origins**:
   - Configure `CORS_ORIGINS` strictly to match the domain names of the serving dashboards.
3. **Security Headers**:
   - All HTTP responses include headers enforcing security policies:
     - `X-Frame-Options: DENY` (prevents clickjacking)
     - `X-Content-Type-Options: nosniff` (prevents MIME sniffing)
     - `Content-Security-Policy: default-src 'self';` (prevents XSS)
4. **Payload Limit**:
   - Requests with payloads larger than `5MB` are rejected with `413 Request Entity Too Large`.

---

## 5. Staging vs Production Differences

- **Staging**:
  - Uses file-based SQLite database fallback (`data/predictions.db`).
  - GDELT/PortWatch loaders can run with `force_live=True` or `force_live=False` (loads local cache files).
- **Production**:
  - Uses active PostgreSQL instance with a threaded connection pool.
  - Rate limiting is configured to a higher threshold (e.g. 120 reqs/min).
  - Production deployments use the multi-stage Docker configuration exposed in `docker-compose.yml`.

---

## 6. Incident Response Playbook

### Scenario A: "Bab el-Mandeb proxy data is unavailable"
- **Symptom**: System degraded banner visible on frontend dashboard.
- **Cause**: IMF PortWatch ArcGIS service timed out, was rate-limited, or failed to respond after 3 retry attempts.
- **Remedy**:
  1. Check backend structured JSON logs for `IMF PortWatch request failed`.
  2. Inspect that the fallback local JSON files exist in `data/raw/portwatch/`.
  3. Verify the platform degrades gracefully by falling back to the latest available cached data, preventing application crash.

### Scenario B: "Database connection pool exhausted"
- **Symptom**: High API latency or HTTP 500 errors.
- **Cause**: DB connections leaked or database load is excessive.
- **Remedy**:
  1. Query Prometheus metrics: `db_latency_seconds` and `db_errors_total`.
  2. Restart the backend container to clear active connection handles.
  3. Verify that the connection is released back to the pool via `release_db_connection(conn)`.
