# Phase 14 — Premium Geopolitical Maritime Intel Command Center & Landing Experience

This document details the architecture, design choices, state layout, and verification process of the **Phase 14 Enterprise Frontend Transformation** of the Crude Oil Management & Geopolitical Maritime Threat Command Center.

---

## 1. Design System & Theming

- **Path:** [`src/design-system/tokens.css`](file:///D:/hackathon%20project/energy-resilience/frontend/src/design-system/tokens.css)
- **Architecture:** The design system implements standard HSL tokens mapped onto CSS variables for dark themes.
  - **Risk Spectrum Colors:**
    - Low Risk: `#10b981` (Emerald)
    - Moderate Risk: `#f59e0b` (Amber)
    - High Risk: `#f43f5e` (Rose)
    - Critical Risk: `#e11d48` (Crimson)
  - **Aesthetics:** Uses curated Glassmorphism panel presets (`glass-panel`) utilizing backdrop filters, linear gradient borders, and customized high-contrast scrollbars (`scrollbar`).
- **Transitions:** Integrated Framer Motion curve settings (`slideInRight`, `pageTransition`, `scaleIn`) to run cinematic entering state changes and slideout draw transitions.

---

## 2. Dynamic Landing Experience

- **Path:** [`src/pages/Landing.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/pages/Landing.tsx)
- **Features:**
  - **Cinematic Entry:** Radar sweep dashboard focusing on the Northern Indian Ocean, Bab el-Mandeb, Strait of Hormuz, and India West Coast shipping corridors.
  - **Animated vector Globe:** Vector map path render highlighting high-exposure shipping lanes with concentric sweep rings and animated radar pulses.
  - **Live Intel Strip:** A real-time operations bar communicating current spot Brent crude prices and API health indicators before command entry.

---

## 3. High-Fidelity command Map & Sidebar Drawer

- **Path:** [`src/components/map/IntelMap.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/components/map/IntelMap.tsx)
- **GIS Layout:**
  - Integrated Leaflet commanding map offering quick toggles for oil facilities, refineries, strategic petroleum reserves (SPR), shipping traffic, and dynamic geopolitical event markers (GDELT).
  - Highlights corridors using active risk level boundaries (colored chokepoint circles with danger alerts).
- **Intelligence slide-out Drawer:**
  - **Path:** [`src/components/corridor/CorridorDrawer.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/components/corridor/CorridorDrawer.tsx)
  - Features 5-vector risk decomposition horizontal Recharts bar layout (`RiskDecomposition.tsx`) and explainable AI SHAP feature attribution waterfall chart (`SHAPPanel.tsx`).
  - **Proxy Disclaimer:** Expressly communicates proxy limitations for Suez flows utilizing Bab el-Mandeb traffic proxies (* Bab el-Mandeb traffic proxy).

---

## 4. MLOps Diagnostics, Governance & Security

- **Path:** [`src/components/models/ModelCenter.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/components/models/ModelCenter.tsx)
- **Diagnostics:** Displays out-of-sample prediction statistics (ROC-AUC, PR-AUC, Brier score), KS covariate feature drift assessments, and active PostgreSQL database pool indicators.
- **Model Governance:**
  - **Path:** [`src/components/governance/GovernanceCenter.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/components/governance/GovernanceCenter.tsx)
  - Role-gated promotion/rollback actions based on session credentials. Disable challenger-to-champion promotion inputs for VIEWER and ANALYST accounts.
- **Credentials Manager:**
  - **Path:** [`src/components/security/SecurityCenter.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/components/security/SecurityCenter.tsx)
  - Full admin API key manager (generate tokens, revoke access) and chronological IP audit logs.

---

## 5. Automated Verification

- **Path:** [`src/App.test.tsx`](file:///D:/hackathon project/energy-resilience/frontend/src/App.test.tsx)
- **Test Coverage (30 Tests):**
  1. Entry and skip transitions on Landing Page.
  2. Tab navigation channels (Monitor, Scenarios, Trends, Models, Observability, Security).
  3. KPI Hero card statistics.
  4. Selected corridor map selectors and intelligence drawers.
  5. Proxy mode warnings and risk decomposition charts.
  6. What-if scenario simulator run triggers.
  7. Out-of-sample metrics (ROC-AUC) verification.
  8. Admin keys provisioning and security audit logs rendering.
- **Verification Output:**
  - `npm run build` compiles successfully with **0 errors**.
  - `npx vitest run` passes **30/30 tests** in 1.56s.
