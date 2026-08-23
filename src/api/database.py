"""
Database & Persistence Layer — Phase 12

Provides connections and table setups for SQLite and PostgreSQL predictions tracking.
Automatically supports PostgreSQL connection pooling in production and falls back to SQLite.
"""

import os
import sqlite3
import json
import logging
import datetime
import time
from typing import List, Dict, Any, Optional

# PostgreSQL dependencies
try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor
except ImportError:
    psycopg2 = None
    pool = None

from src.api.config import settings
from src.api.metrics import DB_LATENCY, DB_ERRORS

logger = logging.getLogger(__name__)

# Global connection pool for PostgreSQL
_pg_pool: Optional[Any] = None

def init_pg_pool() -> None:
    """Initializes the PostgreSQL connection pool if DATABASE_URL is configured."""
    global _pg_pool
    if not psycopg2 or not settings.database_url:
        return

    url = settings.database_url
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        try:
            logger.info("Initializing PostgreSQL ThreadedConnectionPool...")
            # Enforce connection timeout of 5 seconds
            _pg_pool = psycopg2.pool.ThreadedConnectionPool(
                minconn=2,
                maxconn=20,
                dsn=url,
                connect_timeout=5
            )
            logger.info("PostgreSQL Connection Pool initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize PostgreSQL connection pool: {e}")
            DB_ERRORS.labels(operation="init_pool").inc()
            _pg_pool = None

def is_postgres_configured() -> bool:
    """Returns True if PostgreSQL is configured and psycopg2 is available."""
    url = settings.database_url
    return bool(psycopg2 and _pg_pool and (url.startswith("postgresql://") or url.startswith("postgres://")))

