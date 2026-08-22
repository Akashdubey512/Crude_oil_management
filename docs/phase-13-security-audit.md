# Phase 13 Repository Security Audit Report

This report evaluates the current security controls of the Crude Oil Management & Maritime Corridor Risk Intelligence Platform and outlines the plan to upgrade it into an enterprise-grade secure ML intelligence platform.

---

## 1. Current Security Controls
- Centralized configuration management using Pydantic schema validation (`src/api/config.py`).
- Structured logging outputting JSON lines with auto-scrubbing of common secrets (`src/api/logging_config.py`).
- Prometheus metrics at `/metrics` exposing HTTP/DB/Prediction counts and latency summaries.
- Health probes `/api/health/live` and `/api/health/ready`.
- API rate limiting using an in-memory sliding-window IP rate limiter (`src/api/rate_limiter.py`).
- Dual database abstraction fallback supporting SQLite locally and PostgreSQL pooling in production (`src/api/database.py`).
- Security response headers added to FastAPI responses.

---

## 2. Current Authentication & Authorization Gaps
- **Static Headers**: Access to model promotion and rollback relies entirely on the static HTTP header `X-Admin-Role: admin`. This is insecure and vulnerable to spoofing.
- **Lack of Authentication**: API endpoints (e.g. risk calculations, comparison, retrain diagnostics) do not require credentials.
- **No Identity Tracking**: There is no audit logging indicating *who* performed model promotions, rollbacks, or administrative tasks.
- **No Roles (RBAC)**: The system lacks user/M2M identity categorization (e.g. Viewer, Analyst, ML Engineer, Admin).

---

## 3. Exposed Attack Surfaces
- **Model serving endpoints**: Unauthorized users can view and invoke prediction models.
- **Model Promotion & Rollback**: Direct endpoints allow promotion or rollback by passing static header values.
- **SSRF**: External request loader functions in `gdelt.py`, `portwatch.py`, and `ais_client.py` fetch data directly using `urllib.request.urlopen` without enforcing allowed domain whitelists or loopback/private range protection.

---

## 4. Secrets & Configuration Risks
- Configuration defaults in code contain hardcoded paths.
- Secrets (like `fred_api_key`) are loaded directly from environment variables but lack mandatory validation or hash configurations in production mode.

---

## 5. Container & Database Security Risks
- The current database user permissions do not distinguish between schema ownership (DDL) and application read/write (DML).
- Connection pool limits and timeout controls are configured but lack SSL enforcement options.

---

## 6. Phase 13 Action Plan

### Step 1: Centralized Security Configuration
- Update `src/api/config.py` to add `api_key_hash_secret` and enforce strict fail-fast validation in production mode when critical keys (`DATABASE_URL`, `API_KEY_HASH_SECRET`, `CORS_ORIGINS`) are missing or configured insecurely.

### Step 2: Hashed M2M API Keys & Auth Middleware
- Implement `api_keys` database table.
- Create secure API key generator utility (prefixes + public ID + secret key).
- Store key cryptographically using SHA-256 hashes.
- Implement an authentication middleware checking the `Authorization: Bearer <key>` header, verifying status, expiration, and scopes.

### Step 3: Server-Side RBAC Enforcement
- Define explicit roles (`VIEWER`, `ANALYST`, `ML_ENGINEER`, `ADMIN`) and map them to permission scopes.
- Protect endpoints by requiring authentications and specific scopes.
- Return HTTP 401 for unauthenticated requests and 403 for unauthorized requests.

### Step 4: Secure Model Governance
- Secure the model promotion and rollback endpoints.
- Enforce strict checks: authenticated user, ADMIN role/scope, immutable audit event creation, validation verification.

### Step 5: Security Audit Log
- Implement `security_audit_log` persistent database table.
- Record key events: authentication failures, forbidden requests, key creation/revocations, and governance changes. Ensure no raw credentials or keys are logged.

### Step 6: SSRF Request Protection
- Implement `src/api/secure_client.py` containing secure domain allowlist, IP resolution validation, redirect restrictions, and size limiters.
- Refactor GDELT, PortWatch, and AIS client calls to use the secure client.

### Step 7: Security Dashboard UI & API Endpoints
- Expose security endpoints: status, keys, revoke.
- Implement the "Security Center" tab in the frontend UI displaying real backend status, key profiles, audit logs, and rate-limit summaries.

### Step 8: Security Verification Test Suite
- Write `tests/test_phase13_security.py` verifying all 20 required security scenarios.
