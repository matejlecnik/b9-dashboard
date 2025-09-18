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
import gc
import psutil
from datetime import datetime, timezone, timedelta
from supabase import create_client
from dotenv import load_dotenv

# Add parent directory to path for imports when running as standalone script
if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from services.instagram.unified_scraper import InstagramScraperUnified
    from services.instagram.instagram_config import Config
    from utils.system_logger import system_logger
else:
    from ..services.instagram.unified_scraper import InstagramScraperUnified
    from ..services.instagram.instagram_config import Config
    try:
        from ..utils.system_logger import system_logger
    except ImportError:
        system_logger = None

# Version tracking
SCRAPER_VERSION = "2.1.0"

# Configuration
CYCLE_WAIT_HOURS = 4  # Wait 4 hours between cycles
CHECK_INTERVAL_SECONDS = 30  # Check control table every 30 seconds
ERROR_WAIT_SECONDS = 60  # Wait 60 seconds after errors

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
        self.last_cycle_completed_at = None
        self.next_cycle_at = None
        self.total_cycles_completed = 0

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
            now = datetime.now(timezone.utc)
            status_info = {
                'last_heartbeat': now.isoformat(),
                'pid': os.getpid()
            }

            # Add memory usage if available
            try:
                process = psutil.Process()
                memory_info = process.memory_info()
                status_info['memory_mb'] = round(memory_info.rss / 1024 / 1024, 1)
                status_info['cpu_percent'] = process.cpu_percent(interval=0.1)
            except:
                pass

            self.supabase.table('system_control').update(status_info).eq('script_name', 'instagram_scraper').execute()
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")

    def get_health_status(self):
        """Get current health status for monitoring"""
        now = datetime.now(timezone.utc)
        status = {
            'healthy': True,
            'version': SCRAPER_VERSION,
            'uptime_seconds': 0,
            'is_scraping': self.is_scraping,
            'cycles_completed': self.total_cycles_completed,
            'current_cycle': self.cycle_count,
            'last_cycle_completed_at': self.last_cycle_completed_at.isoformat() if self.last_cycle_completed_at else None,
            'next_cycle_at': self.next_cycle_at.isoformat() if self.next_cycle_at else None,
            'in_waiting_period': False
        }

        # Check if in waiting period
        if self.next_cycle_at and now < self.next_cycle_at:
            status['in_waiting_period'] = True
            status['wait_remaining_seconds'] = (self.next_cycle_at - now).total_seconds()

        # Add memory info
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            status['memory_mb'] = round(memory_info.rss / 1024 / 1024, 1)
            status['cpu_percent'] = process.cpu_percent(interval=0.1)
        except:
            pass

        return status

    async def check_scraper_status(self):
        """Check if scraper should be running from Supabase control table"""
        try:
            result = self.supabase.table('system_control').select('*').eq('script_name', 'instagram_scraper').execute()

            if result.data and len(result.data) > 0:
                control = result.data[0]
                # Check both 'enabled' field (new) and 'status' field (backward compatibility)
                enabled = control.get('enabled', False) or control.get('status') == 'running'

                # Log status change
                if self.last_check is not None and self.last_check != enabled:
                    status_msg = "✅ Instagram scraper ENABLED" if enabled else "⏹️ Instagram scraper DISABLED"
                    logger.info(f"{status_msg} via Supabase control")

                    # Log to Supabase
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'instagram_scraper',
                        'script_name': 'continuous_instagram_scraper',
                        'level': 'info',
                        'message': status_msg,
                        'context': {'status_change': True}
                    }).execute()

                self.last_check = enabled
                return enabled, control
            else:
                # No control record, create default one
                logger.warning("No Instagram scraper control record found, creating default (disabled)")
                self.supabase.table('system_control').insert({
                    'script_name': 'instagram_scraper',
                    'script_type': 'scraper',
                    'enabled': False,
                    'status': 'stopped',
                    'config': {'scan_interval_hours': 24, 'batch_size': 5},
                    'updated_at': datetime.now(timezone.utc).isoformat(),
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
            self.supabase.table('system_logs').insert({
                'timestamp': cycle_start_time.isoformat(),
                'source': 'instagram_scraper',
                'script_name': 'continuous_instagram_scraper',
                'level': 'info',
                'message': f'🔄 Starting Instagram scraping cycle #{self.cycle_count}',
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

            # Run the scraping in a thread - let it handle its own control checking
            logger.info("Starting Instagram scraper run() method...")
            try:
                await asyncio.to_thread(self.scraper.run)
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

            # Get scraper stats
            creators_processed = self.scraper.creators_processed if self.scraper else 0
            api_calls_made = self.scraper.api_calls_made if self.scraper else 0

            # Log cycle completion
            self.supabase.table('system_logs').insert({
                'timestamp': cycle_end_time.isoformat(),
                'source': 'instagram_scraper',
                'script_name': 'continuous_instagram_scraper',
                'level': 'success',
                'message': f'✅ Completed Instagram scraping cycle #{self.cycle_count} - {creators_processed} profiles processed',
                'context': {
                    'cycle': self.cycle_count,
                    'duration_seconds': duration_seconds,
                    'duration_formatted': duration_formatted,
                    'creators_processed': creators_processed,
                    'api_calls': api_calls_made,
                    'successful_calls': self.scraper.successful_calls if hasattr(self.scraper, 'successful_calls') else 0
                },
                'duration_ms': int(duration_seconds * 1000)
            }).execute()

            # Mark cycle as completed
            self.last_cycle_completed_at = cycle_end_time
            self.next_cycle_at = cycle_end_time + timedelta(hours=CYCLE_WAIT_HOURS)
            self.total_cycles_completed += 1

            # Update system control with cycle info
            try:
                self.supabase.table('system_control').update({
                    'config': {
                        'current_cycle': self.cycle_count,
                        'total_cycles_completed': self.total_cycles_completed,
                        'last_cycle_completed_at': self.last_cycle_completed_at.isoformat(),
                        'next_cycle_at': self.next_cycle_at.isoformat(),
                        'creators_processed': creators_processed,
                        'api_calls_today': api_calls_made
                    },
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('script_name', 'instagram_scraper').execute()
            except Exception as e:
                logger.error(f"Failed to update cycle info: {e}")

            # Log the waiting period
            wait_msg = f"⏰ Cycle #{self.cycle_count} complete! Processed {creators_processed} profiles. Entering {CYCLE_WAIT_HOURS}-hour timeout. Next cycle at {self.next_cycle_at.strftime('%H:%M:%S UTC')}"
            logger.info(wait_msg)

            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_scraper',
                'script_name': 'continuous_instagram_scraper',
                'level': 'info',
                'message': wait_msg,
                'context': {
                    'cycle_completed': self.cycle_count,
                    'wait_hours': CYCLE_WAIT_HOURS,
                    'next_cycle_at': self.next_cycle_at.isoformat()
                }
            }).execute()

            # Clean up memory after cycle
            logger.info("Cleaning up memory after cycle...")
            if self.scraper:
                self.scraper = None  # Release scraper instance
            gc.collect()  # Force garbage collection

            # Log memory usage
            try:
                process = psutil.Process()
                memory_info = process.memory_info()
                memory_mb = memory_info.rss / 1024 / 1024
                logger.info(f"💾 Memory usage after cleanup: {memory_mb:.1f} MB")
            except:
                pass

        except Exception as e:
            logger.error(f"Error during scraping cycle: {e}")
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"Traceback: {error_details}")

            # Log error with full details
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'instagram_scraper',
                    'script_name': 'continuous_instagram_scraper',
                    'level': 'error',
                    'message': f'❌ Error in Instagram scraping cycle #{self.cycle_count}: {str(e)}',
                    'context': {
                        'cycle': self.cycle_count,
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'traceback': error_details[:1000]  # Limit traceback length
                    }
                }).execute()
            except Exception as log_error:
                logger.error(f"Failed to log error to Supabase: {log_error}")

            # Clean up on error
            if self.scraper:
                logger.info("Cleaning up scraper after error...")
                self.scraper = None
            gc.collect()

        finally:
            self.is_scraping = False

    async def run(self):
        """Main loop that continuously checks control table and runs scraping"""
        logger.info(f"🚀 Continuous Instagram scraper v{SCRAPER_VERSION} started")

        # Log startup
        self.supabase.table('system_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'source': 'instagram_scraper',
            'script_name': 'continuous_instagram_scraper',
            'level': 'info',
            'message': f'🚀 Continuous Instagram scraper v{SCRAPER_VERSION} started',
            'context': {'version': SCRAPER_VERSION}
        }).execute()

        # Check if there's stored cycle information
        try:
            result = self.supabase.table('system_control').select('config').eq('script_name', 'instagram_scraper').execute()
            if result.data and len(result.data) > 0:
                config = result.data[0].get('config', {})
                if config.get('last_cycle_completed_at'):
                    last_completed = datetime.fromisoformat(config['last_cycle_completed_at'].replace('Z', '+00:00'))
                    self.last_cycle_completed_at = last_completed
                    self.next_cycle_at = last_completed + timedelta(hours=CYCLE_WAIT_HOURS)
                    self.total_cycles_completed = config.get('total_cycles_completed', 0)
                    self.cycle_count = config.get('current_cycle', 0)

                    # Check if we're still in waiting period
                    now = datetime.now(timezone.utc)
                    if now < self.next_cycle_at:
                        wait_minutes = (self.next_cycle_at - now).total_seconds() / 60
                        logger.info(f"🕰️ Resuming from previous cycle. Still in waiting period. {wait_minutes:.1f} minutes remaining until next cycle.")
        except Exception as e:
            logger.warning(f"Could not restore cycle state: {e}")

        while not self.stop_requested:
            try:
                # Check if scraper should be running
                enabled, config = await self.check_scraper_status()

                if enabled:
                    # Update heartbeat
                    await self.update_heartbeat()

                    # Check if we're in a waiting period
                    now = datetime.now(timezone.utc)
                    if self.next_cycle_at and now < self.next_cycle_at:
                        # Still in waiting period
                        wait_seconds = (self.next_cycle_at - now).total_seconds()
                        if wait_seconds > 3600:  # More than 1 hour
                            wait_hours = wait_seconds / 3600
                            logger.debug(f"⏳ In waiting period. {wait_hours:.1f} hours until next cycle")
                        elif wait_seconds > 60:  # More than 1 minute
                            wait_minutes = wait_seconds / 60
                            logger.debug(f"⏳ In waiting period. {wait_minutes:.1f} minutes until next cycle")
                        else:
                            logger.info(f"⏳ In waiting period. {wait_seconds:.0f} seconds until next cycle")
                    else:
                        # Time to run a new cycle or no previous cycle
                        logger.info("✅ Ready to start new scraping cycle")
                        await self.run_scraping_cycle(config)
                else:
                    # Reset state when disabled
                    if self.cycle_count > 0 or self.next_cycle_at:
                        logger.info("📴 Instagram scraper disabled, resetting state...")
                        self.cycle_count = 0
                        self.last_cycle_completed_at = None
                        self.next_cycle_at = None
                        self.scraper = None  # Clean up scraper instance
                        gc.collect()

                # Wait before next check
                await asyncio.sleep(CHECK_INTERVAL_SECONDS)

            except KeyboardInterrupt:
                logger.info("⛔ Received interrupt signal, shutting down...")
                self.stop_requested = True
                break
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                # Wait a bit longer on errors to avoid rapid failures
                await asyncio.sleep(ERROR_WAIT_SECONDS)

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