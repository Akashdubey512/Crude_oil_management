# Documented System Limitations & Mitigations

> **Platform**: Energy Resilience Intel  
> **Purpose**: Transparent engineering disclosures for hackathon evaluation and production readiness auditing.

---

## 1. Red Sea Corridor Physical Sensor Proxy

### Limitation
IMF PortWatch tracks major maritime chokepoints like Bab-el-Mandeb and Suez, but does not expose a standalone "Red Sea" chokepoint sensor.

### Mitigation & Transparency
Energy Resilience Intel models the Red Sea corridor using **Bab-el-Mandeb vessel transit count as an authoritative physical proxy**, combined with regional GDELT armed conflict event logs. This limitation is declared explicitly in API schema response headers, JSON payloads (`"limitations": [...]`), model cards, and UI drawers.

---

## 2. Imbalanced Historical Disruption Labels

### Limitation
Major maritime corridor closures or military blockades are rare historical events (~0.5% to 3.0% of historical daily observations). Standard accuracy metrics can be misleadingly high on trivial negative classifications.

### Mitigation
- Models are trained using recall-weighted objective functions in XGBoost.
- Classification thresholds are tuned for high recall ($\ge 0.80$).
- Probabilities are calibrated via **Platt Scaling** and evaluated using Brier Scores rather than uncalibrated classification accuracy.

---

## 3. Daily Batch Ingestion vs. Sub-Second AIS Streaming

### Limitation
Data feeds from GDELT, IMF PortWatch, and FRED operate on daily batch updates rather than sub-second raw satellite AIS feeds.

### Mitigation
The system caches historical data in local Parquet files, surfaces explicit `data_freshness` timestamps on every corridor card, and gracefully falls back to cached snapshots when live API connections are unreachable.

---

## 4. Decision Support vs. Operational Execution

### Limitation
The platform generates probabilistic risk scores, SHAP driver explanations, and recommended drawdown/rerouting strategies, but does not automatically execute financial trades or re-route physical vessels.

### Mitigation
All outputs are positioned as **human-in-the-loop decision intelligence**, empowering procurement officers and refiners to take validated actions within their existing ERP/EORM systems.
