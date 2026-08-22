# System Observability & Metrics Guide — Phase 12

This guide outlines the structured logging format, Prometheus metrics, and dashboard integrations implemented on the platform.

---

## 1. Structured JSON Logging

Every log line printed by the FastAPI application follows a structured JSON format:
```json
{
  "timestamp": "2026-08-22T10:25:44.753334+00:00",
  "level": "INFO",
  "service": "energy_resilience_api",
  "environment": "production",
  "request_id": "cc313be8-3b0d-40ec-982d-0705d0f42c4b",
  "message": "Request completed: GET /api/health status=200 latency=8.4ms",
  "logger": "energy_resilience_api",
  "filename": "main.py",
  "lineno": 135,
  "method": "GET",
  "path": "/api/health",
  "status_code": 200,
  "duration_ms": 8.4
}
```

- **Correlation ID Tracking**: Every request generates or propagates an `X-Request-ID` header. This ID is automatically injected into all log statements triggered within that request's context, enabling seamless end-to-end tracing.
- **Secrets Masking**: Handlers automatically scan log dictionary parameters and scrub credentials matching patterns like `key`, `password`, `secret`, `token`, `key_id`, or `api_key`.

---

## 2. Exposed Prometheus Metrics

The `/metrics` endpoint exports the following metrics in Prometheus text exposition format:

### HTTP Traffic
- `http_requests_total` (Labels: `method`, `path`, `status`): Count of all handled requests.
- `http_request_duration_seconds` (Labels: `method`, `path`): Latency histogram.

### Servings & Predictions
- `predictions_total` (Labels: `corridor`, `model_version`, `risk_level`): Count of computed predictions.
- `prediction_latency_seconds` (Labels: `corridor`): Inference latency profile.
- `ml_champion_predictions_total` (Labels: `corridor`): Count of predictions served using the active registry champion.

### External Feeds
- `external_feed_requests_total` (Labels: `feed_name`, `status`): Count of external loader requests.
- `external_feed_stale` (Labels: `feed_name`): Gauge indicating freshness (1 = stale, 0 = fresh).

### Database Health
- `db_latency_seconds` (Labels: `operation`): Query latency profiles.
- `db_errors_total` (Labels: `operation`): Database connection or write error count.

---

## 3. UI System Observability Tab

The frontend dashboard contains a dedicated **System Observability** panel:
- **System Status Indicators**: Monitors API, Database, and Model Registry connectivity.
- **Request Latency and Volume**: Displays current processed requests, average latency, and uptime.
- **External Feeds Watcher**: Details data freshness for FRED, GDELT, PortWatch, and GFW feeds.
- **Degraded Banners**: Flashes explicit visual warnings on the UI if critical data feeds are stale or Bab el-Mandeb proxy data is unavailable.
