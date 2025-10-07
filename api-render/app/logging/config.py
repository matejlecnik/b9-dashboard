"""
Logging Configuration
Centralized configuration for all logging operations
"""

import os
from dataclasses import dataclass


@dataclass
class LoggingConfig:
    """Configuration for unified logging system"""

    # Log level
    log_level: str = "INFO"

    # Supabase logging
    supabase_logging_enabled: bool = True
    supabase_table: str = "system_logs"  # Fixed: was "logs", should be "system_logs"
    supabase_batch_size: int = 1  # Flush immediately (was 10, caused logs to be batched and lost)
    supabase_flush_interval: int = 5  # seconds

    # File logging
    file_logging_enabled: bool = True
    log_file: str = "logs/api.log"
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    backup_count: int = 5

    # Console logging
    console_logging_enabled: bool = True
    console_format: str = "standard"  # "standard" or "json"

    # Performance
    async_logging: bool = True

    @classmethod
    def from_environment(cls) -> 'LoggingConfig':
        """Create configuration from environment variables"""
        return cls(
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
            supabase_logging_enabled=os.getenv("SUPABASE_LOGGING", "true").lower() == "true",
            file_logging_enabled=os.getenv("FILE_LOGGING", "true").lower() == "true",
            console_logging_enabled=os.getenv("CONSOLE_LOGGING", "true").lower() == "true",
            log_file=os.getenv("LOG_FILE", "logs/api.log"),
        )


# Global config instance
config = LoggingConfig.from_environment()
