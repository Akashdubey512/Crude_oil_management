# Geopolitical Risk Intelligence Layer (Phase 2)

This document describes the design, ingestion methodology, taxonomies, and quality control specifications for the Geopolitical Risk Intelligence Layer of the India Energy Supply Chain Resilience Platform.

---

## 1. Data Sources Overview

The layer combines two primary classes of information:

| Signal Type | Dataset | Provider / Source | Ingestion Format | Target / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Index Signal** | Geopolitical Risk (GPR) Index | Caldara & Iacoviello (Federal Reserve) | XLS spreadsheets | Global daily/monthly risk, country-specific risk (India, China, USA, Russia, Saudi Arabia) |
| **Event Signal** | GDELT Event/News logs | GDELT Project (DOC API v2) | JSON API response | Targeted news articles on maritime chokepoint security, energy facilities, and sanctions |
| **Event Signal** | Specially Designated Nationals (SDN) | US Department of the Treasury (OFAC) | CSV databases | Sanctioned entities, shipping vessels, corporations, and associated countries |

---

## 2. Methodology & Ingestion Details

### A. Geopolitical Risk (GPR) Index (Caldara & Iacoviello)
- **Source**: Standardized monthly and daily text-search frequency indicators based on major international newspapers.
- **Methodology**: Ingested and melt from staging tables. The daily values capture transient global geopolitical shock peaks (`GPRD`, `GPRD_ACT`, `GPRD_THREAT`), while monthly metrics track country-specific risk movements (e.g. `INDIA_GPRC` for India-specific tensions, `CHINA_GPRC`, `RUSSIA_GPRC`).

### B. GDELT Event Logs
- **Source**: GDELT DOC API v2.
- **Query Strategy**: Designed around highly targeted energy security search queries rather than downloading raw multi-gigabyte daily zip archives:
  1. *Chokepoint incidents*: `(crude OR oil OR petroleum OR tanker) (Hormuz OR "Bab-el-Mandeb" OR Suez OR "Red Sea" OR chokepoint) (disruption OR attack OR seizure OR tension)`
  2. *Infrastructure threats*: `(refinery OR pipeline OR "oil supply") (attack OR drone OR sabotage OR explosion OR disruption)`
  3. *Sanctions*: `(oil OR energy OR crude) sanctions (Russia OR Iran OR Venezuela) (export OR import OR restriction)`
  4. *India's energy security*: `(geopolitical OR conflict OR war) (oil OR energy OR supply) India`
- **Rate-Limiting Resilience**: Implements an exponential backoff loop and falls back to plain HTTP if HTTPS connection resets are triggered by GDELT's servers. Saves raw response payloads to `data/raw/gdelt/` to maintain strict lineage.

### C. OFAC SDN Sanctions List
- **Source**: US Department of the Treasury's Sanctions List Service.
- **Programmatic Merger**: Downloads `sdn.csv` (SDN details) and `add.csv` (SDN addresses) programmatically, merging them on the entity number identifier (`ent_num`) to resolve the exact country associated with each sanctioned vessel, individual, or corporation.

---

## 3. Taxonomies

### A. Event Taxonomy Classification
Raw GDELT articles are mapped to a specific energy-security taxonomy using deterministic title matching. If confidence is low, the record is tagged `UNKNOWN`:

- `tanker attack` (e.g., strikes, drone hits, vessel seizures)
- `maritime security incident` (e.g., piracy, vessel boardings, naval disputes)
- `pipeline disruption` (e.g., explosions, leaks, shutdowns)
- `refinery disruption` (e.g., fires, outages, strikes)
- `infrastructure attack` (e.g., drone attacks on storage tanks, depots)
- `armed conflict` (e.g., combat, airstrikes, active war)
- `military escalation` (e.g., deployments, naval exercises)
- `sanctions` (e.g., asset freezes, blocklists, penalties)
- `diplomatic escalation` (e.g., expulsion of ambassadors, severed relations)
- `export restriction` (e.g., export quotas, oil export bans)
- `port disruption` (e.g., strikes, closures)
- `shipping disruption` (e.g., rerouting, Suez transit drops)
- `supply disruption` (e.g., OPEC production cuts, force majeure shutdowns)
- `ceasefire/de-escalation` (e.g., peace talks, truces)
- `UNKNOWN` (default fallback for unrelated text match)

### B. Transit Corridor Mapping
Events are mapped to canonical energy transit chokepoints using keyword boundary scans:
- **`HORMUZ`**: Strait of Hormuz, Persian Gulf, Gulf of Oman, Bandar Abbas
- **`RED_SEA`**: Red Sea, Hodeidah, Houthi, Gulf of Aden
- **`BAB_EL_MANDEB`**: Bab-el-Mandeb, Mandeb Strait
- **`SUEZ`**: Suez Canal, Port Said, Port of Suez

*Note: Geographic coordinates for these corridor polygons are marked as `None` (`PENDING_ACQUISITION`) as authoritative GIS layers have not yet been ingested.*

---

## 4. Deduplication & Normalization

1. **Exact Deduplication**: GDELT URLs and OFAC entry numbers are hashed to form a deterministic `event_id` (`SHA256`). Records sharing duplicate IDs are dropped.
2. **Article-Event Distinctions**: True event clustering is complex due to varying press reporting. Therefore, article-level records are preserved as unique observations rather than compressed without a reproducible rule.

---

## 5. Temporal Aggregations & Features

Three datasets are generated under `data/processed/`:
1. `geopolitical_events.csv`: The master long-format event ledger mapping dates, types, corridors, and countries.
2. `geopolitical_daily_signals.csv`: Aggregated daily event counts (total events, sanctions events, corridor events) merged with the daily Caldara-Iacoviello GPR index (`GPRD`, `GPRD_ACT`, `GPRD_THREAT`).
3. `geopolitical_monthly_signals.csv`: Monthly event counts merged with country-specific GPR monthly indices (e.g. `INDIA_GPRC`).

---

## 6. Known Gaps & Limitations

- **Geographic Coordinates**: Bounding box coordinates for shipping corridors remain pending.
- **GDELT Tone/Goldstein Scale**: The GDELT DOC API v2 returns article lists but lacks the individual event-level Goldstein gravity scale. These severity fields are currently kept as `NULL` to avoid fabricating metrics.
- **OFAC Listing Dates**: Listing dates inside CSV records are embedded in unstructured remarks. Programmatic extraction is not yet active; dates default to the current retrieval date.
- **What is NOT yet implemented**: 
  - Real-time incident streaming (polling frequency is limited)
  - Final AI Risk score predictions (signals are pure analytical features only)
  - Scenario block simulations