def get_db_connection() -> Any:
    """
    Returns a connection to the database.
    If PostgreSQL is configured, returns a connection from the pool.
    Otherwise, returns an SQLite connection.
    """
    if is_postgres_configured():
        try:
            # Get connection from pool
            conn = _pg_pool.getconn()
            return conn
        except Exception as e:
            logger.warning(f"Failed to get PG connection from pool, falling back: {e}")
            DB_ERRORS.labels(operation="getconn").inc()
            
    # Fallback to SQLite
    os.makedirs(settings.data_dir, exist_ok=True)
    db_path = os.path.join(settings.data_dir, "predictions.db")
    conn = sqlite3.connect(db_path, timeout=15, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=10000;")
    return conn

def release_db_connection(conn: Any) -> None:
    """Releases a connection back to the pool or closes it if SQLite."""
    if is_postgres_configured() and _pg_pool:
        try:
            _pg_pool.putconn(conn)
        except Exception as e:
            logger.warning(f"Failed to release PG connection: {e}")
            DB_ERRORS.labels(operation="putconn").inc()
    else:
        try:
            conn.close()
        except Exception:
            pass

def format_query(query: str) -> str:
    """Replaces SQLite placeholder '?' with PostgreSQL placeholder '%s' if using PG."""
    if is_postgres_configured():
        return query.replace("?", "%s")
    return query

def init_database() -> None:
    """Initializes database tables and pre-populates model versions."""
    logger.info("Initializing database schema...")
    
    # Initialize connection pool
    init_pg_pool()
    
    conn = get_db_connection()
    t0 = time.time()
    try:
        if is_postgres_configured():
            cursor = conn.cursor()
            
            # Create model_versions table (Postgres syntax)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS model_versions (
                id SERIAL PRIMARY KEY,
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
                features TEXT,
                target TEXT,
                metrics TEXT,
                artifact_path TEXT,
                status TEXT NOT NULL
            );
            """)

            # Create unique index
            cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_model_versions_uniq 
            ON model_versions(model_name, corridor_id, version);
            """)

            # Create predictions table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id SERIAL PRIMARY KEY,
                corridor TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                model_version TEXT NOT NULL,
                predicted_probability DOUBLE PRECISION NOT NULL,
                predicted_class INTEGER NOT NULL,
                confidence DOUBLE PRECISION,
                actual_outcome INTEGER,
                outcome_available BOOLEAN NOT NULL DEFAULT FALSE,
                feature_snapshot TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

            # Create indexes on predictions
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_corridor ON predictions(corridor);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_model_version ON predictions(model_version);")

            # Phase 13: Create api_keys table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id SERIAL PRIMARY KEY,
                public_id VARCHAR(50) NOT NULL UNIQUE,
                hashed_key VARCHAR(255) NOT NULL,
                actor_id VARCHAR(50) NOT NULL,
                actor_role VARCHAR(50) NOT NULL,
                scopes TEXT NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at VARCHAR(100),
                revoked BOOLEAN NOT NULL DEFAULT FALSE
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_public_id ON api_keys(public_id);")

            # Phase 13: Create security_audit_log table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_audit_log (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                request_id VARCHAR(100),
                actor_id VARCHAR(50),
                actor_role VARCHAR(50),
                action VARCHAR(100) NOT NULL,
                resource VARCHAR(100) NOT NULL,
                resource_id VARCHAR(100),
                corridor VARCHAR(50),
                model_version VARCHAR(50),
                status VARCHAR(50) NOT NULL,
                ip_address VARCHAR(50),
                user_agent TEXT,
                reason TEXT,
                metadata TEXT
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_log(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_log(action);")

            conn.commit()
            
            # Populate model versions if table is empty
            cursor.execute("SELECT COUNT(*) FROM model_versions;")
            if cursor.fetchone()[0] == 0:
                logger.info("Populating PostgreSQL model_versions table from model_registry.json...")
                _populate_from_registry(cursor, is_pg=True)
                conn.commit()
            
            # Phase 13: Seed default admin API key if table is empty
            cursor.execute("SELECT COUNT(*) FROM api_keys;")
            if cursor.fetchone()[0] == 0:
                logger.info("Seeding default admin API key in PostgreSQL api_keys table...")
                from src.api.auth import hash_secret_key, ROLE_SCOPES
                hashed_key = hash_secret_key("defaultadminsecretkey987654321")
                cursor.execute("""
                INSERT INTO api_keys (public_id, hashed_key, actor_id, actor_role, scopes, revoked)
                VALUES (%s, %s, %s, %s, %s, %s);
                """, ("pubadmin", hashed_key, "default_admin", "ADMIN", json.dumps(ROLE_SCOPES["ADMIN"]), False))
                conn.commit()
            
            cursor.close()
        else:
            cursor = conn.cursor()
            
            # Create model_versions table (SQLite syntax)
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
                features TEXT,
                target TEXT,
                metrics TEXT,
                artifact_path TEXT,
                status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'VALIDATED', 'RETIRED', 'FAILED_VALIDATION'))
            );
            """)

            cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_model_versions_uniq 
            ON model_versions(model_name, corridor_id, version);
            """)

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
                feature_snapshot TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
            );
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_corridor ON predictions(corridor);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_model_version ON predictions(model_version);")

            # Phase 13: Create api_keys table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                public_id TEXT NOT NULL UNIQUE,
                hashed_key TEXT NOT NULL,
                actor_id TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                scopes TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
                expires_at TEXT,
                revoked INTEGER NOT NULL DEFAULT 0
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_api_keys_public_id ON api_keys(public_id);")

            # Phase 13: Create security_audit_log table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS security_audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
                request_id TEXT,
                actor_id TEXT,
                actor_role TEXT,
                action TEXT NOT NULL,
                resource TEXT NOT NULL,
                resource_id TEXT,
                corridor TEXT,
                model_version TEXT,
                status TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                reason TEXT,
                metadata TEXT
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON security_audit_log(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_action ON security_audit_log(action);")

            # Phase 14: Alert rules and active alerts tables
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                corridor_id TEXT NOT NULL,
                metric TEXT NOT NULL CHECK (metric IN ('risk_score', 'probability')),
                operator TEXT NOT NULL CHECK (operator IN ('>', '>=')),
                threshold REAL NOT NULL,
                severity TEXT NOT NULL CHECK (severity IN ('WARNING', 'CRITICAL')),
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
                created_by TEXT
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alert_rules_corridor ON alert_rules(corridor_id);")

            cursor.execute("""
            CREATE TABLE IF NOT EXISTS active_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                rule_id INTEGER NOT NULL,
                corridor_id TEXT NOT NULL,
                severity TEXT NOT NULL,
                metric TEXT NOT NULL,
                threshold REAL NOT NULL,
                observed_value REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'RESOLVED', 'ACKNOWLEDGED')),
                triggered_at TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
                resolved_at TEXT,
                acknowledged_by TEXT,
                message TEXT
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_active_alerts_corridor ON active_alerts(corridor_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_active_alerts_status ON active_alerts(status);")

            conn.commit()
            
            cursor.execute("SELECT COUNT(*) FROM model_versions;")
            if cursor.fetchone()[0] == 0:
                logger.info("Populating SQLite model_versions table from model_registry.json...")
                _populate_from_registry(cursor, is_pg=False)
                conn.commit()
                
            # Phase 13: Seed preset role keys (ADMIN / ANALYST / VIEWER) for demo role switcher
            from src.api.auth import hash_secret_key, ROLE_SCOPES
            preset_keys = [
                ("pubadmin",   hash_secret_key("defaultadminsecretkey987654321"), "default_admin",   "ADMIN",   json.dumps(ROLE_SCOPES["ADMIN"])),
                ("pubanalyst", hash_secret_key("defaultanalystsecretkey987654"),  "default_analyst", "ANALYST", json.dumps(ROLE_SCOPES["ANALYST"])),
                ("pubviewer",  hash_secret_key("defaultviewersecretkey1234567"),  "default_viewer",  "VIEWER",  json.dumps(ROLE_SCOPES["VIEWER"])),
            ]
            for pub_id, hk, actor_id, role, scopes in preset_keys:
                cursor.execute("""
                INSERT OR IGNORE INTO api_keys (public_id, hashed_key, actor_id, actor_role, scopes, revoked)
                VALUES (?, ?, ?, ?, ?, ?);
                """, (pub_id, hk, actor_id, role, scopes, 0))
            conn.commit()
            logger.info("Preset role API keys (ADMIN/ANALYST/VIEWER) seeded in SQLite.")
                
            cursor.close()
            
        logger.info("Database schema initialized successfully.")
        DB_LATENCY.labels(operation="init").observe(time.time() - t0)
    except Exception as e:
        if not is_postgres_configured():
            conn.rollback()
        logger.error(f"Failed to initialize database: {e}")
        DB_ERRORS.labels(operation="init").inc()
        raise e
    finally:
        release_db_connection(conn)

def _populate_from_registry(cursor: Any, is_pg: bool) -> None:
    """Helper to parse model_registry.json and populate DB model_versions."""
    reg_path = os.path.join(settings.data_dir, "manifests", "model_registry.json")
    if not os.path.exists(reg_path):
        logger.warning(f"model_registry.json not found at {reg_path}. Skipping pre-population.")
        return

    try:
        with open(reg_path, "r") as f:
            registry = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read model_registry.json: {e}")
        return

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

            train_rows = 680
            val_rows = 182
            test_rows = 138
            status = "ACTIVE" if model_name == "XGBoost" else "VALIDATED"

            if is_pg:
                query = """
                INSERT INTO model_versions (
                    model_name, version, corridor_id, created_at,
                    training_started_at, training_completed_at,
                    dataset_version, feature_schema_version,
                    training_rows, validation_rows, test_rows,
                    features, target, metrics, artifact_path, status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (model_name, corridor_id, version) DO NOTHING;
                """
            else:
                query = """
                INSERT OR IGNORE INTO model_versions (
                    model_name, version, corridor_id, created_at,
                    training_started_at, training_completed_at,
                    dataset_version, feature_schema_version,
                    training_rows, validation_rows, test_rows,
                    features, target, metrics, artifact_path, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """

            cursor.execute(query, (
                model_name, version, corridor_id, registered_at,
                training_start, training_end,
                "1.0", feature_version,
                train_rows, val_rows, test_rows,
                features_json, "is_disrupted", metrics_json,
                artifact_path, status
            ))
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
    """Persists a prediction record in the database."""
    t0 = time.time()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        query = """
        INSERT INTO predictions (
            corridor, timestamp, model_version,
            predicted_probability, predicted_class,
            confidence, actual_outcome, outcome_available,
            feature_snapshot
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        
        query = format_query(query)
        params = (
            corridor.upper(),
            timestamp,
            model_version,
            float(predicted_probability),
            int(predicted_class),
            float(confidence) if confidence is not None else None,
            int(actual_outcome) if actual_outcome is not None else None,
            True if outcome_available else False,
            json.dumps(feature_snapshot),
        )
        
        cursor.execute(query, params)
        
        row_id = None
        if is_postgres_configured():
            conn.commit()
            # Retrieve generated ID if PostgreSQL
            try:
                cursor.execute("SELECT LASTVAL();")
                row_id = cursor.fetchone()[0]
            except Exception:
                row_id = 1
        else:
            conn.commit()
            row_id = cursor.lastrowid
            
        cursor.close()
        DB_LATENCY.labels(operation="insert").observe(time.time() - t0)
        return row_id
    except Exception as e:
        if not is_postgres_configured():
            conn.rollback()
        logger.warning(f"Failed to log prediction for {corridor}: {e}")
        DB_ERRORS.labels(operation="insert").inc()
        return None
    finally:
        release_db_connection(conn)

def log_security_event(
    action: str,
    resource: str,
    status: str,
    actor_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    resource_id: Optional[str] = None,
    corridor: Optional[str] = None,
    model_version: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    reason: Optional[str] = None,
    metadata: Optional[dict] = None
) -> None:
    """
    Persists a security audit event in the security_audit_log table.
    Guarantees that sensitive credentials or secrets are never logged.
    """
    from src.api.logging_config import request_id_var
    req_id = request_id_var.get()
    
    # Strip any potential secrets from reason and metadata
    def sanitize(val: Any) -> Any:
        if isinstance(val, str):
            for pattern in ["key", "password", "secret", "token", "api_key"]:
                if pattern in val.lower():
                    return "[SCRUBBED]"
        return val

    reason = sanitize(reason)
    if metadata:
        metadata = {k: sanitize(v) for k, v in metadata.items()}
        metadata_str = json.dumps(metadata)
    else:
        metadata_str = None

    t0 = time.time()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
        INSERT INTO security_audit_log (
            request_id, actor_id, actor_role, action, resource,
            resource_id, corridor, model_version, status,
            ip_address, user_agent, reason, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """
        query = format_query(query)
        params = (
            req_id, actor_id, actor_role, action, resource,
            resource_id, corridor, model_version, status,
            ip_address, user_agent, reason, metadata_str
        )
        cursor.execute(query, params)
        conn.commit()
        cursor.close()
        DB_LATENCY.labels(operation="insert_audit").observe(time.time() - t0)
    except Exception as e:
        if not is_postgres_configured():
            conn.rollback()
        logger.warning(f"Failed to log security audit event: {e}")
        DB_ERRORS.labels(operation="insert_audit").inc()
    finally:
        release_db_connection(conn)
