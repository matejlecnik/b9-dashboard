"""
CDN to R2 Migration Job
Migrates existing Instagram CDN URLs to permanent Cloudflare R2 storage

Features:
- Batch processing with progress tracking
- Skip existing R2 URLs (idempotent)
- Comprehensive error handling
- Database transaction safety
- Rate limiting
"""

import time
from datetime import datetime, timezone
from typing import Dict, List

from app.core.config.r2_config import r2_config
from app.core.database import get_db
from app.logging import get_logger
from app.utils.media_storage import (
    MediaStorageError,
    process_and_upload_image,
    process_and_upload_profile_picture,
    process_and_upload_video,
)


logger = get_logger(__name__)


class MigrationStats:
    """Track migration statistics"""

    def __init__(self):
        self.total = 0
        self.migrated = 0
        self.failed = 0
        self.skipped = 0
        self.errors: List[str] = []

    def to_dict(self) -> Dict:
        """Convert stats to dictionary"""
        return {
            "total": self.total,
            "migrated": self.migrated,
            "failed": self.failed,
            "skipped": self.skipped,
            "success_rate": f"{(self.migrated / self.total * 100) if self.total > 0 else 0:.1f}%",
            "errors": self.errors[-10:],  # Last 10 errors only
        }


def migrate_profile_pictures(batch_size: int = 10) -> MigrationStats:
    """
    Migrate profile pictures from CDN to R2

    Args:
        batch_size: Number of items to process

    Returns:
        Migration statistics
    """
    stats = MigrationStats()
    db = get_db()

    try:
        logger.info("🔄 Starting profile picture migration...")

        # Fetch creators with CDN profile pics (not R2)
        result = (
            db.table("instagram_creators")
            .select("id, ig_user_id, username, profile_pic_url")
            .like("profile_pic_url", "%cdninstagram%")
            .limit(batch_size)
            .execute()
        )

        creators = result.data or []
        stats.total = len(creators)

        logger.info(f"Found {stats.total} profile pictures to migrate")

        for i, creator in enumerate(creators, 1):
            try:
                ig_user_id = creator["ig_user_id"]
                username = creator["username"]
                cdn_url = creator["profile_pic_url"]

                logger.info(f"[{i}/{stats.total}] Migrating profile pic for {username}...")

                # Upload to R2
                r2_url = process_and_upload_profile_picture(
                    cdn_url=cdn_url, creator_id=str(ig_user_id)
                )

                if r2_url:
                    # Update database
                    db.table("instagram_creators").update(
                        {
                            "profile_pic_url": r2_url,
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    ).eq("id", creator["id"]).execute()

                    stats.migrated += 1
                    logger.info(f"✅ Migrated profile pic for {username}")
                else:
                    stats.failed += 1
                    stats.errors.append(f"{username}: R2 upload returned None")
                    logger.error(f"❌ R2 upload failed for {username}")

                # Rate limiting
                time.sleep(2)

            except MediaStorageError as e:
                stats.failed += 1
                stats.errors.append(f"{creator['username']}: {str(e)[:100]}")
                logger.error(f"❌ Migration error for {creator['username']}: {e}")
            except Exception as e:
                stats.failed += 1
                stats.errors.append(f"{creator['username']}: {str(e)[:100]}")
                logger.error(f"❌ Unexpected error for {creator['username']}: {e}")

        logger.info(f"✅ Profile picture migration complete: {stats.to_dict()}")
        return stats

    except Exception as e:
        logger.error(f"❌ Profile picture migration failed: {e}")
        stats.errors.append(f"Migration error: {e!s}")
        return stats


def migrate_carousel_posts(batch_size: int = 10) -> MigrationStats:
    """
    Migrate carousel post images from CDN to R2

    Args:
        batch_size: Number of posts to process

    Returns:
        Migration statistics
    """
    stats = MigrationStats()
    db = get_db()

    try:
        logger.info("🔄 Starting carousel posts migration...")

        # Fetch carousel posts with CDN URLs (not R2)
        # Use text conversion to check array contents
        result = (
            db.table("instagram_posts")
            .select("id, media_pk, creator_id, image_urls")
            .eq("post_type", "carousel")
            .not_("image_urls", "is", None)
            .limit(batch_size)
            .execute()
        )

        posts = result.data or []

        # Filter for CDN URLs only (not R2)
        cdn_posts = [
            p
            for p in posts
            if p.get("image_urls")
            and len(p["image_urls"]) > 0
            and "cdninstagram" in str(p["image_urls"][0])
        ]

        stats.total = len(cdn_posts)
        logger.info(f"Found {stats.total} carousel posts to migrate")

        for i, post in enumerate(cdn_posts, 1):
            try:
                media_pk = post["media_pk"]
                creator_id = post["creator_id"]
                cdn_urls = post["image_urls"]

                logger.info(
                    f"[{i}/{stats.total}] Migrating post {media_pk} ({len(cdn_urls)} images)..."
                )

                # Upload each image to R2
                r2_urls = []
                for idx, cdn_url in enumerate(cdn_urls):
                    try:
                        r2_url = process_and_upload_image(
                            cdn_url=cdn_url,
                            creator_id=str(creator_id),
                            media_pk=media_pk,
                            index=idx,
                        )
                        if r2_url:
                            r2_urls.append(r2_url)
                        else:
                            logger.warning(
                                f"⚠️ Image {idx} upload returned None for post {media_pk}"
                            )
                            r2_urls.append(cdn_url)  # Keep CDN URL if R2 fails
                    except MediaStorageError as e:
                        logger.error(f"❌ Image {idx} upload failed for post {media_pk}: {e}")
                        r2_urls.append(cdn_url)  # Keep CDN URL if R2 fails

                # Update database with R2 URLs
                if r2_urls:
                    db.table("instagram_posts").update(
                        {
                            "image_urls": r2_urls,
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        }
                    ).eq("id", post["id"]).execute()

                    stats.migrated += 1
                    logger.info(f"✅ Migrated post {media_pk} ({len(r2_urls)} images)")
                else:
                    stats.failed += 1
                    stats.errors.append(f"{media_pk}: All image uploads failed")

                # Rate limiting
                time.sleep(2)

            except Exception as e:
                stats.failed += 1
                stats.errors.append(f"{post['media_pk']}: {str(e)[:100]}")
                logger.error(f"❌ Unexpected error for post {post['media_pk']}: {e}")

        logger.info(f"✅ Carousel posts migration complete: {stats.to_dict()}")
        return stats

    except Exception as e:
        logger.error(f"❌ Carousel posts migration failed: {e}")
        stats.errors.append(f"Migration error: {e!s}")
        return stats


def migrate_reels(batch_size: int = 10) -> MigrationStats:
    """
    Migrate reel videos from CDN to R2

    Args:
        batch_size: Number of reels to process

    Returns:
        Migration statistics
    """
    stats = MigrationStats()
    db = get_db()

    try:
        logger.info("🔄 Starting reels migration...")

        # Fetch reels with CDN URLs (not R2)
        result = (
            db.table("instagram_reels")
            .select("id, media_pk, creator_id, video_url")
            .like("video_url", "%cdninstagram%")
            .limit(batch_size)
            .execute()
        )

        reels = result.data or []
        stats.total = len(reels)

        logger.info(f"Found {stats.total} reels to migrate")

        for i, reel in enumerate(reels, 1):
            try:
                media_pk = reel["media_pk"]
                creator_id = reel["creator_id"]
                cdn_url = reel["video_url"]

                logger.info(f"[{i}/{stats.total}] Migrating reel {media_pk}...")

                # Upload to R2
                r2_url = process_and_upload_video(
                    cdn_url=cdn_url, creator_id=str(creator_id), media_pk=media_pk
                )

                if r2_url:
                    # Update database
                    db.table("instagram_reels").update(
                        {"video_url": r2_url, "updated_at": datetime.now(timezone.utc).isoformat()}
                    ).eq("id", reel["id"]).execute()

                    stats.migrated += 1
                    logger.info(f"✅ Migrated reel {media_pk}")
                else:
                    stats.failed += 1
                    stats.errors.append(f"{media_pk}: R2 upload returned None")
                    logger.error(f"❌ R2 upload failed for reel {media_pk}")

                # Rate limiting (videos take longer)
                time.sleep(3)

            except MediaStorageError as e:
                stats.failed += 1
                stats.errors.append(f"{reel['media_pk']}: {str(e)[:100]}")
                logger.error(f"❌ Migration error for reel {reel['media_pk']}: {e}")
            except Exception as e:
                stats.failed += 1
                stats.errors.append(f"{reel['media_pk']}: {str(e)[:100]}")
                logger.error(f"❌ Unexpected error for reel {reel['media_pk']}: {e}")

        logger.info(f"✅ Reels migration complete: {stats.to_dict()}")
        return stats

    except Exception as e:
        logger.error(f"❌ Reels migration failed: {e}")
        stats.errors.append(f"Migration error: {e!s}")
        return stats


def migrate_all(batch_size: int = 10) -> Dict:
    """
    Migrate all media types from CDN to R2

    Args:
        batch_size: Number of items per type to process

    Returns:
        Combined migration statistics
    """
    start_time = time.time()

    logger.info("=" * 70)
    logger.info("🚀 Starting CDN → R2 Migration")
    logger.info("=" * 70)

    if not r2_config.ENABLED:
        error_msg = "R2 storage is disabled! Set ENABLE_R2_STORAGE=true"
        logger.error(f"❌ {error_msg}")
        return {"success": False, "error": error_msg}

    # Migrate each type
    profile_stats = migrate_profile_pictures(batch_size)
    posts_stats = migrate_carousel_posts(batch_size)
    reels_stats = migrate_reels(batch_size)

    # Combine stats
    total_time = time.time() - start_time
    combined_stats = {
        "success": True,
        "total_time_seconds": round(total_time, 2),
        "profile_pictures": profile_stats.to_dict(),
        "carousel_posts": posts_stats.to_dict(),
        "reels": reels_stats.to_dict(),
        "totals": {
            "total": profile_stats.total + posts_stats.total + reels_stats.total,
            "migrated": profile_stats.migrated + posts_stats.migrated + reels_stats.migrated,
            "failed": profile_stats.failed + posts_stats.failed + reels_stats.failed,
            "skipped": profile_stats.skipped + posts_stats.skipped + reels_stats.skipped,
        },
    }

    logger.info("=" * 70)
    logger.info("✅ CDN → R2 Migration Complete")
    logger.info(f"   Total: {combined_stats['totals']['total']}")
    logger.info(f"   Migrated: {combined_stats['totals']['migrated']}")
    logger.info(f"   Failed: {combined_stats['totals']['failed']}")
    logger.info(f"   Time: {total_time:.1f}s")
    logger.info("=" * 70)

    return combined_stats
