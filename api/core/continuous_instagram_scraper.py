#!/usr/bin/env python3
"""
Continuous Instagram Scraper
Checks Supabase control table every 30 seconds and runs scraping when enabled
Based on Reddit scraper architecture for 24/7 operation
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
    from services.instagram.unified_scraper import InstagramScraperUnified
    from services.instagram.instagram_config import Config
else:
    from ..services.instagram.unified_scraper import InstagramScraperUnified
    from ..services.instagram.instagram_config import Config

# Version tracking
SCRAPER_VERSION = "2.0.0"

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ContinuousInstagramScraper:
    """Manages continuous Instagram scraping with Supabase control"""

    def __init__(self):
        self.supabase = None
        self.scraper = None
        self.is_scraping = False
        self.last_check = None
        self.cycle_count = 0
        self.stop_requested = False

    def initialize_supabase(self):
        """Initialize Supabase client"""
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise Exception("Supabase credentials not configured")

        self.supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized")

    async def update_heartbeat(self):
        """Update heartbeat in database to show scraper is alive"""
        try:
            self.supabase.table('instagram_scraper_control').update({
                'last_heartbeat': datetime.now(timezone.utc).isoformat()
            }).eq('id', 1).execute()
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")

    async def check_scraper_status(self):
        """Check if scraper should be running from Supabase control table"""
        try:
            result = self.supabase.table('instagram_scraper_control').select('*').eq('id', 1).execute()

            if result.data and len(result.data) > 0:
                control = result.data[0]
                # Check both 'enabled' field (new) and 'status' field (backward compatibility)
                enabled = control.get('enabled', False) or control.get('status') == 'running'

                # Log status change
                if self.last_check is not None and self.last_check != enabled:
                    status_msg = "✅ Instagram scraper ENABLED" if enabled else "⏹️ Instagram scraper DISABLED"
                    logger.info(f"{status_msg} via Supabase control")

                    # Log to Supabase
                    self.supabase.table('instagram_scraper_realtime_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'level': 'info',
                        'message': status_msg,
                        'source': 'continuous_instagram_scraper'
                    }).execute()

                self.last_check = enabled
                return enabled, control
            else:
                # No control record, create default one
                logger.warning("No Instagram scraper control record found, creating default (disabled)")
                self.supabase.table('instagram_scraper_control').insert({
                    'id': 1,
                    'status': 'stopped',
                    'enabled': False,
                    'updated_at': datetime.now(timezone.utc).isoformat(),  # Use updated_at
                    'updated_by': 'system'
                }).execute()
                return False, {}

        except Exception as e:
            logger.error(f"Error checking scraper status: {e}")
            return False, {}

    async def run_scraping_cycle(self, config):
        """Run one Instagram scraping cycle"""
        if self.is_scraping:
            logger.warning("⚠️ Scraping already in progress, skipping cycle")
            return

        self.is_scraping = True
        self.cycle_count += 1
        cycle_start_time = datetime.now(timezone.utc)

        try:
            logger.info(f"🔄 Starting Instagram scraping cycle #{self.cycle_count}")

            # Log cycle start
            self.supabase.table('instagram_scraper_realtime_logs').insert({
                'timestamp': cycle_start_time.isoformat(),
                'level': 'info',
                'message': f'🔄 Starting Instagram scraping cycle #{self.cycle_count}',
                'source': 'continuous_instagram_scraper',
                'context': {'cycle': self.cycle_count, 'version': SCRAPER_VERSION}
            }).execute()

            # Initialize scraper if needed
            if not self.scraper:
                logger.info("Initializing Instagram scraper...")
                try:
                    # Validate configuration with detailed error logging
                    logger.info("Validating Instagram API configuration...")
                    Config.validate()  # Validate configuration
                    logger.info(f"✅ Configuration validated - API Key: {'SET' if Config.RAPIDAPI_KEY else 'MISSING'}")
                    logger.info(f"   RapidAPI Host: {Config.RAPIDAPI_HOST}")
                    logger.info(f"   Supabase URL: {'SET' if Config.SUPABASE_URL else 'MISSING'}")

                    # Initialize the scraper
                    logger.info("Creating InstagramScraperUnified instance...")
                    self.scraper = InstagramScraperUnified()
                    logger.info("✅ Instagram scraper initialized successfully")
                except ValueError as e:
                    logger.error(f"❌ Configuration validation failed: {e}")
                    # Log specific missing variables
                    logger.error(f"   RAPIDAPI_KEY: {'SET' if os.getenv('RAPIDAPI_KEY') else 'MISSING'}")
                    logger.error(f"   SUPABASE_URL: {'SET' if os.getenv('SUPABASE_URL') else 'MISSING'}")
                    logger.error(f"   SUPABASE_SERVICE_ROLE_KEY: {'SET' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'MISSING'}")
                    raise
                except Exception as e:
                    logger.error(f"❌ Failed to initialize Instagram scraper: {e}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    raise

            # Create control checker function
            async def control_checker():
                """Check if scraper should continue running"""
                try:
                    result = self.supabase.table('instagram_scraper_control')\
                        .select('enabled, status')\
                        .eq('id', 1)\
                        .execute()

                    if result.data and len(result.data) > 0:
                        control = result.data[0]
                        # Check both fields for backward compatibility
                        return control.get('enabled', False) or control.get('status') == 'running'
                    return False
                except Exception as e:
                    logger.error(f"Error checking control status: {e}")
                    return False

            # Run the scraping with control checker
            # Instagram scraper uses synchronous run method
            logger.info("Starting Instagram scraper run() method...")
            try:
                await asyncio.to_thread(self.scraper.run, control_checker=control_checker)
                logger.info("Instagram scraper run() method completed")
            except Exception as e:
                logger.error(f"❌ Error in scraper run() method: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                raise

            # Calculate cycle duration
            cycle_end_time = datetime.now(timezone.utc)
            duration_seconds = (cycle_end_time - cycle_start_time).total_seconds()

            # Format duration
            if duration_seconds >= 3600:
                hours = int(duration_seconds // 3600)
                minutes = int((duration_seconds % 3600) // 60)
                duration_formatted = f"{hours}h {minutes}m"
            elif duration_seconds >= 60:
                minutes = int(duration_seconds // 60)
                seconds = int(duration_seconds % 60)
                duration_formatted = f"{minutes}m {seconds}s"
            else:
                duration_formatted = f"{int(duration_seconds)}s"

            # Log cycle completion
            self.supabase.table('instagram_scraper_realtime_logs').insert({
                'timestamp': cycle_end_time.isoformat(),
                'level': 'success',
                'message': f'✅ Completed Instagram scraping cycle #{self.cycle_count}',
                'source': 'continuous_instagram_scraper',
                'context': {
                    'cycle': self.cycle_count,
                    'duration_seconds': duration_seconds,
                    'duration_formatted': duration_formatted,
                    'creators_processed': self.scraper.creators_processed,
                    'api_calls': self.scraper.api_calls_made,
                    'successful_calls': self.scraper.successful_calls if hasattr(self.scraper, 'successful_calls') else 0
                }
            }).execute()

            logger.info(f"✅ Completed cycle #{self.cycle_count} in {duration_formatted}")

        except Exception as e:
            logger.error(f"Error during scraping cycle: {e}")

            # Log error
            self.supabase.table('instagram_scraper_realtime_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'level': 'error',
                'message': f'❌ Error in Instagram scraping cycle #{self.cycle_count}: {str(e)}',
                'source': 'continuous_instagram_scraper',
                'context': {'cycle': self.cycle_count, 'error': str(e)}
            }).execute()

        finally:
            self.is_scraping = False

    async def run(self):
        """Main loop that continuously checks control table and runs scraping"""
        logger.info(f"🚀 Continuous Instagram scraper v{SCRAPER_VERSION} started")

        # Log startup
        self.supabase.table('instagram_scraper_realtime_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': 'info',
            'message': f'🚀 Continuous Instagram scraper v{SCRAPER_VERSION} started',
            'source': 'continuous_instagram_scraper'
        }).execute()

        while not self.stop_requested:
            try:
                # Check if scraper should be running
                enabled, config = await self.check_scraper_status()

                if enabled:
                    # Update heartbeat
                    await self.update_heartbeat()

                    # Run a scraping cycle
                    await self.run_scraping_cycle(config)
                else:
                    # Reset cycle count when disabled
                    if self.cycle_count > 0:
                        logger.info("📴 Instagram scraper disabled, waiting for enable signal...")
                        self.cycle_count = 0
                        self.scraper = None  # Clean up scraper instance

                # Wait 30 seconds before next check
                await asyncio.sleep(30)

            except KeyboardInterrupt:
                logger.info("⛔ Received interrupt signal, shutting down...")
                self.stop_requested = True
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                # Wait a bit longer on errors to avoid rapid failures
                await asyncio.sleep(60)

        # Cleanup
        if self.scraper:
            logger.info("Cleaning up scraper resources...")
            # Instagram scraper cleanup if needed
            pass

        logger.info("👋 Continuous Instagram scraper stopped")

    def stop(self):
        """Request the scraper to stop"""
        self.stop_requested = True
        if self.scraper:
            self.scraper.request_stop()

async def main():
    """Main entry point"""
    scraper = ContinuousInstagramScraper()

    try:
        # Initialize Supabase
        scraper.initialize_supabase()

        # Run the continuous scraper
        await scraper.run()

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Run the scraper
    asyncio.run(main())