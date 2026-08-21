# Data Quality Report (Staging Layer)

Generated at: 2026-08-21 15:32:20 UTC

This report presents the validation results, null concentrations, duplicates, and ranges for the normalized staging tables.

## 1. Quality Check Summary

| Staging Table | Status | Row Count | Duplicates | Validation Issues |
| :--- | :--- | :--- | :--- | :--- |
| `crude_prices.csv` | **PASS** | 1305 | 0 | None |
| `geopolitical_risk.csv` | **PASS** | 49604 | 0 | None |
| `refinery_throughput.csv` | **PASS** | 2088 | 0 | None |
| `petroleum_consumption.csv` | **PASS** | 4176 | 0 | None |
| `crude_imports.csv` | **PASS** | 4104 | 0 | None |
| `crude_import_values.csv` | **PASS** | 3396 | 0 | None |

## 2. Table-by-Table Details

### `crude_prices.csv`
- **Overall Status**: PASS
- **Total Rows**: 1305
- **Duplicate Rows**: 0
- **Null Counts by Column**:
  - `value`: 41 (3.14%)
- **Suspicious Zeros**:
  - *None*
- **Validation Issues Raised**:
  - [PASS] No schema violations.

---

### `geopolitical_risk.csv`
- **Overall Status**: PASS
- **Total Rows**: 49604
- **Duplicate Rows**: 0
- **Null Counts by Column**:
  - *None*
- **Suspicious Zeros**:
  - `value`: 100 zeros
- **Validation Issues Raised**:
  - [PASS] No schema violations.

---

### `refinery_throughput.csv`
- **Overall Status**: PASS
- **Total Rows**: 2088
- **Duplicate Rows**: 0
- **Null Counts by Column**:
  - `quantity_tmt`: 4 (0.19%)
- **Suspicious Zeros**:
  - `quantity_tmt`: 1 zeros
- **Validation Issues Raised**:
  - [PASS] No schema violations.

---

### `petroleum_consumption.csv`
- **Overall Status**: PASS
- **Total Rows**: 4176
- **Duplicate Rows**: 0
- **Null Counts by Column**:
  - `quantity_tmt`: 96 (2.30%)
- **Suspicious Zeros**:
  - *None*
- **Validation Issues Raised**:
  - [PASS] No schema violations.

---

### `crude_imports.csv`
- **Overall Status**: PASS
- **Total Rows**: 4104
- **Duplicate Rows**: 0
- **Null Counts by Column**:
  - *None*
- **Suspicious Zeros**:
  - `quantity_tmt`: 703 zeros
- **Validation Issues Raised**:
  - [PASS] No schema violations.

---

### `crude_import_values.csv`
- **Overall Status**: PASS
- **Total Rows**: 3396
- **Duplicate Rows**: 0
- **Null Counts by Column**:
  - `value_inr_crores`: 120 (3.53%)
  - `value_usd_million`: 108 (3.18%)
  - `source_file_inr`: 120 (3.53%)
  - `source_sheet_inr`: 120 (3.53%)
  - `source_row_inr`: 120 (3.53%)
  - `source_file_usd`: 108 (3.18%)
  - `source_sheet_usd`: 108 (3.18%)
  - `source_row_usd`: 108 (3.18%)
  - `ingestion_timestamp`: 120 (3.53%)
  - `transformation_version`: 120 (3.53%)
- **Suspicious Zeros**:
  - `value_inr_crores`: 437 zeros
  - `value_usd_million`: 437 zeros
- **Validation Issues Raised**:
  - [PASS] No schema violations.

---

