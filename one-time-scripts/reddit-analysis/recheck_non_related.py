#!/usr/bin/env python3
"""
Standalone script to recheck 'Non Related' subreddits and identify self-posting communities
Run: python recheck_non_related.py
"""

import os
import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any
from dotenv import load_dotenv
from supabase import create_client
from openai import AsyncOpenAI
import time
import sys
from concurrent.futures import ThreadPoolExecutor
import threading

# Load environment variables from different possible locations
env_loaded = False
env_locations = [
    'dashboard/.env.local',
    '.env.local',
    '.env',
    'dashboard/.env'
]

for env_file in env_locations:
    if os.path.exists(env_file):
        load_dotenv(env_file)
        print(f"Loaded environment from: {env_file}")
        env_loaded = True
        break

if not env_loaded:
    print("Warning: No .env file found, trying system environment variables")
    load_dotenv()

# Check for required environment variables
SUPABASE_URL = os.environ.get('SUPABASE_URL') or os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("\n❌ ERROR: Missing Supabase credentials!")
    print("Please ensure you have the following environment variables set:")
    print("  - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL")
    print("  - SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY")
    print("\nYou can set them in dashboard/.env.local or .env file")
    sys.exit(1)

if not OPENAI_API_KEY:
    print("\n❌ ERROR: Missing OpenAI API key!")
    print("Please ensure you have OPENAI_API_KEY set in your environment variables")
    sys.exit(1)

# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

SELF_POSTING_PROMPT = """
Analyze this Reddit subreddit to determine if it's a place where regular users post photos of themselves.

SUBREDDIT: r/{name}
TITLE: {title}
DESCRIPTION: {description}
SUBSCRIBERS: {subscribers}

IMPORTANT CRITERIA:
1. Must be where REGULAR USERS post their OWN photos (not porn stars, not professional content)
2. NO PORN - Exclude any subreddit requiring nudity, explicit content, or primarily sexual
3. NO NSFW REQUIRED - Skip if nudity/NSFW is mandatory for posting
4. Focus on SFW or mild NSFW where users share personal photos

QUALIFYING CATEGORIES (Non-Nude/Non-Porn):

SELFIES & PERSONAL:
- Regular selfies, face pics
- Rate me communities (rateme, amiugly, amihot, toastme)
- Transformation photos (weight loss, fitness progress, skincare)
- Fashion advice with personal photos
- Hair/makeup transformations
- Dating profile reviews

FITNESS & HEALTH:
- Progress pics, transformation photos
- Gym selfies (clothed)
- Athletic achievements
- Body building (non-nude)
- Weight loss journeys

FASHION & STYLE:
- OOTD (Outfit of the Day)
- Streetwear, fashion advice
- Cosplay (non-lewd)
- Traditional/cultural outfits
- Thrift hauls worn by poster

BEAUTY & GROOMING:
- Makeup looks, tutorials
- Hair styles, transformations
- Skincare before/after
- Tattoo/piercing reveals
- Nail art on own hands

IDENTITY & COMMUNITY:
- LGBTQ+ communities with selfies (non-sexual)
- Age-specific groups (teens, 30plus, 50plus)
- Location-based selfie groups
- Cultural/ethnic communities

HOBBIES WITH SELF:
- Gaming setups with person
- Musicians with instruments
- Artists with their work
- Travel photos with traveler
- Pet photos with owner

EXCLUDE IF:
- Primarily pornographic content
- Requires nudity to post
- Professional adult content creators only
- Fetish/kink focused
- Sexual acts or explicit content required

Based on the name, description and rules, determine if regular users post photos of themselves here.

Return JSON only:
{{
  "is_self_posting": true/false,
  "confidence": 0.0-1.0,
  "is_porn_or_nude_required": true/false,
  "primary_category": "category name or null",
  "reasoning": "brief explanation"
}}
"""

