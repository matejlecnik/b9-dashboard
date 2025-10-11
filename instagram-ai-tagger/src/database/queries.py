"""Database queries for Instagram AI Tagger"""
from typing import List, Dict, Any, Optional
from .client import supabase


def get_creators_for_processing(
    limit: int = 100,
    skip_existing: bool = True,
    creator_ids: Optional[List[int]] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch Instagram creators that need tagging.

    Args:
        limit: Max number of creators to fetch
        skip_existing: Skip creators already tagged
        creator_ids: Process specific creator IDs (overrides other filters)

    Returns:
        List of creator records
    """
    query = supabase.table("instagram_creators").select("*")

    # Filter by specific IDs if provided
    if creator_ids:
        query = query.in_("id", creator_ids)
    elif skip_existing:
        # Skip creators that already have tags
        query = query.is_("body_tags", "null")

    query = query.limit(limit)

    result = query.execute()
    return result.data


def get_creator_by_id(creator_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch a single creator by ID.

    Args:
        creator_id: Database ID of creator

    Returns:
        Creator record or None
    """
    result = (
        supabase.table("instagram_creators").select("*").eq("id", creator_id).execute()
    )

    return result.data[0] if result.data else None


def get_test_creators(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch creators specifically for agent testing.

    Selects creators that have:
    - review_status = 'ok'
    - At least 9 posts/reels
    - Profile pic available
    - Images hosted on R2 CDN (media.b9-dashboard.com)

    Args:
        limit: Number of creators to fetch (default: 5 for testing)

    Returns:
        List of creator records with metadata
    """
    # Get creators with basic filters, including R2 profile pic
    # Accept both direct R2 URLs (pub-*.r2.dev) and custom domain (media.b9dashboard.com)
    query = (
        supabase.table("instagram_creators")
        .select(
            "id, ig_user_id, username, profile_pic_url, followers_count, media_count"
        )
        .eq("review_status", "ok")
        .gte("media_count", 9)
        .not_.is_("profile_pic_url", "null")
        .or_("profile_pic_url.like.%r2.dev%,profile_pic_url.like.%b9dashboard%")
    )

    # Execute query
    result = query.execute()

    # Further filter for R2 CDN content images (need 4+ content images)
    creators_with_r2 = []
    for creator in result.data:
        # Check if this creator has 4+ R2 CDN content images
        has_r2_images = _check_creator_has_r2_images(creator["ig_user_id"])
        if has_r2_images:
            creators_with_r2.append(creator)

        if len(creators_with_r2) >= limit:
            break

    return creators_with_r2


def _check_creator_has_r2_images(creator_id: str) -> bool:
    """
    Check if creator has at least 4 posts with R2 CDN images.

    For testing, we need 4 content images + 1 profile pic = 5 total images.
    Takes first image from each post (even if carousel has multiple).

    Args:
        creator_id: Instagram user ID

    Returns:
        True if creator has at least 4 posts with R2 images
    """
    # Check posts only (we need posts, not reels)
    # Fetch more posts to find R2 images (recent posts might be videos)
    posts = (
        supabase.table("instagram_posts")
        .select("image_urls", count="exact")
        .eq("creator_id", creator_id)
        .not_.is_("image_urls", "null")
        .limit(30)
        .execute()
    )

    # Count posts with R2 URLs (we take first image per post)
    # Accept both direct R2 URLs (pub-*.r2.dev) and custom domain (media.b9dashboard.com)
    r2_posts = [
        p
        for p in posts.data
        if p.get("image_urls")
        and any(
            ("r2.dev" in url or "b9dashboard" in url)
            for url in (
                p["image_urls"]
                if isinstance(p["image_urls"], list)
                else [p["image_urls"]]
            )
        )
    ]

    return len(r2_posts) >= 4


def get_creator_images(creator_id: str, limit: int = 4) -> List[Dict[str, Any]]:
    """
    Fetch images for a creator hosted on R2 CDN.

    Returns ONLY R2 CDN images from POSTS for agent testing.
    Accepts both direct R2 URLs (pub-*.r2.dev) and custom domain (media.b9dashboard.com).
    Fetches recent content sorted by date, not engagement.
    Takes first image from carousel posts.

    Args:
        creator_id: Instagram user ID (ig_user_id)
        limit: Max content images to fetch (default: 4 for 5-image testing w/ profile pic)

    Returns:
        List of image URLs with metadata (R2 CDN only, posts only)
    """
    images = []

    # Fetch posts with image_urls (fetch more than needed to find R2 images)
    # Recent posts might be videos, so we fetch more to ensure we get enough R2 images
    posts = (
        supabase.table("instagram_posts")
        .select("image_urls, like_count, taken_at, media_pk")
        .eq("creator_id", creator_id)
        .not_.is_("image_urls", "null")
        .order("taken_at", desc=True)
        .limit(limit * 5)
        .execute()
    )

    # Process posts (filter for R2 URLs)
    for post in posts.data:
        image_urls = post.get("image_urls")
        if image_urls:
            # Handle both array and single URL
            # For carousel posts, take only the first image
            url = image_urls[0] if isinstance(image_urls, list) else image_urls
            # Accept both direct R2 URLs and custom domain
            if url and ("r2.dev" in url or "b9dashboard" in url):
                images.append(
                    {
                        "url": url,
                        "type": "post",
                        "engagement": post.get("like_count", 0),
                        "media_pk": post.get("media_pk"),
                        "taken_at": post.get("taken_at"),
                    }
                )

    # Sort by recency (most recent first) and limit to requested number
    images.sort(key=lambda x: x.get("taken_at", ""), reverse=True)
    return images[:limit]


def save_creator_tags(
    creator_id: int,
    tags: List[str],
    confidence: Dict[str, float],
    features: Dict[str, Any],
    model_version: str = "1.0.0",
) -> None:
    """
    Save AI-generated tags to database.

    Args:
        creator_id: Database ID of creator
        tags: List of assigned tags
        confidence: Dict of tag -> confidence score
        features: Geometric features (ratios, measurements)
        model_version: Version of model used
    """
    # Update creator
    update_data = {
        "body_tags": tags,
        "tag_confidence": confidence,
        "tags_analyzed_at": "now()",
        "model_version": model_version,
    }

    supabase.table("instagram_creators").update(update_data).eq(
        "id", creator_id
    ).execute()

    # Save to history (audit trail) if table exists
    try:
        supabase.table("instagram_tag_analysis_history").insert(
            {
                "creator_id": creator_id,
                "tags": tags,
                "confidence": confidence,
                "features": features,
                "model_version": model_version,
            }
        ).execute()
    except Exception as e:
        # History table might not exist yet
        print(f"⚠️  Could not save to history: {str(e)}")

    print(f"✅ Saved {len(tags)} tags for creator {creator_id}")


def get_creators_by_tags(
    tags: List[str], min_confidence: float = 0.70, limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Query creators by tags.

    Args:
        tags: List of tags to match
        min_confidence: Minimum average confidence
        limit: Max results

    Returns:
        List of matching creators
    """
    # Note: This uses PostgreSQL JSONB operators
    # ?| checks if any of the tags exist in the array
    query = (
        supabase.table("instagram_creators")
        .select(
            "id, username, profile_pic_url, followers_count, body_tags, tag_confidence"
        )
        .filter("body_tags", "ov", tags)
        .limit(limit)
    )

    result = query.execute()

    # Filter by confidence (done in Python since Supabase doesn't support complex JSONB aggregations easily)
    filtered = []
    for creator in result.data:
        if creator.get("tag_confidence"):
            avg_conf = sum(creator["tag_confidence"].values()) / len(
                creator["tag_confidence"]
            )
            if avg_conf >= min_confidence:
                filtered.append(creator)

    return filtered


def get_tagging_stats() -> Dict[str, Any]:
    """
    Get statistics about tagged creators.

    Returns:
        Dict with stats
    """
    # Total creators
    total = supabase.table("instagram_creators").select("id", count="exact").execute()
    total_count = total.count

    # Tagged creators
    tagged = (
        supabase.table("instagram_creators")
        .select("id", count="exact")
        .not_.is_("body_tags", "null")
        .execute()
    )
    tagged_count = tagged.count

    return {
        "total_creators": total_count,
        "tagged_creators": tagged_count,
        "untagged_creators": total_count - tagged_count,
        "completion_percentage": (tagged_count / total_count * 100)
        if total_count > 0
        else 0,
    }


def get_calibration_dataset() -> List[Dict[str, Any]]:
    """
    Fetch manually labeled images for calibration.

    Returns:
        List of labeled images (if calibration table exists)
    """
    try:
        result = supabase.table("instagram_tag_calibration").select("*").execute()
        return result.data
    except Exception:
        print("⚠️  Calibration table does not exist yet")
        return []
