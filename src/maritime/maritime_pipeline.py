import os
import json
import pandas as pd
import numpy as np
import datetime
import hashlib

from src.maritime.corridors import build_corridor_geojson
from src.maritime.infrastructure import build_infrastructure_registry
from src.maritime.supply_network import build_supply_network
from src.maritime.ais_client import ingest_vessel_observations
from src.maritime.portwatch import ingest_portwatch_pipeline
from src.maritime.anomaly_detection import detect_traffic_anomalies

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"
MANIFEST_DIR = r"D:\hackathon project\energy-resilience\data\manifests"
GEO_DIR = r"D:\hackathon project\energy-resilience\data\geo"

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(QUALITY_DIR, exist_ok=True)

def run_maritime_pipeline(force_live=True):
    print("================================================================================")
    print("Executing Phase 3 Maritime, Port & Energy Corridor Ingestion & Validation Pipeline")
    print("================================================================================")
    
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # 1. Build Corridors GeoJSON and Tabular CSV
    build_corridor_geojson()
    
    # 2. Build Infrastructure Registry
    build_infrastructure_registry()
    
    # 3. Build Supply Network Nodes and Edges
    build_supply_network()
    
    # 4. Ingest AIS Vessel Observations (resilient GFW client)
    df_vessels = ingest_vessel_observations()
    vessels_csv_path = os.path.join(PROCESSED_DIR, "vessel_observations.csv")
    df_vessels.to_csv(vessels_csv_path, index=False)
    print(f"Saved vessel observations to {vessels_csv_path}")
    
    # 5. Ingest PortWatch Daily Transit Data
    df_traffic = ingest_portwatch_pipeline(force_live=force_live)
    traffic_csv_path = os.path.join(PROCESSED_DIR, "corridor_traffic_daily.csv")
    df_traffic.to_csv(traffic_csv_path, index=False)
    print(f"Saved daily corridor traffic to {traffic_csv_path}")
    
    # 6. Execute Anomaly Detection
    df_anomalies = detect_traffic_anomalies(df_traffic)
    anomalies_csv_path = os.path.join(PROCESSED_DIR, "corridor_anomalies.csv")
    df_anomalies.to_csv(anomalies_csv_path, index=False)
    print(f"Saved corridor anomalies to {anomalies_csv_path}")
    
    # 7. Link Phase 2 Geopolitical Events to Corridors
    print("Linking geopolitical events to corridors...")
    link_events_to_corridors()
    
    # 8. Run Geospatial & Tabular Quality Checks
    print("Executing quality control audits...")
    run_quality_audit()
    
    # 9. Update Lineage Manifest
    print("Updating processed datasets manifest...")
    update_lineage_manifest()

def link_events_to_corridors():
    """
    Links Phase 2 events to corridors based on the mapped corridor identifier.
    Writes outputs to D:\\hackathon project\\energy-resilience\\data\\processed\\event_corridor_links.csv.
    """
    events_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
    output_path = os.path.join(PROCESSED_DIR, "event_corridor_links.csv")
    
    if not os.path.exists(events_path):
        print("  [WARNING] geopolitical_events.csv not found. Writing empty event links.")
        df_empty = pd.DataFrame(columns=[
            "link_id", "event_id", "event_date", "source", "event_type", 
            "corridor_id", "text_reference", "source_url"
        ])
        df_empty.to_csv(output_path, index=False)
        return
        
    df_events = pd.read_csv(events_path)
    
    # Filter for events mapped to a corridor
    df_linked = df_events[df_events["corridor"].notna()].copy()
    
    records = []
    for _, row in df_linked.iterrows():
        # Generate link id
        seed = f"{row['event_id']}_{row['corridor']}"
        link_id = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:16]
        records.append({
            "link_id": link_id,
            "event_id": row["event_id"],
            "event_date": row["event_date"],
            "source": row["source"],
            "event_type": row["event_type"],
            "corridor_id": row["corridor"],
            "text_reference": row["text_reference"],
            "source_url": row["source_url"]
        })
        
    df_links = pd.DataFrame(records)
    if df_links.empty:
        df_links = pd.DataFrame(columns=[
            "link_id", "event_id", "event_date", "source", "event_type", 
            "corridor_id", "text_reference", "source_url"
        ])
        
    df_links.to_csv(output_path, index=False)
    print(f"  Saved {len(df_links)} linked events to {output_path}")