async def analyze_subreddit(subreddit: Dict[str, Any], semaphore: asyncio.Semaphore) -> Dict[str, Any]:
    """Analyze a single subreddit with AI"""
    async with semaphore:  # Limit concurrent API calls
        try:
            prompt = SELF_POSTING_PROMPT.format(
                name=subreddit.get('name', 'Unknown'),
                title=subreddit.get('title', 'N/A'),
                description=subreddit.get('public_description', 'N/A'),
                subscribers=subreddit.get('subscribers', 'N/A')
            )

            response = await openai_client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at identifying Reddit communities where regular users post photos of themselves. Focus on non-porn, non-nude communities. Return JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=200,
                response_format={"type": "json_object"}
            )

            result = json.loads(response.choices[0].message.content)

            # Skip if it's porn or requires nudity
            if result.get('is_porn_or_nude_required', False):
                result['is_self_posting'] = False
                result['confidence'] = 0.0

            # Add subreddit info to result
            result['subreddit_name'] = subreddit.get('name')
            result['subreddit_id'] = subreddit.get('id')
            result['subscribers'] = subreddit.get('subscribers')
            result['title'] = subreddit.get('title')

            return result

        except Exception as e:
            print(f"{Colors.RED}Error analyzing r/{subreddit.get('name')}: {e}{Colors.END}")
            return {
                'subreddit_name': subreddit.get('name'),
                'subreddit_id': subreddit.get('id'),
                'is_self_posting': False,
                'confidence': 0.0,
                'error': str(e)
            }

