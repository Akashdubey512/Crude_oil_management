"""
API Server Launcher — Phase 5

Starts the FastAPI application using uvicorn.
Reads configuration from environment variables with sensible defaults.

Usage:
    $env:PYTHONPATH="D:\\hackathon project\\energy-resilience"
    python scripts/run_api.py
"""

import os
import sys

# Ensure src/ is importable from any working directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import uvicorn

HOST = os.getenv("API_HOST", "127.0.0.1")
PORT = int(os.getenv("API_PORT", "8000"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

if __name__ == "__main__":
    print(f"Starting Energy Resilience API on http://{HOST}:{PORT}")
    print(f"  Interactive docs: http://{HOST}:{PORT}/docs")
    print(f"  Alternative docs: http://{HOST}:{PORT}/redoc")
    uvicorn.run(
        "src.api.main:app",
        host=HOST,
        port=PORT,
        log_level=LOG_LEVEL,
        reload=False,
    )
