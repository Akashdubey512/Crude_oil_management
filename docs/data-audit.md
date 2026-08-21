# Data Audit Report

This document presents a detailed audit of all raw datasets discovered in the repository root. Each dataset has been analyzed programmatically for column schemas, row counts, missing values, duplicates, date coverage, and financial/calendar conventions.

## Summary of Datasets

### 1. FRED Brent Crude Oil Prices (`DCOILBRENTEU.csv`)
- **Hash**: `fc9e2e3064d8458c8f31180b6f3ec329284b3e6782994ffafda7f7c06db15218`
- **File Type**: CSV
- **Size**: 22,177 bytes
- **Rows**: 1,305 | **Columns**: 2 (`observation_date`, `DCOILBRENTEU`)
- **Missing Values**: 41 (3.14%) in `DCOILBRENTEU`. These are days with closed markets (holidays and weekends) and are expected.
- **Duplicates**: 0
- **Date Range**: 2021-08-18 to 2026-08-18 (5-year daily window)
- **Convention**: Calendar Year (YYYY-MM-DD)
- **Units**: USD per Barrel ($/bbl)

### 2. Caldara-Iacoviello Daily Geopolitical Risk Index (`data_gpr_daily_recent.xls`)
- **Hash**: `827d56d130e1265407c9c91fbe8116717f2f1447457c119bcf21e22830c18442`
- **File Type**: Excel (.xls)
- **Size**: 3,259,904 bytes
- **Sheets**: `['Sheet1']`
- **Rows**: 15,204 | **Columns**: 11
- **Columns**: `['DAY', 'N10D', 'GPRD', 'GPRD_ACT', 'GPRD_THREAT', 'date', 'GPRD_MA30', 'GPRD_MA7', 'event', 'var_name', 'var_label']`
- **Missing Values**: None in core index columns. `event` is null for 15,152 rows. Column metadata columns (`var_name`, `var_label`) are only filled in the first few rows (15,194 nulls).
- **Duplicates**: 0
- **Date Range**: 1985-01-01 to 2026-08-17
- **Convention**: Calendar Year (Date column is YYYY-MM-DD; DAY column is numeric YYYYMMDD)
- **Units**: Daily Index

### 3. Caldara-Iacoviello Monthly Geopolitical Risk Index (`data_gpr_export.xls`)
- **Hash**: `6126ac6838929a4fd2e4c287979ed985f31f05fc92ab5784a55172b8bef993c2`
- **File Type**: Excel (.xls)
- **Size**: 2,712,064 bytes
- **Sheets**: `['Sheet1']`
- **Rows**: 1,519 | **Columns**: 115
- **Missing Values**: 55,852 total nulls. Global indices (`GPR`, `GPRT`, `GPRA`) and country indices (including `GPRC_IND` for India) are null prior to January 1985 (1,020 rows), as the recent series only goes back to 1985. Historical series (`GPRH`, `GPRHT`, `GPRHA`) are fully populated back to 1900.
- **Duplicates**: 0
- **Date Range**: 1900-01-01 to 2026-07-01
- **Convention**: Calendar Year (Month column is YYYY-MM-01)
- **Units**: Monthly Index

### 4. Indian Refinery Crude-Processing Data (`8d3b6596-b09e-4077-aebf-425193185a5b.csv`)
- **Hash**: `2aca872a202c6802ee5f15cc82b4b0971f40c936a53162f7cab0b36ac217c5c6`
- **File Type**: CSV
- **Size**: 85,915 bytes
- **Rows**: 2,088 | **Columns**: 4 (`Month`, `Year`, `OIL COMPANIES`, `Quantity (000 Metric Tonnes)`)
- **Missing Values**: 4 in `Quantity (000 Metric Tonnes)` (specifically `IOCL-GUWAHATI,ASSAM` in June 2021, April 2020, May 2021, and July 2021).
- **Duplicates**: 0
- **Date Range**: April 2020 to March 2026 (Monthly records).
- **Convention**: Monthly by Financial Year (starts in April 2020, ends in March 2026). Months are strings ("April", "May", etc.), and Year is integer calendar year.
- **Units**: Thousand Metric Tonnes (TMT)
- **Critical Quality Issue**: Contains 31 unique refinery/company names, which includes total lines such as `IOCL TOTAL`, `BPCL-TOTAL`, `HPCL-TOTAL`, `CPCL-TOTAL`, `RIL TOTAL`, `ONGC TOTAL`, `HPCL & JV-TOTAL`, and `GRAND TOTAL`. If summed directly, these rows will cause significant double-counting.

