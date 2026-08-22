"""
Database & Persistence Layer — Phase 9

Provides connections and table setups for SQLite predictions tracking and model versions.
Automatically populates model metadata from data/manifests/model_registry.json.
"""

import os
import sqlite3
import json
import logging
import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DATA_DIR = r"D:\hackathon project\energy-resilience\data"
DB_PATH = os.path.join(DATA_DIR, "predictions.db")
REGISTRY_PATH = os.path.join(DATA_DIR, "manifests", "model_registry.json")


def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite database with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign keys
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_database() -> None:
    """Initializes SQLite database tables and pre-populates model versions."""
    os.makedirs(DATA_DIR, exist_ok=True)
    logger.info(f"Initializing database at: {DB_PATH}")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Create model_versions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS model_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            version TEXT NOT NULL,
            corridor_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            training_started_at TEXT,
            training_completed_at TEXT,
            dataset_version TEXT,
            feature_schema_version TEXT,
            training_rows INTEGER,
            validation_rows INTEGER,
            test_rows INTEGER,
            features TEXT,  -- JSON string list of feature names
            target TEXT,
            metrics TEXT,   -- JSON string metrics dict
            artifact_path TEXT,
            status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'VALIDATED', 'RETIRED', 'FAILED_VALIDATION'))
        );
        """)

        # Create unique index on model_versions
        cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_model_versions_uniq 
        ON model_versions(model_name, corridor_id, version);
        """)

        # Create predictions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            corridor TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            model_version TEXT NOT NULL,
            predicted_probability REAL NOT NULL,
            predicted_class INTEGER NOT NULL,
            confidence REAL,
            actual_outcome INTEGER,
            outcome_available BOOLEAN NOT NULL DEFAULT 0 CHECK (outcome_available IN (0, 1)),
            feature_snapshot TEXT NOT NULL,  -- JSON string of features
            created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
        );
        """)

        # Indexes on predictions table
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_corridor ON predictions(corridor);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_model_version ON predictions(model_version);")

        conn.commit()
        logger.info("Database tables initialized successfully.")

        # Populate model versions if table is empty
        cursor.execute("SELECT COUNT(*) FROM model_versions;")
        if cursor.fetchone()[0] == 0:
            logger.info("Populating model_versions table from model_registry.json...")
            _populate_from_registry(cursor)
            conn.commit()

    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to initialize database: {e}")
        raise e
    finally:
        conn.close()


def _populate_from_registry(cursor: sqlite3.Cursor) -> None:
    """Helper to parse model_registry.json and populate SQLite model_versions."""
    if not os.path.exists(REGISTRY_PATH):
        logger.warning(f"model_registry.json not found at {REGISTRY_PATH}. Skipping pre-population.")
        return

    try:
        with open(REGISTRY_PATH, "r") as f:
            registry = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read model_registry.json: {e}")
        return

    # Extract default features from model features definition if needed
    from src.features.feature_pipeline import FEATURE_COLS
    features_json = json.dumps(FEATURE_COLS)

    for key, entry in registry.items():
        try:
            model_name = entry.get("model_name")
            corridor_id = entry.get("corridor_id")
            version = entry.get("version")
            registered_at = entry.get("registered_at", datetime.datetime.now(datetime.timezone.utc).isoformat())
            training_start = entry.get("training_start")
            training_end = entry.get("training_end")
            feature_version = entry.get("feature_version", "1.0")
            artifact_path = entry.get("artifact_path")
            metrics_json = json.dumps(entry.get("metrics", {}))

            # Approximate row splits from dataset if split exists
            # In our audit, training has 680, validation 182, test 138 rows
            train_rows = 680
            val_rows = 182
            test_rows = 138

            # Decide status: XGBoost is marked as ACTIVE for prediction, others as VALIDATED
            status = "ACTIVE" if model_name == "XGBoost" else "VALIDATED"

            cursor.execute("""
            INSERT OR IGNORE INTO model_versions (
                model_name, version, corridor_id, created_at,
                training_started_at, training_completed_at,
                dataset_version, feature_schema_version,
                training_rows, validation_rows, test_rows,
                features, target, metrics, artifact_path, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                model_name, version, corridor_id, registered_at,
                training_start, training_end,
                "1.0", feature_version,
                train_rows, val_rows, test_rows,
                features_json, "is_disrupted", metrics_json,
                artifact_path, status
            ))
            logger.debug(f"Pre-populated model version: {model_name} for {corridor_id}")
        except Exception as ex:
            logger.error(f"Error parsing registry entry {key}: {ex}")


def log_prediction(
    corridor: str,
    timestamp: str,
    model_version: str,
    predicted_probability: float,
    predicted_class: int,
    feature_snapshot: dict,
    confidence: float = None,
    actual_outcome: int = None,
    outcome_available: bool = False,
) -> Optional[int]:
    """
    Persists a prediction record in the SQLite predictions table.
    Records are immutable — only inserts are allowed, no updates or deletes.
    Returns the row id of the inserted record, or None on failure.
    """
    import json as _json
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO predictions (
            corridor, timestamp, model_version,
            predicted_probability, predicted_class,
            confidence, actual_outcome, outcome_available,
            feature_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            corridor.upper(),
            timestamp,
            model_version,
            float(predicted_probability),
            int(predicted_class),
            float(confidence) if confidence is not None else None,
            int(actual_outcome) if actual_outcome is not None else None,
            1 if outcome_available else 0,
            _json.dumps(feature_snapshot),
        ))
        conn.commit()
        row_id = cursor.lastrowid
        conn.close()
        return row_id
    except Exception as e:
        logger.warning(f"Failed to log prediction for {corridor}: {e}")
        return None

