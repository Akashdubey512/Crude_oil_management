# Enterprise Security & Access Control (RBAC)

> **Platform**: Energy Resilience Intel  
> **Module**: Auth & Security (`src/api/auth.py`, `src/api/routes/security.py`)

---

## 1. Authentication Architecture

All protected API endpoints require an HTTP `Authorization` header containing a valid Bearer token:

```
Authorization: Bearer erp_{public_id}_{secret_part}
```

- **Secret Hashing**: Plaintext secrets are never stored in the database. Secrets are hashed using HMAC-SHA256 with a server-side pepper key.
- **Key Formatting**: Keys follow a strict 3-part structure (`erp_<public_id>_<secret_part>`) containing no inner underscores.

---

## 2. 4-Tier Role-Based Access Control (RBAC)

FastAPI dependencies enforce role scopes on every request:

```python
ROLE_SCOPES = {
    "VIEWER": ["READ", "MODEL_READ"],
    "ANALYST": ["READ", "WRITE", "MODEL_READ"],
    "ML_ENGINEER": ["READ", "WRITE", "MODEL_READ", "MODEL_VALIDATE"],
    "ADMIN": ["READ", "WRITE", "MODEL_READ", "MODEL_VALIDATE", "MODEL_PROMOTE", "MODEL_ROLLBACK", "ADMIN"]
}
```

---

## 3. Threat Mitigation & Hardening

| Threat | Prevention Control | Status |
|:---|:---|:---|
| **Unauthorized Access** | HMAC-SHA256 token authorization middleware | Enforced (HTTP 401) |
| **Privilege Escalation** | Scope verification on protected routes | Enforced (HTTP 403) |
| **Payload Inflation Attacks** | 5MB request body size limit | Enforced (HTTP 413) |
| **Malformed JSON Injections** | Pydantic v2 schema validation | Enforced (HTTP 422) |
| **Stale Key Exploitation** | Automatic `expires_at` timestamp check | Enforced (HTTP 401) |
| **Key Compromise** | Immediate revocation via DB `revoked=1` flag | Enforced (HTTP 401) |
| **Audit Stream Tampering** | Admin-only access to `/api/security/audit` | Enforced (HTTP 403) |
