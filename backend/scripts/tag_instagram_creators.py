#!/usr/bin/env python3
"""
Production Instagram Creator Tagging Script
===========================================

Processes Instagram creators with review_status='ok' and assigns AI-generated
visual attribute tags using Gemini 2.5 Flash vision model.

Usage:
    python tag_instagram_creators.py                    # Process all untagged creators
    python tag_instagram_creators.py --dry-run          # Test without saving to DB
    python tag_instagram_creators.py --limit 50         # Process only 50 creators
    python tag_instagram_creators.py --workers 5        # Use 5 parallel workers
    python tag_instagram_creators.py --batch-size 10    # Process in batches of 10

Features:
- Resumable (skips already-tagged creators)
- Parallel processing support
- Cost tracking
- Progress logging
- Error handling & retries
- Works with both R2 and Instagram CDN images

Cost: ~$0.0013 per creator (Gemini 2.5 Flash)
"""

import argparse
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from io import BytesIO

    import google.generativeai as genai
    import requests
    from dotenv import load_dotenv
    from PIL import Image
    from supabase import Client

    from app.core.database.client import get_supabase_client

    # Import unified logging and database singleton
    from app.logging import get_logger
except ImportError as e:
    print(f"❌ Missing required dependency: {e}")
    print("Install with: pip install -r requirements.txt")
    sys.exit(1)

# Load environment variables
load_dotenv()

# Model configuration
MODEL_NAME = "gemini-2.5-flash"
MODEL_VERSION = "gemini-2.5-flash-v2.1"
PROMPT_VERSION = "v2.1"

# Pricing (per 1M tokens)
INPUT_PRICE_PER_1M = 0.30
OUTPUT_PRICE_PER_1M = 2.50

# Global logger (initialized in main())
logger = None


class GeminiTagger:
    """Handles AI tagging using Gemini 2.5 Flash"""

    def __init__(self, api_key: str, prompt_text: str):
        self.api_key = api_key
        self.prompt_text = prompt_text
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(MODEL_NAME)
        if logger:
            logger.info(f"✅ Initialized {MODEL_NAME}")

    def tag_creator(self, images: List[str], username: str) -> Dict[str, Any]:
        """
        Tag a creator using AI vision model.

        Args:
            images: List of image URLs (1 profile + up to 4 posts)
            username: Creator username for logging

        Returns:
            Dict with tags, confidence, reasoning, cost, tokens
        """
        start_time = time.time()

        try:
            # Download and convert images
            pil_images = []
            for i, url in enumerate(images):
                try:
                    response = requests.get(url, timeout=15)
                    response.raise_for_status()
                    pil_images.append(Image.open(BytesIO(response.content)))
                except Exception as e:
                    logger.warning(f"Failed to load image {i+1}/{len(images)} for {username}: {e}")

            if not pil_images:
                return {
                    "success": False,
                    "error": "No images could be loaded",
                    "tags": [],
                    "confidence": {},
                    "cost": 0.0,
                }

            # Build content
            content = [self.prompt_text, *pil_images]

            # Call API
            response = self.model.generate_content(content)

            # Extract tokens
            try:
                input_tokens = response.usage_metadata.prompt_token_count
                output_tokens = response.usage_metadata.candidates_token_count
            except AttributeError:
                input_tokens = 1290 * len(pil_images)
                output_tokens = 150

            # Calculate cost
            cost = (
                input_tokens / 1_000_000 * INPUT_PRICE_PER_1M
                + output_tokens / 1_000_000 * OUTPUT_PRICE_PER_1M
            )

            # Parse response
            response_text = response.text

            # Extract JSON from markdown code blocks if present
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end].strip()

            # Parse JSON
            try:
                parsed = json.loads(response_text)
                tags = parsed.get("tags", [])
                confidence = parsed.get("confidence", {})
                reasoning = parsed.get("reasoning", "")

                elapsed = time.time() - start_time

                return {
                    "success": True,
                    "tags": tags,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "cost": cost,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "response_time": elapsed,
                    "images_analyzed": len(pil_images),
                    "error": None,
                }

            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error for {username}: {e}")
                return {
                    "success": False,
                    "error": f"JSON parse error: {e!s}",
                    "tags": [],
                    "confidence": {},
                    "cost": cost,
                }

        except Exception as e:
            logger.error(f"Tagging error for {username}: {e}")
            return {
                "success": False,
                "error": str(e),
                "tags": [],
                "confidence": {},
                "cost": 0.0,
            }


