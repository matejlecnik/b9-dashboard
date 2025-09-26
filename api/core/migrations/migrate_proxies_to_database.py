#!/usr/bin/env python3
"""
Migration script to set up reddit_proxies table with proxy configurations
Reads credentials from environment variables for security
"""

import os
import sys
import logging
from datetime import datetime, timezone
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def migrate_proxies():
    """Migrate proxy configurations to database"""

    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        logger.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
        return False

    try:
        supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Connected to Supabase")
    except Exception as e:
        logger.error(f"❌ Failed to connect to Supabase: {e}")
        return False

    # Proxy configurations with credentials from environment
    proxies = [
        {
            'service_name': 'beyondproxy',
            'proxy_url': 'proxy.beyondproxy.io:12321',
            'proxy_username': os.getenv('BEYONDPROXY_USERNAME', '9b1a4c15700a'),
            'proxy_password': os.getenv('BEYONDPROXY_PASSWORD', '654fa0b97850'),
            'display_name': 'BeyondProxy',
            'max_threads': 3,
            'priority': 100,
            'is_active': True
        },
        {
            'service_name': 'nyronproxy',
            'proxy_url': 'residential-ww.nyronproxies.com:16666',
            'proxy_username': os.getenv('NYRONPROXY_USERNAME', 'uxJNWsLXw3XnJE-zone-resi'),
            'proxy_password': os.getenv('NYRONPROXY_PASSWORD', 'cjB3tG2ij'),
            'display_name': 'NyronProxy',
            'max_threads': 3,
            'priority': 100,
            'is_active': True
        },
        {
            'service_name': 'rapidproxy',
            'proxy_url': 'eu.rapidproxy.io:5001',
            'proxy_username': os.getenv('RAPIDPROXY_USERNAME', 'admin123-residential-GLOBAL'),
            'proxy_password': os.getenv('RAPIDPROXY_PASSWORD', 'admin123'),
            'display_name': 'RapidProxy',
            'max_threads': 3,
            'priority': 100,
            'is_active': True
        }
    ]

    # Check if credentials are properly set
    missing_creds = []
    for proxy in proxies:
        if not proxy['proxy_username'] or not proxy['proxy_password']:
            missing_creds.append(proxy['service_name'])

    if missing_creds:
        logger.warning(f"⚠️ Missing credentials for: {', '.join(missing_creds)}")
        logger.warning("Using default credentials. Please update .env file!")

    # Insert or update proxies
    success_count = 0
    for proxy in proxies:
        try:
            # Check if proxy already exists
            existing = supabase.table('reddit_proxies').select('id').eq(
                'service_name', proxy['service_name']
            ).execute()

            if existing.data:
                # Update existing proxy
                result = supabase.table('reddit_proxies').update({
                    'proxy_url': proxy['proxy_url'],
                    'proxy_username': proxy['proxy_username'],
                    'proxy_password': proxy['proxy_password'],
                    'display_name': proxy['display_name'],
                    'max_threads': proxy['max_threads'],
                    'priority': proxy['priority'],
                    'is_active': proxy['is_active'],
                    'updated_at': datetime.now(timezone.utc).isoformat()
                }).eq('service_name', proxy['service_name']).execute()

                logger.info(f"✅ Updated proxy: {proxy['display_name']}")
            else:
                # Insert new proxy
                result = supabase.table('reddit_proxies').insert(proxy).execute()
                logger.info(f"✅ Created proxy: {proxy['display_name']}")

            success_count += 1

        except Exception as e:
            logger.error(f"❌ Failed to migrate {proxy['service_name']}: {e}")

    logger.info(f"🎉 Migration complete: {success_count}/{len(proxies)} proxies migrated")

    # Verify migration
    try:
        active_proxies = supabase.table('reddit_proxies').select(
            'service_name, display_name, max_threads, is_active'
        ).eq('is_active', True).execute()

        logger.info(f"\n📊 Active proxies in database:")
        for proxy in active_proxies.data:
            logger.info(f"   - {proxy['display_name']}: {proxy['max_threads']} threads")

        total_threads = sum(p['max_threads'] for p in active_proxies.data)
        logger.info(f"   Total threads available: {total_threads}")

    except Exception as e:
        logger.error(f"❌ Failed to verify migration: {e}")

    return success_count == len(proxies)


def add_env_template():
    """Create or update .env.example with proxy credentials template"""

    env_template = """
# Proxy Credentials for Reddit Scraper
# Add these to your .env file with actual credentials

# BeyondProxy
BEYONDPROXY_USERNAME=your_beyondproxy_username
BEYONDPROXY_PASSWORD=your_beyondproxy_password

# NyronProxy
NYRONPROXY_USERNAME=your_nyronproxy_username
NYRONPROXY_PASSWORD=your_nyronproxy_password

# RapidProxy
RAPIDPROXY_USERNAME=your_rapidproxy_username
RAPIDPROXY_PASSWORD=your_rapidproxy_password
"""

    env_example_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        '.env.example'
    )

    try:
        # Check if .env.example exists
        if os.path.exists(env_example_path):
            with open(env_example_path, 'r') as f:
                content = f.read()

            # Check if proxy section already exists
            if 'Proxy Credentials for Reddit Scraper' not in content:
                # Append proxy section
                with open(env_example_path, 'a') as f:
                    f.write(env_template)
                logger.info(f"✅ Updated {env_example_path} with proxy credential template")
            else:
                logger.info(f"ℹ️ Proxy credentials already in {env_example_path}")
        else:
            # Create new .env.example
            with open(env_example_path, 'w') as f:
                f.write(env_template)
            logger.info(f"✅ Created {env_example_path} with proxy credential template")

    except Exception as e:
        logger.error(f"❌ Failed to update .env.example: {e}")


if __name__ == "__main__":
    logger.info("🚀 Starting proxy migration to database...")

    # Add environment template
    add_env_template()

    # Run migration
    success = migrate_proxies()

    if success:
        logger.info("✅ Migration completed successfully!")
        sys.exit(0)
    else:
        logger.error("❌ Migration failed!")
        sys.exit(1)