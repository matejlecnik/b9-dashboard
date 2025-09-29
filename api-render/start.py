#!/usr/bin/env python3
"""
Startup script for B9 Dashboard API
Runs the API server and optionally starts the scraper if enabled in database
"""

import os
import sys
import subprocess
import signal
import logging
from datetime import datetime, timezone

# Import system logger using flexible import approach for both dev and production
try:
    # Production path (Docker) 
    from utils.system_logger import system_logger
except ImportError:
    try:
        # Development path (absolute import)
        from api_render.utils.system_logger import system_logger
    except ImportError:
        system_logger = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_and_start_scrapers():
    """Check database and start both Reddit and Instagram scrapers if enabled"""
    try:
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            logger.warning("⚠️ Supabase not configured, skipping scraper auto-start check")
            return

        supabase = create_client(supabase_url, supabase_key)

        # Check and start Reddit scraper
        try:
            result = supabase.table('system_control').select('*').eq('script_name', 'reddit_scraper').execute()

            if result.data and len(result.data) > 0 and result.data[0].get('enabled'):
                logger.info("🔄 Reddit scraper is enabled in database, starting subprocess...")

                # Change to API directory first (crucial for imports)
                original_cwd = os.getcwd()
                try:
                    os.chdir('/app/api')

                    # Open log file for Reddit scraper output
                    reddit_log = open('/tmp/reddit_scraper.log', 'w')

                    # Start with output to log file so we can see errors
                    reddit_process = subprocess.Popen(
                        [sys.executable, "-u", "scrapers/reddit/continuous.py"],
                        stdout=reddit_log,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        start_new_session=True,  # Detach from parent
                        cwd='/app/api'  # Ensure correct working directory
                    )

                    # Check if process is still running after a brief moment
                    import time
                    time.sleep(2)  # Startup context - sync sleep is acceptable here

                    if reddit_process.poll() is None:
                        # Process is still running
                        logger.info(f"✅ Reddit scraper auto-started with PID: {reddit_process.pid}")

                        # Update heartbeat in database
                        supabase.table('system_control').update({
                            'last_heartbeat': datetime.now(timezone.utc).isoformat(),
                            'status': 'running',
                            'updated_by': 'auto_start'
                        }).eq('script_name', 'reddit_scraper').execute()

                        if system_logger:
                            system_logger.info(
                                "Reddit scraper auto-started",
                                source="api",
                                script_name="start",
                                context={"pid": reddit_process.pid, "auto_start": True}
                            )
                    else:
                        # Process died immediately, read error from log
                        reddit_log.close()
                        with open('/tmp/reddit_scraper.log', 'r') as f:
                            error_output = f.read()
                        logger.error(f"❌ Reddit scraper died immediately. Error: {error_output}")

                        # Mark as stopped in database
                        supabase.table('system_control').update({
                            'enabled': False,
                            'status': 'stopped',
                            'last_error': f"Failed to start: {error_output[:500]}",
                            'updated_by': 'auto_start'
                        }).eq('script_name', 'reddit_scraper').execute()

                finally:
                    os.chdir(original_cwd)

            else:
                logger.info("💤 Reddit scraper is disabled in database, not starting")
        except Exception as e:
            logger.error(f"❌ Error checking Reddit scraper: {e}")

        # Check and start Instagram scraper
        try:
            result = supabase.table('system_control').select('*').eq('script_name', 'instagram_scraper').execute()

            if result.data and len(result.data) > 0 and result.data[0].get('enabled'):
                logger.info("🔄 Instagram scraper is enabled in database, starting subprocess...")

                # Change to API directory first (crucial for imports)
                original_cwd = os.getcwd()
                try:
                    os.chdir('/app/api')

                    # Open log file for Instagram scraper output
                    instagram_log = open('/tmp/instagram_scraper.log', 'w')

                    # Start with output to log file so we can see errors
                    instagram_process = subprocess.Popen(
                        [sys.executable, "-u", "core/continuous_instagram_scraper.py"],
                        stdout=instagram_log,
                        stderr=subprocess.STDOUT,
                        stdin=subprocess.DEVNULL,
                        start_new_session=True,  # Detach from parent
                        cwd='/app/api'  # Ensure correct working directory
                    )

                    # Check if process is still running after a brief moment
                    import time
                    time.sleep(2)  # Startup context - sync sleep is acceptable here

                    if instagram_process.poll() is None:
                        # Process is still running
                        logger.info(f"✅ Instagram scraper auto-started with PID: {instagram_process.pid}")

                        # Update heartbeat in database
                        supabase.table('system_control').update({
                            'last_heartbeat': datetime.now(timezone.utc).isoformat(),
                            'status': 'running',
                            'updated_by': 'auto_start'
                        }).eq('script_name', 'instagram_scraper').execute()

                        if system_logger:
                            system_logger.info(
                                f"Instagram scraper auto-started",
                                source="api",
                                script_name="start",
                                context={"pid": instagram_process.pid, "auto_start": True}
                            )
                    else:
                        # Process died immediately, read error from log
                        instagram_log.close()
                        with open('/tmp/instagram_scraper.log', 'r') as f:
                            error_output = f.read()
                        logger.error(f"❌ Instagram scraper died immediately. Error: {error_output}")

                        # Mark as stopped in database
                        supabase.table('system_control').update({
                            'enabled': False,
                            'status': 'stopped',
                            'last_error': f"Failed to start: {error_output[:500]}",
                            'updated_by': 'auto_start'
                        }).eq('script_name', 'instagram_scraper').execute()

                finally:
                    os.chdir(original_cwd)

            else:
                logger.info("💤 Instagram scraper is disabled in database, not starting at startup")
        except Exception as e:
            logger.error(f"❌ Error checking Instagram scraper: {e}")

    except Exception as e:
        logger.error(f"❌ Error checking scraper auto-start: {e}")
        if system_logger:
            system_logger.error(
                f"Error checking scraper auto-start: {e}",
                source="api",
                script_name="start",
                context={"error": str(e)},
                sync=True
            )

def run_api():
    """Run the FastAPI server"""
    logger.info("🚀 Starting FastAPI server...")
    if system_logger:
        system_logger.info(
            "Starting FastAPI server",
            source="api",
            script_name="start",
            context={"port": os.environ.get('PORT', '8000')}
        )
    port = os.environ.get('PORT', '8000')
    try:
        # Change to api directory for API as well
        os.chdir('/app/api')
        subprocess.run([
            "uvicorn", "main:app",
            "--host", "0.0.0.0",
            "--port", port
        ])
    except Exception as e:
        logger.error(f"❌ API server crashed: {e}")

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    logger.info("\n🛑 Shutting down services gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    # Handle shutdown signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("🚀 Starting B9 Dashboard Services...")
    logger.info(f"📋 Environment: {os.environ.get('ENVIRONMENT', 'unknown')}")
    logger.info(f"🌐 Port: {os.environ.get('PORT', '8000')}")

    # Run cleanup of old files on startup
    try:
        logger.info("🧹 Running cleanup of old files...")
        subprocess.run([sys.executable, "cleanup_old_files.py"], cwd='/app/api', timeout=10)
        logger.info("✅ Cleanup complete")
    except Exception as e:
        logger.warning(f"⚠️ Cleanup script failed (non-critical): {e}")

    # Check if scrapers should auto-start based on database state
    logger.info("🔍 Checking if scrapers should auto-start...")
    check_and_start_scrapers()

    # Run API server in main thread
    logger.info("🎁 Starting API server in main thread...")
    run_api()