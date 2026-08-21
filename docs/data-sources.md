# Data Sources Registry

This document lists all the raw datasets discovered in the platform's repository. These datasets are immutable and have been copied into `data/raw/` for versioning.

| Dataset Filename | Dataset Name | Source | Date Range | Frequency | Units | Rows | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DCOILBRENTEU.csv** | Brent Crude Oil Prices | FRED | 2021-08-18 to 2026-08-18 | Daily | USD / Barrel | 1305 | READY |
| **data_gpr_daily_recent.xls** | Daily GPR Index | Caldara & Iacoviello | 1985-01-01 to 2026-08-17 | Daily | Index | 15204 | READY |
| **data_gpr_export.xls** | Monthly GPR Index | Caldara & Iacoviello | 1900-01-01 to 2026-07-01 | Monthly | Index | 1519 | READY |
| **8d3b6596-b09e-4077-aebf-425193185a5b.csv** | Refinery Crude Processing | PPAC / Ministry | Apr 2020 to Mar 2026 | Monthly | '000 Metric Tonnes (TMT) | 2088 | READY |
| **productconsumption.csv** | Product Consumption Subset | PPAC | Apr 2020 to Aug 2023 | Monthly | '000 Metric Tonnes (TMT) | 492 | OUTDATED |
| **1777985064_PT_Consumption_English.xls** | Master Historical Consumption | PPAC | Apr 1997 to Mar 2026 | Monthly/Yearly | '000 Metric Tonnes (TMT) | 662 | READY |
| **1735553804_consumption_en.xlsx** | Consumption FY 2023-24 | PPAC | Apr 2023 to Mar 2024 | Monthly | '000 Metric Tonnes (TMT) | 30 | DUPLICATE |
| **1773140735_FY_24-25_consumption-en.xlsx** | Consumption FY 2024-25 | PPAC | Apr 2024 to Mar 2025 | Monthly | '000 Metric Tonnes (TMT) | 29 | DUPLICATE |
| **1783938756_PT Consumption.xlsx** | Consumption FY 2025-26 | PPAC | Apr 2025 to Mar 2026 | Monthly | '000 Metric Tonnes (TMT) | 31 | DUPLICATE |
| **1786022792_PT Consumption.xlsx** | Consumption FY 2026-27 | PPAC | Apr 2026 to Jul 2026 | Monthly | '000 Metric Tonnes (TMT) | 30 | PROVISIONAL |
| **1751964547_PT_IMPORT_TMT_H.xlsx** | Historical Import Qty | PPAC | Apr 1998 to Mar 2025 | Monthly/Yearly | '000 Metric Tonnes (TMT) | 739 | READY |
| **1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx** | Historical Import Value INR | PPAC | Apr 1998 to Mar 2025 | Monthly/Yearly | Rs. Crores | 735 | READY |
| **1751964622_PT_IMPORT_VAL_US$_H.xlsx** | Historical Import Value USD | PPAC | Apr 1998 to Mar 2025 | Monthly/Yearly | Million USD | 769 | READY |
| **1787119551_PT_import.xls** | Import Qty FY 2026-27 | PPAC | Apr 2026 to Jul 2026 | Monthly | '000 Metric Tonnes (TMT) | 49 | PROVISIONAL |

## SHA256 Hashes and Locations

All files have been verified. Refer to `data/manifests/data_manifest.json` for the verified SHA256 signatures of each file.
- Original location: `D:\hackathon project\`
- Ingested location: `D:\hackathon project\energy-resilience\data\raw\`

## Source Details & Acquisition URLs

1. **FRED Brent Crude Prices**: Federal Reserve Bank of St. Louis (FRED). URL: [FRED DCOILBRENTEU](https://fred.stlouisfed.org/series/DCOILBRENTEU)
2. **Caldara-Iacoviello Geopolitical Risk Indices**: Created by Matteo Caldara and Matteo Iacoviello. URL: [Matteo Iacoviello GPR Index Page](https://www.matteoiacoviello.com/gpr.htm)
3. **PPAC Datasets**: Petroleum Planning & Analysis Cell, Ministry of Petroleum & Natural Gas, Government of India.
   - Consumption Data: [PPAC Petroleum Consumption](https://www.ppac.gov.in/content/149_1_PetroleumConsumption.aspx)
   - Import/Export Data: [PPAC Import Export Value](https://www.ppac.gov.in/content/212_1_ImportExportValue.aspx)
   - Refinery Crude Processing: PPAC monthly reports, published under refinery throughput and processing statistics.