async def main():
    """Main function to recheck all Non-Related subreddits"""

    # Resume from specific subreddit
    RESUME_FROM = "EBONYWAP"  # The last processed subreddit
    RESUME_INDEX = 1630  # The index of the last processed subreddit

    print(f"\n{Colors.BOLD}{Colors.CYAN}=== RECHECKING 'NON RELATED' SUBREDDITS ==={Colors.END}")
    print(f"{Colors.YELLOW}Resuming from r/{RESUME_FROM} (index {RESUME_INDEX}){Colors.END}\n")

    # Fetch all Non-Related subreddits in batches
    print(f"{Colors.YELLOW}Fetching ALL 'Non Related' subreddits from database...{Colors.END}")

    try:
        # First, get the total count
        count_response = supabase.table('reddit_subreddits').select(
            'id', count='exact'
        ).eq('review', 'Non Related').execute()

        expected_total = count_response.count
        print(f"{Colors.CYAN}Expected total: {expected_total} subreddits{Colors.END}")

        # Fetch ALL subreddits with rules in batches
        print(f"{Colors.YELLOW}Fetching all {expected_total} subreddits with rules in batches...{Colors.END}")

        all_subreddits = []
        batch_size = 1000

        # Fetch in batches of 1000
        for start in range(0, expected_total, batch_size):
            end = min(start + batch_size - 1, expected_total - 1)

            print(f"{Colors.CYAN}Fetching batch: records {start}-{end}...{Colors.END}")

            response = supabase.table('reddit_subreddits').select(
                'id, name, title, public_description, subscribers'
            ).eq('review', 'Non Related').order('subscribers', desc=True).range(start, end).execute()

            batch = response.data if response.data else []
            all_subreddits.extend(batch)

            print(f"{Colors.GREEN}Got {len(batch)} subreddits (Total: {len(all_subreddits)}){Colors.END}")

            # Small delay to avoid rate limiting
            if start + batch_size < expected_total:
                time.sleep(0.1)

        print(f"{Colors.GREEN}Successfully fetched all {len(all_subreddits)} subreddits!{Colors.END}")

        subreddits = all_subreddits
        total_count = len(subreddits)

        print(f"{Colors.GREEN}Successfully fetched {total_count} 'Non Related' subreddits{Colors.END}")

        # Verify we got all expected subreddits
        if total_count != expected_total:
            print(f"{Colors.YELLOW}Warning: Expected {expected_total} but got {total_count} subreddits{Colors.END}")
        else:
            print(f"{Colors.GREEN}✓ All subreddits fetched successfully!{Colors.END}\n")

        if total_count == 0:
            print(f"{Colors.YELLOW}No 'Non Related' subreddits found.{Colors.END}")
            return

        # Process subreddits with concurrent processing
        self_posting_subs = []
        maybe_self_posting = []
        all_results = []

        # Create text file for ongoing results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = f"self_posting_subreddits_{timestamp}.txt"

        # Find the starting position
        start_index = 0
        for i, sub in enumerate(subreddits):
            if sub.get('name') == RESUME_FROM:
                start_index = i + 1  # Start from the next one
                print(f"{Colors.GREEN}Found r/{RESUME_FROM} at position {i}, starting from {start_index}{Colors.END}")
                break

        if start_index == 0 and RESUME_FROM:
            print(f"{Colors.YELLOW}Warning: Could not find r/{RESUME_FROM}, starting from beginning{Colors.END}")

        # Adjust counts for remaining subreddits
        remaining_count = total_count - start_index

        print(f"{Colors.CYAN}Analyzing {remaining_count} remaining subreddits with AI using concurrent processing...{Colors.END}")
        print(f"{Colors.YELLOW}This will cost approximately ${remaining_count * 0.005:.2f}{Colors.END}")
        print(f"{Colors.BLUE}Results will be saved to: {results_file}{Colors.END}\n")

        # Open file for writing results as we process
        with open(results_file, 'w') as f:
            f.write(f"=== SELF-POSTING SUBREDDIT ANALYSIS (RESUMED) ===\n")
            f.write(f"Date: {datetime.now().isoformat()}\n")
            f.write(f"Resuming from index: {start_index} (r/{RESUME_FROM})\n")
            f.write(f"Total subreddits to analyze: {remaining_count}\n")
            f.write(f"Already processed: {start_index}\n\n")
            f.write("=" * 50 + "\n\n")

            # Process in batches with concurrency
            batch_size = 10  # Process 10 at once
            semaphore = asyncio.Semaphore(5)  # Limit to 5 concurrent API calls

            for batch_start in range(start_index, total_count, batch_size):
                batch_end = min(batch_start + batch_size, total_count)
                batch = subreddits[batch_start:batch_end]

                # Create tasks for concurrent processing
                tasks = [analyze_subreddit(sub, semaphore) for sub in batch]
                batch_results = await asyncio.gather(*tasks)

                # Process results
                for i, result in enumerate(batch_results):
                    idx = batch_start + i + 1  # Show actual position (1-based)
                    subreddit_name = result.get('subreddit_name', 'Unknown')

                    # Check if it's a self-posting subreddit
                    if result.get('is_self_posting') and not result.get('is_porn_or_nude_required', False):
                        confidence = result.get('confidence', 0)

                        if confidence >= 0.8:
                            self_posting_subs.append(result)
                            print(f"[{idx}/{total_count}] r/{subreddit_name} - {Colors.GREEN}✓ SELF-POSTING ({confidence:.0%}){Colors.END}")

                            # Write to file immediately
                            f.write(f"✓ r/{subreddit_name}\n")
                            f.write(f"  Confidence: {confidence:.0%}\n")
                            f.write(f"  Category: {result.get('primary_category', 'N/A')}\n")
                            f.write(f"  Reasoning: {result.get('reasoning', 'N/A')}\n")
                            subscribers = result.get('subscribers')
                            f.write(f"  Subscribers: {subscribers:,}\n" if subscribers else "  Subscribers: N/A\n")
                            f.write(f"  ID: {result.get('subreddit_id')}\n\n")
                            f.flush()  # Ensure it's written immediately

                        elif confidence >= 0.6:
                            maybe_self_posting.append(result)
                            print(f"[{idx}/{total_count}] r/{subreddit_name} - {Colors.YELLOW}? MAYBE ({confidence:.0%}){Colors.END}")
                        else:
                            print(f"[{idx}/{total_count}] r/{subreddit_name} - ✗ Low confidence")
                    else:
                        if result.get('is_porn_or_nude_required', False):
                            print(f"[{idx}/{total_count}] r/{subreddit_name} - ✗ Porn/nude required")
                        else:
                            print(f"[{idx}/{total_count}] r/{subreddit_name} - ✗ Not self-posting")

                    all_results.append(result)

                # Small delay between batches
                if batch_end < total_count:
                    await asyncio.sleep(0.5)

            # Add maybe section to file
            if maybe_self_posting:
                f.write("\n" + "=" * 50 + "\n")
                f.write("MEDIUM CONFIDENCE (NEEDS REVIEW)\n")
                f.write("=" * 50 + "\n\n")
                for sub in maybe_self_posting:
                    f.write(f"? r/{sub['subreddit_name']}\n")
                    f.write(f"  Confidence: {sub.get('confidence', 0):.0%}\n")
                    f.write(f"  Category: {sub.get('primary_category', 'N/A')}\n")
                    f.write(f"  Reasoning: {sub.get('reasoning', 'N/A')}\n")
                    subscribers = sub.get('subscribers')
                    f.write(f"  Subscribers: {subscribers:,}\n" if subscribers else "  Subscribers: N/A\n")
                    f.write(f"  ID: {sub.get('subreddit_id')}\n\n")

            # Add summary to file
            f.write("\n" + "=" * 50 + "\n")
            f.write("SUMMARY\n")
            f.write("=" * 50 + "\n")
            f.write(f"Total analyzed in this run: {remaining_count}\n")
            f.write(f"Previously processed: {start_index}\n")
            f.write(f"High confidence self-posting: {len(self_posting_subs)}\n")
            f.write(f"Medium confidence: {len(maybe_self_posting)}\n")
            f.write(f"Potential miscategorization rate: {((len(self_posting_subs) + len(maybe_self_posting)) / total_count * 100):.1f}%\n\n")

            # Add IDs for database update
            if self_posting_subs:
                f.write("\nSUBREDDIT IDs TO UPDATE (High Confidence):\n")
                ids = [str(sub['subreddit_id']) for sub in self_posting_subs]
                f.write(', '.join(ids))
                f.write("\n")

        # Display results
        print(f"\n{Colors.BOLD}{Colors.GREEN}=== RESULTS ==={Colors.END}\n")

        # High confidence self-posting subreddits
        if self_posting_subs:
            print(f"{Colors.BOLD}{Colors.GREEN}HIGH CONFIDENCE SELF-POSTING SUBREDDITS ({len(self_posting_subs)}):{Colors.END}\n")

            # Sort by subscribers
            self_posting_subs.sort(key=lambda x: x.get('subscribers', 0), reverse=True)

            for sub in self_posting_subs:
                print(f"{Colors.GREEN}• r/{sub['subreddit_name']}{Colors.END}")
                subscribers = sub.get('subscribers')
                print(f"  Subscribers: {subscribers:,}" if subscribers else "  Subscribers: N/A")
                print(f"  Category: {sub.get('primary_category', 'Unknown')}")
                print(f"  Confidence: {sub.get('confidence', 0):.0%}")
                print(f"  Reasoning: {sub.get('reasoning', 'N/A')}")
                print()

        # Medium confidence subreddits
        if maybe_self_posting:
            print(f"\n{Colors.BOLD}{Colors.YELLOW}MEDIUM CONFIDENCE - NEEDS REVIEW ({len(maybe_self_posting)}):{Colors.END}\n")

            maybe_self_posting.sort(key=lambda x: x.get('subscribers', 0), reverse=True)

            for sub in maybe_self_posting:
                print(f"{Colors.YELLOW}• r/{sub['subreddit_name']}{Colors.END}")
                subscribers = sub.get('subscribers')
                print(f"  Subscribers: {subscribers:,}" if subscribers else "  Subscribers: N/A")
                print(f"  Category: {sub.get('primary_category', 'Unknown')}")
                print(f"  Confidence: {sub.get('confidence', 0):.0%}")
                print(f"  Reasoning: {sub.get('reasoning', 'N/A')}")
                print()

        # Summary
        print(f"\n{Colors.BOLD}{Colors.CYAN}=== SUMMARY ==={Colors.END}")
        print(f"Analyzed in this run: {remaining_count} (Started from index {start_index})")
        print(f"Previously processed: {start_index}")
        print(f"{Colors.GREEN}High confidence self-posting: {len(self_posting_subs)}{Colors.END}")
        print(f"{Colors.YELLOW}Medium confidence (needs review): {len(maybe_self_posting)}{Colors.END}")
        print(f"Percentage that might be miscategorized (this run): {((len(self_posting_subs) + len(maybe_self_posting)) / remaining_count * 100 if remaining_count > 0 else 0):.1f}%")

        # Also save JSON results
        json_filename = f"recheck_results_{timestamp}.json"

        results = {
            'timestamp': datetime.now().isoformat(),
            'resumed_from': RESUME_FROM,
            'resumed_from_index': start_index,
            'analyzed_in_this_run': remaining_count,
            'total_in_database': total_count,
            'high_confidence_self_posting': self_posting_subs,
            'medium_confidence_self_posting': maybe_self_posting,
            'summary': {
                'high_confidence_count': len(self_posting_subs),
                'medium_confidence_count': len(maybe_self_posting),
                'miscategorization_rate': ((len(self_posting_subs) + len(maybe_self_posting)) / remaining_count * 100 if remaining_count > 0 else 0)
            }
        }

        with open(json_filename, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n{Colors.BLUE}Text results saved to: {results_file}{Colors.END}")
        print(f"{Colors.BLUE}JSON results saved to: {json_filename}{Colors.END}")

        # List subreddit IDs for easy database update
        if self_posting_subs:
            print(f"\n{Colors.BOLD}Subreddit IDs to update from 'Non Related' to 'Ok':{Colors.END}")
            ids = [str(sub['subreddit_id']) for sub in self_posting_subs]
            print(f"{Colors.CYAN}{', '.join(ids)}{Colors.END}")

    except Exception as e:
        print(f"{Colors.RED}Error: {e}{Colors.END}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())