import asyncio
import os
import sys
from services.categorization_service import CategorizationService
from supabase import create_client

# Test with one subreddit
async def test():
    # Set environment variables
    supabase_url = "https://cetrhongdrjztsrsffuh.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgxNTgxMywiZXhwIjoyMDcyMzkxODEzfQ.AA29lfBpuIGc7Ss6D4YukZrsnBqpA3qcCbcmnSvt47A"
    openai_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_key:
        print("ERROR: OPENAI_API_KEY not set")
        return
        
    supabase = create_client(supabase_url, supabase_key)
    
    service = CategorizationService(supabase, openai_key)
    
    # Test with RedheadBeauties
    test_sub = {
        'id': 888,
        'name': 'RedheadBeauties',
        'title': 'Redhead Beauties',
        'public_description': 'Beautiful redhead girls and women',
        'subscribers': 1000
    }
    
    print(f"Testing categorization for r/{test_sub['name']}...")
    result = await service.categorize_subreddit(test_sub)
    print(f"✅ Category: {result.category}")
    print(f"✅ Success: {result.success}")
    if result.error_message:
        print(f"❌ Error: {result.error_message}")

asyncio.run(test())
