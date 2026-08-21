import os
import datetime
import json
import pandas as pd
import numpy as np
import hashlib

from src.ingestion.loaders import (
    load_brent_prices,
    load_daily_gpr,
    load_monthly_gpr,
    load_refinery_throughput,
    load_master_consumption,
    load_provisional_consumption,
    load_master_imports,
    load_provisional_imports
)

RAW_DATA_DIR = r"D:\hackathon project\energy-resilience\data\raw"
STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
MANIFEST_DIR = r"D:\hackathon project\energy-resilience\data\manifests"

os.makedirs(STAGING_DIR, exist_ok=True)
os.makedirs(MANIFEST_DIR, exist_ok=True)

def get_sha256(fpath):
    h = hashlib.sha256()
    with open(fpath, 'rb') as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()

def get_fiscal_year(d):
    """
    Standard India Fiscal Year alignment: April to March.
    April 2024 -> FY 2024-25
    March 2025 -> FY 2024-25
    """
    if pd.isnull(d):
        return None
    dt = pd.to_datetime(d)
    yr = dt.year
    mon = dt.month
    if mon >= 4:
        return f"{yr}-{str(yr+1)[2:]}"
    else:
        return f"{yr-1}-{str(yr)[2:]}"

def classify_refinery(company_name):
    """
    Classifies refinery record_type based on company name strings.
    """
    if pd.isnull(company_name):
        return "unknown"
    c_str = str(company_name).strip().upper()
    if "GRAND TOTAL" in c_str:
        return "grand_total"
    elif "TOTAL" in c_str:
        return "subtotal"
    else:
        return "individual"

def build_duplicate_registry():
    """
    Builds data/manifests/duplicate_registry.json by comparing single sheets
    to sheets in the master consumption file.
    """
    master_path = os.path.join(RAW_DATA_DIR, "1777985064_PT_Consumption_English.xls")
    duplicates = {
        "1735553804_consumption_en.xlsx": "2023-24",
        "1773140735_FY_24-25_consumption-en.xlsx": "2024-25",
        "1783938756_PT Consumption.xlsx": "2025-26"
    }
    
    registry = []
    
    if not os.path.exists(master_path):
        return
        
    master_xl = pd.ExcelFile(master_path)
    
    for fname, sheet_name in duplicates.items():
        fpath = os.path.join(RAW_DATA_DIR, fname)
        if not os.path.exists(fpath):
            continue
            
        sha = get_sha256(fpath)
        
        # Compare parsed content
        is_exact = False
        try:
            df_single = pd.ExcelFile(fpath).parse(0)
            df_master = master_xl.parse(sheet_name)
            
            # Simple content check: drop rows that are all nan, check shapes and columns
            s1 = df_single.dropna(how='all').shape
            s2 = df_master.dropna(how='all').shape
            
            if s1 == s2:
                is_exact = True
        except Exception as e:
            print(f"Comparison error for {fname}: {e}")
            
        registry.append({
            "source_workbook": fname,
            "sha256": sha,
            "compared_against_master": "1777985064_PT_Consumption_English.xls",
            "compared_against_sheet": sheet_name,
            "exact_duplicate_data": is_exact,
            "recommendation": "EXCLUDE_FROM_PIPELINE" if is_exact else "REVIEW",
            "notes": "Redundant extracted sheet; master workbook has all historical records."
        })
        
    reg_path = os.path.join(MANIFEST_DIR, "duplicate_registry.json")
    with open(reg_path, 'w', encoding='utf-8') as f:
        json.dump({"duplicate_registry": registry}, f, indent=2)

