"""
FastAPI Application Entrypoint — Phase 12
Energy Supply Chain Resilience Platform — India
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html

from src.api.config import settings
from src.api.logging_config import setup_logging, request_id_var
from src.api.database import init_database, _pg_pool
from src.api.rate_limiter import rate_limit_dependency
from src.api.metrics import HTTP_REQUESTS, HTTP_LATENCY, get_metrics_response
from src.api.auth import authenticate_key
from src.api.routes import (
    health, corridors, risk, events, prices, data_status,
    explainability, scenarios, monitoring, security,
    alerts, forecast, portfolio, reports
)

# Initialize structured logging first so all subsequent logs are JSON lines
setup_logging(log_level=settings.log_level, environment=settings.environment)
logger = logging.getLogger("energy_resilience_api")

# ─── Lifespan (graceful startup / shutdown) ──────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== Energy Resilience API starting up ===")
    logger.info(f"  Environment : {settings.environment}")
    logger.info(f"  Model dir   : {settings.model_dir}")
    logger.info(f"  Data dir    : {settings.data_dir}")
    
    # Initialize connection pools and database tables
    try:
        init_database()
        logger.info("  Database initialized successfully.")
    except Exception as db_exc:
        logger.warning(f"  Database initialization failed: {db_exc}")

    # Validate registry and active champion models
    try:
        from src.models.model_registry import _load_registry, get_champion_model
        reg = _load_registry()
        logger.info(f"  Loaded model registry with {len(reg)} entries.")
        
        # Verify Strait of Hormuz has a champion model loaded
        hormuz_champ = get_champion_model("HORMUZ")
        if hormuz_champ:
            logger.info(f"  Active Hormuz Champion: {hormuz_champ.get('model_name')} v{hormuz_champ.get('version')}")
        else:
            logger.warning("  No active Champion found for Strait of Hormuz in registry.")
    except Exception as e:
        logger.error(f"  ML registry validation failed at startup: {e}")

    yield
    
    logger.info("=== Energy Resilience API shutting down ===")
    # Gracefully close PostgreSQL connection pools if active
    if _pg_pool:
        try:
            logger.info("  Closing PostgreSQL connection pool...")
            _pg_pool.closeall()
            logger.info("  PostgreSQL pool closed successfully.")
        except Exception as e:
            logger.error(f"  Error closing connection pool: {e}")
            
    logger.info("  Flushing log streams...")
    logging.shutdown()

# ─── Application ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="India Energy Supply Chain Resilience API",
    description=(
        "Production-deployable, observable REST API exposing AI-driven corridor risk intelligence, "
        "geopolitical event tracking, maritime traffic observations, and India's "
        "crude-oil supply chain infrastructure data.\n\n"
        "**Phase 14**: Alerting, 7-day Forecasts, Portfolio Risk & Reporting.\n"
        "**Observability**: Prometheus metrics enabled at /metrics. JSON structured logging and request-tracing active."
    ),
    version="1.4.0",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
)

# Mount local static files for offline-compatible API documentation
import os
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url or "/openapi.json",
        title=app.title + " - ReDoc",
        redoc_js_url="/static/redoc.standalone.js",
    )

# ─── Security Middlwares & CORS Whitelist ─────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*", "X-Request-ID", "X-Admin-Role"],
)

# ─── HTTP Headers & Tracing Middleware ─────────────────────────────────────────
@app.middleware("http")
async def correlation_id_and_security_middleware(request: Request, call_next):
    # Skip path checks for metrics
    path = request.url.path
    if path == "/metrics" or path == "/api/metrics":
        return await call_next(request)

    # 1. Enforce payload size limit (max 5MB)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 5 * 1024 * 1024:
         return JSONResponse(status_code=413, content={"detail": "Payload too large. Limit is 5MB."})

    # 2. Extract or generate Request ID
    req_id = request.headers.get("X-Request-ID")
    if not req_id:
        req_id = str(uuid.uuid4())
    else:
        # Sanitize input request ID to prevent injection
        req_id = "".join([c for c in req_id if c.isalnum() or c == "-"]).strip()
        if not req_id:
            req_id = str(uuid.uuid4())

    # 3. Store request ID context variable
    token = request_id_var.set(req_id)
    
    t0 = time.time()
    try:
        # 4. API Rate Limiting check
        await rate_limit_dependency(request)
        
        response = await call_next(request)
        duration = time.time() - t0
        duration_ms = round(duration * 1000, 1)

        # 5. Record HTTP metrics
        HTTP_REQUESTS.labels(method=request.method, path=path, status=str(response.status_code)).inc()
        HTTP_LATENCY.labels(method=request.method, path=path).observe(duration)

        # 6. Log Request Completion
        logger.info(
            f"Request completed: {request.method} {path} status={response.status_code} latency={duration_ms}ms",
            extra={
                "method": request.method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": duration_ms
            }
        )

        # Add security headers
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none';"
        return response
    except HTTPException as http_exc:
        # Handle client errors/rate limits
        duration = time.time() - t0
        HTTP_REQUESTS.labels(method=request.method, path=path, status=str(http_exc.status_code)).inc()
        HTTP_LATENCY.labels(method=request.method, path=path).observe(duration)
        return JSONResponse(status_code=http_exc.status_code, content={"detail": http_exc.detail})
    except Exception as exc:
        duration = time.time() - t0
        HTTP_REQUESTS.labels(method=request.method, path=path, status="500").inc()
        HTTP_LATENCY.labels(method=request.method, path=path).observe(duration)
        
        logger.error(f"Unhandled exception on {path}: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Check server logs for details."},
        )
    finally:
        request_id_var.reset(token)

# ─── Prometheus Metrics Endpoint ──────────────────────────────────────────────
@app.get("/metrics", tags=["System"])
def get_metrics():
    """Exposes application and model serving metrics for Prometheus scrapers."""
    return get_metrics_response()

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router, prefix="/api")

# READ scope routes
app.include_router(corridors.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(events.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(risk.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(prices.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(data_status.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(explainability.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])

# Analysis & Scenarios (READ scope)
app.include_router(scenarios.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])

# Routers with endpoint-level scope checks
app.include_router(monitoring.router, prefix="/api")
app.include_router(security.router)

# Phase 14: Alerting, Forecast, Portfolio, Reports (READ scope)
app.include_router(alerts.router,    prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(forecast.router,  prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(portfolio.router, prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
app.include_router(reports.router,   prefix="/api", dependencies=[Security(authenticate_key, scopes=["READ"])])
