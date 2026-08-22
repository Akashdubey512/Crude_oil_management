# Incident Response & Disaster Recovery Playbook — Phase 12

This playbook details debugging procedures and disaster recovery operations for the platform.

---

## 1. Quick Debugging Command Sheet

### Check API Server Health
- Query liveness probe:
  ```bash
  curl -i http://localhost:8000/api/health/live
  ```
- Query readiness probe:
  ```bash
  curl -i http://localhost:8000/api/health/ready
  ```
- Inspect system logs (JSON structured streams):
  ```bash
  docker-compose logs -f backend
  ```

### Inspect Metrics & Sockets
- Check listening port PID:
  ```cmd
  netstat -ano | findstr LISTENING | findstr :8000
  ```
- Scrape Prometheus metrics:
  ```bash
  curl http://localhost:8000/metrics | grep http_requests
  ```

---

## 2. Emergency Recovery Playbook

### Incident 1: API returns `503 Service Unavailable`
- **Likely Cause**: The database is offline or model registry loading failed.
- **Action**:
  1. Inspect readiness check detail payload: `curl http://localhost:8000/api/health/ready`.
  2. If `database` is down, verify database connectivity and credentials in `.env`.
  3. If `model_registry` is broken, verify that `data/manifests/model_registry.json` is valid JSON and not empty.

### Incident 2: High Memory Consumption or Thread Locks
- **Likely Cause**: PostgreSQL connection pool leak or model loading locks.
- **Action**:
  1. Inspect uvicorn active threads and verify uvicorn process limits.
  2. Force restart uvicorn container:
     ```bash
     docker-compose restart backend
     ```
  3. The uvicorn lifespan startup will automatically reconnect and refresh pools.
