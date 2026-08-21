# Data Contracts & Schemas

This document defines the schema contracts for each of the staging tables under `data/staging/`. All ingested data must comply with these schemas.

---

## 1. Crude Prices Table (`crude_prices.csv`)
Stores standardized daily global crude price benchmarks.

* **Source**: Federal Reserve Bank of St. Louis (FRED)
* **Frequency**: Daily (Trading Days)
* **Validation Level**: Strict

### Fields Schema

| Field Name | Type | Nullable | Unit | Description | Allowed Values | Source | Frequency | Validation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `date` | Date (YYYY-MM-DD) | No | - | Calendar date of trade | Standard date format | DCOILBRENTEU.csv | Daily | Must be parseable date |
| `calendar_year` | Integer | No | Year | Calendar year of record | >= 2020 | DCOILBRENTEU.csv | Daily | Must be integer |
| `month` | String | No | - | Month name of record | "April" to "March" | DCOILBRENTEU.csv | Daily | Must be text name of month |
| `financial_year` | String | No | - | Indian Financial Year alignment | e.g., "2024-25" | Derived | Daily | Must match format YYYY-YY |
| `value` | Float | Yes | USD/Barrel | Closing Brent crude price | Positive float | DCOILBRENTEU.csv | Daily | Price > 0 |
| `unit` | String | No | - | Units flag | "USD/bbl" | Static | Daily | Must equal "USD/bbl" |
| `source` | String | No | - | Data vendor source | "FRED" | Static | Daily | Must equal "FRED" |

---

## 2. Geopolitical Risk Table (`geopolitical_risk.csv`)
Stores the long-format representation of daily and monthly geopolitical risk metrics.

* **Source**: Caldara & Iacoviello (Federal Reserve Board)
* **Frequency**: Mixed (Daily and Monthly)
* **Validation Level**: Strict

### Fields Schema

| Field Name | Type | Nullable | Unit | Description | Allowed Values | Source | Frequency | Validation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `date` | Date (YYYY-MM-DD) | No | - | Observation date | Standard date format | GPR spreadsheets | Daily/Monthly | Must be parseable date |
| `financial_year` | String | No | - | Indian Financial Year alignment | e.g., "2024-25" | Derived | Daily/Monthly | Must match format YYYY-YY |
| `month` | String | No | - | Month name of record | "April" to "March" | Derived | Daily/Monthly | Must be text name of month |
| `geography` | String | No | - | Target country or region | "GLOBAL", "INDIA", "CHINA", "USA", "RUSSIA", "SAUDI_ARABIA" | GPR spreadsheets | Daily/Monthly | Must match geo categories |
| `metric` | String | No | - | GPR index specific type | "GPRD", "GPRD_ACT", "GPRD_THREAT", "GPR", "GPRT", "GPRA", "GPRC" | GPR spreadsheets | Daily/Monthly | Must match index categories |
| `value` | Float | No | Index | Index value | Positive float | GPR spreadsheets | Daily/Monthly | Value > 0 |
| `unit` | String | No | - | Units flag | "Index" | Static | Daily/Monthly | Must equal "Index" |
| `source` | String | No | - | Data vendor source | "Caldara-Iacoviello Daily", "Caldara-Iacoviello Monthly" | Static | Daily/Monthly | Must match GPR source names |

---

## 3. Refinery Throughput Table (`refinery_throughput.csv`)
Stores monthly crude oil processing volumes by Indian oil companies and refineries.

* **Source**: Ministry of Petroleum and Natural Gas / PPAC
* **Frequency**: Monthly
* **Validation Level**: Strict

### Fields Schema

| Field Name | Type | Nullable | Unit | Description | Allowed Values | Source | Frequency | Validation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `date` | Date (YYYY-MM-DD) | No | - | First day of month of record | YYYY-MM-01 | 8d3b6596...csv | Monthly | Must represent 1st of month |
| `calendar_year` | Integer | No | Year | Calendar year of record | >= 2020 | 8d3b6596...csv | Monthly | Must be integer |
| `financial_year` | String | No | - | Indian Financial Year alignment | e.g., "2024-25" | Derived | Monthly | Must match format YYYY-YY |
| `month` | String | No | - | Month name of record | "April" to "March" | 8d3b6596...csv | Monthly | Must be text name of month |
| `oil_company` | String | No | - | Company or refinery name | e.g. "RIL TOTAL", "BPCL-BINA" | 8d3b6596...csv | Monthly | Must be in registered names |
| `record_type` | String | No | - | Row aggregate classification | "individual", "subtotal", "grand_total" | Derived | Monthly | Must be one of three types |
| `quantity_tmt` | Float | Yes | TMT | Crude throughput processed | Positive or zero float | 8d3b6596...csv | Monthly | Quantity >= 0 |
| `unit` | String | No | - | Units flag | "Thousand Metric Tonnes (TMT)" | Static | Monthly | Must equal TMT flag |
| `source` | String | No | - | Data source registry | "PPAC / Ministry of Petroleum and Natural Gas" | Static | Monthly | Must match registry |

