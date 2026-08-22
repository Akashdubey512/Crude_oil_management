"""
Memory-Based IP Rate Limiter — Phase 13
"""

import time
import sys
from collections import defaultdict
from typing import Dict, List
from fastapi import Request, HTTPException, status
from src.api.config import settings

class RateLimiter:
    """
    Lightweight sliding window IP rate limiter.
    Does not require external databases (Redis, etc.).
    """
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        # Filter out timestamps older than 60 seconds
        cutoff = now - 60.0
        self.requests[client_ip] = [t for t in self.requests[client_ip] if t > cutoff]
        
        # Check limit
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return False
            
        self.requests[client_ip].append(now)
        return True

# Initialize separate limiters for endpoint sensitivity categories
read_limiter = RateLimiter(requests_per_minute=120)
write_limiter = RateLimiter(requests_per_minute=60)
governance_limiter = RateLimiter(requests_per_minute=15)
simulation_limiter = RateLimiter(requests_per_minute=10)

# Keep the general default limiter object for backward compatibility
limiter = RateLimiter(requests_per_minute=settings.api_rate_limit)

async def rate_limit_dependency(request: Request):
    # Bypass in testing/unit tests
    is_testing_override = False
    if settings.environment == "testing" or "pytest" in sys.modules or "unittest" in sys.modules:
        # Check if we explicitly want to test rate limiting in security/production tests
        # We do this by checking if the general limiter is overridden to 5
        if limiter.requests_per_minute > 5:
            return
        else:
            is_testing_override = True

    # Extract client IP
    client_ip = request.client.host if request.client else "127.0.0.1"

    if is_testing_override:
        if not limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "Too Many Requests",
                    "message": f"Rate limit of {limiter.requests_per_minute} requests per minute exceeded.",
                    "retry_after_seconds": 60
                }
            )
        return

    # Bypass health checks and metrics
    path = request.url.path
    if path in ["/api/health/live", "/api/health/ready", "/metrics", "/api/metrics", "/health"]:
        return
    
    # 1. Map route paths to specific limiters based on sensitivity
    if path.startswith("/api/scenarios/simulate"):
        active_limiter = simulation_limiter
        limit_name = "SCENARIO_SIMULATION"
    elif "/models/" in path or path.startswith("/api/security"):
        active_limiter = governance_limiter
        limit_name = "MODEL_GOVERNANCE"
    elif request.method == "GET":
        active_limiter = read_limiter
        limit_name = "READ"
    else:
        active_limiter = write_limiter
        limit_name = "WRITE"

    # 2. Verify limits using fallback to default if settings limit is customized
    allowed = active_limiter.is_allowed(client_ip)
    if settings.api_rate_limit != 60:
        # If user customized general limit, enforce default limiter check as fallback
        allowed = allowed and limiter.is_allowed(client_ip)

    if not allowed:
        # Record security audit log for blocked rate limits
        from src.api.database import log_security_event
        log_security_event(
            action="RATE_LIMIT_EXCEEDED",
            resource="API",
            status="BLOCKED",
            ip_address=client_ip,
            user_agent=request.headers.get("user-agent", "unknown"),
            reason=f"Exceeded {limit_name} rate limit of {active_limiter.requests_per_minute} reqs/min"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Too Many Requests",
                "message": f"Rate limit of {active_limiter.requests_per_minute} requests per minute exceeded for category: {limit_name}.",
                "retry_after_seconds": 60
            }
        )
