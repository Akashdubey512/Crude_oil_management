# Observability, SRE & Model Health Monitoring

> **Platform**: Energy Resilience Intel  
> **Module**: Observability Routes (`src/api/routes/observability.py`, `src/api/routes/monitoring.py`)

---

## 1. Overview

Energy Resilience Intel provides comprehensive SRE observability, monitoring both system infrastructure health and ML model drift in real time.

---

## 2. Telemetry Endpoints

| Endpoint | Format | Access Control | Purpose |
|:---|:---|:---|:---|
| `/metrics` | Prometheus Text Exposition | Public | Scraped by Prometheus server for Grafana dashboards |
| `/api/observability/metrics` | Structured JSON | `ADMIN` / `ML_ENGINEER` | Exposes system RAM, CPU, DB pool, and API latency histograms |
| `/api/health` | JSON | Public | Liveness probe returning `{"status": "healthy"}` |
| `/api/health/ready` | JSON | Public | Readiness probe checking database connectivity |
| `/api/models/{corridor}/drift` | JSON | `MODEL_READ` | Model drift metrics (PSI & KS statistics) |

---

## 3. Drift Monitoring (PSI & KS Tests)

To detect data drift before performance degrades, the system computes:

* **Population Stability Index (PSI)**:
  $$\text{PSI} = \sum \left( P_{\text{actual}} - P_{\text{expected}} \right) \times \ln\left(\frac{P_{\text{actual}}}{P_{\text{expected}}}\right)$$
  - $\text{PSI} < 0.10$: Stable distribution (Green).
  - $0.10 \le \text{PSI} \le 0.25$: Slight drift warning (Yellow).
  - $\text{PSI} > 0.25$: Significant data drift (Red $\rightarrow$ Retraining Alert).

* **Kolmogorov-Smirnov (KS) Test**: Evaluates whether current inference feature distributions diverge significantly from baseline training distributions.
