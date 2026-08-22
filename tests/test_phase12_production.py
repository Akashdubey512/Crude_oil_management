"""
Phase 12 Observability, Reliability & Production Integration Tests
"""

import os
import unittest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings
from src.api.database import is_postgres_configured, get_db_connection, release_db_connection

class TestProductionIntegration(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_production_settings_load(self):
        """Verify that configuration settings parse default or environment variables."""
        self.assertIsNotNone(settings.environment)
        self.assertGreaterEqual(settings.request_timeout, 1)
        self.assertGreaterEqual(settings.api_rate_limit, 1)

    def test_liveness_check(self):
        """Verify the /api/health/live liveness probe."""
        response = self.client.get("/api/health/live")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("timestamp", data)

    def test_readiness_check(self):
        """Verify the /api/health/ready readiness probe."""
        response = self.client.get("/api/health/ready")
        # Readiness might return 503 if champion models are missing, which is a controlled ready failure.
        # But it should return 200 or 503, never 500 or crash.
        self.assertIn(response.status_code, [200, 503])
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("details", data)

    def test_prometheus_exposition_format(self):
        """Verify the /metrics endpoint serves Prometheus text format."""
        response = self.client.get("/metrics")
        self.assertEqual(response.status_code, 200)
        text = response.text
        # Check that core metrics are defined in exposition output
        self.assertIn("app_uptime_seconds", text)
        self.assertIn("http_requests_total", text)
        self.assertIn("http_request_duration_seconds", text)

    def test_json_observability_metrics(self):
        """Verify the /api/observability/metrics endpoint returns metrics as structured JSON."""
        response = self.client.get("/api/observability/metrics")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("app_uptime_seconds", data)
        self.assertIn("http_requests", data)

    def test_security_response_headers(self):
        """Verify that essential security headers are present in responses."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        headers = response.headers
        self.assertEqual(headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(headers.get("X-Content-Type-Options"), "nosniff")
        self.assertEqual(headers.get("X-XSS-Protection"), "1; mode=block")
        self.assertIn("X-Request-ID", headers)

    def test_payload_size_limit(self):
        """Verify that payloads exceeding 5MB are rejected with 413 Payload Too Large."""
        large_payload = "a" * (5 * 1024 * 1024 + 100) # Slightly larger than 5MB
        response = self.client.post(
            "/api/scenarios/simulate",
            headers={"Content-Length": str(len(large_payload))},
            content=large_payload
        )
        self.assertEqual(response.status_code, 413)

    def test_database_fallback(self):
        """Verify database fallback logic is active and queries function correctly."""
        conn = get_db_connection()
        self.assertIsNotNone(conn)
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT 1;")
            result = cursor.fetchone()
            self.assertEqual(result[0], 1)
            cursor.close()
        finally:
            release_db_connection(conn)

    def test_rate_limiting_trigger(self):
        """Verify that client exceeds limit if they make many rapid requests."""
        # Clean rate limit lists before run to prevent crosstalk
        from src.api.rate_limiter import limiter
        limiter.requests.clear()
        
        # Override rate limit limit to a low value
        old_limit = limiter.requests_per_minute
        limiter.requests_per_minute = 5
        try:
            # First 5 succeed or fail based on endpoints
            for _ in range(5):
                self.client.get("/api/health")
            # 6th should get 429
            response = self.client.get("/api/health")
            self.assertEqual(response.status_code, 429)
            self.assertIn("Too Many Requests", response.json()["detail"]["error"])
        finally:
            limiter.requests_per_minute = old_limit
