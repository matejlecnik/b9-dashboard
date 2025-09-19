#!/usr/bin/env python3
"""
Debug script to find why the service gets empty responses
"""

import os
import sys
import asyncio
import json
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))

from openai import AsyncOpenAI
from services.categorization_service_tags import TagCategorizationService

async def test_exact_service_call():
    """Replicate exactly what the service does"""

    api_key = os.getenv('OPENAI_API_KEY')
    client = AsyncOpenAI(api_key=api_key)

    # Create a minimal service just to build the prompt
    class MinimalService:
        TAG_STRUCTURE = TagCategorizationService.TAG_STRUCTURE

        def _generate_complete_tag_reference(self):
            """Generate a complete reference of all valid tags"""
            lines = []
            for main_cat, cat_data in self.TAG_STRUCTURE.items():
                for subcat, tags_list in cat_data['subcategories'].items():
                    # Properly display subcategory with proper formatting
                    subcat_display = subcat.replace('_', ' ').title()

                    # If it's a list with specific tags
                    if isinstance(tags_list, list) and len(tags_list) > 0:
                        # For shorter lists, show on one line
                        if len(tags_list) <= 8:
                            formatted_tags = ', '.join([f"{main_cat}:{subcat}:{tag}" for tag in tags_list])
                            lines.append(f"- {subcat_display}: {formatted_tags}")
                        else:
                            # For longer lists, use multiple lines
                            lines.append(f"- {subcat_display}:")
                            for tag in tags_list:
                                lines.append(f"  - {main_cat}:{subcat}:{tag}")
                    else:
                        lines.append(f"- {subcat_display}: {', '.join(tags_list)}")
            return '\n'.join(lines)

        def _build_tag_prompt(self, subreddit):
            """Build the tag assignment prompt for OpenAI"""
            name = subreddit.get('name', 'Unknown')
            title = subreddit.get('title') or 'N/A'
            description = subreddit.get('public_description') or 'N/A'

            # Extract rules if available
            rules_text = 'N/A'
            rules_data = subreddit.get('rules_data')
            if rules_data and isinstance(rules_data, dict):
                rules_text = rules_data.get('combined_text', 'N/A')
                if rules_text and len(rules_text) > 2000:
                    rules_text = rules_text[:2000] + '...'

            # Generate complete tag reference
            tag_reference = self._generate_complete_tag_reference()

            return f"""Analyze this Reddit subreddit and assign relevant tags for OnlyFans creator marketing.

SUBREDDIT: r/{name}
TITLE: {title}
DESCRIPTION: {description}
RULES: {rules_text}

AVAILABLE TAGS (choose from these ONLY):
{tag_reference}

Instructions:
1. Select 2-8 tags from the AVAILABLE TAGS list above that best describe this subreddit
2. Consider the rules to understand what type of content is allowed
3. Rules mentioning "no sellers", "no OnlyFans", or "verification required" suggest platform:of:restricted
4. Focus on the most defining characteristics (body focus, demographics, style, themes)
5. Return ONLY a JSON array of tags, nothing else

Example response:
["physical:hair:redhead", "body:full:nude", "style:nudity:nude", "platform:type:amateur"]

Tags for r/{name}:"""

    service = MinimalService()

    test_subreddit = {
        'name': 'AsianHotties',
        'title': 'Asian Hotties',
        'public_description': 'Beautiful Asian women sharing content',
        'over18': True
    }

    # Build the exact prompt
    prompt = service._build_tag_prompt(test_subreddit)

    print(f"Prompt length: {len(prompt)} characters")
    print(f"First 500 chars of prompt:\n{prompt[:500]}...\n")

    # Make the exact same call
    print("Making OpenAI call with exact service parameters...")

    try:
        response = await client.chat.completions.create(
            model='gpt-3.5-turbo',
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert at tagging adult content subreddits for marketing. Always respond with a JSON array of 2-6 relevant tags in the format category:subcategory:value."
                },
                {"role": "user", "content": prompt}
            ],
            max_completion_tokens=150  # Same as service
        )

        print(f"\nResponse object: {response}")
        print(f"\nChoices: {response.choices}")

        if response.choices and len(response.choices) > 0:
            message = response.choices[0].message
            print(f"\nMessage object: {message}")
            print(f"\nContent type: {type(message.content)}")
            print(f"\nContent is None: {message.content is None}")
            print(f"\nContent repr: {repr(message.content)}")
            print(f"\nContent: [{message.content}]")

            if message.content:
                stripped = message.content.strip()
                print(f"\nAfter strip: [{stripped}]")
                print(f"Is empty after strip: {not stripped}")

        return response

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None

asyncio.run(test_exact_service_call())