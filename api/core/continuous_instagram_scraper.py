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

                    # First log current configuration state
                    logger.info(f"   RAPIDAPI_KEY: {'✅ SET' if Config.RAPIDAPI_KEY else '❌ MISSING'}")
                    logger.info(f"   RapidAPI Host: {Config.RAPIDAPI_HOST}")
                    logger.info(f"   Supabase URL: {'✅ SET' if Config.SUPABASE_URL else '❌ MISSING'}")
                    logger.info(f"   Supabase Key: {'✅ SET' if Config.SUPABASE_KEY else '❌ MISSING'}")

                    # Now validate - this will raise if missing
                    Config.validate()
                    logger.info("✅ Configuration validated successfully")

                    # Initialize the scraper
                    logger.info("Creating InstagramScraperUnified instance...")
                    logger.info(f"Current memory usage: {psutil.Process().memory_info().rss / 1024 / 1024:.1f} MB")

                    self.scraper = InstagramScraperUnified()
                    logger.info("✅ Instagram scraper initialized successfully")

                    # Log memory after creation
                    logger.info(f"Memory after scraper creation: {psutil.Process().memory_info().rss / 1024 / 1024:.1f} MB")

                except ValueError as e:
                    logger.error(f"❌ Configuration validation failed: {e}")
                    # Log specific missing variables
                    logger.error(f"   RAPIDAPI_KEY: {'SET' if os.getenv('RAPIDAPI_KEY') else 'MISSING'}")
                    logger.error(f"   SUPABASE_URL: {'SET' if os.getenv('SUPABASE_URL') else 'MISSING'}")
                    logger.error(f"   SUPABASE_SERVICE_ROLE_KEY: {'SET' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'MISSING'}")

                    # Update database with error
                    self.supabase.table('system_control').update({
                        'enabled': False,
                        'status': 'error',
                        'last_error': str(e)[:500],
                        'last_error_at': datetime.now(timezone.utc).isoformat()
                    }).eq('script_name', 'instagram_scraper').execute()
                    raise

                except Exception as e:
                    logger.error(f"❌ Failed to initialize Instagram scraper: {e}")
                    import traceback
                    error_trace = traceback.format_exc()
                    logger.error(f"Traceback: {error_trace}")

                    # Update database with error
                    self.supabase.table('system_control').update({
                        'enabled': False,
                        'status': 'error',
                        'last_error': f"Init failed: {str(e)[:400]}",
                        'last_error_at': datetime.now(timezone.utc).isoformat()
                    }).eq('script_name', 'instagram_scraper').execute()
                    raise

            # Run the scraping in a thread with timeout protection
            logger.info("Starting Instagram scraper run() method with timeout protection...")
            try:
                # Add timeout of 30 minutes (1800 seconds) for the scraper run
                SCRAPER_TIMEOUT_SECONDS = 1800
                logger.info(f"⏱️ Setting timeout of {SCRAPER_TIMEOUT_SECONDS/60} minutes for scraper run")

                # Run with timeout protection
                await asyncio.wait_for(
                    asyncio.to_thread(self.scraper.run),
                    timeout=SCRAPER_TIMEOUT_SECONDS
                )
                logger.info("✅ Instagram scraper run() method completed successfully")

            except asyncio.TimeoutError:
                logger.error(f"⏱️ TIMEOUT: Instagram scraper exceeded {SCRAPER_TIMEOUT_SECONDS/60} minute limit")
                # Log timeout to Supabase
                try:
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'instagram_scraper',
                        'script_name': 'continuous_instagram_scraper',
                        'level': 'error',
                        'message': f'⏱️ Scraper timeout after {SCRAPER_TIMEOUT_SECONDS/60} minutes',
                        'context': {
                            'cycle': self.cycle_count,
                            'timeout_seconds': SCRAPER_TIMEOUT_SECONDS,
                            'error_type': 'timeout'
                        }
                    }).execute()
                except:
                    pass
                # Don't re-raise, continue to cycle completion
                logger.warning("Continuing to cycle completion despite timeout...")

            except Exception as e:
                logger.error(f"❌ Error in scraper run() method: {e}")
                import traceback
                error_trace = traceback.format_exc()
                logger.error(f"Traceback: {error_trace}")

                # Update database with error details
                try:
                    self.supabase.table('system_control').update({
                        'status': 'error',
                        'last_error': f"Scraper crashed: {str(e)[:400]}",
                        'last_error_at': datetime.now(timezone.utc).isoformat()
                    }).eq('script_name', 'instagram_scraper').execute()

                    # Log error to system_logs
                    self.supabase.table('system_logs').insert({
                        'timestamp': datetime.now(timezone.utc).isoformat(),
                        'source': 'instagram_scraper',
                        'script_name': 'continuous_instagram_scraper',
                        'level': 'error',
                        'message': f'❌ Scraper crashed during cycle #{self.cycle_count}: {str(e)}',
                        'context': {
                            'cycle': self.cycle_count,
                            'error': str(e),
                            'traceback': error_trace[:1000]  # Limit traceback size
                        }
                    }).execute()
                except Exception as log_error:
                    logger.error(f"Failed to log error to database: {log_error}")

                # Don't re-raise, continue to cycle completion logic
                logger.warning("Continuing to cycle completion despite error...")

            # IMPORTANT: Log that we're entering the cycle completion section
            logger.info("=" * 60)
            logger.info("ENTERING CYCLE COMPLETION SECTION")
            logger.info("=" * 60)

            # Log to Supabase that we're in completion section
            try:
                self.supabase.table('system_logs').insert({
                    'timestamp': datetime.now(timezone.utc).isoformat(),
                    'source': 'instagram_scraper',
                    'script_name': 'continuous_instagram_scraper',
                    'level': 'info',
                    'message': '📊 Entering cycle completion section - preparing wait period',
                    'context': {'cycle': self.cycle_count, 'phase': 'cycle_completion'}
                }).execute()
            except Exception as log_error:
                logger.warning(f"Could not log completion section entry: {log_error}")

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

            # Get scraper stats (with better error handling)
            try:
                creators_processed = self.scraper.creators_processed if self.scraper and hasattr(self.scraper, 'creators_processed') else 0
                api_calls_made = self.scraper.api_calls_made if self.scraper and hasattr(self.scraper, 'api_calls_made') else 0
                logger.info(f"Retrieved scraper stats: {creators_processed} creators, {api_calls_made} API calls")
            except Exception as stats_error:
                logger.warning(f"Could not retrieve scraper stats: {stats_error}")
                creators_processed = 0
                api_calls_made = 0

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
                        'api_calls_today': api_calls_made,
                        'in_waiting_period': True,
                        'waiting_until': self.next_cycle_at.isoformat()
                    },
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('script_name', 'instagram_scraper').execute()
            except Exception as e:
                logger.error(f"Failed to update cycle info: {e}")

            # Create prominent cycle completion message
            separator = "=" * 60
            logger.info(separator)
            logger.info("🎉 INSTAGRAM SCRAPER CYCLE COMPLETE 🎉")
            logger.info(separator)
            logger.info(f"✅ Cycle #{self.cycle_count} finished successfully")
            logger.info(f"👥 Creators Processed: {creators_processed}")
            logger.info(f"📊 API Calls Made: {api_calls_made}")
            logger.info(f"⏱️ Duration: {duration_formatted}")
            logger.info(f"💤 ENTERING {CYCLE_WAIT_HOURS}-HOUR WAITING PERIOD")
            logger.info(f"⏰ Next Cycle: {self.next_cycle_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            logger.info(separator)

            # Log to Supabase with SUCCESS level for visibility
            wait_msg = f"🎉 CYCLE #{self.cycle_count} COMPLETE | Processed {creators_processed} profiles | Waiting {CYCLE_WAIT_HOURS} hours | Next: {self.next_cycle_at.strftime('%H:%M:%S UTC')}"

            self.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_scraper',
                'script_name': 'continuous_instagram_scraper',
                'level': 'success',  # Changed to success for better visibility
                'message': wait_msg,
                'context': {
                    'cycle_completed': self.cycle_count,
                    'wait_hours': CYCLE_WAIT_HOURS,
                    'next_cycle_at': self.next_cycle_at.isoformat(),
                    'creators_processed': creators_processed,
                    'api_calls': api_calls_made,
                    'duration_formatted': duration_formatted,
                    'in_waiting_period': True
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

                        # Log status every 30 minutes or when getting close
                        should_log = False
                        log_level = logger.debug

                        # Determine when to log
                        if not hasattr(self, 'last_wait_log_time'):
                            self.last_wait_log_time = now
                            should_log = True
                            log_level = logger.info
                        elif (now - self.last_wait_log_time).total_seconds() >= 1800:  # Every 30 minutes
                            should_log = True
                            log_level = logger.info
                            self.last_wait_log_time = now
                        elif wait_seconds <= 60:  # Last minute
                            should_log = True
                            log_level = logger.info

                        if should_log:
                            if wait_seconds > 3600:  # More than 1 hour
                                wait_hours = wait_seconds / 3600
                                wait_msg = f"⏳ WAITING PERIOD: {wait_hours:.1f} hours remaining until next cycle at {self.next_cycle_at.strftime('%H:%M:%S UTC')}"
                                log_level(wait_msg)

                                # Log to Supabase for visibility
                                if log_level == logger.info:
                                    self.supabase.table('system_logs').insert({
                                        'timestamp': now.isoformat(),
                                        'source': 'instagram_scraper',
                                        'script_name': 'continuous_instagram_scraper',
                                        'level': 'info',
                                        'message': f"⏳ Waiting: {wait_hours:.1f}h remaining",
                                        'context': {
                                            'in_waiting_period': True,
                                            'hours_remaining': round(wait_hours, 1),
                                            'next_cycle_at': self.next_cycle_at.isoformat()
                                        }
                                    }).execute()
                            elif wait_seconds > 60:  # More than 1 minute
                                wait_minutes = wait_seconds / 60
                                wait_msg = f"⏳ WAITING PERIOD: {wait_minutes:.1f} minutes remaining until next cycle"
                                log_level(wait_msg)
                            else:
                                wait_msg = f"⏰ CYCLE STARTING SOON: {wait_seconds:.0f} seconds until next cycle!"
                                logger.info(wait_msg)
                    else:
                        # Time to run a new cycle or no previous cycle
                        logger.info("=" * 60)
                        logger.info("🚀 STARTING NEW INSTAGRAM SCRAPING CYCLE")
                        logger.info("=" * 60)

                        # Clear the last wait log time
                        if hasattr(self, 'last_wait_log_time'):
                            del self.last_wait_log_time

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

        # Log startup to Supabase
        try:
            scraper.supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'instagram_scraper',
                'script_name': 'continuous_instagram_scraper',
                'level': 'info',
                'message': f'🚀 Instagram scraper v{SCRAPER_VERSION} process started',
                'context': {
                    'version': SCRAPER_VERSION,
                    'pid': os.getpid(),
                    'rapidapi_key_set': bool(Config.RAPIDAPI_KEY),
                    'supabase_url_set': bool(Config.SUPABASE_URL),
                    'supabase_key_set': bool(Config.SUPABASE_KEY)
                }
            }).execute()
        except Exception as log_error:
            logger.warning(f"Could not log startup to Supabase: {log_error}")

        # Run the continuous scraper
        await scraper.run()

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
        except:
            pass  # Can't log if Supabase is not available

        sys.exit(1)

if __name__ == "__main__":
    # Log startup immediately
    print(f"🚀 Instagram scraper starting at {datetime.now(timezone.utc).isoformat()}")
    print(f"📍 Current directory: {os.getcwd()}")
    print(f"🐍 Python version: {sys.version}")
    print(f"📦 Script version: {SCRAPER_VERSION}")

    # Check critical environment variables
    env_check = {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_SERVICE_ROLE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "RAPIDAPI_KEY": os.getenv("RAPIDAPI_KEY")
    }

    print("\n🔍 Environment variable check:")
    for key, value in env_check.items():
        status = "✅ SET" if value else "❌ MISSING"
        if key == "RAPIDAPI_KEY" and value:
            # Show partial key for verification
            partial = f"{value[:8]}...{value[-4:]}" if len(value) > 12 else "***"
            print(f"  {key}: {status} ({partial})")
        else:
            print(f"  {key}: {status}")

    # Run the scraper
    asyncio.run(main())