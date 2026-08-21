# Data Gaps and Future Requirements

This document registers critical data gaps discovered during the Phase 0 audit and lists the datasets required for future development of the Energy Supply Chain Resilience platform.

## 1. Identified Data Gaps in Existing Directory

### A. Missing Import/Export Datasets for FY 2025-26
- **Gap**: The directory has no historical or monthly sheets for import/export volumes (TMT) or values (INR/USD) covering the period from April 2025 to March 2026.
- **Impact**: Critical. We cannot calculate trade exposure, import costs, or balance of trade metrics for the most recently completed financial year.
- **Action**: Acquire and import the PPAC FY 2025-26 Import/Export quantity and value Excel workbooks.

### B. Missing Import/Export Value Data for FY 2026-27
- **Gap**: The file `1787119551_PT_import.xls` contains only quantity (TMT) data for the current financial year. The corresponding value sheets (Rs. Crores and Million USD) are completely missing.
- **Impact**: High. Prevents financial impact analysis of current-year supply shocks.
- **Action**: Scrape or download value-specific worksheets from PPAC for the active financial year.

### C. Lag in Refinery Crude-Processing Throughput
- **Gap**: The refinery crude processing statistics (`8d3b6596-b09e-4077-aebf-425193185a5b.csv`) terminate in March 2026. Data for April 2026 through July 2026 is missing.
- **Impact**: High. Disrupts current-year validation of refinery utilization and downstream processing resilience.
- **Action**: Obtain refinery throughput statistics from April 2026 onwards from PPAC monthly publications.

### D. Natural Current-Year Gaps (Active Months)
- **Gap**: The active financial year files (`1786022792_PT Consumption.xlsx` and `1787119551_PT_import.xls`) contain records only up to July 2026. Subsequent months (August 2026 through March 2027) are blank or zero.
- **Impact**: Normal. Since the current local time is August 2026, subsequent months are in the future.
- **Action**: The ingestion engine must support incremental updates and handle future months as "UNKNOWN" without failing schema validation.

---

## 2. Required Future Datasets (Live Platform Phase)

To implement the platform's core resilience, mapping, and simulation features, we will need to integrate the following external datasets in future phases:

### A. Geospatial Asset Coordinates
- **Refinery Locations**: Latitude, longitude, nameplate processing capacity, and ownership type (public/private) for all 23+ operational Indian refineries.
- **Port Coordinates**: Geographic nodes for major oil import terminals (e.g. Mundra, Vadinar, Mumbai, Paradip, Haldia) including maximum tanker size capacity (VLCC/Suezmax).
- **Storage Infrastructure**: Locations and capacity volumes for the Strategic Petroleum Reserves (ISPRL) in Visakhapatnam, Mangalore, and Padur.

### B. Maritime Shipping & Route Vectors
- **Geospatial Transit Lanes**: Digitized maritime routing lines linking international export hubs (Middle East, Russia, West Africa, US Gulf) to Indian ports.
- **Choke Point Bounds**: Bounding polygons for Bab-el-Mandeb, Strait of Hormuz, Malacca Strait, and the Suez Canal to monitor disruptions.
- **AIS Tanker Positioning**: Real-time or near-real-time AIS (Automatic Identification System) vessel location feeds to track active crude tankers headed to India.

### C. Logistics Costs and Freight Tariffs
- **Baltic Clean/Dirty Tanker Indices**: Benchmark indices (like TD3C for Middle East to China/India) to track daily freight shipping price fluctuations.
- **Insurance Risk Premiums**: War risk insurance premiums and transit tariffs across high-risk corridors.
