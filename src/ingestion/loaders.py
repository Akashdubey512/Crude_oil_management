import os
import datetime
import pandas as pd
import numpy as np

def load_brent_prices(fpath):
    """
    Loads daily Brent Crude prices from FRED CSV.
    Keeps missing observations as NaN.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
    
    df = pd.read_csv(fpath)
    df.columns = [c.strip() for c in df.columns]
    
    # Standardize types
    df['observation_date'] = pd.to_datetime(df['observation_date'])
    # DCOILBRENTEU has "." or NaN for missing values
    df['DCOILBRENTEU'] = df['DCOILBRENTEU'].replace('.', np.nan)
    df['DCOILBRENTEU'] = pd.to_numeric(df['DCOILBRENTEU'], errors='coerce')
    
    # Add provenance fields
    df['source_file'] = os.path.basename(fpath)
    df['ingestion_timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    df['transformation_version'] = "1.0"
    
    return df

def load_daily_gpr(fpath):
    """
    Loads daily Geopolitical Risk Index from Excel.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
    
    df = pd.read_excel(fpath, sheet_name=0)
    df.columns = [c.strip() for c in df.columns]
    df['source_row'] = df.index + 2
    
    # Parse date
    df['date'] = pd.to_datetime(df['date'])
    
    # Select columns
    keep_cols = ['date', 'DAY', 'GPRD', 'GPRD_ACT', 'GPRD_THREAT', 'source_row']
    df = df[keep_cols].copy()
    
    # Add provenance fields
    df['source_file'] = os.path.basename(fpath)
    df['source_sheet'] = "Sheet1"
    df['ingestion_timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    df['transformation_version'] = "1.0"
    
    return df

def load_monthly_gpr(fpath):
    """
    Loads monthly Geopolitical Risk Index from Excel.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
    
    df = pd.read_excel(fpath, sheet_name=0)
    df.columns = [c.strip() for c in df.columns]
    df['source_row'] = df.index + 2
    
    df['month'] = pd.to_datetime(df['month'])
    
    # Add provenance fields
    df['source_file'] = os.path.basename(fpath)
    df['source_sheet'] = "Sheet1"
    df['ingestion_timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    df['transformation_version'] = "1.0"
    
    return df

def load_refinery_throughput(fpath):
    """
    Loads monthly Indian Refinery throughput CSV.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
    
    df = pd.read_csv(fpath)
    df.columns = [c.strip() for c in df.columns]
    
    # Keep missing observations as NaN
    df['Quantity (000 Metric Tonnes)'] = pd.to_numeric(df['Quantity (000 Metric Tonnes)'], errors='coerce')
    
    # Add provenance fields
    df['source_file'] = os.path.basename(fpath)
    df['ingestion_timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    df['transformation_version'] = "1.0"
    
    return df

def parse_financial_year(fy_str):
    """
    Parses financial year string like '1998-99' or '2024-25' or 'Period : April 1998-March 1999'
    returns start year (e.g. 1998).
    """
    import re
    # Match strings like '1998-99' or '2024-25'
    match = re.search(r'(\d{4})-(\d{2})', str(fy_str))
    if match:
        start_yr = int(match.group(1))
        return start_yr
    
    # Match strings like 'April-23 to March-24' or 'April-23'
    match2 = re.search(r'April-(\d{2})', str(fy_str), re.IGNORECASE)
    if match2:
        yr_short = int(match2.group(1))
        # assume 2000s
        start_yr = 2000 + yr_short
        return start_yr
        
    # Match 'April 1998-March 1999'
    match3 = re.search(r'April\s+(\d{4})', str(fy_str), re.IGNORECASE)
    if match3:
        return int(match3.group(1))
        
    return None

def parse_ppac_sheet(df, file_name, sheet_name, default_fy_start=None):
    """
    Generic parser for unpivoting PPAC style consumption or import/export sheets.
    Handles spacer rows, header search, section splits, and melting.
    """
    # 1. Detect Header Row
    header_idx = None
    month_cols = []
    header_cols = []
    
    # Look for the row that has product names and month abbreviations
    for idx, row in df.iterrows():
        row_vals = [str(x).strip().upper() for x in row.values if pd.notnull(x)]
        # Consumption sheet header row typically contains 'PRODUCTS' or 'PRODUCT' and months
        # Import/Export sheet header typically contains 'IMPORT/EXPORT' and months
        if any(term in row_vals for term in ['PRODUCTS', 'PRODUCT', 'IMPORT/EXPORT', 'IMPORT']):
            header_idx = idx
            header_cols = [str(x).strip() for x in row.values]
            break
            
    if header_idx is None:
        return None
        
    # Extract data rows below header
    data_df = df.iloc[header_idx + 1:].copy()
    data_df.columns = header_cols
    
    # Find monthly columns (e.g., APR, MAY, JUNE, etc., and not TOTAL or nan)
    std_months = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR',
                  'APRIL', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH']
    
    actual_month_cols = []
    first_col_name = header_cols[0] if len(header_cols) > 0 else 'PRODUCTS'
    
    for col in header_cols:
        if pd.notnull(col) and str(col).strip().upper() in std_months:
            actual_month_cols.append(col)
            
    if not actual_month_cols:
        return None
        
    # Detect FY from file metadata headers (above header row)
    fy_start = default_fy_start
    if fy_start is None:
        for idx, row in df.iloc[:header_idx].iterrows():
            row_str = " ".join([str(x) for x in row.values if pd.notnull(x)])
            parsed_fy = parse_financial_year(row_str)
            if parsed_fy is not None:
                fy_start = parsed_fy
                break
                
    if fy_start is None:
        # Try to parse from sheet name if sheet name is '2023-24' or similar
        parsed_fy = parse_financial_year(sheet_name)
        if parsed_fy is not None:
            fy_start = parsed_fy
            
    if fy_start is None:
        raise ValueError(f"Could not determine Financial Year for file {file_name}, sheet {sheet_name}")
        
    # Clean the rows - strip names, detect section bounds (Import vs Export)
    cleaned_rows = []
    current_section = "CONSUMPTION" # Default section for consumption sheets
    
    # Standard Month Name to Number map
    month_num_map = {
        'APR': 4, 'APRIL': 4,
        'MAY': 5,
        'JUN': 6, 'JUNE': 6,
        'JUL': 7, 'JULY': 7,
        'AUG': 8, 'AUGUST': 8,
        'SEP': 9, 'SEPTEMBER': 9,
        'OCT': 10, 'OCTOBER': 10,
        'NOV': 11, 'NOVEMBER': 11,
        'DEC': 12, 'DECEMBER': 12,
        'JAN': 1, 'JANUARY': 1,
        'FEB': 2, 'FEBRUARY': 2,
        'MAR': 3, 'MARCH': 3
    }
    
    # Look up column indices to avoid duplicate name Series ambiguity
    first_col_idx = 0
    month_col_indices = {}
    for m_col in actual_month_cols:
        indices = [i for i, x in enumerate(header_cols) if x == m_col]
        if indices:
            month_col_indices[m_col] = indices[0]
            
    for idx, row in data_df.iterrows():
        entity_val = row.iloc[first_col_idx]
        if pd.isnull(entity_val):
            continue
            
        entity_str = str(entity_val).strip()
        entity_upper = entity_str.upper()
        
        # Section changes in import/export sheets
        if any(term in entity_upper for term in ['IMPORT^', 'IMPORT#', 'IMPORT']) and 'TOTAL' not in entity_upper:
            current_section = "IMPORT"
            continue
        elif any(term in entity_upper for term in ['EXPORT^', 'EXPORT#', 'EXPORT']) and 'TOTAL' not in entity_upper:
            current_section = "EXPORT"
            continue
            
        # Skip totals, spacers, and sub-headings (rows with all null values or subheaders)
        if 'TOTAL' in entity_upper or 'GROWTH' in entity_upper or entity_upper == '':
            continue
            
        # Check if the row contains values
        # Extract row values for month columns
        row_vals = {}
        has_data = False
        for m_col in actual_month_cols:
            val = row.iloc[month_col_indices[m_col]]
            # Replace character values like '-' or '*' with NaN
            if pd.isnull(val) or str(val).strip() in ['-', '*', 'prov.', 'provisional', '']:
                row_vals[m_col] = np.nan
            else:
                try:
                    row_vals[m_col] = float(str(val).replace(',', '').strip())
                    has_data = True
                except ValueError:
                    row_vals[m_col] = np.nan
                    
        if not has_data:
            continue
            
        # Melt this row
        for m_col in actual_month_cols:
            val = row_vals[m_col]
            m_upper = str(m_col).strip().upper()
            m_num = month_num_map[m_upper]
            
            # Map month to calendar year
            # Financial Year starts in April, so Jan, Feb, Mar belong to start_year + 1
            cal_year = fy_start if m_num >= 4 else fy_start + 1
            
            # Reconstruct date (as first of the month)
            date_val = datetime.date(cal_year, m_num, 1)
            
            cleaned_rows.append({
                "entity": entity_str,
                "date": pd.to_datetime(date_val),
                "month": date_val.strftime('%B'),
                "calendar_year": cal_year,
                "financial_year": f"{fy_start}-{str(fy_start + 1)[2:]}",
                "value": val,
                "section": current_section,
                "source_row": idx + 1 # 1-indexed Excel row
            })
            
    res_df = pd.DataFrame(cleaned_rows)
    if len(res_df) > 0:
        res_df['source_file'] = os.path.basename(file_name)
        res_df['source_sheet'] = sheet_name
        res_df['ingestion_timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        res_df['transformation_version'] = "1.0"
        
    return res_df

def load_master_consumption(fpath):
    """
    Loads all monthly sheets in the master consumption workbook.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
        
    xl = pd.ExcelFile(fpath)
    dfs = []
    
    # Process monthly sheets (e.g. 1998-99 to 2025-26)
    import re
    monthly_sheet_pattern = re.compile(r'^\d{4}-\d{2}$')
    
    for sheet in xl.sheet_names:
        if monthly_sheet_pattern.match(sheet):
            df_sheet = xl.parse(sheet, header=None)
            parsed = parse_ppac_sheet(df_sheet, fpath, sheet)
            if parsed is not None and len(parsed) > 0:
                dfs.append(parsed)
                
    if not dfs:
        raise ValueError(f"No valid monthly consumption sheets found in {fpath}")
        
    return pd.concat(dfs, ignore_index=True)

def load_provisional_consumption(fpath):
    """
    Loads provisional/current year consumption Excel.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
        
    xl = pd.ExcelFile(fpath)
    df_sheet = xl.parse(xl.sheet_names[0], header=None)
    parsed = parse_ppac_sheet(df_sheet, fpath, xl.sheet_names[0], default_fy_start=2026)
    return parsed

def load_master_imports(fpath, flow_val_type='quantity'):
    """
    Loads monthly sheets in the master import workbook.
    flow_val_type is 'quantity' (TMT), 'value_inr' (Rs. Crores), or 'value_usd' (Million USD).
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
        
    xl = pd.ExcelFile(fpath)
    dfs = []
    
    # Process monthly sheets (e.g. PT_IMPORT_2024-25, PT_Import_Val_2024-25, etc.)
    import re
    # Monthly sheets contain year ranges like 2024-25 or 2011-12 or 12-13
    monthly_sheet_pattern = re.compile(r'(\d{4}-\d{2}|\d{2}-\d{2})')
    
    for sheet in xl.sheet_names:
        # Include sheet if it matches the year range pattern (excludes master history and junk sheets like Sheet2)
        if monthly_sheet_pattern.search(sheet):
            df_sheet = xl.parse(sheet, header=None)
            # Determine default FY from sheet name
            fy_match = re.search(r'(\d{4})-(\d{2})|(\d{2})-(\d{2})', sheet)
            default_fy = None
            if fy_match:
                # parse year
                raw_yr = fy_match.group(1) or fy_match.group(3)
                if len(raw_yr) == 2:
                    default_fy = 2000 + int(raw_yr)
                else:
                    default_fy = int(raw_yr)
                    
            parsed = parse_ppac_sheet(df_sheet, fpath, sheet, default_fy_start=default_fy)
            if parsed is not None and len(parsed) > 0:
                parsed['value_type'] = flow_val_type
                dfs.append(parsed)
                
    if not dfs:
        raise ValueError(f"No valid monthly import sheets found in {fpath}")
        
    return pd.concat(dfs, ignore_index=True)

def load_provisional_imports(fpath):
    """
    Loads provisional import quantity sheet for FY 2026-27.
    """
    if not os.path.exists(fpath):
        raise FileNotFoundError(f"File not found: {fpath}")
        
    xl = pd.ExcelFile(fpath)
    df_sheet = xl.parse(xl.sheet_names[0], header=None)
    parsed = parse_ppac_sheet(df_sheet, fpath, xl.sheet_names[0], default_fy_start=2026)
    if parsed is not None and len(parsed) > 0:
        parsed['value_type'] = 'quantity'
    return parsed
