"""
Alert Service — Phase 14

Threshold-based alert engine for maritime corridor risk intelligence.
Evaluates risk snapshots against configured rules, deduplicates active alerts,
and manages lifecycle: ACTIVE → ACKNOWLEDGED → RESOLVED.
"""

import datetime
import logging
from typing import List, Dict, Any, Optional, Tuple

from src.api.database import get_db_connection, release_db_connection, format_query

logger = logging.getLogger(__name__)

# Default seed rules
DEFAULT_RULES = [
    {"corridor_id": "HORMUZ",        "metric": "risk_score", "operator": ">=", "threshold": 65.0, "severity": "WARNING"},
    {"corridor_id": "HORMUZ",        "metric": "risk_score", "operator": ">=", "threshold": 80.0, "severity": "CRITICAL"},
    {"corridor_id": "BAB_EL_MANDEB", "metric": "risk_score", "operator": ">=", "threshold": 60.0, "severity": "WARNING"},
    {"corridor_id": "BAB_EL_MANDEB", "metric": "risk_score", "operator": ">=", "threshold": 78.0, "severity": "CRITICAL"},
    {"corridor_id": "SUEZ",          "metric": "risk_score", "operator": ">=", "threshold": 62.0, "severity": "WARNING"},
    {"corridor_id": "SUEZ",          "metric": "risk_score", "operator": ">=", "threshold": 80.0, "severity": "CRITICAL"},
    {"corridor_id": "RED_SEA",       "metric": "risk_score", "operator": ">=", "threshold": 55.0, "severity": "WARNING"},
    {"corridor_id": "RED_SEA",       "metric": "risk_score", "operator": ">=", "threshold": 75.0, "severity": "CRITICAL"},
]

_rules_seeded = False


def _ensure_default_rules() -> None:
    global _rules_seeded
    if _rules_seeded:
        return
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM alert_rules;")
        count = cursor.fetchone()[0]
        if count == 0:
            for rule in DEFAULT_RULES:
                cursor.execute(
                    format_query(
                        "INSERT INTO alert_rules (corridor_id, metric, operator, threshold, severity, created_by) "
                        "VALUES (?, ?, ?, ?, ?, ?)"
                    ),
                    (rule["corridor_id"], rule["metric"], rule["operator"],
                     rule["threshold"], rule["severity"], "system")
                )
            conn.commit()
            logger.info(f"Seeded {len(DEFAULT_RULES)} default alert rules.")
        _rules_seeded = True
        cursor.close()
    except Exception as e:
        logger.error(f"Failed to seed default alert rules: {e}")
    finally:
        release_db_connection(conn)


def get_active_rules() -> List[Dict[str, Any]]:
    """Returns all enabled alert rules."""
    _ensure_default_rules()
    conn = get_db_connection()
    rules = []
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM alert_rules WHERE enabled = 1 ORDER BY corridor_id, threshold;")
        rows = cursor.fetchall()
        for row in rows:
            rules.append(_row_to_rule(row))
        cursor.close()
    except Exception as e:
        logger.error(f"Failed to fetch alert rules: {e}")
    finally:
        release_db_connection(conn)
    return rules


