# 5-Minute Hackathon Demo Script & Visual Sequence

> **Platform**: Energy Resilience Intel  
> **Target Duration**: 5 Minutes  
> **Presenter**: Technical Lead / Architect

---

## Demo Checklist & Setup

- [x] Backend running on `http://127.0.0.1:8000` (`python scripts/run_api.py`)
- [x] Frontend running on `http://localhost:5173` (`npm run dev`)
- [x] Browser open at `http://localhost:5173`

---

## Step-by-Step Demo Walkthrough

### Step 1: Executive Landing Page (0:00 - 0:30)
- **Action**: Display `Landing.tsx` portal. Point out the hero vessel background and operational status badges.
- **Narration**: *"We start at the executive portal. India imports 88% of its crude oil, with 40% transiting Hormuz. Notice the live corridor status badges indicating real-time risk state across key maritime chokepoints."*
- **Click**: Click **Enter Dashboard**.

### Step 2: Main Command Center & Digital Twin (0:30 - 1:15)
- **Action**: Highlight the dark navy Leaflet cartographic map with interactive nodes for Hormuz, Suez, Bab-el-Mandeb, and Red Sea.
- **Narration**: *"Welcome to the Command Center. On screen is our geospatial digital twin showing global energy transit corridors. The top bar displays current UTC time, data retrieval timestamp, and active role."*

### Step 3: Corridor Inspection & SHAP Diagnostics (1:15 - 2:00)
- **Action**: Click on the **Strait of Hormuz** node on the map.
- **Narration**: *"Clicking Hormuz slides open the diagnostic drawer. The model calculates a 0.25% disruption probability (LOW risk). Opening SHAP diagnostics reveals why: 90-day moving average tanker volume is buffering supply, offsetting minor geopolitical news volatility."*

### Step 4: What-If Scenario Simulation (2:00 - 3:00)
- **Action**: Click **Scenario Simulation** on the side navigation.
- **Narration**: *"Now let's test a crisis. What happens if conflict escalates in the Gulf?"*
- **Interaction**:
  1. Drag **Geopolitical Risk Multiplier** to `2.5x`.
  2. Drag **Tanker Transit Drop** to `-45%`.
  3. Click **Run Simulation**.
- **Highlight**: Point to probability jumping from **0.25% to 48.2% (HIGH)**, triggering automatic strategic drawdown and Cape of Good Hope rerouting recommendations.

### Step 5: Cross-Corridor Comparison & Red Sea Proxy (3:00 - 3:45)
- **Action**: Click **Corridors** / **Cross-Corridor Comparison** tab.
- **Narration**: *"In the Cross-Corridor Comparison table, risk managers get a unified view of all four corridors side by side. Notice the Red Sea corridor displays 'DROP' for vessel volume status. As disclosed transparently in our documentation, the Red Sea uses Bab-el-Mandeb traffic as an authoritative proxy."*

### Step 6: MLOps Governance & Observability (3:45 - 4:30)
- **Action**: Click **Governance** and **Observability** tabs.
- **Narration**: *"In Governance, we monitor Population Stability Index (PSI) drift metrics to ensure our XGBoost models remain calibrated over time. In Observability, our SRE metrics track system RAM, DB pool health, and endpoint latencies under load."*

### Step 7: Conclusion & Q&A (4:30 - 5:00)
- **Narration**: *"In conclusion, Energy Resilience Intel transforms fragmented news and shipping data into an explainable, actionable decision platform for national energy security. Thank you."*