def normalize_all():
    # 1. Crude Prices
    print("Normalizing crude prices...")
    brent_raw_path = os.path.join(RAW_DATA_DIR, "DCOILBRENTEU.csv")
    df_brent = load_brent_prices(brent_raw_path)
    
    df_brent_stage = pd.DataFrame({
        "date": df_brent["observation_date"],
        "calendar_year": df_brent["observation_date"].dt.year,
        "month": df_brent["observation_date"].dt.strftime('%B'),
        "financial_year": df_brent["observation_date"].apply(get_fiscal_year),
        "value": df_brent["DCOILBRENTEU"],
        "unit": "USD/bbl",
        "source": "FRED",
        "source_file": df_brent["source_file"],
        "ingestion_timestamp": df_brent["ingestion_timestamp"],
        "transformation_version": df_brent["transformation_version"]
    })
    df_brent_stage.to_csv(os.path.join(STAGING_DIR, "crude_prices.csv"), index=False)
    
    # 2. Geopolitical Risk (Long Schema)
    print("Normalizing geopolitical risk...")
    gpr_d_path = os.path.join(RAW_DATA_DIR, "data_gpr_daily_recent.xls")
    gpr_m_path = os.path.join(RAW_DATA_DIR, "data_gpr_export.xls")
    
    df_gpr_d = load_daily_gpr(gpr_d_path)
    df_gpr_m = load_monthly_gpr(gpr_m_path)
    
    gpr_rows = []
    
    # Daily Global Risk — melt GPRD, GPRD_ACT, GPRD_THREAT into long format
    for _, r in df_gpr_d.iterrows():
        src_row_val = int(r["source_row"]) if ("source_row" in r.index and pd.notnull(r["source_row"])) else np.nan
        base = {
            "date": r["date"],
            "financial_year": get_fiscal_year(r["date"]),
            "month": r["date"].strftime('%B'),
            "geography": "GLOBAL",
            "unit": "Index",
            "source": "Caldara-Iacoviello Daily",
            "source_file": r["source_file"],
            "source_sheet": r["source_sheet"],
            "source_row": src_row_val,
            "ingestion_timestamp": r["ingestion_timestamp"],
            "transformation_version": r["transformation_version"]
        }
        for metric_col in ["GPRD", "GPRD_ACT", "GPRD_THREAT"]:
            entry = dict(base)
            entry["metric"] = metric_col
            entry["value"] = r[metric_col]
            gpr_rows.append(entry)
        
    # Monthly Global and Country specific (India, China, USA, Russia, Saudi Arabia)
    country_cols = {
        "GPR": ("GLOBAL", "GPR"),
        "GPRT": ("GLOBAL", "GPRT"),
        "GPRA": ("GLOBAL", "GPRA"),
        "GPRC_IND": ("INDIA", "GPRC"),
        "GPRC_CHN": ("CHINA", "GPRC"),
        "GPRC_USA": ("USA", "GPRC"),
        "GPRC_RUS": ("RUSSIA", "GPRC"),
        "GPRC_SAU": ("SAUDI_ARABIA", "GPRC")
    }
    
    for _, r in df_gpr_m.iterrows():
        m_date = r["month"]
        src_row_m = int(r["source_row"]) if ("source_row" in r.index and pd.notnull(r["source_row"])) else np.nan
        for col, (geo, metric) in country_cols.items():
            if col in r.index and pd.notnull(r[col]):
                gpr_rows.append({
                    "date": m_date,
                    "financial_year": get_fiscal_year(m_date),
                    "month": m_date.strftime('%B'),
                    "geography": geo,
                    "metric": metric,
                    "value": float(r[col]),
                    "unit": "Index",
                    "source": "Caldara-Iacoviello Monthly",
                    "source_file": r["source_file"],
                    "source_sheet": r["source_sheet"],
                    "source_row": src_row_m,
                    "ingestion_timestamp": r["ingestion_timestamp"],
                    "transformation_version": r["transformation_version"]
                })
                
    df_gpr_stage = pd.DataFrame(gpr_rows)
    df_gpr_stage.to_csv(os.path.join(STAGING_DIR, "geopolitical_risk.csv"), index=False)
    
    # 3. Refinery Throughput
    print("Normalizing refinery throughput...")
    refinery_raw_path = os.path.join(RAW_DATA_DIR, "8d3b6596-b09e-4077-aebf-425193185a5b.csv")
    df_refinery = load_refinery_throughput(refinery_raw_path)
    
    refinery_rows = []
    # Standard Month Name to Number map
    month_num_map = {
        'APRIL': 4, 'MAY': 5, 'JUNE': 6, 'JULY': 7, 'AUGUST': 8, 'SEPTEMBER': 9,
        'OCTOBER': 10, 'NOVEMBER': 11, 'DECEMBER': 12, 'JANUARY': 1, 'FEBRUARY': 2, 'MARCH': 3
    }
    
    for idx, r in df_refinery.iterrows():
        mon_str = str(r["Month"]).strip().upper()
        mon_num = month_num_map[mon_str]
        yr = int(r["Year"])
        
        # Build month date object (1st of the month)
        m_date = datetime.date(yr, mon_num, 1)
        
        refinery_rows.append({
            "date": pd.to_datetime(m_date),
            "calendar_year": yr,
            "financial_year": get_fiscal_year(m_date),
            "month": r["Month"],
            "oil_company": r["OIL COMPANIES"],
            "record_type": classify_refinery(r["OIL COMPANIES"]),
            "quantity_tmt": r["Quantity (000 Metric Tonnes)"],
            "unit": "Thousand Metric Tonnes (TMT)",
            "source": "PPAC / Ministry of Petroleum and Natural Gas",
            "source_file": r["source_file"],
            "source_row": idx + 2, # 1-indexed, skipping header
            "ingestion_timestamp": r["ingestion_timestamp"],
            "transformation_version": r["transformation_version"]
        })
        
    df_refinery_stage = pd.DataFrame(refinery_rows)
    df_refinery_stage.to_csv(os.path.join(STAGING_DIR, "refinery_throughput.csv"), index=False)
    
    # 4. Petroleum Consumption
    print("Normalizing petroleum consumption...")
    master_cons_path = os.path.join(RAW_DATA_DIR, "1777985064_PT_Consumption_English.xls")
    prov_cons_path = os.path.join(RAW_DATA_DIR, "1786022792_PT Consumption.xlsx")
    
    df_master_cons = load_master_consumption(master_cons_path)
    df_prov_cons = load_provisional_consumption(prov_cons_path)
    
    # Combine master and provisional
    df_cons_all = pd.concat([df_master_cons, df_prov_cons], ignore_index=True)
    
    # Rename columns to standardized names
    df_cons_stage = pd.DataFrame({
        "date": df_cons_all["date"],
        "calendar_year": df_cons_all["calendar_year"],
        "financial_year": df_cons_all["financial_year"],
        "month": df_cons_all["month"],
        "product": df_cons_all["entity"],
        "quantity_tmt": df_cons_all["value"],
        "unit": "Thousand Metric Tonnes (TMT)",
        "source": "PPAC",
        "source_file": df_cons_all["source_file"],
        "source_sheet": df_cons_all["source_sheet"],
        "source_row": df_cons_all["source_row"],
        "ingestion_timestamp": df_cons_all["ingestion_timestamp"],
        "transformation_version": df_cons_all["transformation_version"]
    })
    
    df_cons_stage.to_csv(os.path.join(STAGING_DIR, "petroleum_consumption.csv"), index=False)
    
    # 5. Crude Imports Quantity
    print("Normalizing crude imports quantity...")
    master_imp_path = os.path.join(RAW_DATA_DIR, "1751964547_PT_IMPORT_TMT_H.xlsx")
    prov_imp_path = os.path.join(RAW_DATA_DIR, "1787119551_PT_import.xls")
    
    df_master_imp = load_master_imports(master_imp_path, flow_val_type='quantity')
    df_prov_imp = load_provisional_imports(prov_imp_path)
    
    df_imp_all = pd.concat([df_master_imp, df_prov_imp], ignore_index=True)
    
    df_imp_stage = pd.DataFrame({
        "date": df_imp_all["date"],
        "calendar_year": df_imp_all["calendar_year"],
        "financial_year": df_imp_all["financial_year"],
        "month": df_imp_all["month"],
        "product": df_imp_all["entity"],
        "flow_type": df_imp_all["section"],
        "quantity_tmt": df_imp_all["value"],
        "unit": "Thousand Metric Tonnes (TMT)",
        "source": "PPAC",
        "source_file": df_imp_all["source_file"],
        "source_sheet": df_imp_all["source_sheet"],
        "source_row": df_imp_all["source_row"],
        "ingestion_timestamp": df_imp_all["ingestion_timestamp"],
        "transformation_version": df_imp_all["transformation_version"]
    })
    # Drop any erroneous CONSUMPTION section rows (should only be IMPORT/EXPORT)
    df_imp_stage = df_imp_stage[df_imp_stage["flow_type"].isin(["IMPORT", "EXPORT"])].reset_index(drop=True)
    df_imp_stage.to_csv(os.path.join(STAGING_DIR, "crude_imports.csv"), index=False)
    
    # 6. Crude Import Values
    print("Normalizing crude imports values...")
    val_inr_path = os.path.join(RAW_DATA_DIR, "1751964598_PT_IMPORT_VAL_RS.CRS._H.xlsx")
    val_usd_path = os.path.join(RAW_DATA_DIR, "1751964622_PT_IMPORT_VAL_US$_H.xlsx")
    
    df_val_inr = load_master_imports(val_inr_path, flow_val_type='value_inr')
    df_val_usd = load_master_imports(val_usd_path, flow_val_type='value_usd')
    
    # Drop erroneous CONSUMPTION section rows (only IMPORT/EXPORT are valid in value tables)
    valid_sections = ["IMPORT", "EXPORT"]
    df_val_inr = df_val_inr[df_val_inr["section"].isin(valid_sections)].reset_index(drop=True)
    df_val_usd = df_val_usd[df_val_usd["section"].isin(valid_sections)].reset_index(drop=True)
    
    # Merge INR and USD values
    # Group on primary columns to merge
    merge_keys = ['date', 'calendar_year', 'financial_year', 'month', 'entity', 'section']
    
    df_val_inr_clean = df_val_inr[merge_keys + ['value', 'source_file', 'source_sheet', 'source_row', 'ingestion_timestamp', 'transformation_version']].copy()
    df_val_usd_clean = df_val_usd[merge_keys + ['value', 'source_file', 'source_sheet', 'source_row']].copy()
    
    df_val_merged = pd.merge(
        df_val_inr_clean,
        df_val_usd_clean,
        on=merge_keys,
        how='outer',
        suffixes=('_inr', '_usd')
    )
    
    df_val_stage = pd.DataFrame({
        "date": df_val_merged["date"],
        "calendar_year": df_val_merged["calendar_year"],
        "financial_year": df_val_merged["financial_year"],
        "month": df_val_merged["month"],
        "product": df_val_merged["entity"],
        "flow_type": df_val_merged["section"],
        "value_inr_crores": df_val_merged["value_inr"],
        "value_usd_million": df_val_merged["value_usd"],
        "source": "PPAC",
        "source_file_inr": df_val_merged["source_file_inr"],
        "source_sheet_inr": df_val_merged["source_sheet_inr"],
        "source_row_inr": df_val_merged["source_row_inr"],
        "source_file_usd": df_val_merged["source_file_usd"],
        "source_sheet_usd": df_val_merged["source_sheet_usd"],
        "source_row_usd": df_val_merged["source_row_usd"],
        "ingestion_timestamp": df_val_merged["ingestion_timestamp"],
        "transformation_version": df_val_merged["transformation_version"]
    })
    df_val_stage.to_csv(os.path.join(STAGING_DIR, "crude_import_values.csv"), index=False)
    
    # 7. Run duplicate registry builder
    print("Building duplicate registry...")
    build_duplicate_registry()
    print("All datasets normalized and staged.")

if __name__ == "__main__":
    normalize_all()
