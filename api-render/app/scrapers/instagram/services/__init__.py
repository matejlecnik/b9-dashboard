"""
Instagram service module for B9 Dashboard
High-performance scraping and analytics for Instagram creators
"""

from .unified_scraper import InstagramScraperUnified
from .instagram_config import Config

__all__ = [
    'InstagramScraperUnified',
    'Config'
]