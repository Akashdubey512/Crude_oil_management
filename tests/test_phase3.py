"""
Phase 3 Test Suite — Maritime, Port & Energy Corridor Intelligence
Tests:
  - Corridor polygon geometry bounds and closure
  - Infrastructure registry coordinates and capacity types
  - Coordinate validation bounds
  - Vessel observations schema (when no token)
  - Point-in-polygon corridor assignment correctness
  - Event-corridor linkage integrity
  - Anomaly calculation baseline correctness (median/std)
  - Quality report schema and values
"""
import os
import sys
import json
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.maritime.corridors import (
    CORRIDOR_GEOMETRIES,
    match_point_to_corridor,
    is_point_in_polygon
)
from src.maritime.anomaly_detection import detect_traffic_anomalies
from src.maritime.ais_client import VESSEL_SCHEMA_COLS

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
GEO_DIR = r"D:\hackathon project\energy-resilience\data\geo"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"

# ===========================================================================
# SECTION 1: Corridor Polygon Geometries
# ===========================================================================
class TestCorridorGeometries:
    def test_polygon_ring_closure(self):
        """Every corridor polygon ring must be closed (first coordinate equals last)."""
        for cid, data in CORRIDOR_GEOMETRIES.items():
            ring = data["coordinates"][0]
            assert len(ring) >= 4, f"{cid} polygon ring must have at least 4 points"
            assert ring[0] == ring[-1], f"{cid} polygon ring is not closed: {ring[0]} != {ring[-1]}"
            
    def test_coordinate_validity_bounds(self):
        """Corridor coordinates must be in standard WGS 84 bounds [Lon, Lat]."""
        for cid, data in CORRIDOR_GEOMETRIES.items():
            ring = data["coordinates"][0]
            for coord in ring:
                lon, lat = coord
                assert -180 <= lon <= 180, f"{cid} longitude {lon} out of range"
                assert -90 <= lat <= 90, f"{cid} latitude {lat} out of range"


# ===========================================================================
# SECTION 2: Point-In-Polygon Corridor Assignment
# ===========================================================================
class TestPointInPolygonAssignment:
    def test_point_in_suez(self):
        # Suez chokepoint centroid (~30.5° N, 32.5° E)
        assert match_point_to_corridor(30.2, 32.4) == "SUEZ"
        
    def test_point_in_hormuz(self):
        # Hormuz centroid (~26.5° N, 56.5° E)
        assert match_point_to_corridor(26.5, 56.2) == "HORMUZ"
        
    def test_point_in_bab_el_mandeb(self):
        # Bab-el-Mandeb centroid (~12.8° N, 43.3° E)
        assert match_point_to_corridor(12.7, 43.3) == "BAB_EL_MANDEB"
        
    def test_point_outside_corridors(self):
        # Point in the middle of the Indian Ocean
        assert match_point_to_corridor(0.0, 80.0) is None


# ===========================================================================
# SECTION 3: Infrastructure Registry
# ===========================================================================
class TestInfrastructureRegistry:
    def test_infrastructure_file_and_schema(self):
        inf_path = os.path.join(PROCESSED_DIR, "energy_infrastructure.csv")
        assert os.path.exists(inf_path), "energy_infrastructure.csv not found"
        df = pd.read_csv(inf_path)
        
        # Verify required columns
        required_cols = [
            "facility_id", "name", "facility_type", "operator", "country", 
            "state", "latitude", "longitude", "capacity", "unit", "source", 
            "source_hash", "retrieval_timestamp", "processing_version"
        ]
        for col in required_cols:
            assert col in df.columns, f"Missing required column {col} in infrastructure registry"
            
        # Coordinates range checks
        assert ((df["latitude"] < -90) | (df["latitude"] > 90)).sum() == 0
        assert ((df["longitude"] < -180) | (df["longitude"] > 180)).sum() == 0
        
        # Check facility types
        valid_types = {"port", "refinery", "spr"}
        assert set(df["facility_type"].unique()).issubset(valid_types)


# ===========================================================================
# SECTION 4: Supply Network Edge Consistency
# ===========================================================================
class TestSupplyNetwork:
    def test_supply_network_edges(self):
        edges_path = os.path.join(PROCESSED_DIR, "supply_network_edges.csv")
        assert os.path.exists(edges_path)
        df_edges = pd.read_csv(edges_path)
        
        assert len(df_edges) > 0
        required_cols = ["source_node", "target_node", "edge_type", "description"]
        for col in required_cols:
            assert col in df_edges.columns
            
        # Check source/target nodes are non-empty
        assert df_edges["source_node"].isna().sum() == 0
        assert df_edges["target_node"].isna().sum() == 0


