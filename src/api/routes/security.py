"""
Security Configuration & Audit Management API Routes — Phase 13
"""

import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel, Field

from src.api.auth import authenticate_key, generate_new_api_key
from src.api.database import get_db_connection, release_db_connection, format_query, log_security_event
from src.api.config import settings

router = APIRouter(prefix="/api/security", tags=["security"])

# Schemas
class SecurityStatusResponse(BaseModel):
    environment: str
    database_type: str
    cors_configured_origins: List[str]
    api_key_hash_secret_configured: bool
    https_forced: bool
    active_keys_count: int
    revoked_keys_count: int
    actor_id: str
    actor_role: str
    scopes: List[str]

class KeyGenerationRequest(BaseModel):
    actor_id: str
    actor_role: str
    expires_in_days: int = Field(default=30, ge=1)

class KeyGenerationResponse(BaseModel):
    plaintext_key: str
    public_id: str
    actor_id: str
    actor_role: str
    scopes: List[str]
    expires_at: Optional[str]

class APIKeySummary(BaseModel):
    public_id: str
    actor_id: str
    actor_role: str
    scopes: List[str]
    created_at: str
    expires_at: Optional[str]
    revoked: bool

class SecurityAuditEntry(BaseModel):
    id: int
    timestamp: str
    request_id: Optional[str]
    actor_id: Optional[str]
    actor_role: Optional[str]
    action: str
    resource: str
    resource_id: Optional[str]
    corridor: Optional[str]
    model_version: Optional[str]
    status: str
    ip_address: Optional[str]
    reason: Optional[str]

# Endpoints
@router.get("/me")
async def get_current_identity(auth: dict = Depends(authenticate_key)):
    """Returns the identity and role of the currently authenticated API key."""
    return {
        "actor_id": auth["actor_id"],
        "actor_role": auth["actor_role"],
        "scopes": auth["scopes"],
    }

@router.get("/status", response_model=SecurityStatusResponse)
async def get_security_status(auth: dict = Depends(authenticate_key)):
    """Fetches real status of deployment security configuration parameters."""
    # Verify VIEWER read permission (scope: READ)
    if "READ" not in auth["scopes"]:
        raise HTTPException(status_code=403, detail="Insufficient permission scope.")

    conn = get_db_connection()
    active_count = 0
    revoked_count = 0
    try:
        cursor = conn.cursor()
        cursor.execute(format_query("SELECT COUNT(*) FROM api_keys WHERE revoked = ?;"), (0,))
        active_count = cursor.fetchone()[0]
        cursor.execute(format_query("SELECT COUNT(*) FROM api_keys WHERE revoked = ?;"), (1,))
        revoked_count = cursor.fetchone()[0]
        cursor.close()
    except Exception as e:
        pass
    finally:
        release_db_connection(conn)

    from src.api.database import is_postgres_configured
    db_type = "PostgreSQL (Pool)" if is_postgres_configured() else "SQLite (Fallback)"

    return SecurityStatusResponse(
        environment=settings.environment,
        database_type=db_type,
        cors_configured_origins=settings.cors_origins,
        api_key_hash_secret_configured=bool(settings.api_key_hash_secret),
        https_forced=(settings.environment == "production"),
        active_keys_count=active_count,
        revoked_keys_count=revoked_count,
        actor_id=auth["actor_id"],
        actor_role=auth["actor_role"],
        scopes=auth["scopes"],
    )

@router.get("/audit", response_model=Dict[str, Any])
async def get_audit_log(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    auth: dict = Depends(authenticate_key)
):
    """Admin: full paginated audit log. Non-admin: own events only (last 20)."""
    is_admin = "ADMIN" in auth["scopes"]

    if not is_admin:
        # Non-admin: return own events silently, don't log an access denial
        conn = get_db_connection()
        logs = []
        try:
            cursor = conn.cursor()
            cursor.execute(
                format_query("SELECT id, timestamp, request_id, actor_id, actor_role, action, resource, resource_id, corridor, model_version, status, ip_address, user_agent, reason FROM security_audit_log WHERE actor_id = ? ORDER BY id DESC LIMIT 20;"),
                (auth["actor_id"],)
            )
            rows = cursor.fetchall()
            for row in rows:
                logs.append({
                    "id": row[0], "timestamp": row[1], "request_id": row[2],
                    "actor_id": row[3], "actor_role": row[4], "action": row[5],
                    "resource": row[6], "resource_id": row[7], "corridor": row[8],
                    "model_version": row[9], "status": row[10], "ip_address": row[11],
                    "reason": row[13] if len(row) > 13 else None
                })
            cursor.close()
        except Exception:
            pass
        finally:
            release_db_connection(conn)
        return {"total": len(logs), "page": 1, "limit": 20, "items": logs, "restricted": True}

    # Guard against excessive pagination parameters
    if limit > 100 or page > 500:
        raise HTTPException(status_code=400, detail="Excessive pagination parameters.")

    offset = (page - 1) * limit
    conn = get_db_connection()
    logs = []
    total = 0
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM security_audit_log;")
        total = cursor.fetchone()[0]

        query = f"SELECT id, timestamp, request_id, actor_id, actor_role, action, resource, resource_id, corridor, model_version, status, ip_address, user_agent, reason FROM security_audit_log ORDER BY id DESC LIMIT {limit} OFFSET {offset};"
        cursor.execute(query)
        rows = cursor.fetchall()
        for row in rows:
            if hasattr(row, "keys") or isinstance(row, dict):
                r = dict(row)
            else:
                r = {
                    "id": row[0], "timestamp": row[1], "request_id": row[2],
                    "actor_id": row[3], "actor_role": row[4], "action": row[5],
                    "resource": row[6], "resource_id": row[7], "corridor": row[8],
                    "model_version": row[9], "status": row[10], "ip_address": row[11],
                    "reason": row[13] if len(row) > 13 else None
                }
            logs.append(r)
        cursor.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database retrieval failed: {e}")
    finally:
        release_db_connection(conn)

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "items": logs,
        "restricted": False
    }