def create_rule(
    corridor_id: str,
    metric: str,
    operator: str,
    threshold: float,
    severity: str,
    created_by: str
) -> Dict[str, Any]:
    """Creates a new alert rule and returns it."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            format_query(
                "INSERT INTO alert_rules (corridor_id, metric, operator, threshold, severity, created_by) "
                "VALUES (?, ?, ?, ?, ?, ?)"
            ),
            (corridor_id, metric, operator, threshold, severity, created_by)
        )
        conn.commit()
        rule_id = cursor.lastrowid
        cursor.close()
        logger.info(f"Alert rule {rule_id} created for {corridor_id} by {created_by}.")
        return {
            "id": rule_id, "corridor_id": corridor_id, "metric": metric,
            "operator": operator, "threshold": threshold, "severity": severity,
            "enabled": True, "created_by": created_by
        }
    except Exception as e:
        logger.error(f"Failed to create alert rule: {e}")
        raise
    finally:
        release_db_connection(conn)


def evaluate_alerts(snapshots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Evaluates all enabled alert rules against the given risk snapshots.
    Creates new ACTIVE alerts for threshold breaches (deduplicated).
    Resolves ACTIVE alerts whose condition is no longer met.
    Returns list of newly triggered alerts.
    """
    _ensure_default_rules()
    rules = get_active_rules()
    if not rules:
        return []

    # Map snapshots by corridor
    snapshot_map: Dict[str, Dict] = {}
    for snap in snapshots:
        cid = snap.get("corridor") or snap.get("corridor_id", "")
        snapshot_map[cid] = snap

    newly_triggered = []
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        for rule in rules:
            corridor_id = rule["corridor_id"]
            metric = rule["metric"]
            operator = rule["operator"]
            threshold = float(rule["threshold"])
            severity = rule["severity"]
            rule_id = rule["id"]

            snap = snapshot_map.get(corridor_id)
            if not snap:
                continue

            observed_value = float(snap.get(metric, 0.0) or 0.0)
            breached = (observed_value >= threshold) if operator == ">=" else (observed_value > threshold)

            # Check for existing ACTIVE alert for this rule
            cursor.execute(
                format_query("SELECT id FROM active_alerts WHERE rule_id = ? AND status = 'ACTIVE' LIMIT 1;"),
                (rule_id,)
            )
            existing = cursor.fetchone()

            if breached and not existing:
                message = (
                    f"{corridor_id} {metric} = {observed_value:.1f} "
                    f"(threshold: {operator} {threshold:.1f}, severity: {severity})"
                )
                cursor.execute(
                    format_query(
                        "INSERT INTO active_alerts "
                        "(rule_id, corridor_id, severity, metric, threshold, observed_value, status, message) "
                        "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)"
                    ),
                    (rule_id, corridor_id, severity, metric, threshold, observed_value, message)
                )
                alert_id = cursor.lastrowid
                newly_triggered.append({
                    "id": alert_id,
                    "corridor_id": corridor_id,
                    "severity": severity,
                    "metric": metric,
                    "threshold": threshold,
                    "observed_value": observed_value,
                    "message": message,
                    "status": "ACTIVE",
                    "triggered_at": now
                })
                logger.warning(f"ALERT TRIGGERED [{severity}]: {message}")

            elif not breached and existing:
                # Resolve
                alert_id = existing[0] if not isinstance(existing, dict) else existing["id"]
                cursor.execute(
                    format_query("UPDATE active_alerts SET status='RESOLVED', resolved_at=? WHERE id=?;"),
                    (now, alert_id)
                )
                logger.info(f"Alert {alert_id} resolved for {corridor_id}.")

        conn.commit()
        cursor.close()
    except Exception as e:
        logger.error(f"Alert evaluation failed: {e}")
    finally:
        release_db_connection(conn)

    return newly_triggered


def get_active_alerts(corridor_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Returns all currently ACTIVE alerts."""
    conn = get_db_connection()
    alerts = []
    try:
        cursor = conn.cursor()
        if corridor_id:
            cursor.execute(
                format_query("SELECT * FROM active_alerts WHERE status='ACTIVE' AND corridor_id=? ORDER BY triggered_at DESC;"),
                (corridor_id,)
            )
        else:
            cursor.execute("SELECT * FROM active_alerts WHERE status='ACTIVE' ORDER BY triggered_at DESC;")
        for row in cursor.fetchall():
            alerts.append(_row_to_alert(row))
        cursor.close()
    except Exception as e:
        logger.error(f"Failed to fetch active alerts: {e}")
    finally:
        release_db_connection(conn)
    return alerts


def get_alert_history(page: int = 1, limit: int = 50) -> Tuple[List[Dict[str, Any]], int]:
    """Returns paginated alert history (all statuses)."""
    conn = get_db_connection()
    alerts = []
    total = 0
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM active_alerts;")
        total = cursor.fetchone()[0]
        offset = (page - 1) * limit
        cursor.execute(f"SELECT * FROM active_alerts ORDER BY triggered_at DESC LIMIT {limit} OFFSET {offset};")
        for row in cursor.fetchall():
            alerts.append(_row_to_alert(row))
        cursor.close()
    except Exception as e:
        logger.error(f"Failed to fetch alert history: {e}")
    finally:
        release_db_connection(conn)
    return alerts, total


def acknowledge_alert(alert_id: int, acknowledged_by: str) -> bool:
    """Acknowledges an ACTIVE alert. Returns True if updated."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            format_query("UPDATE active_alerts SET status='ACKNOWLEDGED', acknowledged_by=? WHERE id=? AND status='ACTIVE';"),
            (acknowledged_by, alert_id)
        )
        conn.commit()
        updated = cursor.rowcount > 0
        cursor.close()
        if updated:
            logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}.")
        return updated
    except Exception as e:
        logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
        return False
    finally:
        release_db_connection(conn)


def _row_to_rule(row: Any) -> Dict[str, Any]:
    if hasattr(row, "keys") or isinstance(row, dict):
        return dict(row)
    return {
        "id": row[0], "corridor_id": row[1], "metric": row[2],
        "operator": row[3], "threshold": row[4], "severity": row[5],
        "enabled": bool(row[6]), "created_at": row[7], "created_by": row[8]
    }


def _row_to_alert(row: Any) -> Dict[str, Any]:
    if hasattr(row, "keys") or isinstance(row, dict):
        return dict(row)
    return {
        "id": row[0], "rule_id": row[1], "corridor_id": row[2],
        "severity": row[3], "metric": row[4], "threshold": row[5],
        "observed_value": row[6], "status": row[7], "triggered_at": row[8],
        "resolved_at": row[9], "acknowledged_by": row[10], "message": row[11]
    }
