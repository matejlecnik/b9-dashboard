#!/usr/bin/env python3
"""
Agent Comparison Runner - Test 5 AI vision models for Instagram creator tagging

Tests:
- Gemini 2.5 Flash-Lite
- GPT-5-mini
- Gemini 2.5 Flash
- GPT-5
- Claude Sonnet 4.5

Expected cost: ~$2.10 for 5 creators × 5 agents = 25 requests
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

from src.models import (
    GeminiFlashLiteAgent,
    GPT5MiniAgent,
    GeminiFlashAgent,
    GPT5Agent,
    ClaudeSonnet45Agent,
)
from src.database.queries import get_test_creators, get_creator_images
from src.utils.prompt_helper import PromptHelper

# Load environment variables
load_dotenv()

# Paths
RESULTS_DIR = Path(__file__).parent / "results"
RAW_RESPONSES_DIR = RESULTS_DIR / "raw_responses"

# Ensure directories exist
RAW_RESPONSES_DIR.mkdir(parents=True, exist_ok=True)


def initialize_agents():
    """Initialize all 5 agents"""
    agents = []

    # Get API keys
    openai_key = os.getenv("OPENAI_API_KEY")
    google_key = os.getenv("GOOGLE_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    # Validate keys
    if not all([openai_key, google_key, anthropic_key]):
        raise ValueError(
            "Missing API keys. Required:\n"
            "- OPENAI_API_KEY\n"
            "- GOOGLE_API_KEY\n"
            "- ANTHROPIC_API_KEY"
        )

    # Initialize agents in order of expected cost (cheapest first)
    agents.append(GeminiFlashLiteAgent(google_key))
    agents.append(GPT5MiniAgent(openai_key))
    agents.append(GeminiFlashAgent(google_key))
    agents.append(GPT5Agent(openai_key))
    agents.append(ClaudeSonnet45Agent(anthropic_key))

    return agents


def process_creator(agent, creator, images, prompt):
    """
    Process a single creator with a single agent.

    Args:
        agent: Agent instance
        creator: Creator data dict
        images: List of 5 image URLs
        prompt: Tagging prompt text

    Returns:
        Result dict from agent.tag_creator()
    """
    print(f"  ├─ {agent.agent_name:<30} ", end="", flush=True)

    try:
        result = agent.tag_creator(
            images=images, prompt=prompt, creator_username=creator["username"]
        )

        # Save raw response
        agent_dir = RAW_RESPONSES_DIR / agent.agent_name
        agent_dir.mkdir(exist_ok=True)

        output_file = agent_dir / f"{creator['username']}.json"
        output_file.write_text(json.dumps(result, indent=2))

        # Print status
        if result["error"]:
            print(f"❌ FAILED: {result['error'][:50]}")
        else:
            print(
                f"✅ ${result['cost']:.4f} | {result['response_time']:.1f}s | {len(result['tags'])} tags"
            )

        return result

    except Exception as e:
        print(f"❌ EXCEPTION: {str(e)[:50]}")
        return {
            "agent": agent.agent_name,
            "username": creator["username"],
            "error": str(e),
            "cost": 0.0,
            "tags": [],
        }


def main():
    print("=" * 80)
    print("AI AGENT COMPARISON - Instagram Creator Tagging")
    print("=" * 80)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

    # Load prompt
    print("Loading unified tagging prompt...")
    prompt = PromptHelper.get_default_prompt()
    print(f"✅ Loaded prompt ({len(prompt)} chars)\n")

    # Initialize agents
    print("Initializing 5 agents...")
    agents = initialize_agents()
    print(f"✅ Initialized: {', '.join(a.agent_name for a in agents)}\n")

    # Fetch test creators
    print("Fetching test creators (with R2 CDN images)...")
    creators = get_test_creators(limit=5)

    if len(creators) < 5:
        print(f"⚠️  WARNING: Only found {len(creators)} creators with R2 images")
        print("   Continuing with available creators...\n")
    else:
        print(f"✅ Found {len(creators)} creators\n")

    # Summary data
    all_results = []
    total_cost = 0.0
    successful_requests = 0
    failed_requests = 0

    # Process each creator
    for i, creator in enumerate(creators, 1):
        print(
            f"\n[{i}/{len(creators)}] {creator['username']} (@{creator['ig_user_id']})"
        )
        print(
            f"  Followers: {creator['followers_count']:,} | Posts: {creator['media_count']}"
        )

        # Fetch images (1 profile + up to 4 content)
        content_images = get_creator_images(creator["ig_user_id"], limit=4)

        if len(content_images) < 1:
            print(
                f"  ⚠️  Only {len(content_images)} content images found (need at least 1)"
            )
            print("  Skipping this creator...\n")
            continue

        # Build image list: profile pic + content images
        images = [creator["profile_pic_url"]] + [img["url"] for img in content_images]

        print(f"  Images: {len(images)} (1 profile + {len(content_images)} content)\n")

        # Test each agent
        for agent in agents:
            result = process_creator(agent, creator, images, prompt)
            all_results.append(result)

            # Update stats
            total_cost += result["cost"]
            if result.get("error"):
                failed_requests += 1
            else:
                successful_requests += 1

            # Small delay between agents to avoid rate limits
            time.sleep(1)

    # Save all results
    metrics_file = RESULTS_DIR / "metrics.json"
    metrics_file.write_text(
        json.dumps(
            {
                "test_metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "creators_tested": len(creators),
                    "agents_tested": len(agents),
                    "total_requests": len(all_results),
                },
                "results": all_results,
                "summary": {
                    "total_cost": total_cost,
                    "successful_requests": successful_requests,
                    "failed_requests": failed_requests,
                    "success_rate": successful_requests / len(all_results)
                    if all_results
                    else 0,
                },
            },
            indent=2,
        )
    )

    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Successful: {successful_requests}/{len(all_results)}")
    print(f"❌ Failed: {failed_requests}/{len(all_results)}")
    print(f"💰 Total Cost: ${total_cost:.4f}")
    print(f"\n📊 Results saved to: {RESULTS_DIR}/")
    print("   - metrics.json (summary)")
    print("   - raw_responses/ (25 JSON files)")
    print("\n✅ Done! Run analyze_results.py to generate comparison report.")
    print("=" * 80)


if __name__ == "__main__":
    main()