# ===========================================================================
# SECTION 5: Vessel Observations Schema (Resilient Ingestion)
# ===========================================================================
class TestVesselObservations:
    def test_vessel_obs_schema(self):
        vessel_path = os.path.join(PROCESSED_DIR, "vessel_observations.csv")
        assert os.path.exists(vessel_path)
        df_ves = pd.read_csv(vessel_path)
        
        # Even if empty (due to missing token), columns must match canonical schema
        for col in VESSEL_SCHEMA_COLS:
            assert col in df_ves.columns, f"Missing column {col} in vessel observations"


# ===========================================================================
# SECTION 6: Anomaly Detection Logic
# ===========================================================================
class TestAnomalyDetection:
    def test_anomaly_calculation(self):
        # Create a mock dataset covering 35 days for a single corridor
        dates = pd.date_range(start="2024-01-01", periods=35, freq="D").strftime("%Y-%m-%d").tolist()
        
        # Stable baseline counts (e.g. 10 tankers/day)
        tanker_counts = [10] * 34 + [1] # Day 35 is a major drop (anomaly)
        
        mock_data = pd.DataFrame({
            "date": dates,
            "corridor_id": ["HORMUZ"] * 35,
            "portid": ["chokepoint6"] * 35,
            "portname": ["Strait of Hormuz"] * 35,
            "vessel_count": [25] * 35,
            "tanker_count": tanker_counts,
            "cargo_count": [15] * 35,
            "capacity_tanker": [500000] * 35,
            "capacity_total": [1000000] * 35,
            "source": ["Mock"] * 35,
            "source_url": ["Mock"] * 35,
            "retrieval_timestamp": ["Mock"] * 35,
            "processing_version": [1.0] * 35
        })
        
        df_anomalies = detect_traffic_anomalies(mock_data)
        
        # Verify columns
        assert "rolling_median_28d" in df_anomalies.columns
        assert "rolling_std_28d" in df_anomalies.columns
        assert "anomaly_flag" in df_anomalies.columns
        assert "data_availability" in df_anomalies.columns
        
        # Day 35 must flag an anomaly traffic drop
        last_row = df_anomalies.iloc[-1]
        assert last_row["anomaly_flag"] == True
        assert last_row["anomaly_type"] == "TRAFFIC_DROP"
        
    def test_no_observation_distinction(self):
        # Test timeline reindexing creating gaps (NO_OBSERVATION)
        mock_data = pd.DataFrame({
            "date": ["2024-01-01", "2024-01-03"], # Missing Jan 2nd
            "corridor_id": ["HORMUZ", "HORMUZ"],
            "portid": ["chokepoint6", "chokepoint6"],
            "portname": ["Strait of Hormuz", "Strait of Hormuz"],
            "vessel_count": [20, 22],
            "tanker_count": [10, 11],
            "cargo_count": [10, 11],
            "capacity_tanker": [500000, 500000],
            "capacity_total": [1000000, 1000000],
            "source": ["Mock", "Mock"],
            "source_url": ["Mock", "Mock"],
            "retrieval_timestamp": ["Mock", "Mock"],
            "processing_version": [1.0, 1.0]
        })
        
        df_anomalies = detect_traffic_anomalies(mock_data)
        
        # Timeline must have 3 days: Jan 1, Jan 2, Jan 3
        assert len(df_anomalies) == 3
        
        # Jan 2 must be labeled as NO_OBSERVATION
        jan2_row = df_anomalies[df_anomalies["date"] == "2024-01-02"].iloc[0]
        assert jan2_row["data_availability"] == "NO_OBSERVATION"
        assert pd.isnull(jan2_row["tanker_count"])
        assert jan2_row["anomaly_type"] == "UNKNOWN"


# ===========================================================================
# SECTION 7: Event-Corridor Linkage
# ===========================================================================
class TestEventCorridorLinkage:
    def test_event_links_file(self):
        link_path = os.path.join(PROCESSED_DIR, "event_corridor_links.csv")
        assert os.path.exists(link_path)
        df_links = pd.read_csv(link_path)
        
        # Link details checks
        required_cols = ["link_id", "event_id", "event_date", "source", "event_type", "corridor_id", "text_reference"]
        for col in required_cols:
            assert col in df_links.columns
            
        if len(df_links) > 0:
            # Corridor IDs must match canonical list
            valid_corridors = {"HORMUZ", "RED_SEA", "BAB_EL_MANDEB", "SUEZ"}
            assert set(df_links["corridor_id"].unique()).issubset(valid_corridors)


# ===========================================================================
# SECTION 8: Quality Audit Report
# ===========================================================================
class TestQualityAuditReport:
    def test_quality_json_report(self):
        quality_path = os.path.join(QUALITY_DIR, "maritime_intelligence_quality.json")
        assert os.path.exists(quality_path)
        with open(quality_path) as f:
            report = json.load(f)
            
        assert "status" in report
        assert "failures" in report
        assert report["status"] == "PASS"