### 5. PPAC Petroleum Product Consumption (Subset) (`productconsumption.csv`)
- **Hash**: `3d53ff10ec6036eae78245fc50d047712026dd2b1a610bb7e3469091916b34dd`
- **File Type**: CSV
- **Size**: 23,660 bytes
- **Rows**: 492 | **Columns**: 5 (`Month`, `Year`, `PRODUCTS`, `Quantity (000 Metric Tonnes)`, `updated_date`)
- **Missing Values**: 0
- **Duplicates**: 0
- **Date Range**: April 2020 to August 2023 (stops mid-financial year 2023-24).
- **Convention**: Monthly (Year is integer, Month is text).
- **Units**: Thousand Metric Tonnes (TMT)
- **Status**: OUTDATED. This is a small historical slice of consumption statistics that is superseded by the master Excel workbook `1777985064_PT_Consumption_English.xls`.

### 6. PPAC Petroleum Product Consumption Master Historical (`1777985064_PT_Consumption_English.xls`)
- **Hash**: `d8da87f322342657a81227600d3448ff8b3efa0112cb7d38150d3bb0b991cae6`
- **File Type**: Excel (.xls)
- **Size**: 431,616 bytes
- **Sheets**: `['Historical (year-wise)', '1998-99', '1999-00', ..., '2025-26']` (Total 29 sheets)
- **Rows**: 662 total | **Columns**: Varies (Historical has 58 columns, monthly sheets have 14 columns: Products, APR, MAY, ..., TOTAL).
- **Missing Values**: Spreadsheet header zones contain empty rows/metadata labels that result in NaN values.
- **Duplicates**: Varies. Individual worksheets contain 2-3 duplicate empty spacer rows at the bottom of the tables.
- **Date Range**: April 1997 to March 2026 (Historical sheet goes up to 2025-26 provisional).
- **Convention**: Financial Year (April to March).
- **Units**: Thousand Metric Tonnes (TMT)

### 7. Consumption Year Sheets (`1735553804_consumption_en.xlsx`, `1773140735_FY_24-25_consumption-en.xlsx`, `1783938756_PT Consumption.xlsx`)
- **File Type**: Excel (.xlsx)
- **Status**: DUPLICATES. These single-year Excel sheets are exact worksheets extracted from the master consumption workbook `1777985064_PT_Consumption_English.xls`:
  - `1735553804_consumption_en.xlsx` (FY 2023-24) matches the sheet `2023-24` in the master workbook.
  - `1773140735_FY_24-25_consumption-en.xlsx` (FY 2024-25) matches the sheet `2024-25` in the master workbook.
  - `1783938756_PT Consumption.xlsx` (FY 2025-26) matches the sheet `2025-26` in the master workbook.

### 8. PPAC Petroleum Product Consumption FY 2026-27 (Partial) (`1786022792_PT Consumption.xlsx`)
- **Hash**: `1cfe45bc44ec2fc8d0e03cc5bf4a059c98fb9b3dfc6a563d3007b2ef5dd1c582`
- **File Type**: Excel (.xlsx)
- **Size**: 61,207 bytes
- **Sheets**: `['Consumption']`
- **Rows**: 30 | **Columns**: 14 (Products, APR, MAY, JUN, JUL, ..., MAR, TOTAL)
- **Date Range**: April 2026 to July 2026.
- **Missing Values**: Columns for August 2026 through March 2027 are blank/NaN, as they lie in the future relative to the data capture date.
- **Duplicates**: 3 empty spacer rows at the bottom.
- **Convention**: Financial Year (April to March).
- **Units**: Thousand Metric Tonnes (TMT)

