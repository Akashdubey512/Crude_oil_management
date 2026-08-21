import os
import json
import datetime
import pandas as pd
import numpy as np

STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"

os.makedirs(QUALITY_DIR, exist_ok=True)

STAGING_SCHEMAS = {
    "crude_prices.csv": {
        "required_columns": ["date", "calendar_year", "month", "financial_year", "value", "unit", "source"],
        "types": {
            "calendar_year": "int64",
            "value": "float64"
        },
        "negative_allowed": False,
        "null_threshold_pct": 5.0,  # Brent can have up to 5% holidays/weekends nulls
        # Columns to skip from null threshold check (provenance/metadata)
        "skip_null_check_cols": ["source_row"]
    },
    "geopolitical_risk.csv": {
        "required_columns": ["date", "financial_year", "month", "geography", "metric", "value", "unit", "source"],
        "types": {
            "value": "float64"
        },
        "negative_allowed": False,
        "null_threshold_pct": 0.0,
        # source_row is a provenance convenience column; GPR XLS has no meaningful row index
        "skip_null_check_cols": ["source_row"]
    },
    "refinery_throughput.csv": {
        "required_columns": ["date", "calendar_year", "financial_year", "month", "oil_company", "record_type", "quantity_tmt", "unit", "source"],
        "types": {
            "calendar_year": "int64",
            "quantity_tmt": "float64"
        },
        "negative_allowed": False,
        "null_threshold_pct": 0.5,  # Guwahati refinery had a few null values
        "skip_null_check_cols": ["source_row"]
    },
    "petroleum_consumption.csv": {
        "required_columns": ["date", "calendar_year", "financial_year", "month", "product", "quantity_tmt", "unit", "source"],
        "types": {
            "calendar_year": "int64",
            "quantity_tmt": "float64"
        },
        "negative_allowed": False,
        # Provisional FY 2025-26 data has null cells for some minor products (2.3%)
        "null_threshold_pct": 3.0,
        "skip_null_check_cols": ["source_row"]
    },
    "crude_imports.csv": {
        "required_columns": ["date", "calendar_year", "financial_year", "month", "product", "flow_type", "quantity_tmt", "unit", "source"],
        "types": {
            "calendar_year": "int64",
            "quantity_tmt": "float64"
        },
        "negative_allowed": False,
        "null_threshold_pct": 0.0,
        "skip_null_check_cols": ["source_row"]
    },
    "crude_import_values.csv": {
        "required_columns": ["date", "calendar_year", "financial_year", "month", "product", "flow_type", "value_inr_crores", "value_usd_million", "source"],
        "types": {
            "calendar_year": "int64",
            "value_inr_crores": "float64",
            "value_usd_million": "float64"
        },
        "negative_allowed": False,
        # INR value file covers fewer fiscal years than USD (outer-join produces ~22% INR nulls for earlier FYs)
        "null_threshold_pct": 25.0,
        # Provenance columns that have structured nulls due to outer join are excluded from strict threshold check
        "skip_null_check_cols": ["source_row_inr", "source_row_usd", "source_file_inr", "source_sheet_inr",
                                  "source_file_usd", "source_sheet_usd", "ingestion_timestamp", "transformation_version"]
    }
}

def validate_dataset(filename):
    fpath = os.path.join(STAGING_DIR, filename)
    if not os.path.exists(fpath):
        return {
            "filename": filename,
            "status": "FAIL",
            "error": "Staging file not found."
        }
        
    df = pd.read_csv(fpath)
    schema = STAGING_SCHEMAS.get(filename)
    if not schema:
        return {
            "filename": filename,
            "status": "FAIL",
            "error": "No schema defined for validation."
        }
        
    issues = []
    status = "PASS"
    
    # 1. Column presence check
    for col in schema["required_columns"]:
        if col not in df.columns:
            issues.append(f"Missing required column: {col}")
            status = "FAIL"
            
    # 2. Type validation (only if column is present)
    for col, expected_type in schema["types"].items():
        if col in df.columns:
            try:
                if expected_type == "int64":
                    # Convert to numeric, check for fractions
                    converted = pd.to_numeric(df[col], errors='raise')
                    if not np.all(converted.dropna() % 1 == 0):
                        issues.append(f"Column {col} contains non-integer values.")
                        status = "FAIL"
                elif expected_type == "float64":
                    pd.to_numeric(df[col], errors='raise')
            except Exception as e:
                issues.append(f"Type check failed for column {col}: {e}")
                status = "FAIL"
                
    # 3. Null percentage check
    null_counts = df.isnull().sum().to_dict()
    total_rows = len(df)
    skip_null_cols = set(schema.get("skip_null_check_cols", []))
    
    for col, n_count in null_counts.items():
        if n_count > 0 and col not in skip_null_cols:
            null_pct = (n_count / total_rows) * 100
            if null_pct > schema["null_threshold_pct"]:
                issues.append(f"Column '{col}' null rate {null_pct:.2f}% exceeds threshold of {schema['null_threshold_pct']}% (Null Count: {n_count})")
                if status == "PASS":
                    status = "WARNING"
                    
    # 4. Duplicate rows check
    duplicates = int(df.duplicated().sum())
    if duplicates > 0:
        issues.append(f"Duplicate rows detected: {duplicates}")
        status = "FAIL"
        
    # 5. Negative values check (where not allowed)
    if not schema["negative_allowed"]:
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col in df.columns:
                negative_count = int((df[col] < 0).sum())
                if negative_count > 0:
                    issues.append(f"Column '{col}' contains {negative_count} negative values.")
                    status = "FAIL"
                    
    # 6. Suspicious zeros check
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    suspicious_zeros = {}
    for col in numeric_cols:
        if col in df.columns and col != 'calendar_year':
            zero_count = int((df[col] == 0).sum())
            if zero_count > 0:
                suspicious_zeros[col] = zero_count
                
    # 7. Date checks (ensure parseable and logically bound)
    date_issues = 0
    if "date" in df.columns:
        parsed_dates = pd.to_datetime(df["date"], errors='coerce')
        nat_count = parsed_dates.isna().sum()
        if nat_count > 0:
            issues.append(f"Column 'date' contains {nat_count} unparseable date values.")
            status = "FAIL"
            
    # Compile quality report
    report = {
        "filename": filename,
        "status": status,
        "row_count": total_rows,
        "duplicate_rows": duplicates,
        "null_counts": null_counts,
        "suspicious_zeros": suspicious_zeros,
        "validation_issues": issues,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    # Save validation report
    q_name = os.path.splitext(filename)[0] + "_validation_report.json"
    with open(os.path.join(QUALITY_DIR, q_name), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2)
        
    return report

def validate_all():
    print("Executing staging schema validation...")
    reports = {}
    for filename in STAGING_SCHEMAS.keys():
        rep = validate_dataset(filename)
        reports[filename] = rep
        print(f"  {filename}: {rep['status']} (Issues: {len(rep['validation_issues'])})")
    return reports

if __name__ == "__main__":
    validate_all()
