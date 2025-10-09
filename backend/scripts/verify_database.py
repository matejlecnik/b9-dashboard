#!/usr/bin/env python3
"""
Database Verification Script
Queries Supabase to verify test results and data integrity
"""
import os
import sys
from datetime import datetime, timedelta

from dotenv import load_dotenv
from supabase import Client, create_client


# Load environment variables
env_path = os.path.join(os.path.dirname(__file__), '../../.env.api')
load_dotenv(env_path)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.api")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def print_header(title):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def verify_instagram_creator(username: str):
    """Verify an Instagram creator exists and check their data"""
    print_header(f"Instagram Creator: @{username}")

    try:
        result = supabase.table("instagram_creators").select("*").eq("username", username).execute()

        if not result.data:
            print(f"❌ Creator @{username} NOT FOUND in database")
            return None

        creator = result.data[0]
        print(f"✅ Creator @{username} EXISTS in database")
        print(f"   ID: {creator.get('id')}")
        print(f"   IG User ID: {creator.get('ig_user_id')}")
        print(f"   Full Name: {creator.get('full_name') or 'NULL'}")

        followers = creator.get('followers_count')
        following = creator.get('following_count')
        posts = creator.get('posts_count')

        print(f"   Followers: {followers:,}" if followers is not None else "   Followers: NULL")
        print(f"   Following: {following:,}" if following is not None else "   Following: NULL")
        print(f"   Posts Count: {posts}" if posts is not None else "   Posts Count: NULL")
        print(f"   Review Status: {creator.get('review_status') or 'NULL'}")
        print(f"   Niche: {creator.get('niche') or 'NULL'}")
        print(f"   Added At: {creator.get('added_at') or 'NULL'}")
        print(f"   Last Scraped: {creator.get('last_scraped_at') or 'NULL'}")

        # Check associated content
        reels_count = supabase.table("instagram_reels").select("id", count="exact").eq("creator_id", creator['id']).execute()
        posts_count = supabase.table("instagram_posts").select("id", count="exact").eq("creator_id", creator['id']).execute()

        print("\n   📊 Content Stats:")
        print(f"   Reels in DB: {reels_count.count}")
        print(f"   Posts in DB: {posts_count.count}")

        return creator

    except Exception as e:
        print(f"❌ Error querying creator: {e}")
        return None

def check_recent_system_logs(source: str = None, minutes: int = 10, limit: int = 20):
    """Check recent system logs"""
    print_header(f"Recent System Logs (last {minutes} minutes)")

    try:
        cutoff_time = (datetime.utcnow() - timedelta(minutes=minutes)).isoformat()

        query = supabase.table("system_logs").select("*").gte("timestamp", cutoff_time).order("timestamp", desc=True).limit(limit)

        if source:
            query = query.eq("source", source)

        result = query.execute()

        if not result.data:
            print(f"❌ No logs found in last {minutes} minutes")
            if source:
                print(f"   Source filter: {source}")
            return []

        print(f"✅ Found {len(result.data)} log entries")
        print(f"\n{'Timestamp':<20} {'Source':<30} {'Level':<8} {'Message'[:40]}")
        print("-"*100)

        for log in result.data:
            timestamp = log.get('timestamp', '')[:19]
            source_name = log.get('source', '')[:28]
            level = log.get('level', '')[:6]
            message = log.get('message', '')[:60]
            print(f"{timestamp:<20} {source_name:<30} {level:<8} {message}")

        return result.data

    except Exception as e:
        print(f"❌ Error querying logs: {e}")
        return []

def check_scraper_status(scraper_name: str):
    """Check scraper control status"""
    print_header(f"Scraper Status: {scraper_name}")

    try:
        result = supabase.table("system_control").select("*").eq("script_name", scraper_name).execute()

        if not result.data:
            print(f"❌ Scraper '{scraper_name}' NOT FOUND in system_control")
            return None

        control = result.data[0]
        print(f"✅ Scraper '{scraper_name}' found")
        print(f"   Is Running: {control.get('is_running')}")
        print(f"   Last Started: {control.get('last_started_at')}")
        print(f"   Last Stopped: {control.get('last_stopped_at')}")
        print(f"   Last Heartbeat: {control.get('last_heartbeat_at')}")

        return control

    except Exception as e:
        print(f"❌ Error querying scraper status: {e}")
        return None

def check_api_call_logs(username: str = None):
    """Check API call logs from system_logs"""
    print_header("API Calls from System Logs")

    try:
        query = supabase.table("system_logs").select("*").eq("source", "instagram_scraper").order("timestamp", desc=True).limit(30)

        if username:
            query = query.ilike("message", f"%{username}%")

        result = query.execute()

        if not result.data:
            print("❌ No Instagram API logs found")
            return []

        # Filter for API requests/responses
        api_logs = [log for log in result.data if "API Request" in log.get('message', '') or "API Response" in log.get('message', '')]

        if not api_logs:
            print("❌ No API request/response logs found")
            return []

        print(f"✅ Found {len(api_logs)} API call logs")

        print(f"\n{'Timestamp':<20} {'Message'[:70]}")
        print("-"*95)

        for log in api_logs[:15]:  # Show first 15
            timestamp = log.get('timestamp', '')[:19]
            message = log.get('message', '')[:68]
            print(f"{timestamp:<20} {message}")

        return api_logs

    except Exception as e:
        print(f"❌ Error querying API logs: {e}")
        return []

def main():
    """Main verification routine"""
    print("\n" + "="*60)
    print("  B9 Dashboard - Database Verification")
    print("  Production Environment")
    print("="*60)
    print(f"  Supabase URL: {supabase_url}")
    print(f"  Timestamp: {datetime.utcnow().isoformat()}Z")
    print("="*60)

    # Check NASA creator from Phase 3 tests
    nasa_creator = verify_instagram_creator("nasa")

    # Check scraper statuses
    check_scraper_status("reddit_scraper")
    check_scraper_status("instagram_scraper")

    # Check recent logs
    check_recent_system_logs(minutes=60, limit=30)

    # Check API call logs for NASA
    check_api_call_logs(username="nasa")

    print("\n" + "="*60)
    print("  Verification Complete")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
