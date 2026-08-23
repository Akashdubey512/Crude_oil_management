# Phase 15 Documentation: Enterprise Dual-Theme System, Cartographic Intelligence & MLOps Governance Overhaul

## 1. Executive Summary

Phase 15 completes the full visual, cartographic, MLOps governance, and operational resilience overhaul of the **India Energy Supply Chain Resilience Platform**. 

Every module has been engineered to support enterprise light and dark theme parity, real-time telemetry observation, dynamic threat grading on maritime maps, and robust RBAC governance.

---

## 2. Key Architectural Deliverables

### A. Enterprise Dual-Theme System (`tokens.css` & `theme-utils.ts`)
- **Semantic CSS Token Infrastructure**: All surfaces, cards, borders, text levels, and status indicators reference CSS custom properties (`--bg-app`, `--bg-card`, `--text-primary`, `--border-default`, `--risk-low-*`, `--risk-moderate-*`, `--risk-high-*`, `--info-blue-*`).
- **Dynamic Leaflet Map Tile Switching**: Synchronous layer swapping between CartoDB Dark Matter and CartoDB Positron based on `html.theme-light` observation.
- **Universal Zero-Bleed Force Overrides**: Global stylesheet rules enforce proper text and surface contrast across all charts, tables, badges, and drawers.

### B. Advanced Maritime Cartography & Threat Vector Gradients
- **Multi-Vector Risk Visualizations**: Dynamic color-graded transit arcs (Green for Low Risk, Amber for Moderate Risk, Red for High Risk).
- **Interactive Multi-Layer Controls**: Toggles for AIS Maritime Traffic, Geopolitical GDELT Incidents, Energy Infrastructure, Import Terminals, and System Alerts.
- **Slide-Out Corridor Intelligence Drawer**: 5-vector risk decomposition, explainable AI SHAP waterfall charts, PortWatch vessel volume feeds, and proxy disclosures.

### C. MLOps Diagnostics & Model Governance
- **Champion vs. Challenger Architecture**: Automatic performance comparison (ROC-AUC, PR-AUC, Brier score) and version tracking across all 4 corridors (`HORMUZ`, `BAB_EL_MANDEB`, `SUEZ`, `RED_SEA`).
- **Formal Model Card Specifications**: Comprehensive markdown documentation detailing algorithm parameters, training windows, and operational bounds viewable in-app.
- **Automated Retraining Recommender**: Drift severity tracking (PSI/KS checks across all 52 features) with deterministic pipeline triggers.

### D. SRE Observability & Telemetry Stream
- **Prometheus Metrics Aggregation**: Real-time HTTP request throughput, response latency, and error tracking.
- **PostgreSQL Connection Pool Status**: Live database active thread monitoring.
- **Streaming Telemetry Console**: Formatted log feed displaying real-time engine operations.

### E. RBAC Scope Alignment & Production Hardening
- **Permission Matrix**: Refined authorization enabling Viewer, Analyst, and ML Engineer roles to explore analytics, models, and simulations while preserving Admin locks on model promotion and key generation.
- **Zero Runtime Warnings**: Unified Framer Motion animations and unique React keys across all lists and tables.
- **Build Quality**: Verified TypeScript compilation (`tsc -b`) and fast Vite bundle minification.

---

## 3. Verification & Compliance
- **Backend Tests**: 282 tests passing (`pytest tests/`).
- **Frontend Build**: Production bundle built cleanly (`npm run build`).
- **Endpoint Diagnostics**: 100% 200 OK responses across all authenticated endpoints.
