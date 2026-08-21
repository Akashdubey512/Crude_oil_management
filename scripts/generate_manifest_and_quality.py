import os
import json
import hashlib
import pandas as pd
import numpy as np

RAW_DATA_DIR = r"D:\hackathon project\energy-resilience\data\raw"
MANIFEST_DIR = r"D:\hackathon project\energy-resilience\data\manifests"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"

os.makedirs(MANIFEST_DIR, exist_ok=True)
os.makedirs(QUALITY_DIR, exist_ok=True)

datasets_metadata = {
    "DCOILBRENTEU.csv": {
        "dataset_id": "fred_brent_crude_prices",
        "dataset_name": "FRED Brent Crude Prices",
        "source": "Federal Reserve Bank of St. Louis (FRED)",
        "source_url": "https://fred.stlouisfed.org/series/DCOILBRENTEU",
        "units": "USD per Barrel ($/bbl)",
        "frequency": "Daily",
        "expected_sha256": "fc9e2e3064d8458c8f31180b6f3ec329284b3e6782994ffafda7f7c06db15218",
        "notes": "Daily prices with missing values on weekends and holidays."
    },
    "data_gpr_daily_recent.xls": {
        "dataset_id": "gpr_daily_recent",
        "dataset_name": "Caldara-Iacoviello Daily Geopolitical Risk Index",
        "source": "Matteo Caldara and Matteo Iacoviello / Federal Reserve Board",
        "source_url": "https://www.matteoiacoviello.com/gpr.htm",
        "units": "Index (1985:2019=100)",
        "frequency": "Daily",
        "expected_sha256": "827d56d130e1265407c9c91fbe8116717f2f1447457c119bcf21e22830c18442",
        "notes": "Daily global geopolitical risk index from 1985 onwards."
    },
    "data_gpr_export.xls": {
        "dataset_id": "gpr_monthly_historical",
        "dataset_name": "Caldara-Iacoviello Monthly Geopolitical Risk Index",
        "source": "Matteo Caldara and Matteo Iacoviello / Federal Reserve Board",
        "source_url": "https://www.matteoiacoviello.com/gpr.htm",
        "units": "Index",
        "frequency": "Monthly",
        "expected_sha256": "6126ac6838929a4fd2e4c287979ed985f31f05fc92ab5784a55172b8bef993c2",
        "notes": "Monthly historical and country-level GPR indices back to 1900. Includes India-specific GPR index."
    },
    "8d3b6596-b09e-4077-aebf-425193185a5b.csv": {
        "dataset_id": "refinery_crude_processing",
        "dataset_name": "Indian Refinery Crude-Processing Data",
        "source": "Ministry of Petroleum and Natural Gas / PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "2aca872a202c6802ee5f15cc82b4b0971f40c936a53162f7cab0b36ac217c5c6",
        "notes": "Refinery crude oil throughput details by company. Contains aggregation rows."
    },
    "productconsumption.csv": {
        "dataset_id": "petroleum_consumption_subset",
        "dataset_name": "PPAC Petroleum Product Consumption (Subset)",
        "source": "PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "3d53ff10ec6036eae78245fc50d047712026dd2b1a610bb7e3469091916b34dd",
        "notes": "Outdated subset of petroleum product consumption data."
    },
    "1777985064_PT_Consumption_English.xls": {
        "dataset_id": "petroleum_consumption_historical_master",
        "dataset_name": "PPAC Petroleum Product Consumption Master Historical",
        "source": "PPAC",
        "source_url": "https://www.ppac.gov.in/content/149_1_PetroleumConsumption.aspx",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly and Yearly",
        "expected_sha256": "d8da87f322342657a81227600d3448ff8b3efa0112cb7d38150d3bb0b991cae6",
        "notes": "Master workbook containing historical sheet (1997-98 onwards) and individual monthly sheets up to 2025-26."
    },
    "1735553804_consumption_en.xlsx": {
        "dataset_id": "petroleum_consumption_fy_2023_24",
        "dataset_name": "PPAC Petroleum Product Consumption FY 2023-24",
        "source": "PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "a763332687ebcd81cd54f93543fb4a5f07df3b65f121106891d1e78579a055f2",
        "notes": "Redundant. Identical duplicate of the 2023-24 sheet in the master workbook."
    },
    "1773140735_FY_24-25_consumption-en.xlsx": {
        "dataset_id": "petroleum_consumption_fy_2024_25",
        "dataset_name": "PPAC Petroleum Product Consumption FY 2024-25",
        "source": "PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "6f8f08b7fe6e83d430b21e69881d4a43bcacc1787bbd0c5a5b24e9696874ad9f",
        "notes": "Redundant. Identical duplicate of the 2024-25 sheet in the master workbook."
    },
    "1783938756_PT Consumption.xlsx": {
        "dataset_id": "petroleum_consumption_fy_2025_26",
        "dataset_name": "PPAC Petroleum Product Consumption FY 2025-26",
        "source": "PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "ac7f5d3ebc0ceee17e3bff8d2731a0728d7e4282fc5425bea3b04eb0caec0689",
        "notes": "Redundant. Identical duplicate of the 2025-26 sheet in the master workbook."
    },
    "1786022792_PT Consumption.xlsx": {
        "dataset_id": "petroleum_consumption_fy_2026_27_partial",
        "dataset_name": "PPAC Petroleum Product Consumption FY 2026-27 (Partial)",
        "source": "PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "1cfe45bc44ec2fc8d0e03cc5bf4a059c98fb9b3dfc6a563d3007b2ef5dd1c582",
        "notes": "Contains consumption data for April 2026 to July 2026. Future months are null."
    },
    "1751964547_PT_IMPORT_TMT_H.xlsx": {
        "dataset_id": "import_export_quantity_historical",
        "dataset_name": "PPAC Import/Export Crude & Products Quantity Historical",
        "source": "PPAC",
        "source_url": "https://www.ppac.gov.in/content/212_1_ImportExportValue.aspx",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly and Yearly",
        "expected_sha256": "772d7c9f54f6650960d0c3b1885575d638de478148374cba936c41cee457353b",
        "notes": "Historical import/export volumes up to FY 2024-25."
    },
    "1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx": {
        "dataset_id": "import_export_value_inr_historical",
        "dataset_name": "PPAC Import/Export Crude & Products Value in INR Historical",
        "source": "PPAC",
        "source_url": "https://www.ppac.gov.in/content/212_1_ImportExportValue.aspx",
        "units": "Rs. Crores (INR)",
        "frequency": "Monthly and Yearly",
        "expected_sha256": "c7f52e764c9b8c47542dd14776073d1b76fa6ea3ab1de3fbfdf18fd3f09a0e9a",
        "notes": "Historical import/export values in INR up to FY 2024-25."
    },
    "1751964622_PT_IMPORT_VAL_US$_H.xlsx": {
        "dataset_id": "import_export_value_usd_historical",
        "dataset_name": "PPAC Import/Export Crude & Products Value in USD Historical",
        "source": "PPAC",
        "source_url": "https://www.ppac.gov.in/content/212_1_ImportExportValue.aspx",
        "units": "Million USD",
        "frequency": "Monthly and Yearly",
        "expected_sha256": "fd2ebfb9a9c93e544c89c4008615062b6d6f76190170f758dd7b20bbad47064b",
        "notes": "Historical import/export values in USD up to FY 2024-25."
    },
    "1787119551_PT_import.xls": {
        "dataset_id": "import_export_quantity_fy_2026_27_partial",
        "dataset_name": "PPAC Import/Export Crude & Products Quantity FY 2026-27 (Partial)",
        "source": "PPAC",
        "source_url": "UNKNOWN",
        "units": "Thousand Metric Tonnes (TMT)",
        "frequency": "Monthly",
        "expected_sha256": "6e81e61e674489d5d3ad460aa7db053f6909dd193b1756da06aa961e3623c041",
        "notes": "Provisional import/export quantities for April 2026 to July 2026. Future months are zero."
    }
}

