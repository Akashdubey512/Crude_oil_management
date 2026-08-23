# Interface Screenshots & Visual Manifest

> **Platform**: Energy Resilience Intel  
> **Purpose**: Visual interface documentation for hackathon evaluation and technical review.

---

## Screen Inventory

| ID | Filename | Component / Screen | Description |
|:---|:---|:---|:---|
| **01** | `01-landing.png` | `Landing.tsx` | Executive portal landing view with problem context & status badges |
| **02** | `02-command-center.png` | `CommandCenter.tsx` | Main command center dashboard with geospatial digital twin |
| **03** | `03-corridor-risk.png` | `CorridorDrawer.tsx` | Corridor diagnostic drawer with 5-vector risk decomposition |
| **04** | `04-shap-explainability.png` | `RiskDecomposition.tsx` | SHAP Tree Explainer local and global feature contribution bars |
| **05** | `05-scenario-simulator.png` | `ScenarioSimulator.tsx` | Interactive what-if simulation view with parameter sliders |
| **06** | `06-trend-analyzer.png` | `RiskHistoryChart.tsx` | 30-day rolling risk history and trend analysis |
| **07** | `07-cross-corridor.png` | `CommandCenter.tsx` | Side-by-side corridor comparison table with proxy indicators |
| **08** | `08-model-health.png` | `ModelCenter.tsx` | ML model performance metrics, ROC-AUC curves & Brier score |
| **09** | `09-governance.png` | `GovernanceCenter.tsx` | Champion/Challenger model registry & PSI drift monitoring |
| **10** | `10-observability.png` | `ObservabilityCenter.tsx` | System resource monitoring, Prometheus metrics & DB pool status |

---

## UI Aesthetic Highlights
- **Dual-Theme Support**: Full Light and Dark theme compatibility built using custom CSS design tokens (`src/design-system/tokens.css`).
- **Cartographic Map Engine**: Leaflet digital twin displaying active maritime corridors, risk severity indicators, and node interactive drawers.
- **Accessibility**: High-contrast typography, WCAG-compliant color palettes, and `prefers-reduced-motion` media query compliance.