### 9. PPAC Import/Export Quantity Historical (`1751964547_PT_IMPORT_TMT_H.xlsx`)
- **Hash**: `772d7c9f54f6650960d0c3b1885575d638de478148374cba936c41cee457353b`
- **File Type**: Excel (.xlsx)
- **Size**: 287,465 bytes
- **Sheets**: `['PT_IMPORT_H', 'PT_IMPORT_2024-25', 'PT_IMPORT_2023-24', ..., 'PT_import_H_2011-12']` (Total 16 sheets)
- **Rows**: 739 total | **Columns**: Varies (Historical has 28 columns; monthly sheets have 14 columns).
- **Date Range**: April 1998 to March 2025.
- **Convention**: Financial Year (April to March).
- **Units**: Thousand Metric Tonnes (TMT)

### 10. PPAC Import/Export Value in INR Historical (`1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx`)
- **Hash**: `c7f52e764c9b8c47542dd14776073d1b76fa6ea3ab1de3fbfdf18fd3f09a0e9a`
- **File Type**: Excel (.xlsx)
- **Size**: 335,886 bytes
- **Sheets**: `['PT_IMPORT_VALRS_H', 'PT_Import_Val_2024-25', ..., 'Sheet2', 'Sheet3']` (Total 17 sheets)
- **Rows**: 735 total | **Columns**: Varies
- **Date Range**: April 1998 to March 2025.
- **Convention**: Financial Year (April to March).
- **Units**: Rs. Crores (INR)

### 11. PPAC Import/Export Value in USD Historical (`1751964622_PT_IMPORT_VAL_US$_H.xlsx`)
- **Hash**: `fd2ebfb9a9c93e544c89c4008615062b6d6f76190170f758dd7b20bbad47064b`
- **File Type**: Excel (.xlsx)
- **Size**: 307,537 bytes
- **Sheets**: `['PT_IMPORT_VAL$_H', 'PT_Import_Val_2024-25', ..., 'Sheet2']` (Total 17 sheets)
- **Rows**: 769 total | **Columns**: Varies
- **Date Range**: April 1998 to March 2025.
- **Convention**: Financial Year (April to March).
- **Units**: Million USD ($)

### 12. PPAC Import/Export Quantity FY 2026-27 (Partial) (`1787119551_PT_import.xls`)
- **Hash**: `6e81e61e674489d5d3ad460aa7db053f6909dd193b1756da06aa961e3623c041`
- **File Type**: Excel (.xls)
- **Size**: 78,336 bytes
- **Sheets**: `['PT_import']`
- **Rows**: 49 | **Columns**: 14 (Products, APRIL, MAY, JUNE, JULY, AUGUST, ..., TOTAL)
- **Date Range**: April 2026 to July 2026.
- **Missing Values**: Columns for August 2026 to March 2027 are populated with zeros (representing future periods).
- **Duplicates**: 2 blank rows at the bottom.
- **Convention**: Financial Year (April to March).
- **Units**: Thousand Metric Tonnes (TMT)
- **Note**: This file contains only import/export volume quantity in TMT, with no value sheets for INR or USD.

---

## Technical Findings and Recommendations

1. **Temporal Alignment**: Refineries and PPAC write data in Financial Year formats (April to March) where years are text indicators (e.g. `2024-25`). Geopolitical risk and Brent crude prices are in Calendar Year daily formats. Preprocessing must convert all data to standardized Gregorian dates (first day of the month for monthly values, exact dates for daily values) to execute joins.
2. **Refinery Aggregations**: Refinery data must be parsed carefully. Scripts must explicitly exclude rows where `OIL COMPANIES` ends in `TOTAL` or `GRAND TOTAL` to avoid doubling calculated metrics.
3. **Consumption Master vs Individual Files**: To avoid redundant data storage, ingestion scripts should extract data directly from the master consumption workbook `1777985064_PT_Consumption_English.xls` and the partial current-year file `1786022792_PT Consumption.xlsx`. The individual sheets for 2023-24, 2024-25, and 2025-26 should be marked as "Archived/Duplicates" and ignored.
