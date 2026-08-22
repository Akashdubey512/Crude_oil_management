import sys
import os
import json
import sqlite3

# Ensure src/ is importable from any working directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.api.auth import hash_secret_key, ROLE_SCOPES
from src.api.config import settings

print("settings.api_key_hash_secret:", repr(settings.api_key_hash_secret))

conn = sqlite3.connect("energy-resilience/data/predictions.db")
cursor = conn.cursor()

# Insert a known admin key
public_id = "pubadmin"
secret_key = "defaultadminsecretkey987654321"
hashed_key = hash_secret_key(secret_key)

cursor.execute("DELETE FROM api_keys WHERE public_id = ?", (public_id,))
cursor.execute("""
INSERT INTO api_keys (public_id, hashed_key, actor_id, actor_role, scopes, revoked)
VALUES (?, ?, ?, ?, ?, ?);
""", (public_id, hashed_key, "default_admin", "ADMIN", json.dumps(ROLE_SCOPES["ADMIN"]), 0))
conn.commit()
conn.close()

print("Plaintext key:")
print(f"erp_{public_id}_{secret_key}")
