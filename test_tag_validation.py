#!/usr/bin/env python3
"""
Test script to diagnose why all subreddits are getting only 1 tag
"""

import os
import sys
import asyncio
import json
from dotenv import load_dotenv

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
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.ENDC}\n")

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.ENDC}")

def print_info(message):
    print(f"{Colors.YELLOW}ℹ {message}{Colors.ENDC}")

async def test_tag_validation():
    """Test the tag validation logic"""
    print_section("Testing Tag Validation Logic")

    from services.categorization_service_tags import TagCategorizationService
    from supabase import create_client

    # Initialize service
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    openai_key = os.getenv('OPENAI_API_KEY')

    supabase = create_client(url, key)
    service = TagCategorizationService(supabase, openai_key)

    # Test 1: Check valid tags list
    print_info("Checking valid tags list...")
    print(f"Total valid tags: {len(service.valid_tags)}")

    # Show first 10 valid tags
    sample_tags = list(service.valid_tags)[:10]
    print("Sample valid tags:")
    for tag in sample_tags:
        print(f"  - {tag}")

    # Test 2: Test tag validation with different formats
    print_info("\nTesting tag validation...")

    test_cases = [
        '["body:ass:bigass", "platform:type:amateur"]',
        '["demo:age:milf", "style:aesthetic:glamour"]',
        '["platform:type:amateur"]',
        '["Body:Ass:BigAss"]',  # Mixed case
        '["PLATFORM:TYPE:AMATEUR"]',  # Upper case
        'body:ass:bigass, platform:type:amateur',  # Comma separated
        'invalid_tag_format',
    ]

    for test in test_cases:
        print(f"\n  Testing: {test[:50]}...")
        tags, confidence = service._validate_and_clean_tags(test)
        print(f"    Result: {tags}")
        print(f"    Confidence: {confidence}")

    # Test 3: Check if lowercase conversion is the issue
    print_info("\nChecking case sensitivity...")
    test_tag = "body:ass:bigass"

    # Check original case
    if test_tag in service.valid_tags:
        print_success(f"'{test_tag}' is in valid_tags")
    else:
        print_error(f"'{test_tag}' is NOT in valid_tags")

    # Check lowercase
    if test_tag.lower() in service.valid_tags:
        print_success(f"'{test_tag.lower()}' is in valid_tags")
    else:
        print_error(f"'{test_tag.lower()}' is NOT in valid_tags")

    # Check if any valid tags contain uppercase
    has_uppercase = any(tag != tag.lower() for tag in service.valid_tags)
    if has_uppercase:
        print_error("Valid tags contain UPPERCASE characters!")
    else:
        print_success("All valid tags are lowercase")

async def test_openai_response():
    """Test what OpenAI actually returns"""
    print_section("Testing OpenAI Response")

    from openai import AsyncOpenAI

    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print_error("Missing OPENAI_API_KEY")
        return

    client = AsyncOpenAI(api_key=api_key)

    # Test with a simple prompt
    test_prompt = """Analyze this Reddit subreddit and assign 2-4 relevant tags.

SUBREDDIT: r/tattoos
TITLE: Tattoos
DESCRIPTION: Welcome to /r/tattoos, a subreddit for the discussion and sharing of professional tattoos.

Choose from these tags:
- body:art:tattoos
- style:aesthetic:artistic
- platform:type:showcase
- platform:type:amateur

Return ONLY a JSON array of tags, nothing else.
"""

    print_info("Testing OpenAI response format...")

    try:
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert at categorizing Reddit subreddits. Always respond with a JSON array."},
                {"role": "user", "content": test_prompt}
            ],
            max_completion_tokens=50  # Small limit to see if it gets cut off
        )

        raw_response = response.choices[0].message.content
        print(f"Raw response: {raw_response}")

        # Try to parse it
        try:
            parsed = json.loads(raw_response)
            print_success(f"Successfully parsed: {parsed}")
        except json.JSONDecodeError as e:
            print_error(f"Failed to parse JSON: {e}")
            # Try to extract JSON from markdown
            if "```json" in raw_response:
                json_part = raw_response.split("```json")[1].split("```")[0].strip()
                print_info(f"Extracted from markdown: {json_part}")
                try:
                    parsed = json.loads(json_part)
                    print_success(f"Successfully parsed extracted JSON: {parsed}")
                except:
                    print_error("Still couldn't parse extracted JSON")

    except Exception as e:
        print_error(f"OpenAI API error: {e}")

async def test_with_real_subreddit():
    """Test with an actual subreddit that's getting only 1 tag"""
    print_section("Testing with Real Subreddit")

    from services.categorization_service_tags import TagCategorizationService
    from supabase import create_client

    # Initialize service
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    openai_key = os.getenv('OPENAI_API_KEY')

    supabase = create_client(url, key)

    # Create a modified service with extra logging
    class DebugTagCategorizationService(TagCategorizationService):
        def _validate_and_clean_tags(self, tags_raw):
            print(f"\n  DEBUG: Raw tags received: {tags_raw}")
            print(f"  DEBUG: Type: {type(tags_raw)}")

            tags, confidence = super()._validate_and_clean_tags(tags_raw)

            print(f"  DEBUG: Validated tags: {tags}")
            print(f"  DEBUG: Confidence: {confidence}")

            # Check each tag
            if isinstance(tags_raw, str) and tags_raw.strip().startswith('['):
                try:
                    tags_list = json.loads(tags_raw)
                    print(f"  DEBUG: Parsed as JSON: {tags_list}")
                    for tag in tags_list:
                        tag_clean = tag.strip().lower()
                        print(f"    Checking '{tag}' -> '{tag_clean}': {tag_clean in self.valid_tags}")
                except:
                    pass

            return tags, confidence

    service = DebugTagCategorizationService(supabase, openai_key)

    # Get a test subreddit
    test_subreddit = {
        'id': 12877,
        'name': 'AsiansGoneErotic',
        'title': 'Asians Gone Erotic',
        'public_description': 'A place for Asian content',
        'over18': True,
        'subscribers': 50000
    }

    print_info(f"Testing with r/{test_subreddit['name']}")

    try:
        result = await service.categorize_subreddit(test_subreddit)
        print(f"\nResult:")
        print(f"  Tags: {result.tags}")
        print(f"  Primary Category: {result.primary_category}")
        print(f"  Success: {result.success}")
        if result.error_message:
            print(f"  Error: {result.error_message}")
    except Exception as e:
        print_error(f"Failed: {e}")
        import traceback
        traceback.print_exc()

async def main():
    print(f"\n{Colors.BOLD}Tag Validation Diagnostic Test{Colors.ENDC}")
    print(f"Testing why all subreddits get only 1 tag\n")

    await test_tag_validation()
    await test_openai_response()
    await test_with_real_subreddit()

    print_section("Test Complete")

if __name__ == "__main__":
    asyncio.run(main())