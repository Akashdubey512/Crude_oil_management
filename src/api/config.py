"""
Centralized Configuration & Startup Validation System — Phase 13
"""

import os
from typing import List
from pydantic import BaseModel, Field, field_validator

class APIConfig(BaseModel):
    environment: str = Field(default="development")
    log_level: str = Field(default="INFO")
    database_url: str = Field(default="")
    model_dir: str = Field(default="")
    data_dir: str = Field(default="")
    
    # Cors allowed origins
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])
    
    # Rate limit (requests per minute)
    api_rate_limit: int = Field(default=60)
    
    # HTTP and service timeouts
    request_timeout: float = Field(default=10.0)
    model_load_timeout: float = Field(default=5.0)
    
    # API endpoints and keys
    fred_api_key: str = Field(default="")
    gdelt_base_url: str = Field(default="https://api.gdeltproject.org/api/v2")
    portwatch_base_url: str = Field(default="https://portwatch.imf.org/api")
    gfw_base_url: str = Field(default="https://gateway.gfw.org/v2")
    
    # Phase 13: Secret Hashing & Keys config
    api_key_hash_secret: str = Field(default="")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        v = v.lower()
        if v not in ["development", "staging", "production"]:
            raise ValueError("ENVIRONMENT must be development, staging, or production")
        return v

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        v = v.upper()
        if v not in ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]:
            raise ValueError("LOG_LEVEL must be DEBUG, INFO, WARNING, ERROR, or CRITICAL")
        return v

    @field_validator("api_rate_limit")
    @classmethod
    def validate_rate_limit(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("API_RATE_LIMIT must be greater than 0")
        return v

# Instantiate and validate config from environment
def load_config() -> APIConfig:
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    # Parse CORS origins
    origins_raw = os.getenv("CORS_ORIGINS", "*")
    origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
    
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    settings = {
        "environment": env,
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "database_url": os.getenv("DATABASE_URL", ""),
        "model_dir": os.getenv("MODEL_DIR", os.path.join(repo_root, "models")),
        "data_dir": os.getenv("DATA_DIR", os.path.join(repo_root, "data")),
        "cors_origins": origins,
        "api_rate_limit": int(os.getenv("API_RATE_LIMIT", "60")),
        "request_timeout": float(os.getenv("REQUEST_TIMEOUT", "10.0")),
        "model_load_timeout": float(os.getenv("MODEL_LOAD_TIMEOUT", "5.0")),
        "fred_api_key": os.getenv("FRED_API_KEY", ""),
        "gdelt_base_url": os.getenv("GDELT_BASE_URL", "https://api.gdeltproject.org/api/v2"),
        "portwatch_base_url": os.getenv("PORTWATCH_BASE_URL", "https://portwatch.imf.org/api"),
        "gfw_base_url": os.getenv("GFW_BASE_URL", "https://gateway.gfw.org/v2"),
        "api_key_hash_secret": os.getenv("API_KEY_HASH_SECRET", ""),
    }
    
    config = APIConfig(**settings)
    
    # Startup validation checks for production (Fail-Fast Gate)
    if config.environment == "production":
        import logging
        _cfg_logger = logging.getLogger(__name__)

        # 1. Database URL: default to SQLite if not set (acceptable for demo/hackathon)
        if not config.database_url or config.database_url.strip() == "":
            default_db = "sqlite:////app/data/energy_resilience.db"
            _cfg_logger.warning(
                f"DATABASE_URL not set in production — defaulting to {default_db}. "
                "Set DATABASE_URL to a Postgres URL for persistent storage."
            )
            config = config.model_copy(update={"database_url": default_db})

        # 2. Secret Key: generate a random one if not provided (warn loudly)
        if not config.api_key_hash_secret or len(config.api_key_hash_secret.strip()) < 16:
            import secrets
            generated = secrets.token_hex(32)
            _cfg_logger.warning(
                "API_KEY_HASH_SECRET not set — using ephemeral random secret. "
                "Set API_KEY_HASH_SECRET env var for stable sessions across restarts."
            )
            config = config.model_copy(update={"api_key_hash_secret": generated})

        # 3. CORS origins: warn but allow wildcard in demo mode
        if not config.cors_origins or "*" in config.cors_origins:
            _cfg_logger.warning(
                "CORS_ORIGINS is set to '*' in production. "
                "Set CORS_ORIGINS to your frontend domain for security."
            )

    return config

settings = load_config()

