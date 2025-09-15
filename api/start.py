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

def run_scraper():
    """Run the continuous scraper in a thread"""
    print("🔄 Starting continuous scraper...")
    subprocess.run([sys.executable, "continuous_scraper.py"])

def run_api():
    """Run the FastAPI server"""
    print("🚀 Starting FastAPI server...")
    port = os.environ.get('PORT', '8000')
    subprocess.run([
        "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", port
    ])

def signal_handler(sig, frame):
    """Handle shutdown signals"""
    print("\n🛑 Shutting down services...")
    sys.exit(0)

if __name__ == "__main__":
    # Handle shutdown signals
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    print("🚀 Starting B9 Dashboard Services...")
    
    # Start continuous scraper in background thread
    scraper_thread = threading.Thread(target=run_scraper, daemon=True)
    scraper_thread.start()
    
    # Give scraper time to initialize
    time.sleep(2)
    
    # Run API server in main thread
    run_api()