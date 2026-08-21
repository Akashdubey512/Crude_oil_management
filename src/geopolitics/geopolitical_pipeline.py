import os
import json
import datetime
import pandas as pd
import numpy as np

from src.geopolitics.gdelt import ingest_gdelt_pipeline
from src.geopolitics.sanctions import ingest_sanctions_pipeline
from src.geopolitics.event_normalizer import normalize_and_deduplicate

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(QUALITY_DIR, exist_ok=True)

def run_geopolitical_pipeline(force_live=True):
    print("================================================================================")
    # 1. Ingest Raw Event Sources
    gdelt_raw = ingest_gdelt_pipeline(force_live=force_live)
    sanctions_raw = ingest_sanctions_pipeline(force_live=force_live)
    
    # 2. Normalize and Deduplicate
    df_events = normalize_and_deduplicate(gdelt_raw, sanctions_raw)
    
    if df_events.empty:
        print("No geopolitical events ingested. Skipping signal compilation.")
        return
        
    # Save the canonical events dataset
    events_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
    df_events.to_csv(events_path, index=False)
    print(f"Saved normalized events to {events_path}")
    
    # 3. Load Staging GPR Index
    gpr_staging_path = os.path.join(STAGING_DIR, "geopolitical_risk.csv")
    if not os.path.exists(gpr_staging_path):
        raise FileNotFoundError(f"Staging geopolitical risk table not found at {gpr_staging_path}")
        
    df_gpr = pd.read_csv(gpr_staging_path)
    df_gpr['date'] = pd.to_datetime(df_gpr['date'])
    df_events['event_date_dt'] = pd.to_datetime(df_events['event_date'])
    
    # 4. Compile Daily Signals
    print("Compiling daily signals...")
    df_gpr_daily = df_gpr[df_gpr['source'] == 'Caldara-Iacoviello Daily']
    df_gpr_daily_pivot = df_gpr_daily.pivot_table(
        index='date', 
        columns='metric', 
        values='value', 
        aggfunc='first'
    ).reset_index()
    
    # Aggregate daily event signals
    # Get daily event counts by category and corridor
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
    
    # Merge Daily GPR and Daily Event Counts
    # Merge outer to preserve both GPR timelines and specific event days
    df_daily_signals = pd.merge(df_gpr_daily_pivot, df_daily_counts, on='date', how='outer')
    df_daily_signals = df_daily_signals.sort_values('date').reset_index(drop=True)
    
    # Fill event count NaNs with 0 (days without events)
    count_cols = [c for c in df_daily_signals.columns if 'count' in c]
    df_daily_signals[count_cols] = df_daily_signals[count_cols].fillna(0).astype(int)
    
    daily_signals_path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
    df_daily_signals.to_csv(daily_signals_path, index=False)
    print(f"Saved daily signals to {daily_signals_path}")
    
    # 5. Compile Monthly Signals
    print("Compiling monthly signals...")
    df_gpr_monthly = df_gpr[df_gpr['source'] == 'Caldara-Iacoviello Monthly']
    
    # Combine geography & metric to make clean column headers
    df_gpr_monthly['pivot_metric'] = df_gpr_monthly['geography'] + "_" + df_gpr_monthly['metric']
    df_gpr_monthly_pivot = df_gpr_monthly.pivot_table(
        index='date',
        columns='pivot_metric',
        values='value',
        aggfunc='first'
    ).reset_index()
    
    # Extract month start date for events
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
    print(f"Saved monthly signals to {monthly_signals_path}")
    
    # 6. Quality Control Report
    print("Running Quality Control checks...")
    run_quality_checks(df_events)

def run_quality_checks(df_events):
    """
    Evaluates GDELT & sanctions dataset quality metrics.
    Writes report to data/quality/geopolitical_intelligence_quality.json.
    """
    total_events = len(df_events)
    
    # Check duplicates
    dup_ids = int(df_events['event_id'].duplicated().sum())
    
    # Check invalid or missing dates
    missing_dates = int(df_events['event_date'].isna().sum())
    
    # Detect impossible dates
    parsed_dates = pd.to_datetime(df_events['event_date'], errors='coerce')
    today = pd.Timestamp.today()
    impossible_dates = int((parsed_dates > today).sum() + (parsed_dates < pd.Timestamp("1900-01-01")).sum())
    
    # Check missing URL for GDELT
    gdelt_events = df_events[df_events['source'] == 'GDELT']
    missing_urls = int(gdelt_events['source_url'].isna().sum())
    
    # Unmapped corridors (count and percentage)
    unmapped_corridors = int(df_events['corridor'].isna().sum())
    unmapped_corridors_pct = (unmapped_corridors / total_events) * 100 if total_events > 0 else 0
    
    # Missing provenance checks
    missing_provenance = int(df_events['source_hash'].isna().sum() + df_events['ingestion_timestamp'].isna().sum())
    
    # Suspicious event volumes (> 50 events on a single day)
    daily_volumes = df_events.groupby('event_date').size()
    suspicious_volume_days = daily_volumes[daily_volumes > 50].to_dict()
    
    # Category statistics
    category_counts = df_events['event_type'].value_counts().to_dict()
    
    # Corridor statistics
    corridor_counts = df_events['corridor'].value_counts(dropna=False).to_dict()
    # Convert NaN key to string for JSON serialization
    if None in corridor_counts:
        corridor_counts["UNMAPPED"] = corridor_counts.pop(None)
    if np.nan in corridor_counts:
        corridor_counts["UNMAPPED"] = corridor_counts.pop(np.nan)
        
    quality_report = {
        "report_timestamp": datetime.datetime.utcnow().isoformat(),
        "status": "PASS" if dup_ids == 0 and missing_dates == 0 and impossible_dates == 0 else "WARNING",
        "metrics": {
            "total_events": total_events,
            "duplicate_event_ids": dup_ids,
            "missing_dates": missing_dates,
            "impossible_dates": impossible_dates,
            "gdelt_missing_urls": missing_urls,
            "unmapped_corridors_count": unmapped_corridors,
            "unmapped_corridors_pct": round(unmapped_corridors_pct, 2),
            "missing_provenance_records": missing_provenance,
            "days_with_suspicious_volume_count": len(suspicious_volume_days)
        },
        "breakdown": {
            "categories": category_counts,
            "corridors": corridor_counts
        },
        "anomalies": {
            "suspicious_volume_days": {str(k): int(v) for k, v in suspicious_volume_days.items()}
        }
    }
    
    quality_path = os.path.join(QUALITY_DIR, "geopolitical_intelligence_quality.json")
    with open(quality_path, 'w', encoding='utf-8') as f:
        json.dump(quality_report, f, indent=2)
    print(f"Saved Quality Control report to {quality_path}")
