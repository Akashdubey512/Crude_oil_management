"""
FastAPI Application Entrypoint — Phase 5
Energy Supply Chain Resilience Platform — India
"""

import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routes import health, corridors, risk, events

# ─── Logging ──────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s: %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("energy_resilience_api")

# ─── Lifespan (startup / shutdown) ────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== Energy Resilience API starting up ===")
    logger.info(f"  Environment : {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"  Model dir   : {os.getenv('MODEL_DIR', 'models/')}")
    logger.info(f"  Data dir    : {os.getenv('DATA_DIR', 'data/')}")
    yield
    logger.info("=== Energy Resilience API shutting down ===")

# ─── Application ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="India Energy Supply Chain Resilience API",
    description=(
        "Production-grade REST API exposing AI-driven corridor risk intelligence, "
        "geopolitical event tracking, maritime traffic observations, and India's "
        "crude-oil supply chain infrastructure data.\n\n"
        "**Data rules**: Real data only. No fabricated predictions or synthetic responses."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Lock down to specific origins in production
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ─── Request logging middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    t0 = time.time()
    response = await call_next(request)
    elapsed = round((time.time() - t0) * 1000, 1)
    logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} latency={elapsed}ms"
    )
    return response

# ─── Global error handler ─────────────────────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs for details."},
    )

# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(corridors.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
