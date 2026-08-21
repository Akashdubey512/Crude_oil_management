"""
Phase 2 Test Suite — Geopolitical Intelligence Layer
Tests:
  - GDELT raw data caching and loader fallback
  - Event normalization and schema properties
  - Taxonomy classification (keywords to categories)
  - Chokepoint/corridor text matching
  - OFAC SDN sanctions parsing and merge logic
  - Event deduplication (unique event_ids)
  - Daily/monthly temporal signal aggregation
  - Quality report schema and values
"""
import os
import sys
import json
import pandas as pd
import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.geopolitics.gdelt import ingest_gdelt_pipeline
from src.geopolitics.sanctions import ingest_sanctions_pipeline
from src.geopolitics.corridor_mapping import map_text_to_corridor, CORRIDORS
from src.geopolitics.event_classifier import classify_event
from src.geopolitics.event_normalizer import (
    normalize_gdelt_event,
    normalize_sanctions_event,
    normalize_and_deduplicate,
)

PROCESSED_DIR = r"D:\hackathon project\energy-resilience\data\processed"
STAGING_DIR = r"D:\hackathon project\energy-resilience\data\staging"
QUALITY_DIR = r"D:\hackathon project\energy-resilience\data\quality"

# ===========================================================================
# SECTION 1: Event Taxonomy Classification
# ===========================================================================
class TestEventClassification:
    def test_classify_tanker_attack(self):
        assert classify_event("Houthi forces launch tanker attack in Red Sea") == "tanker attack"
        
    def test_classify_sanctions(self):
        assert classify_event("US imposes new sanctions on Russian oil exporters") == "sanctions"
        
    def test_classify_pipeline_disruption(self):
        assert classify_event("Explosion leads to pipeline blast in East Europe") == "pipeline disruption"
        
    def test_classify_refinery_disruption(self):
        assert classify_event("Refinery fire shuts down processing in Jamnagar") == "refinery disruption"
        
    def test_classify_unknown(self):
        # Text with no matching keyword should return UNKNOWN, not a forced class
        assert classify_event("Strait of Hormuz remains quiet today") == "UNKNOWN"


# ===========================================================================
# SECTION 2: Corridor Mapping
# ===========================================================================
class TestCorridorMapping:
    def test_map_hormuz(self):
        assert map_text_to_corridor("Tensions rise near Strait of Hormuz") == "HORMUZ"
        
    def test_map_red_sea(self):
        assert map_text_to_corridor("Vessel reporting drone attack in the Southern Red Sea") == "RED_SEA"
        
    def test_map_bab_el_mandeb(self):
        assert map_text_to_corridor("Cargo ship transits the Bab el Mandeb strait safely") == "BAB_EL_MANDEB"
        
    def test_map_suez(self):
        assert map_text_to_corridor("Suez Canal traffic reports 10 percent volume decline") == "SUEZ"
        
    def test_map_no_corridor(self):
        assert map_text_to_corridor("Oil tankers arrive at port of Mumbai") is None

    def test_corridor_coordinates_are_pending(self):
        """Geographic coordinates must be None / pending acquisition as instructed."""
        for cid, meta in CORRIDORS.items():
            assert meta["latitude"] is None, f"{cid} latitude must be pending/None"
            assert meta["longitude"] is None, f"{cid} longitude must be pending/None"


# ===========================================================================
# SECTION 3: Normalizer and Schema Validation
# ===========================================================================
class TestEventNormalizer:
    def test_normalize_gdelt_event_schema(self):
        art = {
            "title": "Drone hits crude oil tanker in Red Sea",
            "url": "https://example.com/tanker-incident",
            "seendate": "20240821T153000Z",
            "sourcecountry": "India"
        }
        event = normalize_gdelt_event(art)
        
        # Verify schema presence
        required_fields = [
            "event_id", "event_date", "event_time_if_available", "source", 
            "source_event_id", "event_type", "country", "region", "corridor",
            "actor", "target", "severity_raw", "source_confidence", "text_reference",
            "source_url", "ingestion_timestamp", "source_hash", "processing_version"
        ]
        for field in required_fields:
            assert field in event, f"Missing required field {field}"
            
        assert event["source"] == "GDELT"
        assert event["event_date"] == "2024-08-21"
        assert event["event_time_if_available"] == "15:30:00"
        assert event["event_type"] == "tanker attack"
        assert event["corridor"] == "RED_SEA"
        assert event["country"] == "India"
        assert event["source_url"] == "https://example.com/tanker-incident"
        assert len(event["event_id"]) == 64 # SHA256 length

    def test_normalize_sanctions_event_schema(self):
        row = {
            "ent_num": 12345,
            "name": "SOVCOMFLOT",
            "type": "Entity",
            "program": "UKRAINE-EO13662",
            "country": "Russia",
            "remarks": "Linked to Russian crude shipping"
        }
        event = normalize_sanctions_event(row)
        
        assert event["source"] == "OFAC_SDN"
        assert event["event_type"] == "sanctions"
        assert event["country"] == "Russia"
        assert event["target"] == "SOVCOMFLOT"
        assert event["actor"] == "US OFAC"


