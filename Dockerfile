# ─── Multi-Stage Dockerfile — Phase 12 ───

# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
# Install packages to a custom directory to keep image minimal
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Final minimal runtime
FROM python:3.12-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed pip packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy application source code and artifacts
COPY src/ /app/src/
COPY models/ /app/models/
COPY data/ /app/data/
COPY docs/ /app/docs/
COPY scripts/ /app/scripts/

# Create a non-root system user and adjust permissions
RUN useradd -u 10001 -m appuser \
    && chown -R appuser:appuser /app

USER appuser

# Document exposed API port
EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV LOG_LEVEL=INFO
ENV ENVIRONMENT=production

# Health check using Python's built-in urllib (guarantees zero dependencies)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/live')" || exit 1

# Start the API server
CMD ["python", "scripts/run_api.py"]
