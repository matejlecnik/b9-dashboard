#!/usr/bin/env python3
"""
Continuous Instagram Scraper
Checks Supabase control table every 30 seconds and runs scraping when enabled
Based on Reddit scraper architecture with 4-hour wait between cycles
"""
import asyncio
import os
import sys
import logging
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

# Use absolute imports from api_render package
from api_render.scrapers.instagram.services.instagram_scraper import InstagramScraperUnified
from api_render.core.database import get_db
from api_render.scrapers.instagram.services.instagram_config import Config

# Note: system_logger moved to unified logging system
system_logger = None

# Version tracking
SCRAPER_VERSION = "3.0.0"  # Simplified to match Reddit pattern

# Configuration
CYCLE_WAIT_HOURS = 4  # Wait 4 hours between cycles (Instagram specific)
CHECK_INTERVAL_SECONDS = 30  # Check control table every 30 seconds
WAIT_UPDATE_MINUTES = 1  # Update wait status every minute

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ContinuousInstagramScraper:
    """Manages continuous Instagram scraping with Supabase control (simplified like Reddit)"""

    def __init__(self):
        self.supabase = None
        self.scraper = None
        self.is_scraping = False
        self.last_check = None
        self.cycle_count = 0
        self.last_cycle_completed_at = None
        self.next_cycle_at = None

    def initialize_supabase(self):
        """Initialize Supabase client from singleton"""
        self.supabase = get_db()
        logger.info("✅ Supabase client initialized (singleton)")

    async def update_heartbeat(self):
        """Update heartbeat in database to show scraper is alive"""
        try:
            self.supabase.table('system_control').update({
                'last_heartbeat': datetime.now(timezone.utc).isoformat(),
                'pid': os.getpid()
            }).eq('script_name', 'instagram_scraper').execute()
        except Exception as e:
            logger.error(f"Error updating heartbeat: {e}")

    def _log_to_system(self, level: str, message: str, context: dict = None):
        """Log to both console and Supabase system_logs"""
        # Console log
        if level == 'error':
            logger.error(message)
        elif level == 'warning':
            logger.warning(message)
        elif level == 'success':
            logger.info(f"✅ {message}")
        else:
            logger.info(message)

        # Supabase log
        try:
            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_scraper',  # Always instagram_scraper
                'script_name': 'continuous_instagram_scraper',
                'level': level,
                'message': message,
                'context': context or {}
            }).execute()
        except Exception as e:
            logger.debug(f"Could not log to system_logs: {e}")

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

    async def run_scraping_cycle(self):
        """Run one Instagram scraping cycle (simplified like Reddit)"""
        if self.is_scraping:
            logger.warning("⚠️ Scraping already in progress, skipping cycle")
            return

        self.is_scraping = True
        self.cycle_count += 1
        cycle_start_time = datetime.now(timezone.utc)

        try:
            self._log_to_system('info', f'Starting Instagram scraping cycle #{self.cycle_count}', {
                'cycle': self.cycle_count,
                'version': SCRAPER_VERSION
            })

            # Initialize scraper if needed
            if not self.scraper:
                logger.info("Initializing Instagram scraper...")
                Config.validate()
                self.scraper = InstagramScraperUnified()
                logger.info("✅ Instagram scraper initialized")

            # Create control checker function (like Reddit scraper)
            async def control_checker():
                """Check if scraper should continue running"""
                try:
                    result = self.supabase.table('system_control').select('enabled').eq('script_name', 'instagram_scraper').execute()
                    if result.data and len(result.data) > 0:
                        return result.data[0].get('enabled', False)
                    return False
                except Exception as e:
                    logger.error(f"Error checking control status: {e}")
                    return False

            # Run the scraping
            await self.scraper.run(control_checker=control_checker)

            # Cycle completion (simplified)

            # Calculate cycle duration
            cycle_end_time = datetime.now(timezone.utc)
            duration_seconds = (cycle_end_time - cycle_start_time).total_seconds()
            duration_str = f"{int(duration_seconds // 60)}m {int(duration_seconds % 60)}s" if duration_seconds >= 60 else f"{duration_seconds:.1f}s"

            # Get stats from scraper
            creators_processed = self.scraper.creators_processed if self.scraper and hasattr(self.scraper, 'creators_processed') else 0
            api_calls = self.scraper.api_calls_made if self.scraper and hasattr(self.scraper, 'api_calls_made') else 0

            # Log cycle completion
            self._log_to_system('success', f'Completed Instagram cycle #{self.cycle_count} in {duration_str}', {
                'cycle': self.cycle_count,
                'duration_seconds': duration_seconds,
                'creators_processed': creators_processed,
                'api_calls': api_calls
            })

            # Mark cycle as completed and set next cycle time
            self.last_cycle_completed_at = cycle_end_time
            self.next_cycle_at = cycle_end_time + timedelta(hours=CYCLE_WAIT_HOURS)

            logger.info(f"✅ Cycle #{self.cycle_count} complete - {creators_processed} creators processed")
            logger.info(f"⏳ Starting {CYCLE_WAIT_HOURS}-hour wait until next cycle")

            # Clean up scraper instance
            self.scraper = None

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

        finally:
            self.is_scraping = False

    async def run_continuous(self):
        """Main continuous loop - checks every 30 seconds (like Reddit scraper)"""
        logger.info(f"🚀 Starting Instagram scraper v{SCRAPER_VERSION} with 30-second check interval")

        # Initialize Supabase
        self.initialize_supabase()

        # Log startup
        self._log_to_system('info', f'Instagram scraper v{SCRAPER_VERSION} started', {
            'version': SCRAPER_VERSION
        })

        while True:
            try:
                # Check if scraper should be running
                check_result = await self.check_scraper_status()
                if isinstance(check_result, tuple):
                    enabled, config = check_result
                else:
                    enabled, config = check_result, {}

                if enabled:
                    # Update heartbeat
                    await self.update_heartbeat()

                    # Check if we're in a waiting period
                    now = datetime.now(timezone.utc)
                    if self.next_cycle_at and now < self.next_cycle_at:
                        # Still in waiting period - update every minute
                        wait_seconds = (self.next_cycle_at - now).total_seconds()
                        wait_minutes = int(wait_seconds / 60)

                        # Log every minute
                        if not hasattr(self, '_last_wait_minute') or self._last_wait_minute != wait_minutes:
                            logger.info(f"⏳ Waiting: {wait_minutes} minutes until next cycle")

                            # Log to system_logs every minute (not just every 10 minutes)
                            self._log_to_system('info', f'⏳ Waiting {wait_minutes} minutes until next cycle', {
                                'minutes_remaining': wait_minutes,
                                'next_cycle_at': self.next_cycle_at.isoformat(),
                                'hours_remaining': round(wait_minutes / 60, 1)
                            })

                            self._last_wait_minute = wait_minutes

                        # Short sleep during wait
                        await asyncio.sleep(1)
                    else:
                        # Time to run a new cycle
                        logger.info("🚀 Starting Instagram scraping cycle")

                        # Run the cycle
                        await self.run_scraping_cycle()

                        # After cycle, enter 4-hour wait
                        logger.info(f"💤 Entering {CYCLE_WAIT_HOURS}-hour wait period")
                        self._log_to_system('info', f'Starting {CYCLE_WAIT_HOURS}-hour wait period', {
                            'wait_hours': CYCLE_WAIT_HOURS,
                            'next_cycle_at': self.next_cycle_at.isoformat() if self.next_cycle_at else None
                        })
                else:
                    # Scraper disabled
                    logger.info("💤 Instagram scraper disabled - checking again in 30 seconds...")
                    await asyncio.sleep(30)

            except KeyboardInterrupt:
                logger.info("⛔ Received interrupt signal, shutting down...")
                break
            except Exception as e:
                logger.error(f"❌ Error in continuous loop: {e}")
                logger.info("⏳ Waiting 30 seconds before retry...")
                await asyncio.sleep(30)

        # Cleanup
        if self.scraper:
            self.scraper = None

        # Log shutdown
        try:
            self.supabase.table('system_control').update({
                'pid': None,
                'enabled': False,
                'status': 'stopped',
                'stopped_at': datetime.now(timezone.utc).isoformat()
            }).eq('script_name', 'instagram_scraper').execute()

            self._log_to_system('info', 'Instagram scraper stopped')
        except Exception as e:
            logger.error(f"Error logging shutdown: {e}")

        logger.info("👋 Instagram scraper stopped")

