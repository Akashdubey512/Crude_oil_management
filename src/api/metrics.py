"""
Prometheus Metrics Instrumentation — Phase 12
"""

import time
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

# Uptime
START_TIME = time.time()
SYSTEM_UPTIME = Gauge("app_uptime_seconds", "Application uptime in seconds")

# HTTP Metrics
HTTP_REQUESTS = Counter(
    "http_requests_total",
    "Total HTTP requests handled",
    ["method", "path", "status"]
)
HTTP_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"]
)

# ML & Prediction Metrics
PREDICTIONS = Counter(
    "predictions_total",
    "Total predictions computed",
    ["corridor", "model_version", "risk_level"]
)
PREDICTION_LATENCY = Histogram(
    "prediction_latency_seconds",
    "Prediction computation latency in seconds",
    ["corridor"]
)
ML_CHAMPION_PREDICTIONS = Counter(
    "ml_champion_predictions_total",
    "Total predictions served using registry CHAMPION model",
    ["corridor"]
)
ML_CHALLENGER_EVALUATIONS = Counter(
    "ml_challenger_evaluations_total",
    "Total evaluations performed on challenger models",
    ["corridor"]
)
ML_PROMOTION_ATTEMPTS = Counter(
    "ml_promotion_attempts_total",
    "Total champion model promotion attempts",
    ["corridor", "status"]
)
ML_ROLLBACK_EVENTS = Counter(
    "ml_rollback_events_total",
    "Total model rollback events triggered",
    ["corridor"]
)
ML_RETRAIN_RECOMMENDATIONS = Counter(
    "ml_retraining_recommendations_total",
    "Total retraining recommendations issued",
    ["corridor", "severity"]
)

# External Data Feeds Metrics
EXTERNAL_FEED_REQUESTS = Counter(
    "external_feed_requests_total",
    "Total external data feed API requests",
    ["feed_name", "status"]
)
EXTERNAL_FEED_LATENCY = Histogram(
    "external_feed_latency_seconds",
    "External feed API request latency in seconds",
    ["feed_name"]
)
EXTERNAL_FEED_STALE = Gauge(
    "external_feed_stale",
    "Stale indicator for external feeds (1 = stale, 0 = fresh)",
    ["feed_name"]
)

# Database Metrics
DB_LATENCY = Histogram(
    "db_latency_seconds",
    "Database operation latency in seconds",
    ["operation"]
)
DB_ERRORS = Counter(
    "db_errors_total",
    "Total database execution errors",
    ["operation"]
)

def update_uptime() -> None:
    """Updates the system uptime metric."""
    SYSTEM_UPTIME.set(time.time() - START_TIME)

def get_metrics_response() -> Response:
    """Generates the latest Prometheus exposition metrics."""
    update_uptime()
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )
