#!/usr/bin/env python3
"""
Production Server Configuration for Hetzner CPX31
Gunicorn + Uvicorn workers optimized for 4 vCPU multi-core performance
"""

import multiprocessing
import os
import sys


def get_worker_count() -> int:
    """
    Calculate optimal worker count for Hetzner CPX31 (4 vCPUs)

    Formula: (2 x CPU) + 1
    - CPX31 has 4 vCPUs -> (2 x 4) + 1 = 9 workers
    - Allows for MAX_WORKERS env var override
    - Minimum 2 workers for redundancy

    Returns:
        int: Optimal number of workers
    """
    cpus = multiprocessing.cpu_count()
    calculated_workers = (cpus * 2) + 1

    # Allow environment variable override
    max_workers = int(os.getenv("MAX_WORKERS", calculated_workers))
    workers = min(calculated_workers, max_workers)

    # Minimum 2 workers for production
    return max(workers, 2)


def get_bind_address() -> str:
    """
    Get bind address from environment

    Returns:
        str: Bind address in format "host:port"
    """
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    return f"{host}:{port}"


def get_gunicorn_config():
    """
    Generate Gunicorn configuration dictionary

    Production-grade settings optimized for Hetzner CPX31:
    - 8 workers (utilizing all 4 vCPUs)
    - UvicornWorker for async support
    - Graceful restarts and timeouts
    - Connection pooling
    - Request limits
    """
    workers = get_worker_count()
    bind = get_bind_address()

    return {
        # Worker configuration
        "workers": workers,
        "worker_class": "uvicorn.workers.UvicornWorker",
        "bind": bind,
        # Timeout configuration
        "timeout": 120,  # Worker timeout (2 minutes)
        "graceful_timeout": 30,  # Graceful shutdown timeout
        "keepalive": 5,  # Keep-alive timeout
        # Worker lifecycle
        "max_requests": 1000,  # Restart worker after N requests
        "max_requests_jitter": 100,  # Add randomness to prevent thundering herd
        # Logging
        "accesslog": "-",  # Access log to stdout
        "errorlog": "-",  # Error log to stderr
        "loglevel": os.getenv("LOG_LEVEL", "info").lower(),
        # Process naming
        "proc_name": "b9-dashboard-api",
        # Security
        "limit_request_line": 8190,  # Max HTTP request line size
        "limit_request_fields": 100,  # Max number of HTTP headers
        "limit_request_field_size": 8190,  # Max HTTP header size
        # Performance
        "worker_connections": 1000,  # Max concurrent connections per worker
        "backlog": 2048,  # Socket backlog queue size
        # Preload app for faster worker startup (optional, can be disabled if causing issues)
        "preload_app": os.getenv("PRELOAD_APP", "false").lower() == "true",
    }


def run_production_server():
    """
    Start Gunicorn with Uvicorn workers for production

    This provides:
    - Multi-worker support for CPU utilization
    - Graceful worker restarts
    - Better process management than standalone uvicorn
    - Production-grade error handling
    """
    try:
        # Import Gunicorn application
        from gunicorn.app.base import BaseApplication

        class StandaloneApplication(BaseApplication):
            """Standalone Gunicorn application"""

            def __init__(self, app_uri, options=None):
                self.app_uri = app_uri
                self.options = options or {}
                super().__init__()

            def load_config(self):
                """Load configuration"""
                for key, value in self.options.items():
                    if key in self.cfg.settings and value is not None:
                        self.cfg.set(key.lower(), value)

            def load(self):
                """Load the application"""
                return self.app_uri

        # Get configuration
        config = get_gunicorn_config()

        print("🚀 Starting B9 Dashboard API (Hetzner Optimized)")
        print(f"📊 Workers: {config['workers']} (CPUs: {multiprocessing.cpu_count()})")
        print(f"🌐 Binding to: {config['bind']}")
        print(f"⚙️  Worker class: {config['worker_class']}")
        print(f"⏱️  Timeout: {config['timeout']}s")
        print(
            f"🔄 Max requests per worker: {config['max_requests']} (±{config['max_requests_jitter']})"
        )

        # Create and run the application
        app = StandaloneApplication("main:app", config)
        app.run()

    except ImportError:
        print("❌ Gunicorn not installed. Install with: pip install gunicorn")
        print("💡 Falling back to uvicorn (single worker)")

        # Fallback to uvicorn if gunicorn not available
        import uvicorn

        port = int(os.getenv("PORT", 8000))
        uvicorn.run(
            "main:app", host="0.0.0.0", port=port, log_level=os.getenv("LOG_LEVEL", "info").lower()
        )

    except Exception as e:
        print(f"❌ Failed to start production server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_production_server()