def calculate_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

manifest_entries = []

for fname, meta in datasets_metadata.items():
    fpath = os.path.join(RAW_DATA_DIR, fname)
    if not os.path.exists(fpath):
        print(f"ERROR: File not found in data/raw/: {fname}")
        continue
    
    # Verify hash
    actual_sha = calculate_sha256(fpath)
    if actual_sha != meta["expected_sha256"]:
        print(f"WARNING: Hash mismatch for {fname}. Expected: {meta['expected_sha256']}, Actual: {actual_sha}")
    
    size_bytes = os.path.getsize(fpath)
    ext = os.path.splitext(fname)[1].lower()
    
    # Load schema, counts, range using pandas
    cols = []
    row_count = 0
    date_range = "UNKNOWN"
    duplicates = 0
    missing_data = {}
    sheets_info = {}
    
    try:
        if ext == '.csv':
            df = pd.read_csv(fpath)
            row_count = len(df)
            cols = list(df.columns)
            duplicates = int(df.duplicated().sum())
            missing_data = df.isnull().sum().to_dict()
            
            # Simple date parsing logic
            date_cols = [c for c in df.columns if 'date' in c.lower() or 'day' in c.lower() or 'month' in c.lower() or 'year' in c.lower() or c == 'DATE']
            for dc in date_cols:
                parsed = pd.to_datetime(df[dc], errors='coerce')
                if parsed.notnull().sum() > 0:
                    date_range = f"{parsed.min().strftime('%Y-%m-%d')} to {parsed.max().strftime('%Y-%m-%d')}"
                    break
        else:
            xl = pd.ExcelFile(fpath)
            sheets = xl.sheet_names
            row_count = 0
            for sname in sheets:
                df = xl.parse(sname)
                row_count += len(df)
                sheets_info[sname] = {
                    "shape": df.shape,
                    "columns": list(df.columns)[:10],
                    "nulls": int(df.isnull().sum().sum()),
                    "duplicates": int(df.duplicated().sum())
                }
            cols = sheets
            duplicates = sum(sh["duplicates"] for sh in sheets_info.values())
            # For excel files we hardcode or extract specific ranges
            if fname == "data_gpr_daily_recent.xls":
                date_range = "1985-01-01 to 2026-08-17"
            elif fname == "data_gpr_export.xls":
                date_range = "1900-01-01 to 2026-07-01"
            elif fname == "1777985064_PT_Consumption_English.xls":
                date_range = "1997-04-01 to 2026-03-31"
            elif fname == "1735553804_consumption_en.xlsx":
                date_range = "2023-04-01 to 2024-03-31"
            elif fname == "1773140735_FY_24-25_consumption-en.xlsx":
                date_range = "2024-04-01 to 2025-03-31"
            elif fname == "1783938756_PT Consumption.xlsx":
                date_range = "2025-04-01 to 2026-03-31"
            elif fname == "1786022792_PT Consumption.xlsx":
                date_range = "2026-04-01 to 2026-07-31 (Provisional)"
            elif fname in ["1751964547_PT_IMPORT_TMT_H.xlsx", "1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx", "1751964622_PT_IMPORT_VAL_US$_H.xlsx"]:
                date_range = "1998-04-01 to 2025-03-31"
            elif fname == "1787119551_PT_import.xls":
                date_range = "2026-04-01 to 2026-07-31 (Provisional)"
    except Exception as e:
        print(f"Error analyzing {fname}: {e}")
        
    # Determine status
    status = "READY"
    if "redundant" in meta["notes"].lower() or "duplicate" in meta["notes"].lower():
        status = "CLEANING_REQUIRED" # needs removal or marking duplicate
    elif "outdated" in meta["notes"].lower():
        status = "NEEDS_UPDATE"
    elif "partial" in meta["notes"].lower() or "provisional" in meta["notes"].lower():
        status = "PROVISIONAL"
        
    manifest_entry = {
        "dataset_id": meta["dataset_id"],
        "dataset_name": meta["dataset_name"],
        "source": meta["source"],
        "source_url": meta["source_url"],
        "original_filename": fname,
        "sha256": actual_sha,
        "retrieved_at": "UNKNOWN",
        "date_range": date_range,
        "frequency": meta["frequency"],
        "units": meta["units"],
        "row_count": row_count,
        "status": status,
        "notes": meta["notes"]
    }
    manifest_entries.append(manifest_entry)
    
    # Save a detailed quality report in data/quality/
    quality_report = {
        "dataset_id": meta["dataset_id"],
        "original_filename": fname,
        "sha256": actual_sha,
        "file_size_bytes": size_bytes,
        "row_count": row_count,
        "duplicates": duplicates,
        "date_range": date_range,
        "columns": cols if ext == '.csv' else list(sheets_info.keys()),
        "missing_values": missing_data if ext == '.csv' else {s: sh["nulls"] for s, sh in sheets_info.items()},
        "sheets_detail": sheets_info if ext != '.csv' else {}
    }
    
    quality_fname = os.path.splitext(fname)[0] + "_quality.json"
    quality_fpath = os.path.join(QUALITY_DIR, quality_fname)
    with open(quality_fpath, 'w', encoding='utf-8') as qf:
        json.dump(quality_report, qf, indent=2)

# Save the master manifest
manifest_data = {
    "manifest_version": "1.0",
    "project": "India Energy Supply Chain Resilience Platform",
    "datasets": manifest_entries
}

with open(os.path.join(MANIFEST_DIR, "data_manifest.json"), 'w', encoding='utf-8') as mf:
    json.dump(manifest_data, mf, indent=2)

print("Manifest and quality reports generated successfully.")
