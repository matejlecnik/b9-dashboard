import asyncio
import os
from services.categorization_service_tags import TagCategorizationService
from supabase import create_client

async def test_tags():
    # Set environment variables  
    supabase_url = "https://cetrhongdrjztsrsffuh.supabase.co"
    supabase_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgxNTgxMywiZXhwIjoyMDcyMzkxODEzfQ.AA29lfBpuIGc7Ss6D4YukZrsnBqpA3qcCbcmnSvt47A"
    openai_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_key:
        print("ERROR: Set OPENAI_API_KEY environment variable")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    service = TagCategorizationService(supabase, openai_key)
    
    # Test subreddits with different themes
    test_subs = [
        {'id': 909, 'name': 'CamGirls', 'title': 'Cam Girls', 'public_description': 'Beautiful cam girls', 'subscribers': 5000},
        {'id': 1729, 'name': 'CosplaySoCute', 'title': 'Cosplay So Cute', 'public_description': 'Cute cosplay girls', 'subscribers': 3000}, 
        {'id': 4909, 'name': 'FootFiends', 'title': 'Foot Fiends', 'public_description': 'For foot fetish lovers', 'subscribers': 2000},
        {'id': 86636, 'name': 'CosplayThots', 'title': 'Cosplay Thots', 'public_description': 'Sexy cosplay', 'subscribers': 10000},
    ]
    
    print("Testing tag categorization with 4 subreddits...")
    
    for sub in test_subs:
        print(f"\nTesting r/{sub['name']}...")
        result = await service.tag_single_subreddit(sub)
        
        if result.success:
            print(f"✅ Success!")
            print(f"   Tags: {', '.join(result.tags)}")
            print(f"   Primary: {result.primary_category}")
            print(f"   Cost: ${result.cost:.4f}")
        else:
            print(f"❌ Failed: {result.error_message}")

asyncio.run(test_tags())
