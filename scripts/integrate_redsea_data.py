"""
Phase 10 — Red Sea Data Integration Script

Tasks:
1. Load Daily_Chokepoints_Data.csv from D:\\hackathon project.
2. Extract chokepoint4 (Bab el-Mandeb) daily transit counts to act as the RED_SEA corridor traffic proxy.
3. Merge this RED_SEA traffic into data/processed/corridor_traffic_daily.csv.
4. Run detect_traffic_anomalies on the updated traffic DataFrame and save to corridor_anomalies.csv.
5. Ingest Red Sea Incident reports (Galaxy Leader, Cordelia Moon, etc.) and GDELT Red Sea events.
6. Append these events to data/processed/geopolitical_events.csv.
7. Re-run geopolitical daily/monthly signal compilation to build updated signal matrices.
8. Update event_corridor_links.csv.
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
import datetime
import hashlib
import pandas as pd
import numpy as np

BASE_DIR = r"D:\hackathon project\energy-resilience"
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")
STAGING_DIR = os.path.join(BASE_DIR, "data", "staging")
RAW_DIR = os.path.join(BASE_DIR, "data", "raw")

DAILY_CHOKEPOINTS_PATH = r"D:\hackathon project\Daily_Chokepoints_Data.csv"
GDELT_REDSEA_PATH = r"D:\hackathon project\GDELT_RedSea_Geopolitical_Events_2024_2026 (2).csv"
INCIDENTS_F1 = r"D:\hackathon project\Red_Sea_Incidents_Report_for_Member_States_12_09_2024.csv"
INCIDENTS_F2 = r"D:\hackathon project\Red_Sea_Incidents_MS_version_25-11-24.csv"


def integrate_traffic():
    print("\n--- 1. Integrating PortWatch Traffic Data ---")
    if not os.path.exists(DAILY_CHOKEPOINTS_PATH):
        print(f"[ERROR] PortWatch CSV not found at {DAILY_CHOKEPOINTS_PATH}")
        return False
        
    df_raw_pw = pd.read_csv(DAILY_CHOKEPOINTS_PATH, parse_dates=["date"])
    print(f"Loaded Daily_Chokepoints_Data.csv: {len(df_raw_pw):,} rows")
    
    # Filter for chokepoint4 (Bab el-Mandeb Strait) as the RED_SEA proxy
    df_bab = df_raw_pw[df_raw_pw["portid"] == "chokepoint4"].copy()
    print(f"Extracted Bab el-Mandeb (chokepoint4) rows: {len(df_bab)}")
    
    # Map to RED_SEA
    df_rs_traffic = pd.DataFrame({
        "date": df_bab["date"].dt.strftime("%Y-%m-%d"),
        "corridor_id": "RED_SEA",
        "portid": "RED_SEA",
        "portname": "Red Sea Corridor",
        "vessel_count": df_bab["n_total"].astype(float),
        "tanker_count": df_bab["n_tanker"].astype(float),
        "cargo_count": df_bab["n_cargo"].astype(float),
        "capacity_tanker": df_bab["capacity_tanker"].astype(float),
        "capacity_total": df_bab["capacity"].astype(float),
        "source": "IMF PortWatch Daily_Chokepoints_Data Proxy",
        "source_url": "https://portwatch.imf.org/",
        "retrieval_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "processing_version": 1.0
    })
    
    # Load existing traffic file
    traffic_csv_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    if os.path.exists(traffic_csv_path):
        df_existing = pd.read_csv(traffic_csv_path)
        print(f"Existing corridor_traffic_daily.csv: {len(df_existing)} rows")
        # Remove any existing RED_SEA rows
        df_existing = df_existing[df_existing["corridor_id"] != "RED_SEA"]
        df_new_traffic = pd.concat([df_existing, df_rs_traffic], ignore_index=True)
    else:
        df_new_traffic = df_rs_traffic
        
    # Sort and write back
    df_new_traffic = df_new_traffic.sort_values(["corridor_id", "date"]).reset_index(drop=True)
    df_new_traffic.to_csv(traffic_csv_path, index=False)
    print(f"Saved merged traffic to {traffic_csv_path} ({len(df_new_traffic)} rows)")
    
    # Re-run anomaly detection
    from src.maritime.anomaly_detection import detect_traffic_anomalies
    print("Running traffic anomaly detection...")
    df_anomalies = detect_traffic_anomalies(df_new_traffic)
    anomalies_csv_path = os.path.join(PROCESSED_DIR, "corridor_anomalies.csv")
    df_anomalies.to_csv(anomalies_csv_path, index=False)
    print(f"Saved anomalies to {anomalies_csv_path} ({len(df_anomalies)} rows)")
    return True


def parse_incident_date(date_str):
    if not isinstance(date_str, str):
        return None
    date_str = date_str.strip()
    import re
    # Handle ranges like "26-27 Nov 2023"
    match = re.match(r"(\d+)-(\d+)\s+([A-Za-z]+)\s+(\d{4})", date_str)
    if match:
        day_start, day_end, month, year = match.groups()
        date_str = f"{day_start} {month} {year}"
    for fmt in ["%d %b %Y", "%d %B %Y", "%d-%b-%Y", "%Y-%m-%d"]:
        try:
            return datetime.datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    try:
        from dateutil import parser
        if "-" in date_str:
            date_str = date_str.split("-")[0] + " " + " ".join(date_str.split()[-2:])
        return parser.parse(date_str).date()
    except Exception:
        pass
    return None


def integrate_geopolitical_events():
    print("\n--- 2. Integrating Geopolitical Events ---")
    
    events = []
    
    # 1. Parse Member State Incident Reports (Nov 2023 - Oct 2024)
    for fn in [INCIDENTS_F1, INCIDENTS_F2]:
        if os.path.exists(fn):
            df = pd.read_csv(fn, encoding="utf-8", on_bad_lines='skip')
            print(f"Loaded {os.path.basename(fn)}: {len(df)} rows")
            for idx, row in df.iterrows():
                raw_date = row.get("Date")
                parsed_date = parse_incident_date(raw_date)
                if parsed_date is None:
                    continue
                    
                ship = str(row.get("Ship Name", "Unknown"))
                desc = str(row.get("Brief Description", ""))
                ship_type = str(row.get("Type", "")).lower()
                
                # Determine event type
                if "tanker" in ship_type:
                    event_type = "tanker attack"
                elif any(x in ship_type for x in ["cargo", "carrier", "container", "vehicle", "ro-ro"]):
                    event_type = "shipping disruption"
                else:
                    event_type = "maritime security incident"
                    
                # Generate unique hash
                seed = f"{parsed_date}_{ship}_{idx}"
                event_id = hashlib.sha256(seed.encode("utf-8")).hexdigest()
                
                events.append({
                    "event_id": event_id,
                    "event_date": str(parsed_date),
                    "event_time_if_available": None,
                    "source": "IMO Member States Incident Report",
                    "source_event_id": str(row.get("No", idx)),
                    "event_type": event_type,
                    "country": str(row.get("Flag", "Unknown")),
                    "region": "Southern Red Sea",
                    "corridor": "RED_SEA",
                    "actor": "Houthis",
                    "target": ship,
                    "severity_raw": 5.0, # Highly severe
                    "source_confidence": 1.0,
                    "text_reference": desc,
                    "source_url": str(row.get("Links to Houthis", "")),
                    "ingestion_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "source_hash": hashlib.md5(desc.encode("utf-8")).hexdigest(),
                    "processing_version": 1.0
                })
                
    # 2. Parse GDELT Red Sea Geopolitical Events (2023 - 2026)
    if os.path.exists(GDELT_REDSEA_PATH):
        df_gdelt = pd.read_csv(GDELT_REDSEA_PATH, on_bad_lines='skip')
        print(f"Loaded {os.path.basename(GDELT_REDSEA_PATH)}: {len(df_gdelt):,} rows")
        for idx, row in df_gdelt.iterrows():
            sqldate = str(row.get("SQLDATE"))
            try:
                parsed_date = datetime.datetime.strptime(sqldate, "%Y%m%d").date()
            except Exception:
                continue
                
            root_code = int(row.get("EventRootCode", 0))
            event_code = str(row.get("EventCode", ""))
            
            # Map EventRootCode to our taxonomy
            if root_code in [18, 19]:
                event_type = "armed conflict"
            elif root_code == 13:
                event_type = "military escalation"
            elif root_code == 17:
                event_type = "sanctions"
            else:
                event_type = "UNKNOWN"
                
            # Filter only key relevant event types to avoid noise overload
            if event_type == "UNKNOWN":
                continue
                
            seed = f"{parsed_date}_{event_code}_{idx}"
            event_id = hashlib.sha256(seed.encode("utf-8")).hexdigest()
            
            ref = f"GDELT Event {event_code} between {row.get('Actor1CountryCode','None')} and {row.get('Actor2CountryCode','None')} in {row.get('ActionGeo_CountryCode','None')}"
            
            events.append({
                "event_id": event_id,
                "event_date": str(parsed_date),
                "event_time_if_available": None,
                "source": "GDELT Red Sea Download",
                "source_event_id": f"gdelt_{idx}",
                "event_type": event_type,
                "country": str(row.get("ActionGeo_CountryCode", "")),
                "region": "Red Sea Corridor",
                "corridor": "RED_SEA",
                "actor": str(row.get("Actor1CountryCode", "")),
                "target": str(row.get("Actor2CountryCode", "")),
                "severity_raw": float(row.get("GoldsteinScale", 0.0)),
                "source_confidence": 0.8,
                "text_reference": ref,
                "source_url": None,
                "ingestion_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "source_hash": hashlib.md5(ref.encode("utf-8")).hexdigest(),
                "processing_version": 1.0
            })
            
    df_new_events = pd.DataFrame(events)
    print(f"Extracted {len(df_new_events)} new Red Sea geopolitical events.")
    
    # Load existing geopolitical events
    events_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
    if os.path.exists(events_path):
        df_existing_events = pd.read_csv(events_path)
        print(f"Existing geopolitical_events.csv: {len(df_existing_events)} rows")
        # Remove any existing RED_SEA events to avoid duplicates
        df_existing_events = df_existing_events[df_existing_events["corridor"] != "RED_SEA"]
        df_merged_events = pd.concat([df_existing_events, df_new_events], ignore_index=True)
    else:
        df_merged_events = df_new_events
        
    df_merged_events.to_csv(events_path, index=False)
    print(f"Saved merged events to {events_path} ({len(df_merged_events)} rows)")
    
    # Compile daily and monthly signals
    print("Re-compiling daily and monthly signals...")
    compile_signals(df_merged_events)
    
    # Link events to corridors
    from src.maritime.maritime_pipeline import link_events_to_corridors
    link_events_to_corridors()
    return True


def compile_signals(df_events):
    df_events = df_events.copy()
    gpr_staging_path = os.path.join(STAGING_DIR, "geopolitical_risk.csv")
    df_gpr = pd.read_csv(gpr_staging_path)
    df_gpr['date'] = pd.to_datetime(df_gpr['date'])
    df_events['event_date_dt'] = pd.to_datetime(df_events['event_date'])
    
    # Compile daily signals
    df_gpr_daily = df_gpr[df_gpr['source'] == 'Caldara-Iacoviello Daily']
    df_gpr_daily_pivot = df_gpr_daily.pivot_table(
        index='date', 
        columns='metric', 
        values='value', 
        aggfunc='first'
    ).reset_index()
    
    df_daily_counts = df_events.groupby('event_date_dt').agg(
        event_count=('event_id', 'count'),
        sanctions_event_count=('event_type', lambda x: (x == 'sanctions').sum()),
        maritime_incident_count=('event_type', lambda x: x.isin(['tanker attack', 'maritime security incident', 'shipping disruption']).sum()),
        conflict_event_count=('event_type', lambda x: x.isin(['armed conflict', 'military escalation', 'infrastructure attack']).sum()),
        escalation_event_count=('event_type', lambda x: x.isin(['military escalation', 'diplomatic escalation']).sum()),
        hormuz_event_count=('corridor', lambda x: (x == 'HORMUZ').sum()),
        red_sea_event_count=('corridor', lambda x: (x == 'RED_SEA').sum()),
        bab_el_mandeb_event_count=('corridor', lambda x: (x == 'BAB_EL_MANDEB').sum()),
        suez_event_count=('corridor', lambda x: (x == 'SUEZ').sum())
    ).reset_index().rename(columns={'event_date_dt': 'date'})
    
    df_daily_signals = pd.merge(df_gpr_daily_pivot, df_daily_counts, on='date', how='outer')
    df_daily_signals = df_daily_signals.sort_values('date').reset_index(drop=True)
    count_cols = [c for c in df_daily_signals.columns if 'count' in c]
    df_daily_signals[count_cols] = df_daily_signals[count_cols].fillna(0).astype(int)
    
    daily_signals_path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
    df_daily_signals.to_csv(daily_signals_path, index=False)
    print(f"  Saved daily signals to {daily_signals_path}")
    
    # Compile monthly signals
    df_gpr_monthly = df_gpr[df_gpr['source'] == 'Caldara-Iacoviello Monthly']
    df_gpr_monthly['pivot_metric'] = df_gpr_monthly['geography'] + "_" + df_gpr_monthly['metric']
    df_gpr_monthly_pivot = df_gpr_monthly.pivot_table(
        index='date',
        columns='pivot_metric',
        values='value',
        aggfunc='first'
    ).reset_index()
    
    df_events['month_start'] = df_events['event_date_dt'].dt.to_period('M').dt.to_timestamp()
    df_monthly_counts = df_events.groupby('month_start').agg(
        event_count=('event_id', 'count'),
        sanctions_event_count=('event_type', lambda x: (x == 'sanctions').sum()),
        maritime_incident_count=('event_type', lambda x: x.isin(['tanker attack', 'maritime security incident', 'shipping disruption']).sum()),
        conflict_event_count=('event_type', lambda x: x.isin(['armed conflict', 'military escalation', 'infrastructure attack']).sum()),
        escalation_event_count=('event_type', lambda x: x.isin(['military escalation', 'diplomatic escalation']).sum()),
        hormuz_event_count=('corridor', lambda x: (x == 'HORMUZ').sum()),
        red_sea_event_count=('corridor', lambda x: (x == 'RED_SEA').sum()),
        bab_el_mandeb_event_count=('corridor', lambda x: (x == 'BAB_EL_MANDEB').sum()),
        suez_event_count=('corridor', lambda x: (x == 'SUEZ').sum())
    ).reset_index().rename(columns={'month_start': 'date'})
    
    df_monthly_signals = pd.merge(df_gpr_monthly_pivot, df_monthly_counts, on='date', how='outer')
    df_monthly_signals = df_monthly_signals.sort_values('date').reset_index(drop=True)
    df_monthly_signals[count_cols] = df_monthly_signals[count_cols].fillna(0).astype(int)
    
    monthly_signals_path = os.path.join(PROCESSED_DIR, "geopolitical_monthly_signals.csv")
    df_monthly_signals.to_csv(monthly_signals_path, index=False)
    print(f"  Saved monthly signals to {monthly_signals_path}")


if __name__ == "__main__":
    t_ok = integrate_traffic()
    e_ok = integrate_geopolitical_events()
    if t_ok and e_ok:
        print("\n✓ Red Sea Data Integration Completed Successfully!")
    else:
        print("\n[ERROR] Red Sea Data Integration Failed!")
