import pytest
from fastapi import Request, HTTPException
from fastapi.security import SecurityScopes
from src.api.main import app
from src.api.auth import authenticate_key, ROLE_SCOPES

async def mock_authenticate_key(
    request: Request,
    security_scopes: SecurityScopes
):
    # Check X-Admin-Role header (legacy Phase 11 test support)
    x_admin_role = request.headers.get("X-Admin-Role", "").upper()
    if x_admin_role in ROLE_SCOPES:
        role = x_admin_role
    else:
        # Default to ADMIN for general legacy tests (like Phase 5/7/8/9),
        # but if it is a promotion/rollback endpoint in Phase 11, default to VIEWER unless specified.
        path = request.url.path
        if "promote" in path or "rollback" in path:
            role = "VIEWER"
        else:
            role = "ADMIN"

    scopes = ROLE_SCOPES[role]

    # Verify scopes
    for required_scope in security_scopes.scopes:
        if required_scope not in scopes:
            raise HTTPException(
                status_code=403,
                detail=f"Unauthorized: Insufficient scopes. Required: {required_scope}."
            )

    return {
        "actor_id": "test_legacy_runner",
        "actor_role": role,
        "scopes": scopes
    }

@pytest.fixture(autouse=True)
def override_auth(request):
    # If testing Phase 13 security specifically, preserve authentic authentication
    if "test_phase13_security" in request.node.nodeid:
        yield
    else:
        app.dependency_overrides[authenticate_key] = mock_authenticate_key
        try:
            yield
        finally:
            app.dependency_overrides.pop(authenticate_key, None)