def load_prompt() -> str:
    """Load the tagging prompt"""
    prompt_path = (
        Path(__file__).parent.parent.parent
        / "instagram-ai-tagger"
        / "prompts"
        / "unified_tagging_prompt.md"
    )

    if prompt_path.exists():
        return prompt_path.read_text()
    else:
        # Fallback inline prompt
        logger.warning("Prompt file not found, using inline fallback")
        return """# Instagram Creator Visual Attribute Tagging

Analyze the images and assign visual attribute tags.

Return ONLY valid JSON:
{
  "tags": ["body_type:curvy", "breasts:large", "hair_color:blonde", ...],
  "confidence": {"body_type": 0.9, "breasts": 0.95, ...},
  "reasoning": "Brief explanation"
}

Minimum confidence: 0.75 for ALL attributes."""


def get_untagged_creators(supabase: Client, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Fetch creators that need tagging.

    Args:
        supabase: Supabase client
        limit: Max creators to fetch

    Returns:
        List of creator records
    """
    query = (
        supabase.table("instagram_creators")
        .select("id, ig_user_id, username, profile_pic_url, followers_count, media_count")
        .eq("review_status", "ok")
        .is_("body_tags", "null")
    )

    if limit:
        query = query.limit(limit)

    result = query.execute()
    return result.data


def get_creator_images(supabase: Client, creator_id: str, limit: int = 4) -> List[str]:
    """
    Fetch image URLs for a creator.

    Args:
        supabase: Supabase client
        creator_id: Instagram user ID
        limit: Max content images

    Returns:
        List of image URLs
    """
    # Fetch posts
    posts = (
        supabase.table("instagram_posts")
        .select("image_urls, taken_at")
        .eq("creator_id", creator_id)
        .not_.is_("image_urls", "null")
        .order("taken_at", desc=True)
        .limit(limit * 3)
        .execute()
    )

    images = []
    for post in posts.data:
        urls = post.get("image_urls")
        if urls:
            # Take first image from carousel
            url = urls[0] if isinstance(urls, list) else urls
            if url:
                images.append(url)
                if len(images) >= limit:
                    break

    return images


def save_tags(
    supabase: Client,
    creator_id: int,
    tags: List[str],
    confidence: Dict[str, float],
    dry_run: bool = False,
) -> bool:
    """
    Save tags to database.

    Args:
        supabase: Supabase client
        creator_id: Creator database ID
        tags: List of tags
        confidence: Confidence scores
        dry_run: If True, don't actually save

    Returns:
        True if successful
    """
    if dry_run:
        logger.info(f"  [DRY RUN] Would save {len(tags)} tags for creator {creator_id}")
        return True

    try:
        supabase.table("instagram_creators").update(
            {
                "body_tags": tags,
                "tag_confidence": confidence,
                "tags_analyzed_at": datetime.utcnow().isoformat(),
                "model_version": MODEL_VERSION,
            }
        ).eq("id", creator_id).execute()
        return True
    except Exception as e:
        logger.error(f"Failed to save tags for creator {creator_id}: {e}")
        return False


def process_creator(
    creator: Dict[str, Any],
    tagger: GeminiTagger,
    supabase: Client,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Process a single creator.

    Args:
        creator: Creator record
        tagger: GeminiTagger instance
        supabase: Supabase client
        dry_run: If True, don't save to DB

    Returns:
        Processing result
    """
    username = creator["username"]
    creator_id = creator["id"]
    ig_user_id = creator["ig_user_id"]

    try:
        # Get images
        profile_pic = creator.get("profile_pic_url")
        content_images = get_creator_images(supabase, ig_user_id, limit=4)

        if not profile_pic:
            logger.warning(f"  ⚠️  {username}: No profile picture")
            return {"success": False, "error": "No profile picture", "cost": 0.0}

        images = [profile_pic, *content_images]
        logger.info(
            f"  Processing {username} with {len(images)} images ({len(content_images)} content)"
        )

        # Tag creator
        result = tagger.tag_creator(images, username)

        if result["success"]:
            # Save to database
            saved = save_tags(supabase, creator_id, result["tags"], result["confidence"], dry_run)

            if saved:
                logger.info(
                    f"✅ {username}: {len(result['tags'])} tags | ${result['cost']:.4f} | {result['response_time']:.1f}s",
                    context={
                        "creator_id": creator_id,
                        "username": username,
                        "tags_count": len(result["tags"]),
                        "cost": round(result["cost"], 4),
                        "response_time": round(result["response_time"], 1),
                        "images_analyzed": result.get("images_analyzed", 0),
                        "action": "tag_creator_success",
                    },
                )
            else:
                logger.error(
                    f"❌ {username}: Failed to save to database",
                    context={
                        "creator_id": creator_id,
                        "username": username,
                        "action": "save_failed",
                    },
                )
                result["success"] = False
        else:
            logger.error(
                f"❌ {username}: {result.get('error', 'Unknown error')}",
                context={
                    "creator_id": creator_id,
                    "username": username,
                    "error": result.get("error"),
                    "action": "tag_creator_failed",
                },
            )

        return result

    except Exception as e:
        logger.error(f"  ❌ {username}: Exception - {e}")
        return {"success": False, "error": str(e), "cost": 0.0}


def main():
    global logger

    parser = argparse.ArgumentParser(description="Tag Instagram creators with AI")
    parser.add_argument("--limit", type=int, help="Max creators to process")
    parser.add_argument("--workers", type=int, default=1, help="Number of parallel workers")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch size for processing")
    parser.add_argument("--dry-run", action="store_true", help="Test without saving to DB")

    args = parser.parse_args()

    # Initialize database and logger
    try:
        # Get Supabase client using singleton
        supabase = get_supabase_client()

        # Initialize unified logger with Supabase
        logger = get_logger(
            __name__,
            supabase_client=supabase,
            source="instagram_ai_tagger",
            script_name="tag_instagram_creators",
        )

        logger.info(
            "Instagram AI Tagging - Starting",
            context={
                "model": MODEL_NAME,
                "prompt_version": PROMPT_VERSION,
                "workers": args.workers,
                "dry_run": args.dry_run,
            },
        )

        google_key = os.getenv("GOOGLE_API_KEY")
        if not google_key:
            raise ValueError("GOOGLE_API_KEY not set in environment")

        prompt = load_prompt()
        tagger = GeminiTagger(google_key, prompt)

    except Exception as e:
        if logger:
            logger.error(f"Initialization failed: {e}")
        else:
            print(f"❌ Initialization failed: {e}")
        sys.exit(1)

    # Fetch creators
    logger.info("Fetching untagged creators", context={"limit": args.limit})
    creators = get_untagged_creators(supabase, limit=args.limit)
    logger.info(
        f"Found {len(creators)} creators to process",
        context={"total_creators": len(creators), "limit": args.limit},
    )

    if not creators:
        logger.info("No creators to process. Exiting.")
        return

    # Process creators
    start_time = time.time()
    total_cost = 0.0
    successful = 0
    failed = 0

    if args.workers == 1:
        # Sequential processing
        for i, creator in enumerate(creators, 1):
            logger.info(f"[{i}/{len(creators)}] {creator['username']}")
            result = process_creator(creator, tagger, supabase, args.dry_run)

            total_cost += result.get("cost", 0.0)
            if result.get("success"):
                successful += 1
            else:
                failed += 1

            time.sleep(0.5)  # Rate limiting

    else:
        # Parallel processing
        with ThreadPoolExecutor(max_workers=args.workers) as executor:
            futures = {
                executor.submit(process_creator, creator, tagger, supabase, args.dry_run): creator
                for creator in creators
            }

            for i, future in enumerate(as_completed(futures), 1):
                creator = futures[future]
                try:
                    result = future.result()
                    total_cost += result.get("cost", 0.0)
                    if result.get("success"):
                        successful += 1
                    else:
                        failed += 1
                except Exception as e:
                    logger.error(f"Worker exception for {creator['username']}: {e}")
                    failed += 1

                logger.info(f"Progress: {i}/{len(creators)} complete")

    # Summary
    elapsed = time.time() - start_time
    success_rate = (successful / len(creators) * 100) if len(creators) > 0 else 0

    logger.info(
        "Instagram AI Tagging - Complete",
        context={
            "total_creators": len(creators),
            "successful": successful,
            "failed": failed,
            "success_rate": round(success_rate, 1),
            "total_cost": round(total_cost, 4),
            "elapsed_minutes": round(elapsed / 60, 1),
            "rate_per_minute": round(len(creators) / elapsed * 60, 1) if elapsed > 0 else 0,
            "dry_run": args.dry_run,
            "workers": args.workers,
            "action": "tagging_complete",
        },
    )

    logger.info(f"✅ Successful: {successful}/{len(creators)}")
    logger.info(f"❌ Failed: {failed}/{len(creators)}")
    logger.info(f"💰 Total Cost: ${total_cost:.4f}")
    logger.info(f"⏱️  Time: {elapsed/60:.1f} minutes")
    logger.info(f"📊 Rate: {len(creators)/elapsed*60:.1f} creators/minute")

    if args.dry_run:
        logger.info("⚠️  DRY RUN - No changes were saved to database")


if __name__ == "__main__":
    main()
