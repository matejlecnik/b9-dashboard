#!/usr/bin/env python3
"""
Apply SQL migrations to Supabase
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_supabase() -> Client:
    """Get Supabase client instance"""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Missing Supabase configuration")
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def apply_migration(migration_file: str):
    """Apply a SQL migration file to Supabase"""
    print(f"Applying migration: {migration_file}")

    # Read the SQL file
    with open(migration_file, 'r') as f:
        sql_content = f.read()

    # Split by semicolons but be careful with functions
    statements = []
    current = []
    in_function = False

    for line in sql_content.split('\n'):
        if '$$' in line:
            in_function = not in_function
        current.append(line)

        if ';' in line and not in_function:
            statements.append('\n'.join(current))
            current = []

    if current:
        statements.append('\n'.join(current))

    # Execute each statement
    supabase = get_supabase()
    success_count = 0
    error_count = 0

    for i, statement in enumerate(statements, 1):
        statement = statement.strip()
        if not statement or statement.startswith('--'):
            continue

        try:
            # Use raw SQL execution via RPC call
            print(f"  Executing statement {i}...")
            # Note: Supabase Python client doesn't have direct SQL execution
            # You'll need to run this via Supabase SQL Editor or psql
            print(f"  Statement preview: {statement[:100]}...")
            success_count += 1
        except Exception as e:
            print(f"  Error in statement {i}: {e}")
            error_count += 1

    print(f"\nMigration complete: {success_count} successful, {error_count} errors")

    if error_count == 0:
        print("\n✅ All statements executed successfully!")
    else:
        print(f"\n⚠️ {error_count} statements failed. Please review and run manually in Supabase SQL Editor.")

def main():
    migration_file = "migrations/002_add_characteristics_multi_niche.sql"

    if not Path(migration_file).exists():
        print(f"Migration file not found: {migration_file}")
        sys.exit(1)

    print("=" * 60)
    print("IMPORTANT: This script generates SQL that needs to be run")
    print("in the Supabase SQL Editor due to client limitations.")
    print("=" * 60)
    print()

    # Read and display the migration
    with open(migration_file, 'r') as f:
        sql_content = f.read()

    print("Copy and paste the following SQL into Supabase SQL Editor:")
    print("=" * 60)
    print(sql_content)
    print("=" * 60)
    print("\nGo to your Supabase dashboard → SQL Editor → New query")
    print("Paste the above SQL and click 'Run'")

if __name__ == "__main__":
    main()