def run_quality_audit():
    """
    Validates coordinates, duplicates, and geometry properties.
    Writes report to data/quality/maritime_intelligence_quality.json.
    """
    report = {
        "report_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "PASS",
        "failures": []
    }
    
    # 1. Validate Infrastructure coordinates
    inf_path = os.path.join(PROCESSED_DIR, "energy_infrastructure.csv")
    if os.path.exists(inf_path):
        df_inf = pd.read_csv(inf_path)
        lat_errors = ((df_inf["latitude"] < -90) | (df_inf["latitude"] > 90)).sum()
        lon_errors = ((df_inf["longitude"] < -180) | (df_inf["longitude"] > 180)).sum()
        dup_names = df_inf.duplicated(subset=["name", "facility_type"]).sum()
        
        if lat_errors > 0 or lon_errors > 0:
            report["status"] = "FAIL"
            report["failures"].append(f"Infrastructure coordinates out of range: {lat_errors} lat, {lon_errors} lon")
        if dup_names > 0:
            report["failures"].append(f"Duplicate infrastructure facility entries found: {dup_names}")
            
    # 2. Validate Corridors GeoJSON geometry
    geo_path = os.path.join(GEO_DIR, "energy_corridors.geojson")
    if os.path.exists(geo_path):
        try:
            with open(geo_path, "r", encoding="utf-8") as f:
                geojson = json.load(f)
            assert geojson.get("type") == "FeatureCollection"
            for feat in geojson.get("features", []):
                assert feat.get("type") == "Feature"
                geom = feat.get("geometry", {})
                assert geom.get("type") == "Polygon"
                ring = geom.get("coordinates", [[]])[0]
                assert len(ring) >= 4 # Polygon must have at least 4 coordinates (triangle + closed point)
                assert ring[0] == ring[-1] # Polygon ring must be closed
        except Exception as e:
            report["status"] = "FAIL"
            report["failures"].append(f"GeoJSON validation failed: {e}")
            
    # 3. Validate Vessel timestamps and duplicates
    vessel_path = os.path.join(PROCESSED_DIR, "vessel_observations.csv")
    if os.path.exists(vessel_path):
        df_ves = pd.read_csv(vessel_path)
        if not df_ves.empty:
            # Check duplicates on MMSI + Timestamp
            dup_ves = df_ves.duplicated(subset=["mmsi", "timestamp"]).sum()
            if dup_ves > 0:
                report["failures"].append(f"Duplicate vessel observations found: {dup_ves}")
                
    # 4. Save validation report
    quality_path = os.path.join(QUALITY_DIR, "maritime_intelligence_quality.json")
    with open(quality_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"  Saved maritime quality audit report to {quality_path}")

def update_lineage_manifest():
    """
    Appends Phase 3 processed datasets into manifests/processed_manifest.json,
    preserving Phase 1 staging details.
    """
    manifest_path = os.path.join(MANIFEST_DIR, "processed_manifest.json")
    
    manifest_data = {}
    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r") as f:
                manifest_data = json.load(f)
        except Exception:
            pass
            
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Files to register
    files_to_track = [
        ("energy_corridors.csv", "authoritative maritime corridors tabular mapping"),
        ("energy_infrastructure.csv", "ports, refineries, and SPR coordinates and capacities"),
        ("vessel_observations.csv", "AIS vessel observations dataset"),
        ("corridor_traffic_daily.csv", "daily transit volume counts from IMF PortWatch"),
        ("corridor_anomalies.csv", "rolling deviations and data availability signals"),
        ("event_corridor_links.csv", "links mapping geopolitical events to corridors")
    ]
    
    for fn, desc in files_to_track:
        fpath = os.path.join(PROCESSED_DIR, fn)
        if os.path.exists(fpath):
            df = pd.read_csv(fpath)
            
            # Compute hash of the processed file
            with open(fpath, "rb") as f:
                file_hash = hashlib.sha256(f.read()).hexdigest()
                
            manifest_data[fn] = {
                "description": desc,
                "row_count": len(df),
                "column_count": len(df.columns),
                "columns": list(df.columns),
                "file_hash": file_hash,
                "last_modified": timestamp,
                "source": "Derived / Phase 3 Pipeline",
                "transformation_version": 1.0
            }
            
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)
    print(f"  Successfully updated lineage manifest at {manifest_path}")
