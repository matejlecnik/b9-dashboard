#!/usr/bin/env python3
"""
Fix for the scraper control - this should be added to the Python scraper code
to check the SCRAPER_ENABLED environment variable
"""

import os
import sys
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('scraper_control')

def should_run_scraper():
    """Check if scraper should run based on environment variable"""
    scraper_enabled = os.getenv('SCRAPER_ENABLED', 'true').lower()
    return scraper_enabled in ['true', '1', 'yes', 'on']

def main():
    """Main scraper loop with environment variable check"""
    logger.info("🚀 Scraper control starting...")

    while True:
        if not should_run_scraper():
            logger.info("⏸️ Scraper is disabled (SCRAPER_ENABLED=false). Sleeping...")
            time.sleep(60)  # Check every minute
            continue

        logger.info("✅ Scraper is enabled, running scraping tasks...")

        # Your actual scraping code would go here
        # For now, just simulate work
        try:
            # Import and run your actual scraper
            # from reddit_scraper import run_scraper
            # run_scraper()

            # Placeholder for actual scraping
            logger.info("📊 Processing Reddit data...")
            time.sleep(30)  # Simulate work

        except Exception as e:
            logger.error(f"❌ Error in scraper: {e}")
            time.sleep(60)  # Wait before retrying

if __name__ == "__main__":
    main()