"""
Instagram service module for B9 Dashboard
High-performance scraping and analytics for Instagram creators
"""

from .instagram_config import Config
from .instagram_scraper import InstagramScraperUnified


__all__ = [
    'Config',
    'InstagramScraperUnified'
]