# ===========================================================================
# SECTION 4: Deduplication Logic
# ===========================================================================
class TestDeduplication:
    def test_dedup_drops_duplicates(self):
        art1 = {
            "title": "Red Sea tanker incident",
            "url": "https://example.com/report1",
            "seendate": "20240821T100000Z"
        }
        # Duplicate url and date -> duplicate event_id
        art2 = {
            "title": "Red Sea tanker incident",
            "url": "https://example.com/report1",
            "seendate": "20240821T100000Z"
        }
        
        sanctions_df = pd.DataFrame()
        df_events = normalize_and_deduplicate([art1, art2], sanctions_df)
        
        assert len(df_events) == 1


# ===========================================================================
# SECTION 5: Ingestion Fallbacks (Offline Mode)
# ===========================================================================
class TestIngestionFallbacks:
    def test_gdelt_cached_fallback(self):
        """ingest_gdelt_pipeline(force_live=False) must load from local cache folder."""
        articles = ingest_gdelt_pipeline(force_live=False)
        assert isinstance(articles, list)
        if len(articles) > 0:
            assert "url" in articles[0]
            assert "title" in articles[0]

    def test_sanctions_cached_fallback(self):
        """ingest_sanctions_pipeline(force_live=False) must successfully load cached CSVs."""
        df_sanctions = ingest_sanctions_pipeline(force_live=False)
        assert isinstance(df_sanctions, pd.DataFrame)
        if not df_sanctions.empty:
            assert "ent_num" in df_sanctions.columns
            assert "name" in df_sanctions.columns
            assert "country" in df_sanctions.columns


# ===========================================================================
# SECTION 6: Processed Dataset Outputs
# ===========================================================================
class TestProcessedOutputs:
    def test_events_file_validity(self):
        events_path = os.path.join(PROCESSED_DIR, "geopolitical_events.csv")
        assert os.path.exists(events_path), "geopolitical_events.csv not found"
        df = pd.read_csv(events_path)
        assert len(df) > 0
        assert "event_id" in df.columns
        assert "source" in df.columns
        
    def test_daily_signals_file_validity(self):
        daily_path = os.path.join(PROCESSED_DIR, "geopolitical_daily_signals.csv")
        assert os.path.exists(daily_path), "geopolitical_daily_signals.csv not found"
        df = pd.read_csv(daily_path)
        assert len(df) > 0
        assert "date" in df.columns
        # Must contain pivoted GPR daily columns and event count metrics
        for col in ["GPRD", "GPRD_ACT", "GPRD_THREAT", "event_count", "maritime_incident_count"]:
            assert col in df.columns, f"Missing daily column: {col}"
            
    def test_monthly_signals_file_validity(self):
        monthly_path = os.path.join(PROCESSED_DIR, "geopolitical_monthly_signals.csv")
        assert os.path.exists(monthly_path), "geopolitical_monthly_signals.csv not found"
        df = pd.read_csv(monthly_path)
        assert len(df) > 0
        assert "date" in df.columns
        # Must contain pivoted GPR monthly columns
        for col in ["GLOBAL_GPR", "INDIA_GPRC", "event_count", "sanctions_event_count"]:
            assert col in df.columns, f"Missing monthly column: {col}"


# ===========================================================================
# SECTION 7: Quality Report & Schemas
# ===========================================================================
class TestGeopoliticalQuality:
    def test_quality_json_exists_and_passes(self):
        qpath = os.path.join(QUALITY_DIR, "geopolitical_intelligence_quality.json")
        assert os.path.exists(qpath), "Quality JSON report not found"
        with open(qpath) as f:
            report = json.load(f)
            
        assert "status" in report
        assert "metrics" in report
        assert "breakdown" in report
        assert report["metrics"]["duplicate_event_ids"] == 0
        assert report["metrics"]["missing_dates"] == 0
        assert report["metrics"]["impossible_dates"] == 0
