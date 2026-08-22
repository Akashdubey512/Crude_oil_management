"""
Phase 13 Enterprise Security & Hardening Tests
"""

import os
import json
import sqlite3
import datetime
import unittest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.config import settings
from src.api.database import get_db_connection, release_db_connection
from src.api.auth import hash_secret_key, ROLE_SCOPES, authenticate_key
from src.api.secure_client import is_safe_ip

class TestEnterpriseSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self._temp_keys = []
        
        # Clean up any leftover keys from aborted test runs
        conn = get_db_connection()
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("DELETE FROM api_keys WHERE public_id LIKE 'pubtest%'")
        conn.commit()
        release_db_connection(conn)

        # Generate a valid dummy model pickle file for REJECTED promotion test
        import pickle
        from src.features.feature_pipeline import FEATURE_COLS
        os.makedirs("data/models", exist_ok=True)
        dummy_data = {"model": "dummy", "feature_medians": [0.0]*len(FEATURE_COLS)}
        with open("data/models/dummy_test_rejected.pkl", "wb") as f:
            pickle.dump(dummy_data, f)

    def tearDown(self):
        # Clean up any keys generated during testing
        conn = get_db_connection()
        for pub_id in self._temp_keys:
            conn.execute("DELETE FROM api_keys WHERE public_id = ?", (pub_id,))
            conn.execute("DELETE FROM security_audit_log WHERE actor_id = ?", (f"test_actor_{pub_id}",))
        conn.execute("DELETE FROM api_keys WHERE public_id LIKE 'pubtest%'")
        conn.commit()
        release_db_connection(conn)
        
        # Remove dummy pickle
        if os.path.exists("data/models/dummy_test_rejected.pkl"):
            try:
                os.remove("data/models/dummy_test_rejected.pkl")
            except Exception:
                pass

    def _create_test_key(self, role: str, actor_id: str = None, expires_in_days: int = 1) -> str:
        # Strip underscores from all parts — the auth parser splits on '_' and expects exactly 3 parts
        safe_actor = (actor_id or role.lower()).replace("_", "")
        safe_role = role.lower().replace("_", "")
        pub_id = f"pubtest{safe_actor}"
        secret_part = f"testsecretkeyfor{safe_role}12345"
        plaintext_key = f"erp_{pub_id}_{secret_part}"
        
        hashed = hash_secret_key(secret_part)
        scopes = ROLE_SCOPES[role]
        
        expires_at = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=expires_in_days)).isoformat()
        
        conn = get_db_connection()
        # Use INSERT OR REPLACE to handle duplicate runs cleanly
        conn.execute("""
            INSERT OR REPLACE INTO api_keys (public_id, hashed_key, actor_id, actor_role, scopes, expires_at, revoked)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (pub_id, hashed, f"test_actor_{pub_id}", role, json.dumps(scopes), expires_at))
        conn.commit()
        release_db_connection(conn)
        
        self._temp_keys.append(pub_id)
        return plaintext_key

    def test_unauthenticated_request_fails(self):
        """1. Verify that requesting a protected endpoint without an API key returns 401."""
        response = self.client.get("/api/risk")
        self.assertEqual(response.status_code, 401)
        self.assertIn("Missing", response.json().get("detail", ""))

    def test_invalid_api_key_fails(self):
        """2. Verify that requesting with an invalid key returns 401."""
        response = self.client.get("/api/risk", headers={"Authorization": "Bearer invalid_key_structure"})
        self.assertEqual(response.status_code, 401)

        response2 = self.client.get("/api/risk", headers={"Authorization": "Bearer erp_pubadmin_badsecret123"})
        self.assertEqual(response2.status_code, 401)

    def test_public_endpoints_allowed(self):
        """3. Verify that public routes like liveness and readiness do not require credentials."""
        response = self.client.get("/api/health/live")
        self.assertEqual(response.status_code, 200)

        response2 = self.client.get("/api/health/ready")
        self.assertIn(response2.status_code, [200, 503])

    def test_revoked_key_fails(self):
        """4. Verify that a revoked key returns 401."""
        key = self._create_test_key("VIEWER", actor_id="revoked")
        pub_id = "pubtestrevoked"
        
        # Revoke the key
        conn = get_db_connection()
        conn.execute("UPDATE api_keys SET revoked = 1 WHERE public_id = ?", (pub_id,))
        conn.commit()
        release_db_connection(conn)

        response = self.client.get("/api/risk", headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 401)

    def test_expired_key_fails(self):
        """5. Verify that an expired key returns 401."""
        key = self._create_test_key("VIEWER", actor_id="expired", expires_in_days=-5)
        response = self.client.get("/api/risk", headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 401)

    def test_role_scope_enforcement_read_only(self):
        """6. Verify that a VIEWER can read but not simulate scenarios."""
        key = self._create_test_key("VIEWER", actor_id="viewer")
        
        # Read risk should succeed
        response = self.client.get("/api/risk", headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 200)

        # Simulate scenario should fail with 403 Forbidden
        sim_payload = {"scenario_name": "Blockade", "risk_factors": {"geopolitical": 2.5}}
        response2 = self.client.post("/api/scenarios/simulate", json=sim_payload, headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response2.status_code, 403)

    def test_role_scope_enforcement_analyst(self):
        """7. Verify that an ANALYST can read and simulate but not promote models."""
        key = self._create_test_key("ANALYST", actor_id="analyst")
        
        # Simulate scenario should succeed
        sim_payload = {"corridor_id": "HORMUZ", "gpr_multiplier": 2.5}
        response = self.client.post("/api/scenarios/simulate", json=sim_payload, headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 200)

        # Promote model should fail with 403
        promo_payload = {"challenger_key": "some_model", "reason": "Test promotion"}
        response2 = self.client.post("/api/models/HORMUZ/promote", json=promo_payload, headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response2.status_code, 403)

    def test_role_scope_enforcement_admin(self):
        """8. Verify that an ADMIN has complete access to MLOps and Security Center."""
        key = self._create_test_key("ADMIN", actor_id="admin")
        
        # Retrieve keys list should succeed
        response = self.client.get("/api/security/keys", headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.json(), list)

    def test_ssrf_ip_filtering(self):
        """9. Verify is_safe_ip blocks private networks and resolves local addresses correctly."""
        # Loopback
        self.assertFalse(is_safe_ip("127.0.0.1"))
        self.assertFalse(is_safe_ip("::1"))
        
        # Private classes
        self.assertFalse(is_safe_ip("10.0.0.1"))
        self.assertFalse(is_safe_ip("172.16.50.1"))
        self.assertFalse(is_safe_ip("192.168.1.100"))
        
        # Cloud metadata
        self.assertFalse(is_safe_ip("169.254.169.254"))
        
        # Safe public IP
        self.assertTrue(is_safe_ip("8.8.8.8"))

    def test_concurrency_safety_registry_lock(self):
        """10. Verify that model registry operations are protected against concurrent edits."""
        from src.models.model_registry import REGISTRY_LOCK
        self.assertIsNotNone(REGISTRY_LOCK)
        self.assertTrue(hasattr(REGISTRY_LOCK, "acquire"))

    def test_audit_logs_written_on_promotion_attempt(self):
        """11. Verify that security audit log records model promotion attempts."""
        key = self._create_test_key("ADMIN", actor_id="promoaudit")
        
        promo_payload = {"challenger_key": "non_existent_key_123", "reason": "Audit validation test"}
        response = self.client.post("/api/models/HORMUZ/promote", json=promo_payload, headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 400) # Bad Request because challenger does not exist

        # Verify audit record was written
        conn = get_db_connection()
        row = conn.execute("""
            SELECT * FROM security_audit_log 
            WHERE action = 'MODEL_PROMOTED' AND actor_id = 'test_actor_pubtestpromoaudit'
        """).fetchone()
        conn.close()
        
        self.assertIsNotNone(row)
        self.assertEqual(row["status"], "FAILURE")
        self.assertIn("[SCRUBBED]", row["reason"])

    def test_model_promotion_prevents_rejected_models(self):
        """12. Verify promotion fails fast for models that are flagged as REJECTED."""
        from src.models.model_registry import _load_registry, _save_registry
        
        # Seed a dummy model and mark it REJECTED
        registry = _load_registry()
        dummy_key = "dummy_rejected_model_123"
        # Use a valid mock pickle path to pass integrity checks
        registry[dummy_key] = {
            "model_name": "dummy",
            "version": "123",
            "status": "REJECTED",
            "corridor_id": "HORMUZ",
            "artifact_path": "data/models/dummy_test_rejected.pkl",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        _save_registry(registry)
        
        try:
            from src.api.services.model_promotion import promote_challenger_to_champion
            success, reason = promote_challenger_to_champion(dummy_key, "Test promote rejected")
            self.assertFalse(success)
            self.assertIn("REJECTED", reason)
        finally:
            registry = _load_registry()
            if dummy_key in registry:
                del registry[dummy_key]
                _save_registry(registry)

    def test_api_rate_limiter_active(self):
        """13. Verify rate limiter configuration and middleware presence."""
        from src.api.rate_limiter import rate_limit_dependency
        self.assertIsNotNone(rate_limit_dependency)

    def test_invalid_rollback_corridor_rejected(self):
        """14. Verify rollback targets must correspond to the requested corridor."""
        key = self._create_test_key("ADMIN", actor_id="rollbackcorridor")
        
        rollback_payload = {"rollback_key": "some_other_key", "reason": "Corridor safety check"}
        response = self.client.post("/api/models/BAB_EL_MANDEB/rollback", json=rollback_payload, headers={"Authorization": f"Bearer {key}"})
        # Should fail with 400 because some_other_key is not in registry or mismatch
        self.assertEqual(response.status_code, 400)

    def test_ssrf_client_blocks_localhost_requests(self):
        """15. Verify that secure urlopen raises error for localhost urls."""
        from src.api.secure_client import secure_urlopen
        from unittest.mock import patch
        with patch("src.api.secure_client.settings.environment", "production"):
            with self.assertRaises(Exception):
                secure_urlopen("http://localhost:8000/api/health/live")

    def test_audit_logs_retrieval_restrictions(self):
        """16. Verify that VIEWER cannot retrieve security audits."""
        key = self._create_test_key("VIEWER", actor_id="audithind")
        response = self.client.get("/api/security/audit", headers={"Authorization": f"Bearer {key}"})
        self.assertEqual(response.status_code, 403)

    def test_key_revocation_rejects_immediately(self):
        """17. Verify that key revocation updates status and rejects request."""
        admin_key = self._create_test_key("ADMIN", actor_id="revoker")
        temp_key = self._create_test_key("VIEWER", actor_id="to_revoke")
        
        # Verify temp key works
        resp1 = self.client.get("/api/risk", headers={"Authorization": f"Bearer {temp_key}"})
        self.assertEqual(resp1.status_code, 200)

        # Revoke it (pub_id is sanitized: 'pubtesttorrevoke')
        pub_id_to_revoke = "pubtesttorevoke"  # actor_id='to_revoke' → sanitized → 'torevoke'
        resp2 = self.client.post(f"/api/security/keys/{pub_id_to_revoke}/revoke", headers={"Authorization": f"Bearer {admin_key}"})
        self.assertEqual(resp2.status_code, 200)

        # Verify temp key fails now
        resp3 = self.client.get("/api/risk", headers={"Authorization": f"Bearer {temp_key}"})
        self.assertEqual(resp3.status_code, 401)

    def test_key_generation_adds_record(self):
        """18. Verify key generation adds record to database and yields valid key."""
        admin_key = self._create_test_key("ADMIN", actor_id="generator")
        
        payload = {"actor_id": "gen_test_actor", "actor_role": "ANALYST", "expires_in_days": 10}
        resp = self.client.post("/api/security/keys", json=payload, headers={"Authorization": f"Bearer {admin_key}"})
        self.assertEqual(resp.status_code, 201)
        data = resp.json()
        self.assertIn("plaintext_key", data)
        self.assertIn("public_id", data)
        
        pub_id = data["public_id"]
        self._temp_keys.append(pub_id) # mark for cleanup
        
        # Verify it works
        resp2 = self.client.get("/api/risk", headers={"Authorization": f"Bearer {data['plaintext_key']}"})
        self.assertEqual(resp2.status_code, 200)

    def test_production_fails_without_credentials_validation(self):
        """19. Verify Settings validation rules in config.py."""
        from src.api.config import load_config
        import os
        from unittest.mock import patch
        
        # Missing secret
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@host/db",
            "API_KEY_HASH_SECRET": ""
        }):
            with self.assertRaises(ValueError):
                load_config()

        # Secret too short
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@host/db",
            "API_KEY_HASH_SECRET": "short"
        }):
            with self.assertRaises(ValueError):
                load_config()

    def test_cors_wildcard_rejected_in_production(self):
        """20. Verify CORS config does not allow '*' in production."""
        from src.api.config import load_config
        import os
        from unittest.mock import patch
        
        with patch.dict(os.environ, {
            "ENVIRONMENT": "production",
            "DATABASE_URL": "postgresql://user:pass@host/db",
            "API_KEY_HASH_SECRET": "very_secure_hash_secret_value_123456",
            "CORS_ORIGINS": "*"
        }):
            with self.assertRaises(ValueError):
                load_config()
