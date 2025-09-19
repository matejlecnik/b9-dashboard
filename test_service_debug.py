#!/usr/bin/env python3
"""
Debug the actual service to find where it's failing
"""

import os
import sys
import asyncio
import json
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from openai import AsyncOpenAI
from supabase import create_client

async def test_service_internals():
    """Test the service with detailed debugging"""

    # Get environment variables
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    openai_key = os.getenv('OPENAI_API_KEY')

    print(f"Environment check:")
    print(f"  SUPABASE_URL: {url[:50] if url else 'MISSING'}...")
    print(f"  SUPABASE_SERVICE_ROLE_KEY: {'Found' if key else 'MISSING'}")
    print(f"  OPENAI_API_KEY: {openai_key[:20] if openai_key else 'MISSING'}...")

    # Initialize clients
    supabase = create_client(url, key)
    openai_client = AsyncOpenAI(api_key=openai_key)

    # Import and monkey-patch the service for debugging
    from services import categorization_service_tags

    # Create a custom version with extra logging
    class DebugTagCategorizationService(categorization_service_tags.TagCategorizationService):
        async def categorize_subreddit(self, subreddit, batch_number=None):
            """Override with debugging"""
            import time
            start_time = time.time()
            subreddit_name = subreddit.get('name', 'Unknown')
            subreddit_id = subreddit.get('id', 0)

            print(f"\n=== Starting categorization for r/{subreddit_name} ===")

            try:
                prompt = self._build_tag_prompt(subreddit)
                print(f"Prompt built, length: {len(prompt)}")

                print("Making OpenAI call...")
                response = await self.openai.chat.completions.create(
                    model=self.model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert at tagging adult content subreddits for marketing. Always respond with a JSON array of 2-6 relevant tags in the format category:subcategory:value."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    max_completion_tokens=self.max_tokens
                )

                print(f"Response received: {response}")
                print(f"Response choices: {response.choices}")

                if not response.choices or len(response.choices) == 0:
                    print("ERROR: No choices in response")
                    raise ValueError("No choices")

                content = response.choices[0].message.content
                print(f"Content type: {type(content)}")
                print(f"Content is None: {content is None}")
                print(f"Content repr: {repr(content)}")
                print(f"Content value: [{content}]")

                if content is None:
                    print("ERROR: Content is None")
                    raise ValueError("Content is None")

                tags_raw = content.strip()
                print(f"After strip: [{repr(tags_raw)}]")
                print(f"Length after strip: {len(tags_raw)}")

                if not tags_raw:
                    print("ERROR: Empty after strip")
                    raise ValueError("Empty content after strip")

                # Try to parse
                print(f"Attempting to parse as JSON...")
                tags, confidence = self._validate_and_clean_tags(tags_raw)

                print(f"Tags: {tags}")
                print(f"Confidence: {confidence}")

                # Success!
                from services.categorization_service_tags import TagCategorizationResult
                return TagCategorizationResult(
                    subreddit_id=subreddit_id,
                    subreddit_name=subreddit_name,
                    tags=tags,
                    primary_category=self._determine_primary_category(tags),
                    confidence=confidence,
                    success=True,
                    processing_time_ms=int((time.time() - start_time) * 1000)
                )

            except Exception as e:
                print(f"EXCEPTION: {e}")
                import traceback
                traceback.print_exc()

                from services.categorization_service_tags import TagCategorizationResult
                return TagCategorizationResult(
                    subreddit_id=subreddit_id,
                    subreddit_name=subreddit_name,
                    tags=[],
                    primary_category="",
                    confidence=0.0,
                    success=False,
                    error_message=str(e),
                    processing_time_ms=int((time.time() - start_time) * 1000)
                )

    # Create and test the service
    service = DebugTagCategorizationService(supabase, openai_key)

    test_subreddit = {
        'id': 1,
        'name': 'AsianHotties',
        'title': 'Asian Hotties',
        'public_description': 'Beautiful Asian women sharing content',
        'over18': True
    }

    result = await service.categorize_subreddit(test_subreddit)

    print(f"\n=== Final Result ===")
    print(f"Success: {result.success}")
    print(f"Tags: {result.tags}")
    print(f"Primary category: {result.primary_category}")
    print(f"Error: {result.error_message}")

asyncio.run(test_service_internals())