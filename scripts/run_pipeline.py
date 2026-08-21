import os
import json
import datetime
import pandas as pd
import numpy as np

from src.preprocessing.normalizer import normalize_all, STAGING_DIR, RAW_DATA_DIR, MANIFEST_DIR, get_sha256
from src.validation.validators import validate_all, QUALITY_DIR

def run_pipeline():
    print("================================================================================")
    print("STARTING ENERGY PLATFORM INGESTION & VALIDATION PIPELINE")
    print("================================================================================")
    
    # 1. Run normalization
    normalize_all()
    
    # 2. Run validation
    validation_reports = validate_all()
    
    # 3. Build Processed Lineage Manifest
    print("\nCompiling lineage manifest...")
    manifest_entries = []
    
    metadata_map = {
        "crude_prices.csv": {
            "dataset_id": "staged_crude_prices",
            "frequency": "Daily",
            "units": "USD per Barrel ($/bbl)"
        },
        "geopolitical_risk.csv": {
            "dataset_id": "staged_geopolitical_risk",
            "frequency": "Mixed (Daily & Monthly)",
            "units": "Index"
        },
        "refinery_throughput.csv": {
            "dataset_id": "staged_refinery_throughput",
            "frequency": "Monthly",
            "units": "Thousand Metric Tonnes (TMT)"
        },
        "petroleum_consumption.csv": {
            "dataset_id": "staged_petroleum_consumption",
            "frequency": "Monthly",
            "units": "Thousand Metric Tonnes (TMT)"
        },
        "crude_imports.csv": {
            "dataset_id": "staged_crude_imports",
            "frequency": "Monthly",
            "units": "Thousand Metric Tonnes (TMT)"
        },
        "crude_import_values.csv": {
            "dataset_id": "staged_crude_import_values",
            "frequency": "Monthly",
            "units": "INR Crores & USD Millions"
        }
    }
    
    for filename, meta in metadata_map.items():
        fpath = os.path.join(STAGING_DIR, filename)
        if not os.path.exists(fpath):
            continue
            
        df = pd.read_csv(fpath)
        
        # Extract unique sources
        source_files = []
        if "source_file" in df.columns:
            source_files = [x for x in df["source_file"].dropna().unique().tolist()]
        elif "source_file_inr" in df.columns:
            source_files = [x for x in df["source_file_inr"].dropna().unique().tolist()]
            if "source_file_usd" in df.columns:
                source_files.extend([x for x in df["source_file_usd"].dropna().unique().tolist()])
                source_files = list(set(source_files))
                
        source_sheets = []
        if "source_sheet" in df.columns:
            source_sheets = [x for x in df["source_sheet"].dropna().unique().tolist()]
        elif "source_sheet_inr" in df.columns:
            source_sheets = [x for x in df["source_sheet_inr"].dropna().unique().tolist()]
            
        source_hashes = [get_sha256(os.path.join(RAW_DATA_DIR, sf)) for sf in source_files]
        
        ing_time = "UNKNOWN"
        if "ingestion_timestamp" in df.columns:
            ing_time = df["ingestion_timestamp"].dropna().iloc[0]
            
        trans_ver = "1.0"
        if "transformation_version" in df.columns:
            trans_ver = df["transformation_version"].dropna().iloc[0]
            
        # Date range
        date_min = "UNKNOWN"
        date_max = "UNKNOWN"
        if "date" in df.columns:
            parsed = pd.to_datetime(df["date"])
            date_min = parsed.min().strftime('%Y-%m-%d')
            date_max = parsed.max().strftime('%Y-%m-%d')
            
        q_status = validation_reports.get(filename, {}).get("status", "UNKNOWN")
        
        entry = {
            "dataset_id": meta["dataset_id"],
            "source_file": source_files,
            "source_hash": source_hashes,
            "source_sheet": source_sheets,
            "ingestion_time": ing_time,
            "row_count": len(df),
            "column_count": len(df.columns),
            "date_min": date_min,
            "date_max": date_max,
            "frequency": meta["frequency"],
            "units": meta["units"],
            "quality_status": q_status,
            "transformation_version": trans_ver
        }
        manifest_entries.append(entry)
        
    processed_manifest = {
        "manifest_version": "1.0",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "datasets": manifest_entries
    }
    
    with open(os.path.join(MANIFEST_DIR, "processed_manifest.json"), 'w', encoding='utf-8') as f:
        json.dump(processed_manifest, f, indent=2)
        
    # 4. Generate human-readable data quality report
    print("\nGenerating human-readable data quality report...")
    generate_data_quality_report(validation_reports)
    
    print("================================================================================")
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print("================================================================================")

def generate_data_quality_report(reports):
    doc_path = r"D:\hackathon project\energy-resilience\docs\data-quality-report.md"
    
    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write("# Data Quality Report (Staging Layer)\n\n")
        f.write(f"Generated at: {datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M:%S')} UTC\n\n")
        
        f.write("This report presents the validation results, null concentrations, duplicates, and ranges for the normalized staging tables.\n\n")
        
        f.write("## 1. Quality Check Summary\n\n")
        f.write("| Staging Table | Status | Row Count | Duplicates | Validation Issues |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        
        for fname, r in reports.items():
            issues_joined = "; ".join(r["validation_issues"]) if r["validation_issues"] else "None"
            f.write(f"| `{fname}` | **{r['status']}** | {r['row_count']} | {r['duplicate_rows']} | {issues_joined} |\n")
            
        f.write("\n## 2. Table-by-Table Details\n\n")
        
        for fname, r in reports.items():
            f.write(f"### `{fname}`\n")
            f.write(f"- **Overall Status**: {r['status']}\n")
            f.write(f"- **Total Rows**: {r['row_count']}\n")
            f.write(f"- **Duplicate Rows**: {r['duplicate_rows']}\n")
            
            f.write("- **Null Counts by Column**:\n")
            for col, n_cnt in r["null_counts"].items():
                if n_cnt > 0:
                    pct = (n_cnt / r["row_count"]) * 100
                    f.write(f"  - `{col}`: {n_cnt} ({pct:.2f}%)\n")
            if not any(v > 0 for v in r["null_counts"].values()):
                f.write("  - *None*\n")
                
            f.write("- **Suspicious Zeros**:\n")
            if r["suspicious_zeros"]:
                for col, z_cnt in r["suspicious_zeros"].items():
                    f.write(f"  - `{col}`: {z_cnt} zeros\n")
            else:
                f.write("  - *None*\n")
                
            f.write("- **Validation Issues Raised**:\n")
            if r["validation_issues"]:
                for issue in r["validation_issues"]:
                    f.write(f"  - [FAIL] {issue}\n")
            else:
                f.write("  - [PASS] No schema violations.\n")
            f.write("\n---\n\n")

if __name__ == "__main__":
    run_pipeline()
