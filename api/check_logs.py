#!/usr/bin/env python3
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# Get Supabase client
supabase_url = os.getenv("SUPABASE_URL", "https://cetrhongdrjztsrsffuh.supabase.co")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgxNTgxMywiZXhwIjoyMDcyMzkxODEzfQ.AA29lfBpuIGc7Ss6D4YukZrsnBqpA3qcCbcmnSvt47A")
supabase = create_client(supabase_url, supabase_key)

# Get all tables with 'log' in the name
result = supabase.rpc('get_tables_with_log', {}).execute()
if result.data:
    print("Tables with 'log' in the name:")
    for table in result.data:
        print(f"  - {table}")
else:
    # Try direct query
    print("\nChecking log tables directly:")
    
    # List of potential log tables
    log_tables = [
        'reddit_scraper_logs',
        'scraper_logs',
        'api_logs',
        'error_logs',
        'system_logs',
        'logs'
    ]
    
    for table in log_tables:
        try:
            result = supabase.table(table).select('*').limit(1).execute()
            count_result = supabase.table(table).select('*', count='exact').execute()
            print(f"  ✓ {table}: {count_result.count if hasattr(count_result, 'count') else 'unknown'} records")
        except Exception as e:
            if "relation" not in str(e).lower():
                print(f"  ? {table}: {e}")

# Check what the scraper is actually using
print("\n📝 Checking recent logs from reddit_scraper_logs:")
try:
    logs = supabase.table('reddit_scraper_logs').select('*').order('timestamp', desc=True).limit(5).execute()
    for log in logs.data:
        print(f"  {log['timestamp']}: {log['message'][:80]}...")
except Exception as e:
    print(f"  Error: {e}")

print("\n📝 Checking scraper control status:")
try:
    control = supabase.table('scraper_control').select('*').execute()
    for c in control.data:
        print(f"  ID: {c['id']}, Enabled: {c['enabled']}, Last Updated: {c['last_updated']}")
except Exception as e:
    print(f"  Error: {e}")