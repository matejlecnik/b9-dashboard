#!/usr/bin/env python3
"""
Fix FORCE_STOP flag in system_control table
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client


# Load .env file
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Get Supabase credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    exit(1)

# Create Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("🔧 Updating system_control table...")

# Update the config to turn off FORCE_STOP and KILL_IMMEDIATELY
result = (
    supabase.table("system_control")
    .update({"config": {"FORCE_STOP": False, "KILL_IMMEDIATELY": False}})
    .eq("script_name", "instagram_scraper")
    .execute()
)

if result.data:
    print("✅ Successfully updated system_control:")
    print(f"   Script: {result.data[0]['script_name']}")
    print(f"   Status: {result.data[0]['status']}")
    print(f"   Config: {result.data[0]['config']}")
else:
    print("❌ Failed to update system_control")
    exit(1)
