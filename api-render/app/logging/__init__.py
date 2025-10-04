"""
Unified Logging System for B9 Dashboard API
Consolidates 4 separate logging implementations into one cohesive interface
"""

from app.logging.core import UnifiedLogger, get_logger

__all__ = ["UnifiedLogger", "get_logger"]
