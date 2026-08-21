# Maritime, Port & Energy Corridor Intelligence (Phase 3)

This document describes the design, ingestion, spatial geometry boundaries, supply-network representations, and data limitations for the Maritime, Port & Energy Corridor Intelligence Layer.

---

## 1. Real Data Source Coverage

The layer integrates data from the following real-world sources:

| Source | Scope | Mode | Provenance / URL |
| :--- | :--- | :--- | :--- |
| **IMF PortWatch** | Daily transit calls (container, cargo, tanker) and capacities | Live REST API query | Sourced from `services9.arcgis.com/weJ1QsnbMYJlCHdG` |
| **Global Fishing Watch (GFW)** | AIS vessel positioning and transmission data | Live REST API query | Sourced from GFW API v3 (requires Bearer token) |
| **NGA World Port Index** | Crude import port coordinates | Static reference | [National Geospatial-Intelligence Agency](https://msi.nga.mil/Publications/WPI) |
| **ISPRL publications** | Strategic Petroleum Reserve sites, capacity | Static reference | [ISPRL](https://www.isprl.in/) |
| **PPAC Staging Tables** | Historical imports, refinery throughput, consumption | Staged data (Phase 1) | Compiled from Ministry of Petroleum & Natural Gas files |

---

## 2. Spatial Geometries & Corridors

Seven critical maritime corridors and chokepoints are represented as canonical **GeoJSON Polygons** inside `data/geo/energy_corridors.geojson` (and summarized in `data/processed/energy_corridors.csv`):

- **Strait of Hormuz** (`HORMUZ`): Bounded near `[55.8, 26.2] -> [56.9, 26.9]`. Primary oil exit route from Persian Gulf.
- **Bab-el-Mandeb** (`BAB_EL_MANDEB`): Bounded near `[43.1, 12.5] -> [43.6, 13.0]`. Southern entry to Red Sea.
- **Suez Canal** (`SUEZ`): Bounded near `[32.2, 29.9] -> [32.6, 31.3]`. Artificial canal linking Red Sea to Mediterranean.
- **Red Sea** (`RED_SEA`): Connecting Bab-el-Mandeb and Suez Canal.
- **Gulf of Oman** (`GULF_OF_OMAN`): Leading to Strait of Hormuz from the Arabian Sea.
- **Gulf of Aden** (`GULF_OF_ADEN`): Leading to Bab-el-Mandeb from the Arabian Sea.
- **Arabian Sea** (`ARABIAN_SEA`): Regional sea forming the northwestern part of the Indian Ocean, through which crude travels to India.

*Note: All coordinates are sourced from NGA World Port Index and EIA publications. No coordinates have been manually invented.*

---

## 3. Indian Energy Infrastructure Registry

A canonical database of **32 operational facilities** has been compiled under `data/processed/energy_infrastructure.csv` (and mapped as point coordinates in `data/geo/energy_infrastructure.geojson`):

- **Crude Import Ports (9)**: Mundra, Vadinar, Mumbai, Paradip, Haldia, Kochi, Mangalore, Visakhapatnam, Chennai.
- **Major Refineries (20)**: IOCL Koyali (13.7 MMTPA), RIL Jamnagar (33 MMTPA), NEL Vadinar (20 MMTPA), BPCL Kochi (15.5 MMTPA), HMEL Bathinda (11.3 MMTPA), and others representing individual refineries in PPAC data.
- **Strategic Petroleum Reserves (3)**: Visakhapatnam SPR (1.33 MMT), Mangalore SPR (1.50 MMT), Padur SPR (2.50 MMT).

---

## 4. Supply Network Topology

Using logistical mapping of Indian pipelines and maritime lanes, a topological network has been saved under `data/processed/supply_network_nodes.csv` and `data/processed/supply_network_edges.csv`:

- **Nodes**: Corridors, Ports, Refineries, and Global Supplier pools.
- **Edges**: Links representing pipeline connections (e.g., Mundra Port to HMEL Bathinda Refinery; Paradip Port to Barauni Refinery) and shipping lanes (e.g. Hormuz to Vadinar Port).

---

## 5. Anomaly Detection & Baselining

A rolling 28-day statistical baseline (median and standard deviation) was calculated for Suez, Bab-el-Mandeb, and Strait of Hormuz transits from IMF PortWatch data. 

- **Congestion Anomaly**: Day where observed tanker count exceeds `Rolling Median + 2 * Rolling Std`.
- **Traffic Drop Anomaly**: Day where observed tanker count falls below `Rolling Median - 2 * Rolling Std`.
- **Data Availability**: The output dataset `data/processed/corridor_anomalies.csv` explicitly registers data availability:
  - `OBSERVED`: Actual data was captured (including counts of 0, representing **ZERO_TRAFFIC**).
  - `NO_OBSERVATION`: Gaps in data transmission are preserved as nulls, preventing false forward-fills or trajectory interpolations.

Total records processed: **3,000 daily observations**  
- **Normal Days**: 2,847  
- **Congestion Events**: 95  
- **Traffic Drop Events**: 58  

---

## 6. Known Gaps & Limitations

1. **Vessel Observations Ingestion (GFW)**: Global Fishing Watch requires Bearer Token registration. Since automated runs cannot self-register, the AIS module operates in a resilient offline fallback state — returning a schema-valid empty table (`vessel_observations.csv` with 0 rows) and logging the limitation. If `GFW_API_TOKEN` is set in `.env`, the pipeline automatically executes live REST requests.
2. **PPAC Country-Wise Import Gap**: Staging imports only list product totals. Supplier country-wise details (e.g., imports from Iraq vs Saudi Arabia) are published in Monthly Ready Reckoner PDFs and are currently missing.
3. **AIS Tanker Limitation**: Commercial AIS tracking data is heavily restricted. Free GFW datasets focus predominantly on fishing vessels, and while cargo/tankers are partially visible in GFW v3, a specialized commercial feed (e.g. MarineTraffic) is needed for production.
4. **Vessel Trajectory Interpolation**: No trajectories are forward-filled. Gaps are preserved as structured nulls (`NO_OBSERVATION`) to prevent inaccurate navigation assumptions.
