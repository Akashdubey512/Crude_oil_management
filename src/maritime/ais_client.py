import os
import urllib.request
import urllib.parse
import json
import pandas as pd
import datetime

GFW_API_URL = "https://gateway.api.globalfishingwatch.org/v3/vessels"
RAW_AIS_DIR = r"D:\hackathon project\energy-resilience\data\raw\ais"

os.makedirs(RAW_AIS_DIR, exist_ok=True)

# Canonical schema columns for vessel observations
VESSEL_SCHEMA_COLS = [
    "vessel_id",
    "imo",
    "mmsi",
    "timestamp",
    "latitude",
    "longitude",
    "speed",
    "heading",
    "vessel_type",
    "source",
    "source_timestamp",
    "ingestion_timestamp"
]

def fetch_gfw_vessels(token, query="cargo OR tanker"):
    """
    Programmatically queries the GFW v3 API for vessel records matching the query.
    Requires a valid Bearer Token.
    """
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "EnergyResiliencePlatform/1.0"
    }
    
    params = {
        "query": query,
        "limit": 100
    }
    
    url_parts = list(urllib.parse.urlparse(GFW_API_URL))
    url_parts[4] = urllib.parse.urlencode(params)
    final_url = urllib.parse.urlunparse(url_parts)
    
    req = urllib.request.Request(final_url, headers=headers)
    try:
        print(f"Querying GFW API at {GFW_API_URL}...")
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read().decode('utf-8')
            return json.loads(content)
    except Exception as e:
        print(f"GFW API network request failed: {e}")
        return None

def ingest_vessel_observations():
    """
    Ingestion orchestrator for vessel observations.
    - Sourced from GFW API v3 if GFW_API_TOKEN is set in environment.
    - Gracefully defaults to an empty DataFrame with canonical schema if token is missing.
    """
    token = os.getenv("GFW_API_TOKEN")
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    if not token:
        # Documented limitation: GFW API requires manual developer registration
        print("[WARNING] GFW_API_TOKEN not found in environment variables.")
        print("  Real GFW AIS vessel position data is unavailable for ingestion.")
        print("  Gracefully returning empty schema-compliant vessel observations table.")
        empty_df = pd.DataFrame(columns=VESSEL_SCHEMA_COLS)
        return empty_df
        
    print("GFW Token detected. Triggering GFW AIS Ingestion...")
    raw_data = fetch_gfw_vessels(token)
    
    if not raw_data or "entries" not in raw_data:
        print("  GFW API returned no records or failed. Returning empty observations table.")
        return pd.DataFrame(columns=VESSEL_SCHEMA_COLS)
        
    # Save raw GFW JSON response (raw data immutability)
    cache_filepath = os.path.join(RAW_AIS_DIR, f"gfw_vessels_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(cache_filepath, 'w', encoding='utf-8') as f:
        json.dump(raw_data, f, indent=2)
    print(f"  Saved raw GFW payload to {cache_filepath}")
    
    # Normalize to canonical schema
    records = []
    for entry in raw_data.get("entries", []):
        records.append({
            "vessel_id": entry.get("id"),
            "imo": entry.get("imo"),
            "mmsi": entry.get("mmsi"),
            "timestamp": entry.get("lastTransmissionDate"),
            "latitude": entry.get("latitude"),
            "longitude": entry.get("longitude"),
            "speed": entry.get("speed"),
            "heading": entry.get("heading"),
            "vessel_type": entry.get("type", "tanker"),
            "source": "Global Fishing Watch v3",
            "source_timestamp": entry.get("lastTransmissionDate"),
            "ingestion_timestamp": timestamp
        })
        
    df_vessels = pd.DataFrame(records)
    # Ensure all canonical columns are present in output
    for col in VESSEL_SCHEMA_COLS:
        if col not in df_vessels.columns:
            df_vessels[col] = None
            
    df_vessels = df_vessels[VESSEL_SCHEMA_COLS]
    return df_vessels
