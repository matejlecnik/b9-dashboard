#!/usr/bin/env python3
"""
Working test script for tag categorization
Tests the complete flow locally before deploying to Render
"""

import os
import sys
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the api directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from openai import AsyncOpenAI
from supabase import create_client
from services.categorization_service_tags import TagCategorizationService

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.YELLOW}ℹ {message}{Colors.ENDC}")

def print_section(title):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")

async def test_direct_openai():
    """Test OpenAI API directly to ensure it's working"""
    print_section("Testing OpenAI API Directly")

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print_error("OPENAI_API_KEY not found in environment")
        return False

    print_success(f"API Key found: {api_key[:10]}...")

    client = AsyncOpenAI(api_key=api_key)

    # Test with a simple categorization request
    test_prompt = """Analyze this Reddit subreddit and assign relevant tags.

SUBREDDIT: r/AsianHotties
TITLE: Asian Hotties
DESCRIPTION: Beautiful Asian women sharing content

Choose from these tags:
- demo:ethnicity:asian
- demo:ethnicity:white
- body:breasts:large
- body:breasts:small
- platform:type:amateur
- platform:type:professional
- style:aesthetic:sexy
- style:aesthetic:cute

Return ONLY a JSON array of 2-4 relevant tags.
Example: ["demo:ethnicity:asian", "platform:type:amateur"]"""

    try:
        response = await client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are an expert at categorizing subreddits. Always respond with a JSON array of tags.'
                },
                {'role': 'user', 'content': test_prompt}
            ],
            max_completion_tokens=150
        )

        content = response.choices[0].message.content
        print_info(f"Raw response: {content}")

        if not content:
            print_error("OpenAI returned empty content!")
            return False

        # Try to parse as JSON
        try:
            tags = json.loads(content.strip())
            print_success(f"Parsed tags: {tags}")
            return True
        except json.JSONDecodeError as e:
            print_error(f"Failed to parse JSON: {e}")
            print_info(f"Content was: {content}")
            return False

    except Exception as e:
        print_error(f"OpenAI API error: {e}")
        return False

async def test_with_full_tag_list():
    """Test with the complete tag list from the service"""
    print_section("Testing with Full Tag List")

    api_key = os.getenv('OPENAI_API_KEY')
    client = AsyncOpenAI(api_key=api_key)

    # Get the full tag list
    from services.categorization_service_tags import TagCategorizationService

    service_temp = type('obj', (object,), {'TAG_STRUCTURE': TagCategorizationService.TAG_STRUCTURE})()

    # Generate tag reference
    lines = []
    for main_cat, cat_data in service_temp.TAG_STRUCTURE.items():
        for subcat, tags in cat_data['subcategories'].items():
            for tag in tags:
                lines.append(f'- {main_cat}:{subcat}:{tag}')
    tag_reference = '\n'.join(lines)

    print_info(f"Testing with {len(lines)} tags ({len(tag_reference)} characters)")

    # Build full prompt
    prompt = f"""Analyze this Reddit subreddit and assign relevant tags for OnlyFans creator marketing.

SUBREDDIT: r/AsianHotties
TITLE: Asian Hotties
DESCRIPTION: Beautiful Asian women sharing erotic content
RULES: N/A

AVAILABLE TAGS (choose from these ONLY):
{tag_reference}

Instructions:
1. Select 2-8 tags from the AVAILABLE TAGS list above
2. Return ONLY a JSON array of tags, nothing else

Example: ["demo:ethnicity:asian", "platform:type:amateur"]

Tags for r/AsianHotties:"""

    try:
        response = await client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[
                {
                    'role': 'system',
                    'content': 'You are an expert at tagging adult content subreddits. Always respond with a JSON array of 2-6 relevant tags.'
                },
                {'role': 'user', 'content': prompt}
            ],
            max_completion_tokens=150
        )

        content = response.choices[0].message.content

        if not content:
            print_error("OpenAI returned None/empty content with full prompt!")
            return False

        print_info(f"Response: {content[:200]}...")

        # Clean and parse response
        content = content.strip()
        if content.startswith('```json'):
            content = content.split('```json')[1].split('```')[0].strip()
        elif content.startswith('```'):
            content = content.split('```')[1].split('```')[0].strip()

        try:
            tags = json.loads(content)
            print_success(f"Successfully parsed {len(tags)} tags: {tags}")

            # Validate tags
            valid_tags = set(lines)
            valid_tags = {line[2:] for line in valid_tags}  # Remove "- " prefix

            for tag in tags:
                if tag in valid_tags:
                    print_success(f"  ✓ {tag} is valid")
                else:
                    print_error(f"  ✗ {tag} is INVALID")

            return True

        except json.JSONDecodeError as e:
            print_error(f"Failed to parse JSON: {e}")
            return False

    except Exception as e:
        print_error(f"API error: {e}")
        return False

async def test_categorization_service():
    """Test the actual categorization service"""
    print_section("Testing Categorization Service")

    # Initialize service
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    openai_key = os.getenv('OPENAI_API_KEY')

    if not all([url, key, openai_key]):
        print_error("Missing required environment variables")
        return False

    print_success("All environment variables found")

    supabase = create_client(url, key)
    service = TagCategorizationService(supabase, openai_key)

    # Test subreddits
    test_cases = [
        {
            'id': 1,
            'name': 'AsianHotties',
            'title': 'Asian Hotties',
            'public_description': 'Beautiful Asian women sharing content',
            'over18': True
        },
        {
            'id': 2,
            'name': 'tattoos',
            'title': 'Tattoos',
            'public_description': 'Professional tattoo art and discussion',
            'over18': False
        },
        {
            'id': 3,
            'name': 'OnlyFansPromotions',
            'title': 'OnlyFans Promotions',
            'public_description': 'Promote your OnlyFans here',
            'over18': True,
            'rules_data': {'combined_text': 'No spam. Sellers welcome.'}
        }
    ]

    for subreddit in test_cases:
        print_info(f"\nTesting r/{subreddit['name']}...")

        try:
            result = await service.categorize_subreddit(subreddit)

            if result.success:
                print_success(f"Successfully categorized!")
                print(f"  Tags: {result.tags}")
                print(f"  Primary category: {result.primary_category}")
                print(f"  Confidence: {result.confidence:.2f}")
            else:
                print_error(f"Failed: {result.error_message}")

        except Exception as e:
            print_error(f"Exception: {e}")

    return True

async def main():
    print(f"\n{Colors.BOLD}Tag Categorization Working Test{Colors.ENDC}")
    print("Testing the complete categorization flow\n")

    # Run tests
    results = []

    # Test 1: Direct OpenAI
    result = await test_direct_openai()
    results.append(("Direct OpenAI API", result))

    # Test 2: Full tag list
    result = await test_with_full_tag_list()
    results.append(("Full tag list", result))

    # Test 3: Categorization service
    result = await test_categorization_service()
    results.append(("Categorization Service", result))

    # Summary
    print_section("Test Summary")
    for test_name, passed in results:
        if passed:
            print_success(f"{test_name}: PASSED")
        else:
            print_error(f"{test_name}: FAILED")

    all_passed = all(r[1] for r in results)
    if all_passed:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ All tests passed! Ready to deploy.{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ Some tests failed. Fix issues before deploying.{Colors.ENDC}")

if __name__ == "__main__":
    asyncio.run(main())