async def main():
    """Main entry point"""
    scraper = ContinuousInstagramScraper()

    try:
        # Run the continuous scraper
        await scraper.run_continuous()

    except Exception as e:
        logger.error(f"Fatal error: {e}")
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Traceback: {error_details}")

        # Try to log fatal error to Supabase
        try:
            if scraper.supabase:
                scraper.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'instagram_scraper',
                    'script_name': 'continuous_instagram_scraper',
                    'level': 'error',
                    'message': f'💥 Fatal error in Instagram scraper: {str(e)}',
                    'context': {
                        'error': str(e),
                        'error_type': type(e).__name__,
                        'traceback': error_details[:1000]
                    }
                }).execute()

                # Update status in system_control
                scraper.supabase.table('system_control').update({
                    'status': 'stopped',
                    'last_error': f"Fatal error: {str(e)[:500]}",
                    'last_error_at': datetime.now(timezone.utc).isoformat(),
                    'enabled': False
                }).eq('script_name', 'instagram_scraper').execute()
        except Exception:
            pass  # Can't log if Supabase is not available

        sys.exit(1)

if __name__ == "__main__":
    # Log startup immediately
    logging.info(f"Instagram scraper starting at {datetime.now(timezone.utc).isoformat()}")
    logging.info(f"Current directory: {os.getcwd()}")
    logging.info(f"Python version: {sys.version}")
    logging.info(f"Script version: {SCRAPER_VERSION}")

    # Check critical environment variables
    env_check = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "RAPIDAPI_KEY": os.getenv("RAPIDAPI_KEY")
    }

    logging.info("Environment variable check:")
    for key, value in env_check.items():
        status = "✅ SET" if value else "❌ MISSING"
        if key == "RAPIDAPI_KEY" and value:
            # Show partial key for verification
            partial = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
            logging.info(f"  {key}: {status} ({partial})")
        else:
            logging.info(f"  {key}: {status}")

    # Run the scraper
    asyncio.run(main())