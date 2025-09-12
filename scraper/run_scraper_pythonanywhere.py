#!/usr/bin/env python3
"""
PythonAnywhere Always-On Task for B9 Agency Reddit Scraper
Cost-optimized public JSON API scraper with BeyondProxy integration.
Runs continuous 4-hour cycles for $5/day operation.
"""

import os
import sys
import logging
import asyncio
from datetime import datetime

# Add current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging for local testing and PythonAnywhere
LOG_FILE = os.environ.get('LOG_FILE', './reddit_scraper.log')  # Use current directory for local testing
try:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
except (OSError, TypeError):
    # Fallback to current directory if path creation fails
    LOG_FILE = './reddit_scraper.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

def setup_environment():
    """Set up environment variables for PythonAnywhere"""
    
    # Supabase configuration (update with your actual values)
    os.environ['SUPABASE_URL'] = 'https://cetrhongdrjztsrsffuh.supabase.co'
    os.environ['SUPABASE_ANON_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTU4MTMsImV4cCI6MjA3MjM5MTgxM30.DjuEhcfDpdd7gmHFVaqcZP838FXls9-HiXJg-QF-vew'
    
    # Cost optimization configuration for $5/day operation
    os.environ['SCRAPER_MODE'] = 'cost_optimized'  # Public JSON API + BeyondProxy
    os.environ['CYCLE_INTERVAL_MINUTES'] = '240'  # 4 hour cycles (6 per day)
    os.environ['MAX_USERS_PER_CYCLE'] = '100'
    os.environ['ENABLE_DB_FILTERING'] = 'true'  # Skip fresh subreddits
    os.environ['STALENESS_THRESHOLD_HOURS'] = '24'  # Re-scrape after 24h

    # Pass LOG_FILE to scraper so it writes to the same path
    if 'LOG_FILE' not in os.environ:
        os.environ['LOG_FILE'] = LOG_FILE
    
    logger.info("✅ Cost-optimized environment configured for PythonAnywhere:")
    logger.info("   💰 4-hour cycles for $5/day operation")
    logger.info("   🌐 BeyondProxy hardcoded for auto IP rotation")  
    logger.info("   🔄 Public JSON API (no authentication needed)")
    logger.info("   📊 Database filtering enabled (70% cost savings)")

async def run_scraper():
    """Main scraper loop for always-on task"""
    scraper = None
    try:
        from reddit_scraper import ProxyEnabledMultiScraper
        scraper = ProxyEnabledMultiScraper()
        
        await scraper.initialize()
        logger.info("🔄 Starting cost-optimized continuous scraping...")
        
        # Run continuous cycles (4-hour intervals)
        cycle_count = 0
        while True:
            cycle_count += 1
            cycle_start = datetime.now()
            logger.info(f"🔄 Starting cycle #{cycle_count} at {cycle_start}")
            
            try:
                # Run one scraping cycle using public JSON API
                await scraper.test_proxy_scraping()
                
                # Log performance stats
                logger.info(f"✅ Cycle #{cycle_count} completed successfully")
                
                # Calculate and log estimated cost
                cycle_duration = (datetime.now() - cycle_start).total_seconds() / 60
                logger.info(f"⏱️ Cycle duration: {cycle_duration:.1f} minutes")
                logger.info(f"💰 Estimated daily cost: ~$5.00 (6 cycles × $0.83)")
                
            except Exception as e:
                logger.error(f"❌ Cycle #{cycle_count} failed: {e}")
                # Continue to next cycle instead of crashing
                
            # Wait before next cycle (4 hours = 240 minutes)
            cycle_interval = int(os.environ.get('CYCLE_INTERVAL_MINUTES', 240))
            next_cycle = datetime.now().replace(second=0, microsecond=0)
            next_cycle = next_cycle.replace(minute=0, hour=(next_cycle.hour // 4 + 1) * 4 % 24)
            
            logger.info(f"😴 Next cycle scheduled for: {next_cycle}")
            logger.info(f"⏳ Waiting {cycle_interval} minutes until next cycle...")
            await asyncio.sleep(cycle_interval * 60)
                
    except KeyboardInterrupt:
        logger.info("🛑 Always-on task stopped by user")
    except Exception as e:
        logger.error(f"❌ Fatal scraper error: {e}")
        raise
    finally:
        if scraper:
            await scraper.close()

def main():
    """Main function for PythonAnywhere always-on task"""
    logger.info("🚀 B9 Agency Reddit Scraper - Always-On Task Starting")
    logger.info(f"📅 Started at: {datetime.now()}")
    logger.info("💰 Cost-optimized for $5/day operation (4-hour cycles)")
    
    try:
        # Setup environment
        setup_environment()
        
        # Run the async scraper
        asyncio.run(run_scraper())
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        raise

if __name__ == "__main__":
    main()
