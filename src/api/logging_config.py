"""
Structured JSON Logging Configuration — Phase 12
"""

import json
import logging
import datetime
from contextvars import ContextVar

# ContextVar to hold Request ID in a thread-safe manner
request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

class StructuredJSONFormatter(logging.Formatter):
    """
    Format logs as structured JSON lines.
    Automatically scrubs secrets/keys and injects Request IDs from the context.
    """
    def __init__(self, service: str = "energy_resilience_api", environment: str = "development"):
        super().__init__()
        self.service = service
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        # Build core log record
        log_data = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "level": record.levelname,
            "service": self.service,
            "environment": self.environment,
            "request_id": request_id_var.get(),
            "message": record.getMessage(),
            "logger": record.name,
            "filename": record.filename,
            "lineno": record.lineno,
        }

        # Handle exception info safely
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Merge extra attributes if passed via `extra` parameter and are JSON serializable
        if hasattr(record, "__dict__"):
            # Exclude standard attributes
            standard_attrs = {
                "args", "asctime", "created", "exc_info", "exc_text", "filename",
                "funcName", "levelname", "levelno", "lineno", "module", "msecs",
                "message", "msg", "name", "pathname", "process", "processName",
                "relativeCreated", "stack_info", "thread", "threadName"
            }
            for k, v in record.__dict__.items():
                if k not in standard_attrs and not k.startswith("_"):
                    try:
                        # Scrub secrets before storing
                        log_data[k] = self.scrub_secrets(k, v)
                    except Exception:
                        pass

        return json.dumps(log_data)

    def scrub_secrets(self, key: str, value: any) -> any:
        """Recursively scrub common sensitive keys from dictionaries/values."""
        sensitive_keys = {"secret", "api_key", "password", "token", "auth", "credential"}
        
        # Check if key itself is sensitive
        key_lower = key.lower()
        if any(sk in key_lower for sk in sensitive_keys):
            return "[REDACTED]"

        if isinstance(value, dict):
            return {k: self.scrub_secrets(k, v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self.scrub_secrets(key, item) for item in value]
        
        return value

def setup_logging(log_level: str = "INFO", environment: str = "development") -> None:
    """Configures root logging with StructuredJSONFormatter."""
    root_logger = logging.getLogger()
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add console stream handler
    console_handler = logging.StreamHandler()
    formatter = StructuredJSONFormatter(environment=environment)
    console_handler.setFormatter(formatter)
    
    root_logger.addHandler(console_handler)
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))
    
    # Reduce noise from third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
