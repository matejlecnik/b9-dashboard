#!/usr/bin/env python3
"""
Startup script for B9 Dashboard API
Runs both the API server and continuous scraper
"""

import os
import sys
import subprocess
import threading
import signal
import time
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Track active threads to prevent duplicates
active_threads = {'scraper': None, 'api': None}
thread_lock = threading.Lock()

def run_scraper():
    """Run the continuous scraper in a thread"""
    with thread_lock:
        if active_threads['scraper'] is not None and active_threads['scraper'].is_alive():
            logger.warning("⚠️ Scraper thread already running, skipping duplicate")
            return

    logger.info("🔄 Starting continuous scraper thread...")
    try:
        # Change to api directory and run scraper
        os.chdir('/app/api')
        subprocess.run([sys.executable, "continuous_scraper.py"])
    except Exception as e:
        logger.error(f"❌ Scraper thread crashed: {e}")
    finally:
        with thread_lock:
            active_threads['scraper'] = None
            logger.info("🏏 Scraper thread ended")

def run_api():
    """Run the FastAPI server"""
    logger.info("🚀 Starting FastAPI server...")
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

    # Start continuous scraper in background thread (only one instance)
    with thread_lock:
        if active_threads['scraper'] is None or not active_threads['scraper'].is_alive():
            scraper_thread = threading.Thread(target=run_scraper, daemon=True, name="ScraperThread")
            active_threads['scraper'] = scraper_thread
            scraper_thread.start()
            logger.info("✅ Scraper thread started successfully")
        else:
            logger.warning("⚠️ Scraper thread already active, skipping")

    # Give scraper time to initialize
    time.sleep(3)

    # Run API server in main thread
    logger.info("🎁 Starting API server in main thread...")
    run_api()