---

## 4. Petroleum Consumption Table (`petroleum_consumption.csv`)
Stores unpivoted monthly domestic consumption volumes of petroleum products in India.

* **Source**: Petroleum Planning & Analysis Cell (PPAC)
* **Frequency**: Monthly
* **Validation Level**: Strict

### Fields Schema

| Field Name | Type | Nullable | Unit | Description | Allowed Values | Source | Frequency | Validation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `date` | Date (YYYY-MM-DD) | No | - | First day of month of record | YYYY-MM-01 | Consumption sheets | Monthly | Must represent 1st of month |
| `calendar_year` | Integer | No | Year | Calendar year of record | >= 1997 | Consumption sheets | Monthly | Must be integer |
| `financial_year` | String | No | - | Indian Financial Year alignment | e.g., "2025-26" | Derived | Monthly | Must match format YYYY-YY |
| `month` | String | No | - | Month name of record | "April" to "March" | Consumption sheets | Monthly | Must be text name of month |
| `product` | String | No | - | Petroleum product | e.g. "LPG", "MS", "HSD", "ATF" | Consumption sheets | Monthly | Must match product registry |
| `quantity_tmt` | Float | No | TMT | Consumption volume | Positive float | Consumption sheets | Monthly | Quantity > 0 |
| `unit` | String | No | - | Units flag | "Thousand Metric Tonnes (TMT)" | Static | Monthly | Must equal TMT flag |
| `source` | String | No | - | Data source registry | "PPAC" | Static | Monthly | Must equal "PPAC" |

---

## 5. Crude Imports Table (`crude_imports.csv`)
Stores unpivoted monthly trade import and export volumes for crude and petroleum products.

* **Source**: PPAC
* **Frequency**: Monthly
* **Validation Level**: Strict

### Fields Schema

| Field Name | Type | Nullable | Unit | Description | Allowed Values | Source | Frequency | Validation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `date` | Date (YYYY-MM-DD) | No | - | First day of month of record | YYYY-MM-01 | Import quantity sheets | Monthly | Must represent 1st of month |
| `calendar_year` | Integer | No | Year | Calendar year of record | >= 1998 | Import quantity sheets | Monthly | Must be integer |
| `financial_year` | String | No | - | Indian Financial Year alignment | e.g., "2024-25" | Derived | Monthly | Must match format YYYY-YY |
| `month` | String | No | - | Month name of record | "April" to "March" | Import quantity sheets | Monthly | Must be text name of month |
| `product` | String | No | - | Traded commodity | e.g. "CRUDE OIL", "LPG", "MS" | Import quantity sheets | Monthly | Must match product registry |
| `flow_type` | String | No | - | Trade direction | "IMPORT", "EXPORT" | Import quantity sheets | Monthly | "IMPORT" or "EXPORT" |
| `quantity_tmt` | Float | Yes | TMT | Traded volume | Positive or zero float | Import quantity sheets | Monthly | Quantity >= 0 |
| `unit` | String | No | - | Units flag | "Thousand Metric Tonnes (TMT)" | Static | Monthly | Must equal TMT flag |
| `source` | String | No | - | Data source registry | "PPAC" | Static | Monthly | Must equal "PPAC" |

---

## 6. Crude Import Values Table (`crude_import_values.csv`)
Stores unpivoted monthly trade value in INR (Rs. Crores) and USD (Millions) for imports and exports.

* **Source**: PPAC
* **Frequency**: Monthly
* **Validation Level**: Strict

### Fields Schema

| Field Name | Type | Nullable | Unit | Description | Allowed Values | Source | Frequency | Validation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `date` | Date (YYYY-MM-DD) | No | - | First day of month of record | YYYY-MM-01 | Value spreadsheets | Monthly | Must represent 1st of month |
| `calendar_year` | Integer | No | Year | Calendar year of record | >= 1998 | Value spreadsheets | Monthly | Must be integer |
| `financial_year` | String | No | - | Indian Financial Year alignment | e.g., "2024-25" | Derived | Monthly | Must match format YYYY-YY |
| `month` | String | No | - | Month name of record | "April" to "March" | Value spreadsheets | Monthly | Must be text name of month |
| `product` | String | No | - | Traded commodity | e.g. "CRUDE OIL", "LPG" | Value spreadsheets | Monthly | Must match product registry |
| `flow_type` | String | No | - | Trade direction | "IMPORT", "EXPORT" | Value spreadsheets | Monthly | "IMPORT" or "EXPORT" |
| `value_inr_crores` | Float | Yes | Rs. Crores | Transaction value in INR | Positive or zero float | 1751964598...xlsx | Monthly | Value >= 0 |
| `value_usd_million` | Float | Yes | Million USD | Transaction value in USD | Positive or zero float | 1751964622...xlsx | Monthly | Value >= 0 |
| `source` | String | No | - | Data source registry | "PPAC" | Static | Monthly | Must equal "PPAC" |