@router.get("/keys", response_model=List[APIKeySummary])
async def list_keys(auth: dict = Depends(authenticate_key)):
    """Admin: lists all keys. Non-admin: returns only own key entry."""
    is_admin = "ADMIN" in auth["scopes"]

    conn = get_db_connection()
    keys = []
    try:
        cursor = conn.cursor()
        if is_admin:
            cursor.execute("SELECT public_id, actor_id, actor_role, scopes, created_at, expires_at, revoked FROM api_keys ORDER BY id DESC;")
        else:
            # Non-admin can only see their own key
            cursor.execute(
                format_query("SELECT public_id, actor_id, actor_role, scopes, created_at, expires_at, revoked FROM api_keys WHERE actor_id = ? ORDER BY id DESC;"),
                (auth["actor_id"],)
            )
        rows = cursor.fetchall()
        for row in rows:
            if hasattr(row, "keys") or isinstance(row, dict):
                r = dict(row)
            else:
                r = {
                    "public_id": row[0],
                    "actor_id": row[1],
                    "actor_role": row[2],
                    "scopes": row[3],
                    "created_at": row[4],
                    "expires_at": row[5],
                    "revoked": bool(row[6])
                }
            try:
                scopes_list = json.loads(r["scopes"])
            except Exception:
                scopes_list = []
            keys.append(APIKeySummary(
                public_id=r["public_id"],
                actor_id=r["actor_id"],
                actor_role=r["actor_role"],
                scopes=scopes_list,
                created_at=r["created_at"],
                expires_at=r["expires_at"],
                revoked=r["revoked"]
            ))
        cursor.close()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database lookup failed: {e}")
    finally:
        release_db_connection(conn)

    return keys

@router.post("/keys", response_model=KeyGenerationResponse, status_code=status.HTTP_201_CREATED)
async def generate_key(req: KeyGenerationRequest, auth: dict = Depends(authenticate_key)):
    """Admin-only: Generates a new cryptographically secure API key and hashes it."""
    if "ADMIN" not in auth["scopes"]:
        raise HTTPException(status_code=403, detail="Admin role required.")

    try:
        plaintext_key, db_record = generate_new_api_key(
            actor_id=req.actor_id,
            actor_role=req.actor_role.upper(),
            expires_in_days=req.expires_in_days
        )
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))

    # Save to Database
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = """
        INSERT INTO api_keys (public_id, hashed_key, actor_id, actor_role, scopes, expires_at, revoked)
        VALUES (?, ?, ?, ?, ?, ?, ?);
        """
        query = format_query(query)
        params = (
            db_record["public_id"],
            db_record["hashed_key"],
            db_record["actor_id"],
            db_record["actor_role"],
            db_record["scopes"],
            db_record["expires_at"],
            0 if isinstance(db_record["revoked"], bool) and not db_record["revoked"] else db_record["revoked"]
        )
        cursor.execute(query, params)
        conn.commit()
        cursor.close()
        
        # Log to security audit log
        log_security_event(
            action="API_KEY_CREATED",
            resource="API_KEY",
            status="SUCCESS",
            actor_id=auth["actor_id"],
            actor_role=auth["actor_role"],
            resource_id=db_record["public_id"],
            reason=f"Generated new {db_record['actor_role']} key for {db_record['actor_id']}"
        )
    except Exception as e:
        if not is_postgres_configured():
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to persist API Key: {e}")
    finally:
        release_db_connection(conn)

    scopes_list = json.loads(db_record["scopes"])
    return KeyGenerationResponse(
        plaintext_key=plaintext_key,
        public_id=db_record["public_id"],
        actor_id=db_record["actor_id"],
        actor_role=db_record["actor_role"],
        scopes=scopes_list,
        expires_at=db_record["expires_at"]
    )

@router.post("/keys/{id}/revoke")
async def revoke_key(id: str, auth: dict = Depends(authenticate_key)):
    """Admin-only: Instantly revokes an active API key using its public identification ID."""
    if "ADMIN" not in auth["scopes"]:
        raise HTTPException(status_code=403, detail="Admin role required.")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Verify it exists first
        cursor.execute(format_query("SELECT public_id FROM api_keys WHERE public_id = ?;"), (id,))
        row = cursor.fetchone()
        if not row:
            cursor.close()
            raise HTTPException(status_code=404, detail="API Key not found.")

        # Update revoked
        cursor.execute(format_query("UPDATE api_keys SET revoked = ? WHERE public_id = ?;"), (1, id))
        conn.commit()
        cursor.close()

        # Log event
        log_security_event(
            action="API_KEY_REVOKED",
            resource="API_KEY",
            status="SUCCESS",
            actor_id=auth["actor_id"],
            actor_role=auth["actor_role"],
            resource_id=id,
            reason=f"API Key {id} revoked by admin"
        )
    except HTTPException:
        raise
    except Exception as e:
        if not is_postgres_configured():
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Revocation failed: {e}")
    finally:
        release_db_connection(conn)

    return {"status": "ok", "message": f"API Key {id} successfully revoked."}
