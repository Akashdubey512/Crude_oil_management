"""
Enterprise Authentication & Role-Based Access Control (RBAC) — Phase 13
"""

import hmac
import hashlib
import secrets
import uuid
import datetime
import json
import logging
from typing import List, Tuple, Dict, Any, Optional
from fastapi import Request, Header, HTTPException, status
from fastapi.security import SecurityScopes

from src.api.config import settings

logger = logging.getLogger(__name__)

# Roles mapping to explicit permission scopes
ROLE_SCOPES: Dict[str, List[str]] = {
    "VIEWER": ["READ", "MODEL_READ"],
    "ANALYST": ["READ", "WRITE", "MODEL_READ"],
    "ML_ENGINEER": ["READ", "WRITE", "MODEL_READ", "MODEL_VALIDATE"],
    "ADMIN": ["READ", "WRITE", "MODEL_READ", "MODEL_VALIDATE", "MODEL_PROMOTE", "MODEL_ROLLBACK", "ADMIN"]
}

def hash_secret_key(secret_part: str) -> str:
    """Hashes the secret key part using HMAC-SHA256 with the central configured secret."""
    secret = settings.api_key_hash_secret or "dev_default_api_key_hash_secret_value"
    return hmac.new(
        secret.encode("utf-8"),
        secret_part.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

def generate_new_api_key(
    actor_id: str,
    actor_role: str,
    expires_in_days: Optional[int] = 30
) -> Tuple[str, Dict[str, Any]]:
    """
    Generates a secure plaintext API key and returns it along with the database record dict.
    Plaintext key format: erp_<public_id>_<secret_key>
    """
    if actor_role not in ROLE_SCOPES:
        raise ValueError(f"Invalid actor role '{actor_role}'. Available roles: {list(ROLE_SCOPES.keys())}")

    public_id = "pub" + uuid.uuid4().hex[:12]
    secret_part = secrets.token_hex(24)
    plaintext_key = f"erp_{public_id}_{secret_part}"
    
    hashed_key = hash_secret_key(secret_part)
    
    scopes = ROLE_SCOPES[actor_role]
    
    expires_at = None
    if expires_in_days:
        expires_at = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=expires_in_days)).isoformat()
        
    db_record = {
        "public_id": public_id,
        "hashed_key": hashed_key,
        "actor_id": actor_id,
        "actor_role": actor_role,
        "scopes": json.dumps(scopes),
        "expires_at": expires_at,
        "revoked": False
    }
    
    return plaintext_key, db_record

async def authenticate_key(
    request: Request,
    security_scopes: SecurityScopes,
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    FastAPI security dependency. Verifies API key, active status, expiration, and scope permissions.
    """
    from src.api.database import get_db_connection, release_db_connection, log_security_event, format_query

    ip_address = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "unknown")

    # 1. Verify Authorization Header exists
    if not authorization:
        log_security_event(
            action="AUTHENTICATION_FAILED",
            resource="API",
            status="FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Missing Authorization header"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header."
        )

    # 2. Extract token parts
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        log_security_event(
            action="AUTHENTICATION_FAILED",
            resource="API",
            status="FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Invalid Authorization header format"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must follow format 'Bearer <key>'."
        )

    token = parts[1]
    token_parts = token.split("_", 2)
    # Expected: erp_<public_id>_<secret_key>
    if len(token_parts) != 3 or token_parts[0] != "erp":
        log_security_event(
            action="AUTHENTICATION_FAILED",
            resource="API",
            status="FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Invalid API key prefix structure"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format."
        )

    public_id = token_parts[1]
    secret_part = token_parts[2]

    # 3. Lookup Key in Database
    conn = get_db_connection()
    key_record = None
    try:
        cursor = conn.cursor()
        query = format_query("SELECT * FROM api_keys WHERE public_id = ?;")
        cursor.execute(query, (public_id,))
        row = cursor.fetchone()
        if row:
            # Handle RealDictCursor or tuple
            if hasattr(row, "keys") or isinstance(row, dict):
                key_record = dict(row)
            else:
                key_record = {
                    "public_id": row[1],
                    "hashed_key": row[2],
                    "actor_id": row[3],
                    "actor_role": row[4],
                    "scopes": row[5],
                    "expires_at": row[7],
                    "revoked": bool(row[8])
                }
        cursor.close()
    except Exception as e:
        logger.error(f"Database lookup failed during auth: {e}")
    finally:
        release_db_connection(conn)

    if not key_record:
        log_security_event(
            action="AUTHENTICATION_FAILED",
            resource="API",
            status="FAILURE",
            ip_address=ip_address,
            user_agent=user_agent,
            reason=f"API key not found in database for public_id: {public_id}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key credentials."
        )

    # 4. Check if Revoked
    if key_record["revoked"]:
        log_security_event(
            action="AUTHENTICATION_FAILED",
            resource="API",
            status="FAILURE",
            actor_id=key_record["actor_id"],
            actor_role=key_record["actor_role"],
            ip_address=ip_address,
            user_agent=user_agent,
            reason="API key is revoked"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API Key has been revoked."
        )

    # 5. Check if Expired
    if key_record["expires_at"]:
        try:
            exp = datetime.datetime.fromisoformat(key_record["expires_at"])
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=datetime.timezone.utc)
            now = datetime.datetime.now(datetime.timezone.utc)
            if now > exp:
                log_security_event(
                    action="AUTHENTICATION_FAILED",
                    resource="API",
                    status="FAILURE",
                    actor_id=key_record["actor_id"],
                    actor_role=key_record["actor_role"],
                    ip_address=ip_address,
                    user_agent=user_agent,
                    reason="API key expired"
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API Key has expired."
                )
        except HTTPException:
            raise
        except Exception:
            pass

    # 6. Verify Hashed Secret Match
    expected_hash = hash_secret_key(secret_part)
    if not hmac.compare_digest(key_record["hashed_key"], expected_hash):
        log_security_event(
            action="AUTHENTICATION_FAILED",
            resource="API",
            status="FAILURE",
            actor_id=key_record["actor_id"],
            actor_role=key_record["actor_role"],
            ip_address=ip_address,
            user_agent=user_agent,
            reason="Secret key mismatch"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key credentials."
        )

    # Parse key scopes
    try:
        key_scopes = json.loads(key_record["scopes"])
    except Exception:
        key_scopes = []

    # 7. Server-Side RBAC Scope Verification
    for required_scope in security_scopes.scopes:
        if required_scope not in key_scopes:
            log_security_event(
                action="PERMISSION_DENIED",
                resource="API",
                status="FAILURE",
                actor_id=key_record["actor_id"],
                actor_role=key_record["actor_role"],
                ip_address=ip_address,
                user_agent=user_agent,
                reason=f"Missing required permission scope: {required_scope}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unauthorized: Insufficient scopes. Required: {required_scope}."
            )

    return {
        "actor_id": key_record["actor_id"],
        "actor_role": key_record["actor_role"],
        "scopes": key_scopes
    }
