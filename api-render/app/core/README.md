# Core Infrastructure

Core infrastructure components for the B9 Dashboard API.

## Directory Structure

```
core/
├── clients/                # API client management
│   ├── api_pool.py        # Thread-safe client pool
│   └── README.md
├── config/                # Configuration management
│   ├── config_manager.py  # Database-driven config
│   ├── scraper_config.py  # Scraper settings
│   └── README.md
├── database/              # Database layer
│   ├── batch_writer.py    # Batch write operations
│   ├── supabase_client.py # Client initialization
│   └── README.md
├── utils/                 # Utility functions
│   ├── supabase_logger.py # Logging to Supabase
│   └── README.md
├── exceptions.py          # Custom exceptions
└── logging_helper.py      # Logging utilities
```

## Components

### Database Layer (`database/`)
- **supabase_client.py**: Supabase client initialization and connection management
- **batch_writer.py**: Batch write operations for improved performance

### Configuration (`config/`)
- **config_manager.py**: Database-driven configuration management
- **scraper_config.py**: Scraper-specific configuration settings

### Client Management (`clients/`)
- **api_pool.py**: Thread-safe API client pool for concurrent operations

### Utilities (`utils/`)
- **supabase_logger.py**: Custom logging handler that writes to Supabase system_logs table

### Other
- **exceptions.py**: Custom exception classes for error handling
- **logging_helper.py**: Logging setup and utilities

## Usage

```python
# Database client
from app.core.database.supabase_client import get_supabase_client
client = get_supabase_client()

# Configuration
from app.core.config.config_manager import ConfigManager
config = ConfigManager(client)

# Logging
from app.core.utils.supabase_logger import SupabaseLogHandler
logger.addHandler(SupabaseLogHandler(client))
```

---

_Version: 3.0.0 | Last Updated: 2025-10-03_
