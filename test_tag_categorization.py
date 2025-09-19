#!/usr/bin/env python3
"""
Test script for diagnosing tag categorization issues
Run this script to test the tag categorization service directly
"""

import os
import sys
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add the api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_section(title):
    """Print a section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")

def print_success(message):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message):
    """Print error message"""
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def print_info(message):
    """Print info message"""
    print(f"{Colors.YELLOW}ℹ {message}{Colors.ENDC}")

async def test_supabase_connection():
    """Test Supabase connection and query for untagged subreddits"""
    print_section("Testing Supabase Connection")

    try:
        from supabase import create_client

        # Get Supabase credentials
        url = os.getenv('SUPABASE_URL')
        key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not url or not key:
            print_error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
            return None

        print_info(f"Connecting to: {url}")

        # Create client
        supabase = create_client(url, key)
        print_success("Connected to Supabase")

        # Test query 1: Check for null tags
        print_info("\nQuery 1: Checking for subreddits with NULL tags...")
        response1 = supabase.table('reddit_subreddits').select(
            'id, name, tags, review'
        ).eq('review', 'Ok').filter('tags', 'is', 'null').limit(5).execute()

        print(f"  Found {len(response1.data or [])} subreddits with NULL tags")
        if response1.data:
            for sub in response1.data[:3]:
                print(f"    - {sub['name']} (id: {sub['id']})")

        # Test query 2: Check for empty array tags
        print_info("\nQuery 2: Checking for subreddits with empty [] tags...")
        response2 = supabase.table('reddit_subreddits').select(
            'id, name, tags, review'
        ).eq('review', 'Ok').eq('tags', '[]').limit(5).execute()

        print(f"  Found {len(response2.data or [])} subreddits with empty [] tags")
        if response2.data:
            for sub in response2.data[:3]:
                print(f"    - {sub['name']} (id: {sub['id']}, tags: {sub['tags']})")

        # Get total counts
        print_info("\nGetting total counts...")
        total_ok = supabase.table('reddit_subreddits').select('id', count='exact').eq('review', 'Ok').execute()
        total_untagged = len(response1.data or []) + len(response2.data or [])

        print(f"  Total OK subreddits: {total_ok.count}")
        print(f"  Total untagged (sample): {total_untagged}")

        # Return a test subreddit for further testing
        test_subreddit = None
        if response2.data:
            test_subreddit = response2.data[0]
        elif response1.data:
            test_subreddit = response1.data[0]

        if test_subreddit:
            print_success(f"\nTest subreddit selected: r/{test_subreddit['name']}")
        else:
            print_error("No untagged subreddits found!")

        return supabase, test_subreddit

    except Exception as e:
        print_error(f"Supabase connection failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None

async def test_openai_connection():
    """Test OpenAI API connection"""
    print_section("Testing OpenAI Connection")

    try:
        from openai import AsyncOpenAI

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print_error("Missing OPENAI_API_KEY in environment")
            return None

        print_info(f"API Key: {api_key[:20]}...")

        client = AsyncOpenAI(api_key=api_key)

        # Test with a simple completion
        print_info("Testing API with simple completion...")
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say 'test successful'"}],
            max_tokens=10
        )

        result = response.choices[0].message.content
        print_success(f"OpenAI API working: {result}")

        return client

    except Exception as e:
        print_error(f"OpenAI connection failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_tag_categorization_service(supabase, openai_client, test_subreddit):
    """Test the tag categorization service"""
    print_section("Testing Tag Categorization Service")

    if not supabase or not openai_client or not test_subreddit:
        print_error("Missing required components for testing")
        return

    try:
        # Import the service
        from services.categorization_service_tags import TagCategorizationService

        print_info("Initializing TagCategorizationService...")
        service = TagCategorizationService(supabase, os.getenv('OPENAI_API_KEY'))
        print_success("Service initialized")

        # Test fetching untagged subreddits
        print_info("\nTesting get_uncategorized_subreddits method...")
        untagged = await service.get_uncategorized_subreddits(limit=5)
        print(f"  Found {len(untagged)} untagged subreddits")

        if untagged:
            # Test categorizing a single subreddit
            print_info(f"\nTesting categorization for r/{untagged[0]['name']}...")
            print(f"  Title: {untagged[0].get('title', 'N/A')}")
            print(f"  Description: {untagged[0].get('public_description', 'N/A')[:100]}...")

            result = await service.categorize_subreddit(untagged[0])

            print(f"\n  Result:")
            print(f"    Success: {result.success}")
            print(f"    Tags: {result.tags}")
            print(f"    Primary Category: {result.primary_category}")
            print(f"    Confidence: {result.confidence}")
            if result.error_message:
                print(f"    Error: {result.error_message}")
            if result.cost:
                print(f"    Cost: ${result.cost:.4f}")

            if result.success:
                print_success(f"Successfully categorized r/{result.subreddit_name}")
            else:
                print_error(f"Failed to categorize: {result.error_message}")
        else:
            print_error("No untagged subreddits found by the service")

    except Exception as e:
        print_error(f"Tag categorization service test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_direct_categorization():
    """Test categorization with a direct API call"""
    print_section("Testing Direct Tag Assignment")

    try:
        from openai import AsyncOpenAI

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            print_error("Missing OPENAI_API_KEY")
            return

        client = AsyncOpenAI(api_key=api_key)

        # Test with a known subreddit
        test_prompt = """Analyze this Reddit subreddit and assign 2-4 relevant tags.

SUBREDDIT: r/tattoos
TITLE: Tattoos
DESCRIPTION: Welcome to /r/tattoos, a subreddit for the discussion and sharing of professional tattoos.

Assign tags from these categories:
- physical:mod:tattoos (for tattoo-related content)
- style:aesthetic:artistic (for artistic content)
- platform:type:showcase (for showing off content)

Return ONLY a JSON array of tags, nothing else.
"""

        print_info("Testing direct OpenAI call for tag assignment...")
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert at categorizing Reddit subreddits with tags."},
                {"role": "user", "content": test_prompt}
            ],
            temperature=0.1,
            max_tokens=100
        )

        result = response.choices[0].message.content
        print(f"  Response: {result}")

        # Try to parse as JSON
        import json
        try:
            tags = json.loads(result)
            print_success(f"Successfully parsed tags: {tags}")
        except:
            print_error("Failed to parse response as JSON")

    except Exception as e:
        print_error(f"Direct categorization test failed: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Run all tests"""
    print(f"\n{Colors.BOLD}Tag Categorization Diagnostic Test{Colors.ENDC}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Test 1: Supabase
    supabase, test_subreddit = await test_supabase_connection()

    # Test 2: OpenAI
    openai_client = await test_openai_connection()

    # Test 3: Tag Categorization Service
    if supabase and openai_client:
        await test_tag_categorization_service(supabase, openai_client, test_subreddit)

    # Test 4: Direct categorization
    await test_direct_categorization()

    print_section("Test Complete")

    if supabase and openai_client:
        print_success("Basic connections working - check service logs for errors")
    else:
        print_error("Connection issues detected - fix these first")

if __name__ == "__main__":
    asyncio.run(main())