"""
Logging Setup and Configuration
Configures Python's standard logging for the application
"""

import os
import logging


def setup_logging() -> logging.Logger:
    """
    Configure logging for production

    Returns:
        Logger instance for the main module
    """
    log_level = os.getenv('LOG_LEVEL', 'info').upper()
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('logs/api.log') if os.path.exists('logs') else logging.NullHandler()
        ]
    )
    return logging.getLogger(__name__)
