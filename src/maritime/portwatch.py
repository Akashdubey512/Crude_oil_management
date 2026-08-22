import os
import urllib.request
import urllib.parse
import json
import time
import pandas as pd
import datetime

PORTWATCH_QUERY_URL = "https://services9.arcgis.com/weJ1QsnbMYJlCHdG/arcgis/rest/services/Daily_Chokepoints_Data/FeatureServer/0/query"
RAW_PORTWATCH_DIR = r"D:\hackathon project\energy-resilience\data\raw\portwatch"

os.makedirs(RAW_PORTWATCH_DIR, exist_ok=True)

# Map our canonical corridor IDs to PortWatch portids
CHOKEPOINT_MAP = {
    "SUEZ": "chokepoint1",
    "BAB_EL_MANDEB": "chokepoint4",
    "HORMUZ": "chokepoint6"
}

def fetch_portwatch_data(portid, max_records=2000):
    """
    Queries IMF PortWatch ArcGIS service for a specific chokepoint portid.
    """
    from src.api.config import settings
    
    params = {
        "where": f"portid = '{portid}'",
        "outFields": "date,year,month,day,portid,portname,n_tanker,n_cargo,n_total,capacity_tanker,capacity",
        "orderByFields": "date DESC",
        "returnGeometry": "false",
        "f": "json",
        "resultRecordCount": max_records
    }
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # Allow URL overrides from env if configured
    url_base = os.getenv("PORTWATCH_QUERY_URL", PORTWATCH_QUERY_URL)
    url_parts = list(urllib.parse.urlparse(url_base))
    url_parts[4] = urllib.parse.urlencode(params)
    final_url = urllib.parse.urlunparse(url_parts)
    
    req = urllib.request.Request(final_url, headers=headers)
    timeout = int(settings.request_timeout)
    
    # Retry loop for resilience
    for attempt in range(3):
        try:
            print(f"Querying IMF PortWatch Live for {portid} (attempt {attempt+1}/3)...")
            with urllib.request.urlopen(req, timeout=timeout) as response:
                content = response.read().decode('utf-8')
                return json.loads(content)
        except Exception as e:
            print(f"IMF PortWatch attempt {attempt+1}/3 failed for {portid}: {e}")
            if attempt < 2:
                time.sleep(2 ** attempt)
            else:
                return None

def ingest_portwatch_pipeline(force_live=True):
    """
    Ingests daily transit count metrics from IMF PortWatch.
    Falls back to cached JSON if live query fails or force_live is False.
    """
    all_records = []
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    for canon_id, pid in CHOKEPOINT_MAP.items():
        cache_filename = f"portwatch_{pid}.json"
        cache_filepath = os.path.join(RAW_PORTWATCH_DIR, cache_filename)
        
        raw_data = None
        if force_live:
            raw_data = fetch_portwatch_data(pid)
            if raw_data and "features" in raw_data:
                # Save raw response to cache directory (raw data immutability)
                with open(cache_filepath, 'w', encoding='utf-8') as f:
                    json.dump(raw_data, f, indent=2)
                print(f"  Saved raw response to {cache_filepath}")
                
        # Fallback to local cache if live fetch failed or wasn't requested
        if not raw_data or "features" not in raw_data:
            print(f"Searching for local cached data for {pid}...")
            if os.path.exists(cache_filepath):
                print(f"  Loading local cache from {cache_filepath}")
                with open(cache_filepath, 'r', encoding='utf-8') as f:
                    raw_data = json.load(f)
            else:
                print(f"  No local cache files found for {pid}")
                
        if raw_data and "features" in raw_data:
            features = raw_data["features"]
            print(f"  Ingested {len(features)} daily records for {canon_id} ({pid})")
            
            for feat in features:
                attr = feat["attributes"]
                all_records.append({
                    "date": attr.get("date"),
                    "corridor_id": canon_id,
                    "portid": attr.get("portid"),
                    "portname": attr.get("portname"),
                    "vessel_count": attr.get("n_total"),
                    "tanker_count": attr.get("n_tanker"),
                    "cargo_count": attr.get("n_cargo"),
                    "capacity_tanker": attr.get("capacity_tanker"),
                    "capacity_total": attr.get("capacity"),
                    "source": "IMF PortWatch",
                    "source_url": "https://portwatch.imf.org/",
                    "retrieval_timestamp": timestamp,
                    "processing_version": 1.0
                })
                
    if not all_records:
        print("[WARNING] No PortWatch transit records ingested. Returning empty DataFrame.")
        return pd.DataFrame(columns=[
            "date", "corridor_id", "portid", "portname", "vessel_count", "tanker_count", 
            "cargo_count", "capacity_tanker", "capacity_total", "source", "source_url", 
            "retrieval_timestamp", "processing_version"
        ])
        
    df_portwatch = pd.DataFrame(all_records)
    # Sort and clean
    df_portwatch = df_portwatch.sort_values(["corridor_id", "date"]).reset_index(drop=True)
    return df_portwatch
