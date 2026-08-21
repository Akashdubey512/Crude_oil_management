# Risk Register

This document tracks identified data, pipeline, and modeling risks, assessing their potential impact and outlining mitigation strategies.

| Risk ID | Risk Category | Description | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Data Quality | **Missing FY 2025-26 Import/Export Data**: The directory lacks import/export volume and value data for the entire 2025-26 financial year. | High | Critical | The ingestion pipeline must raise a data-gap warning. In Phase 1, we will seek to download the missing year directly from PPAC archives. |
| **R-02** | Data Quality | **Double Counting in Refineries**: The refinery statistics file (`8d3b6596-b09e-4077-aebf-425193185a5b.csv`) contains summary rows like "IOCL TOTAL" and "GRAND TOTAL" in the `OIL COMPANIES` column. | High | High | Implement a strict filtering check during validation to isolate individual refinery rows (excluding labels containing "TOTAL" or "GRAND TOTAL") for granular analysis. |
| **R-03** | Pipeline Stability | **Spreadsheet Schema Drift**: PPAC frequently alters column positions, header text, and spacing rows in yearly worksheets (e.g. "Annexure-I" vs "Sheet1"). | Medium | High | Rely on schema validation rules that search for key anchors (like "PRODUCTS" or "IMPORT/EXPORT") and months rather than using hardcoded row/column indices. |
| **R-04** | Data Quality | **Holiday Gaps in Daily Brent Prices**: Weekends and market holidays have missing `DCOILBRENTEU` prices in the FRED dataset. | High | Low | Preprocessing will automatically apply a forward-fill (`ffill()`) transformation to copy the last available trading price onto closed-market dates. |
| **R-05** | Modeling Accuracy | **Historical Index Revisions**: Geopolitical risk indices are subject to minor historical revisions as newspaper databases are rescanned. | Low | Medium | Enforce absolute immutability on raw files. Treat all inputs as snapshots, and track model version dependencies on specific data hashes. |
| **R-06** | Data Quality | **Refinery Reporting Lags**: The refinery crude processing dataset stops at March 2026. Data for subsequent months is missing. | High | High | Ingestion scripts will flag data as "UNKNOWN" from April 2026 onwards, and request fresh monthly PPAC PDF/Excel reports to update the staging tables. |
