import os
import urllib.request
import pandas as pd
import datetime

SDN_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv"
ADD_URL = "https://www.treasury.gov/ofac/downloads/add.csv"
RAW_SANCTIONS_DIR = r"D:\hackathon project\energy-resilience\data\raw\sanctions"

os.makedirs(RAW_SANCTIONS_DIR, exist_ok=True)

def fetch_ofac_file(url, filename):
    """
    Downloads a file from Treasury.gov and returns the local filepath.
    """
    filepath = os.path.join(RAW_SANCTIONS_DIR, filename)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        print(f"Downloading OFAC file from {url}...")
        from src.api.secure_client import secure_urlopen
        content_bytes = secure_urlopen(url, timeout=20.0, headers=headers)
        with open(filepath, 'wb') as f:
            f.write(content_bytes)
        print(f"  Successfully saved to {filepath}")
        return filepath
    except Exception as e:
        print(f"Failed to download OFAC file from {url}: {e}")
        return None

def ingest_sanctions_pipeline(force_live=True):
    """
    Downloads and normalizes OFAC SDN and address lists.
    Falls back to cached versions if live download fails.
    """
    sdn_filename = "sdn.csv"
    add_filename = "add.csv"
    
    sdn_path = os.path.join(RAW_SANCTIONS_DIR, sdn_filename)
    add_path = os.path.join(RAW_SANCTIONS_DIR, add_filename)
    
    if force_live:
        live_sdn = fetch_ofac_file(SDN_URL, sdn_filename)
        live_add = fetch_ofac_file(ADD_URL, add_filename)
        if not live_sdn or not live_add:
            print("Live OFAC download failed. Falling back to cache...")
            
    # Verify file existence (either newly downloaded or cached)
    if not os.path.exists(sdn_path) or not os.path.exists(add_path):
        print(f"Required OFAC files not found in cache. Ingestion stopped.")
        return pd.DataFrame()
        
    try:
        # Load SDN List
        # Columns in sdn.csv:
        # 1. ent_num, 2. name, 3. type, 4. program, 5. title, 6. call_sign, 7. vess_type,
        # 8. tonnage, 9. grt, 10. vess_flag, 11. vess_owner, 12. remarks
        df_sdn = pd.read_csv(
            sdn_path, 
            header=None,
            names=['ent_num', 'name', 'type', 'program', 'title', 'call_sign', 'vess_type', 
                   'tonnage', 'grt', 'vess_flag', 'vess_owner', 'remarks'],
            on_bad_lines='skip'
        )
        
        # Load Address List to map entities to countries
        # Columns in add.csv:
        # 1. ent_num, 2. add_num, 3. address, 4. city_state_zip, 5. country, 6. remarks
        df_add = pd.read_csv(
            add_path,
            header=None,
            names=['ent_num', 'add_num', 'address', 'city_state_zip', 'country', 'add_remarks'],
            on_bad_lines='skip'
        )
        
        # Merge Country information from add.csv onto sdn.csv
        # Take first address country per entity to keep it simple and clean
        df_country = df_add.dropna(subset=['country']).groupby('ent_num')['country'].first().reset_index()
        df_merged = pd.merge(df_sdn, df_country, on='ent_num', how='left')
        
        # Add metadata for provenance
        df_merged['source_file'] = sdn_filename
        df_merged['ingestion_timestamp'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        df_merged['transformation_version'] = 1.0
        
        print(f"Successfully loaded and merged {len(df_merged)} sanctions records.")
        return df_merged
        
    except Exception as e:
        print(f"Error parsing OFAC sanctions data: {e}")
        return pd.DataFrame()
