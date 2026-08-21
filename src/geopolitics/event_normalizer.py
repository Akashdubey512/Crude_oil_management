import hashlib
import pandas as pd
import numpy as np
import datetime
from src.geopolitics.corridor_mapping import map_text_to_corridor
from src.geopolitics.event_classifier import classify_event

def normalize_gdelt_event(art):
    """
    Normalizes a single GDELT article record into the canonical schema.
    """
    title = art.get("title", "")
    url = art.get("url", "")
    
    # Parse date from GDELT format (e.g., 20240224T123000Z or 20240224123000)
    seen_date_str = art.get("seendate", "")
    event_date = None
    event_time = None
    
    if seen_date_str:
        try:
            # Clean string and extract YYYY-MM-DD
            dt = pd.to_datetime(seen_date_str, format="%Y%m%dT%H%M%SZ", errors='coerce')
            if pd.isnull(dt):
                dt = pd.to_datetime(seen_date_str, format="%Y%m%d%H%M%S", errors='coerce')
            if pd.isnull(dt):
                # Fallback to date-only parse
                dt = pd.to_datetime(seen_date_str[:8], format="%Y%m%d", errors='coerce')
                
            if not pd.isnull(dt):
                event_date = dt.strftime("%Y-%m-%d")
                event_time = dt.strftime("%H:%M:%S")
        except Exception:
            pass
            
    if not event_date:
        event_date = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d") # Default fallback
        
    source_event_id = url
    source = "GDELT"
    
    # Run classifications
    event_type = classify_event(title)
    corridor = map_text_to_corridor(title)
    country = art.get("sourcecountry", None)
    if pd.isnull(country) or country == "":
        country = None
        
    # Tone or Tone-based severity if available (GDELT doc returns none, leave as NULL)
    severity_raw = None
    source_confidence = None
    
    # Calculate source_hash for auditing
    raw_str = f"{title}_{url}_{seen_date_str}"
    source_hash = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
    
    # Deterministic event_id
    id_seed = f"{event_date}_{source}_{source_event_id}"
    event_id = hashlib.sha256(id_seed.encode('utf-8')).hexdigest()
    
    return {
        "event_id": event_id,
        "event_date": event_date,
        "event_time_if_available": event_time,
        "source": source,
        "source_event_id": source_event_id,
        "event_type": event_type,
        "country": country,
        "region": None, # Pending more granular regional mapping
        "corridor": corridor,
        "actor": None,  # GDELT Doc API doesn't extract actor details; leave as NULL
        "target": None, # GDELT Doc API doesn't extract target details; leave as NULL
        "severity_raw": severity_raw,
        "source_confidence": source_confidence,
        "text_reference": title,
        "source_url": url,
        "ingestion_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source_hash": source_hash,
        "processing_version": "1.0"
    }

def normalize_sanctions_event(row):
    """
    Normalizes a single OFAC SDN row into the canonical schema.
    """
    ent_num = str(row.get("ent_num", ""))
    name = row.get("name", "")
    sdn_type = row.get("type", "UNKNOWN")
    program = row.get("program", "")
    country = row.get("country", None)
    remarks = row.get("remarks", "")
    
    event_date = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d") # OFAC file is current snapshot
    source = "OFAC_SDN"
    source_event_id = ent_num
    
    # Set event type to sanctions
    event_type = "sanctions"
    
    # Map corridor (rare for individuals, but possible for vessel names)
    corridor = map_text_to_corridor(name)
    if not corridor and pd.notnull(remarks):
        corridor = map_text_to_corridor(remarks)
        
    text_ref = f"Sanctioned Entity: {name} (Type: {sdn_type}, Program: {program})"
    if pd.notnull(remarks) and remarks != "":
        text_ref += f" - {remarks}"
        
    # Calculate source_hash
    raw_str = f"{ent_num}_{name}_{sdn_type}_{program}"
    source_hash = hashlib.sha256(raw_str.encode('utf-8')).hexdigest()
    
    # Deterministic event_id
    id_seed = f"{event_date}_{source}_{source_event_id}"
    event_id = hashlib.sha256(id_seed.encode('utf-8')).hexdigest()
    
    return {
        "event_id": event_id,
        "event_date": event_date,
        "event_time_if_available": None,
        "source": source,
        "source_event_id": source_event_id,
        "event_type": event_type,
        "country": country if pd.notnull(country) else None,
        "region": None,
        "corridor": corridor,
        "actor": "US OFAC",
        "target": name,
        "severity_raw": None,
        "source_confidence": 1.0, # OFAC list has absolute confidence
        "text_reference": text_ref,
        "source_url": "https://sanctionslistservice.ofac.treas.gov/",
        "ingestion_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source_hash": source_hash,
        "processing_version": "1.0"
    }

def normalize_and_deduplicate(gdelt_raw_list, sanctions_df):
    """
    Normalizes all records and performs deduplication:
    1. Removes exact duplicates on (source, source_event_id)
    2. Groups identical titles/URLs
    """
    normalized_events = []
    
    # 1. Normalize GDELT
    for art in gdelt_raw_list:
        normalized_events.append(normalize_gdelt_event(art))
        
    # 2. Normalize Sanctions
    if not sanctions_df.empty:
        for _, r in sanctions_df.iterrows():
            normalized_events.append(normalize_sanctions_event(r.to_dict()))
            
    if not normalized_events:
        return pd.DataFrame()
        
    df_events = pd.DataFrame(normalized_events)
    
    # Deduplication Step: Keep first row when event_id is duplicated
    before_dedup = len(df_events)
    df_events = df_events.drop_duplicates(subset=["event_id"], keep="first").reset_index(drop=True)
    after_dedup = len(df_events)
    print(f"Deduplication completed. Reduced {before_dedup} events to {after_dedup} unique records.")
    
    return df_events
