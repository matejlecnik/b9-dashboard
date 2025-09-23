#!/usr/bin/env python3
"""
Continuous Reddit Scraper
Checks Supabase control table every 30 seconds and runs scraping when enabled
"""
import asyncio
import os
import sys
import logging
from datetime import datetime, timezone
from supabase import create_client
from dotenv import load_dotenv

# Add parent directory to path for imports when running as standalone script
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from core.reddit_scraper import ProxyEnabledMultiScraper, SupabaseLogHandler
else:
    from .reddit_scraper import ProxyEnabledMultiScraper, SupabaseLogHandler

# Version tracking
SCRAPER_VERSION = "2.4.0"  # Added subreddit_score calculation using balanced formula


# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ContinuousScraper:
    """Manages continuous scraping with Supabase control"""

    def __init__(self):
        self.supabase = None
        self.scraper = None
        self.is_scraping = False
        self.last_check = None
        self.cycle_count = 0

    def initialize_supabase(self):
        """Initialize Supabase client"""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise Exception("Supabase credentials not configured")

        self.supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized")

        # Set up Supabase logging handler to send logs to system_logs table
        try:
            supabase_handler = SupabaseLogHandler(self.supabase, source='reddit_scraper')
            supabase_handler.setLevel(logging.INFO)  # Only send INFO and above to database
            logger.addHandler(supabase_handler)
            logger.info("🔗 Supabase logging handler initialized for continuous scraper")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase logging: {e}")

    async def update_heartbeat(self):
        """Update heartbeat in database to show scraper is alive"""
        try:
            self.supabase.table('system_control').update({
                'last_heartbeat': datetime.now(timezone.utc).isoformat()
            }).eq('script_name', 'reddit_scraper').execute()
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")

    async def check_scraper_status(self):
        """Check if scraper should be running from Supabase control table"""
        try:
            result = self.supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

            if result.data and len(result.data) > 0:
                control = result.data[0]
                enabled = control.get('enabled', False)

                # Log status change
                if self.last_check is not None and self.last_check != enabled:
                    status_msg = "✅ Scraper ENABLED" if enabled else "⏹️ Scraper DISABLED"
                    logger.info(f"{status_msg} via Supabase control")

                    # Log to Supabase
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'reddit_scraper',
                        'script_name': 'continuous_scraper',
                        'level': 'info',
                        'message': status_msg,
                        'context': {'status_change': True}
                    }).execute()

                self.last_check = enabled
                return enabled, control
            else:
                # No control record, create default one
                logger.warning("No scraper control record found, creating default (disabled)")
                self.supabase.table('system_control').insert({
                    'script_name': 'reddit_scraper',
                    'script_type': 'scraper',
                    'enabled': False,
                    'status': 'stopped',
                    'config': {
                        'batch_size': 10,
                        'delay_between_batches': 30,
                        'max_daily_requests': 10000
                    },
                    'updated_at': datetime.now(timezone.utc).isoformat(),
                    'updated_by': 'system'
                }).execute()
                return False, {}

        except Exception as e:
            logger.error(f"Error checking scraper status: {e}")
            return False, {}

    async def run_scraping_cycle(self, config):
        """Run one scraping cycle"""
        if self.is_scraping:
            logger.warning("⚠️ Scraping already in progress, skipping cycle")
            return

        self.is_scraping = True
        self.cycle_count += 1
        cycle_start_time = datetime.now(timezone.utc)

        try:
            logger.info(f"🔄 Starting scraping cycle #{self.cycle_count}")

            # Log cycle start
            self.supabase.table('system_logs').insert({
                'timestamp': cycle_start_time.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_scraper',
                'level': 'info',
                'message': f'🔄 Starting scraping cycle #{self.cycle_count}',
                'context': {'cycle': self.cycle_count, 'version': SCRAPER_VERSION}
            }).execute()

            # Initialize scraper if needed
            if not self.scraper:
                logger.info("Initializing Reddit scraper...")
                self.scraper = ProxyEnabledMultiScraper()
                await self.scraper.initialize()

            # Create control checker function
            async def control_checker():
                """Check if scraper should continue running"""
                try:
                    result = self.supabase.table('system_control').select('enabled').eq('script_name', 'reddit_scraper').execute()
                    if result.data and len(result.data) > 0:
                        return result.data[0].get('enabled', False)
                    return False
                except Exception as e:
                    logger.error(f"Error checking control status: {e}")
                    return False

            # Run the scraping with control checker
            await self.scraper.test_proxy_scraping(control_checker=control_checker)

            # Calculate cycle duration
            cycle_end_time = datetime.now(timezone.utc)
            cycle_duration = (cycle_end_time - cycle_start_time).total_seconds()
            duration_str = f"{int(cycle_duration // 60)}m {int(cycle_duration % 60)}s" if cycle_duration >= 60 else f"{cycle_duration:.1f}s"

            # Log cycle completion with duration
            self.supabase.table('system_logs').insert({
                'timestamp': cycle_end_time.isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_scraper',
                'level': 'success',
                'message': f'✅ Completed scraping cycle #{self.cycle_count} in {duration_str}',
                'context': {
                    'cycle': self.cycle_count,
                    'duration_seconds': cycle_duration,
                    'duration_formatted': duration_str,
                    'version': SCRAPER_VERSION
                },
                'duration_ms': int(cycle_duration * 1000)
            }).execute()

            logger.info(f"✅ Completed scraping cycle #{self.cycle_count} in {duration_str}")

        except Exception as e:
            logger.error(f"❌ Error in scraping cycle #{self.cycle_count}: {e}")

            # Log error
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_scraper',
                'level': 'error',
                'message': f'❌ Error in cycle #{self.cycle_count}: {str(e)}',
                'context': {'cycle': self.cycle_count, 'error': str(e)}
            }).execute()

        finally:
            self.is_scraping = False

    async def run_continuous(self):
        """Main continuous loop - checks every 30 seconds"""
        logger.info(f"🚀 Starting continuous scraper v{SCRAPER_VERSION} with 30-second check interval")

        # Initialize Supabase
        self.initialize_supabase()

        # Log startup
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_scraper',
                'level': 'info',
                'message': f'🚀 Continuous scraper v{SCRAPER_VERSION} started',
                'context': {'version': SCRAPER_VERSION}
            }).execute()
        except Exception as e:
            logger.error(f"Error logging startup: {e}")

        while True:
            try:
                # Check if scraper should be running
                check_result = await self.check_scraper_status()
                if isinstance(check_result, tuple):
                    enabled, config = check_result
                else:
                    # Backward compatibility: if only bool returned
                    enabled, config = check_result, {}

                if enabled:
                    # Update heartbeat to show we're alive
                    await self.update_heartbeat()

                    # Get config values from the config JSON field
                    config_json = config.get('config', {})
                    batch_size = config_json.get('batch_size', 10)
                    delay_between_batches = config_json.get('delay_between_batches', 30)

                    logger.info(f"📊 Scraper enabled - batch_size: {batch_size}, delay: {delay_between_batches}s")

                    # Run scraping cycle
                    await self.run_scraping_cycle(config)

                    # Wait for configured delay between batches
                    logger.info(f"⏳ Waiting {delay_between_batches} seconds before next check...")
                    await asyncio.sleep(delay_between_batches)
                else:
                    logger.info("💤 Scraper disabled - checking again in 30 seconds...")
                    await asyncio.sleep(30)

            except KeyboardInterrupt:
                logger.info("⚡ Received interrupt signal, shutting down...")
                break
            except Exception as e:
                logger.error(f"❌ Error in continuous loop: {e}")
                logger.info("⏳ Waiting 30 seconds before retry...")
                await asyncio.sleep(30)

        # Cleanup
        if self.scraper:
            try:
                await self.scraper.close()
            except Exception as e:
                logger.error(f"Error closing scraper: {e}")

        # Log shutdown and clear PID
        try:
            # Clear PID from control table since we're shutting down
            self.supabase.table('system_control').update({
                'pid': None,
                'enabled': False,
                'status': 'stopped',
                'stopped_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'updated_by': 'shutdown'
            }).eq('script_name', 'reddit_scraper').execute()

            # Log shutdown
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_scraper',
                'script_name': 'continuous_scraper',
                'level': 'info',
                'message': '⏹️ Continuous scraper stopped',
                'context': {'shutdown': True}
            }).execute()
        except Exception as e:
            logger.error(f"Error logging shutdown: {e}")

        logger.info("👋 Continuous scraper stopped")

async def main():
    """Main entry point"""
    scraper = ContinuousScraper()
    try:
        await scraper.run_continuous()
    except Exception as e:
        logger.error(f"Fatal error in main: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("👋 Exiting continuous scraper (KeyboardInterrupt)")
    except Exception as e:
        logger.error(f"Fatal error on exit: {e}")