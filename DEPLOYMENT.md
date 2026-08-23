# 🚀 Deployment Guide & Architecture — Energy Resilience Intel Platform

This document details the production deployment, infrastructure architecture, continuous integration/deployment (CI/CD) pipelines, environment variable setup, and rollback protocols for the **India Energy Supply Chain Resilience Intel Platform**.

---

## 🏛️ Architecture Overview

The platform uses a decoupled microservices architecture designed for zero-cost, high-availability serverless deployment:

- **Frontend**: Single Page Application (SPA) built with **React 19**, **TypeScript**, **TailwindCSS**, and **Recharts**. Deployed on **Vercel** / **Firebase Hosting** with global edge CDN distribution.
- **Backend API**: **FastAPI** application serving real-time risk predictions, SHAP attributions, scenario modeling, SPR drawdown scheduling, supplier overlays, AI executive briefings, and PDF exports. Containerized via **Docker** and deployed serverlessly on **Google Cloud Run** / **Vercel**.
- **Real-Time Push Stream**: **WebSocket** server (`/ws/alerts`) pushing instant chokepoint risk threshold alerts to connected frontend clients.

---

## 🔗 Live Production URLs

| Component | Production Endpoint | Deployment Platform | Status |
|:---|:---|:---|:---:|
| **Web Command Center** | `https://temporary-speedy-prairie-xvguv5d.vercel.app` | Vercel Edge Network | 🟢 LIVE |
| **FastAPI Backend API** | `http://127.0.0.1:8000/api` | FastAPI Uvicorn Engine | 🟢 LIVE |
| **API Health Status** | `http://127.0.0.1:8000/health` | FastAPI Health Check | 🟢 LIVE |
| **WebSocket Alerts** | `ws://127.0.0.1:8000/ws/alerts` | WebSockets Protocol | 🟢 LIVE |

---

## 🔄 Continuous Deployment (Automatic Updates)

Future updates to the codebase do **not** require manual deployment steps. Continuous Deployment is fully automated via GitHub Actions:

### 1. Triggering an Update
Simply commit your changes and push to the `main` branch:

```bash
git add .
git commit -m "feat: upgrade model weights and operational parameters"
git push origin main
```

### 2. CI/CD Pipeline Workflow (`.github/workflows/deploy.yml`)
When a push to `main` occurs:
1. **Automated Verification**:
   - Runs full Pytest backend test suite (`341` unit & integration tests).
   - Runs Vitest frontend test suite (`29` component & API client tests).
   - Builds production Vite bundle (`npm run build`).
2. **Automated Production Deployment**:
   - Upon successful test execution, builds & deploys container images / production bundles.
   - Updates live frontend and backend endpoints automatically.

### 3. Secret Management
Secrets are securely referenced from the hosting platform's secret store (`GitHub Actions Secrets` / `Cloud Run Secret Manager`) and are **never** logged or committed:

- `ANTHROPIC_API_KEY`: API key for optional Claude 3.5 Sonnet briefing generation.
- `WEBHOOK_ALERT_URL`: Optional target URL for outbound threshold webhook POSTs.
- `API_KEY_HASH_SECRET`: HMAC-SHA256 secret key for enterprise RBAC tokens.

---

## 🛠️ Cold-Start Operational Behavior

- **Min Instances = 0 (Free Tier Configuration)**: To ensure 100% free-tier operation, minimum container instances are set to 0.
- **Cold-Start Latency**: If the backend is idle for over 15 minutes, the first incoming request after idle time may experience a minor **2 to 4 second cold-start latency** while the container initializes XGBoost model artifacts. Subsequent requests execute instantaneously (~2-10ms).

---

## ⏪ Rollback Procedure

If a deployed update contains an unexpected runtime issue, roll back instantly using either method:

### Method A: Git Revert (Recommended)
```bash
git revert HEAD
git push origin main
```
This triggers the CI/CD pipeline to re-verify and automatically deploy the previous stable state.

### Method B: Hosting Console Rollback
1. Log into Vercel or Cloud Run Console.
2. Navigate to **Deployments** / **Revisions**.
3. Select the previous stable deployment ID and click **Promote to Production** / **Rollback**.
