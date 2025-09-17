#!/usr/bin/env python3
"""
Always-on Instagram Reels Scraper Runner
Runs the reels scraper on a schedule with jitter to avoid thundering herd
"""
import os
import sys
import time
import subprocess
import random
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment
INTERVAL_SECONDS = int(os.getenv('SCRAPER_INTERVAL_SECONDS', str(6 * 60 * 60)))  # 6 hours default
JITTER_SECONDS = int(os.getenv('SCRAPER_JITTER_SECONDS', '60'))  # up to 1 minute jitter

# Path to the one-shot scraper (can be overridden via env)
# Default to same directory as this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCRAPER_PATH = os.environ.get('SCRAPER_PATH', os.path.join(SCRIPT_DIR, 'reels-scraper.py'))
PYTHON_BIN = sys.executable  # relies on the virtualenv/interpreter in use


def log(msg: str) -> None:
    """Log message with timestamp."""
    print(f"[{datetime.utcnow().isoformat()}Z] {msg}", flush=True)


def run_once() -> int:
    """Run the reels scraper once and return exit code."""
    cmd = [PYTHON_BIN, SCRAPER_PATH]
    log(f"Running: {' '.join(cmd)}")
    try:
        proc = subprocess.run(cmd, stdout=sys.stdout, stderr=sys.stderr)
        return proc.returncode
    except Exception as e:
        log(f"Error running scraper: {e}")
        return 1


def main():
    """Main loop that runs the scraper on schedule."""
    log("Always-on Instagram Reels Scraper started")
    log(f"Scraper path: {SCRAPER_PATH}")
    log(f"Interval: {INTERVAL_SECONDS} seconds (~{INTERVAL_SECONDS/3600:.1f} hours)")
    log(f"Jitter: up to {JITTER_SECONDS} seconds")

    # Validate scraper exists
    if not os.path.exists(SCRAPER_PATH):
        log(f"ERROR: Scraper script not found at {SCRAPER_PATH}")
        sys.exit(1)

    while True:
        start_ts = time.time()
        rc = run_once()
        end_ts = time.time()
        runtime = max(0, int(end_ts - start_ts))

        log(f"Scraper finished with exit code {rc}; runtime={runtime}s (~{runtime/3600:.2f} h)")

        # Calculate sleep time to maintain interval
        base_sleep = max(0, INTERVAL_SECONDS - runtime)
        sleep_for = base_sleep + random.randint(0, JITTER_SECONDS)

        log(f"Sleeping for {sleep_for} seconds (~{sleep_for/3600:.2f} h) until next run")
        time.sleep(sleep_for)


if __name__ == '__main__':
    main()