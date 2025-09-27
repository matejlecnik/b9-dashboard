#!/usr/bin/env python3
"""
Cleanup script to remove old files that are causing issues
This will run once on deployment to clean up legacy files
"""
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_old_files():
    """Remove old files that shouldn't exist anymore"""

    old_files = [
        '/app/api/core/reddit_scraper_v2.py',
        '/app/api/core/reddit_scraper_v2.pyc',
        '/app/api/core/__pycache__/reddit_scraper_v2.cpython-*.pyc',
        '/app/api/core/continuous_scraper_v2.py',
        '/app/api/core/continuous_scraper_v2.pyc',
        '/app/api/core/__pycache__/continuous_scraper_v2.cpython-*.pyc',
    ]

    removed_count = 0
    for filepath in old_files:
        # Handle wildcards in __pycache__ files
        if '*' in filepath:
            import glob
            for match in glob.glob(filepath):
                if os.path.exists(match):
                    try:
                        os.remove(match)
                        logger.info(f"✅ Removed old file: {match}")
                        removed_count += 1
                    except Exception as e:
                        logger.error(f"❌ Failed to remove {match}: {e}")
        else:
            if os.path.exists(filepath):
                try:
                    os.remove(filepath)
                    logger.info(f"✅ Removed old file: {filepath}")
                    removed_count += 1
                except Exception as e:
                    logger.error(f"❌ Failed to remove {filepath}: {e}")

    logger.info(f"🧹 Cleanup complete: Removed {removed_count} old files")

    # Log to Supabase that cleanup was performed
    try:
        from datetime import datetime, timezone
        from supabase import create_client

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if supabase_url and supabase_key:
            supabase = create_client(supabase_url, supabase_key)
            supabase.table('system_logs').insert({
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'cleanup',
                'script_name': 'cleanup_old_files',
                'level': 'info',
                'message': f'🧹 Cleaned up {removed_count} old files from Render server',
                'context': {'files_removed': removed_count}
            }).execute()
    except Exception as e:
        logger.error(f"Could not log to Supabase: {e}")

if __name__ == "__main__":
    cleanup_old_files()