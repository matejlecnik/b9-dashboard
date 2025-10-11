#!/usr/bin/env python3
"""
Test GeminiFlashAgent (gemini-2.5-flash) on 5 creators
"""
import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.models import GeminiFlashAgent
from src.database.queries import get_creator_images
from src.utils.prompt_helper import PromptHelper

# Load environment variables
load_dotenv()

# Paths
RESULTS_DIR = Path(__file__).parent / "results"
RAW_RESPONSES_DIR = RESULTS_DIR / "raw_responses" / "GeminiFlashAgent"

# Ensure directory exists
RAW_RESPONSES_DIR.mkdir(parents=True, exist_ok=True)


def main():
    print("=" * 80)
    print("GEMINI 2.5 FLASH TEST - Instagram Creator Tagging")
    print("=" * 80)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Load prompt
    print("Loading unified tagging prompt...")
    prompt = PromptHelper.get_default_prompt()
    print(f"✅ Loaded prompt ({len(prompt)} chars)\n")

    # Initialize agent
    print("Initializing GeminiFlashAgent...")
    google_key = os.getenv("GOOGLE_API_KEY")
    if not google_key:
        raise ValueError("Missing GOOGLE_API_KEY")

    agent = GeminiFlashAgent(google_key)
    print(f"✅ Model: {agent.model_name}\n")

    # Fetch specific test creators
    print("Fetching 5 test creators...")
    target_usernames = [
        "bonnieparkerss",
        "urcherryx",
        "lanahcherry",
        "vismaramartina",
        "breckiehill",
    ]

    from src.database.client import supabase

    result = (
        supabase.table("instagram_creators")
        .select(
            "id, ig_user_id, username, profile_pic_url, followers_count, media_count"
        )
        .in_("username", target_usernames)
        .execute()
    )

    creators = result.data
    print(f"✅ Found {len(creators)} creators\n")

    # Process each creator
    results = []
    total_cost = 0.0
    successful = 0
    failed = 0

    for i, creator in enumerate(creators, 1):
        print(
            f"\n[{i}/{len(creators)}] {creator['username']} (@{creator['ig_user_id']})"
        )
        print(
            f"  Followers: {creator['followers_count']:,} | Posts: {creator['media_count']}"
        )

        # Fetch images
        content_images = get_creator_images(creator["ig_user_id"], limit=4)
        images = [creator["profile_pic_url"]] + [img["url"] for img in content_images]
        print(f"  Images: {len(images)} (1 profile + {len(content_images)} content)")

        # Tag creator
        print("  Processing with GeminiFlashAgent... ", end="", flush=True)

        try:
            result = agent.tag_creator(
                images=images, prompt=prompt, creator_username=creator["username"]
            )

            # Save result
            output_file = RAW_RESPONSES_DIR / f"{creator['username']}.json"
            output_file.write_text(json.dumps(result, indent=2))

            # Print status
            if result["error"]:
                print(f"❌ FAILED: {result['error'][:50]}")
                failed += 1
            else:
                print(
                    f"✅ ${result['cost']:.4f} | {result['response_time']:.1f}s | {len(result['tags'])} tags"
                )
                successful += 1

            total_cost += result["cost"]
            results.append(result)

        except Exception as e:
            print(f"❌ EXCEPTION: {str(e)[:50]}")
            failed += 1
            results.append(
                {
                    "agent": agent.agent_name,
                    "username": creator["username"],
                    "error": str(e),
                    "cost": 0.0,
                    "tags": [],
                }
            )

        time.sleep(1)  # Small delay between requests

    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Successful: {successful}/{len(creators)}")
    print(f"❌ Failed: {failed}/{len(creators)}")
    print(f"💰 Total Cost: ${total_cost:.4f}")
    print(f"📊 Results saved to: {RAW_RESPONSES_DIR}/")
    print("=" * 80)


if __name__ == "__main__":
    main()
