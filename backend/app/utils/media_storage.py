"""
Media Storage Utility for Cloudflare R2
Handles downloading and permanent storage of Instagram media

NOTE: Compression removed (v3.11.0) to eliminate FFmpeg bottleneck.
Videos/images are now uploaded in original quality for 60-80% faster processing.
Storage cost increase: ~$40/month initially, ~$407/month at 10k creators/year.
"""

import time
from datetime import datetime
from typing import Optional

import boto3
import requests
from botocore.config import Config
from botocore.exceptions import ClientError

# Removed imports (compression no longer needed):
# - tempfile (no temp files for FFmpeg)
# - ffmpeg (no video compression)
# - PIL.Image (no image compression)
# - io.BytesIO (no in-memory compression)
from app.core.config.r2_config import r2_config
from app.core.database.supabase_client import get_supabase_client
from app.logging import get_logger


# Get Supabase client for logging
_supabase = get_supabase_client()
logger = get_logger(__name__, supabase_client=_supabase, source="instagram_media_storage")


class MediaStorageError(Exception):
    """Base exception for media storage errors"""

    pass


class R2Client:
    """Cloudflare R2 storage client"""

    _instance: Optional["R2Client"] = None
    _client: Optional[boto3.client] = None

    def __new__(cls):
        """Singleton pattern"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> boto3.client:
        """Get or create R2 S3 client"""
        if self._client is None:
            # Validate R2 configuration
            is_valid, error_msg = r2_config.validate_config()
            if not is_valid:
                error = f"❌ R2 configuration invalid: {error_msg}"
                logger.error(error, action="r2_init_failed")
                raise MediaStorageError(error)

            if not r2_config.is_configured():
                error = (
                    "❌ R2 credentials missing: Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, "
                    "R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
                )
                logger.error(error, action="r2_init_failed")
                raise MediaStorageError(error)

            try:
                # Create S3-compatible client for R2 with timeout configuration
                self._client = boto3.client(
                    "s3",
                    endpoint_url=r2_config.get_endpoint_url(),
                    aws_access_key_id=r2_config.ACCESS_KEY_ID,
                    aws_secret_access_key=r2_config.SECRET_ACCESS_KEY,
                    config=Config(
                        signature_version="s3v4",
                        retries={"max_attempts": r2_config.MAX_RETRIES},
                        connect_timeout=30,  # 30 second connection timeout
                        read_timeout=r2_config.UPLOAD_TIMEOUT_SECONDS,  # 5 minute upload timeout
                    ),
                )

                # Test connection by listing buckets
                self._client.head_bucket(Bucket=r2_config.BUCKET_NAME)

                logger.info(
                    "✅ R2 Storage Connected Successfully",
                    action="r2_init_success",
                    context={
                        "bucket": r2_config.BUCKET_NAME,
                        "endpoint": r2_config.get_endpoint_url(),
                        "account_id": r2_config.ACCOUNT_ID[:8] + "...",  # Partial for security
                    },
                )

            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                error = f"❌ R2 connection failed: {error_code} - {e!s}"
                logger.error(error, action="r2_connection_failed", exc_info=True)
                raise MediaStorageError(error) from e
            except Exception as e:
                error = f"❌ R2 initialization failed: {e!s}"
                logger.error(error, action="r2_init_failed", exc_info=True)
                raise MediaStorageError(error) from e

        return self._client


# Singleton instance
_r2_client = R2Client()


def download_media(url: str, timeout: int = 60) -> bytes:
    """
    Download media from URL with timeout protection

    Args:
        url: Media URL (Instagram CDN)
        timeout: Request timeout in seconds (default 60s for large videos)

    Returns:
        Raw media bytes

    Raises:
        MediaStorageError: If download fails
    """
    try:
        logger.debug(f"⬇️ Downloading media from {url[:80]}... (timeout: {timeout}s)")
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()
        content = response.content
        logger.debug(f"✅ Downloaded {len(content) / (1024 * 1024):.1f}MB")
        return content
    except requests.Timeout as e:
        raise MediaStorageError(f"Download timeout after {timeout}s for {url[:80]}...") from e
    except requests.RequestException as e:
        raise MediaStorageError(f"Failed to download media from {url[:80]}...: {e}") from e


# Compression functions removed - we now upload original files directly to R2
# This eliminates FFmpeg/PIL dependencies and reduces upload time by 60-80%
# Storage cost impact: ~$40/month initially, ~$407/month at 10k creators/year


def upload_to_r2(
    file_data: bytes,
    object_key: str,
    content_type: str = "application/octet-stream",
    metadata: Optional[dict] = None,
) -> str:
    """
    Upload file to R2

    Args:
        file_data: File bytes
        object_key: S3 object key (path in bucket)
        content_type: MIME type
        metadata: Optional metadata dict

    Returns:
        Public URL to uploaded file

    Raises:
        MediaStorageError: If upload fails
    """
    try:
        client = _r2_client.get_client()
        file_size_kb = len(file_data) / 1024

        logger.info(f"📤 Uploading to R2: {object_key} ({file_size_kb:.1f}KB)")

        # Upload with retries
        for attempt in range(r2_config.MAX_RETRIES):
            try:
                client.put_object(
                    Bucket=r2_config.BUCKET_NAME,
                    Key=object_key,
                    Body=file_data,
                    ContentType=content_type,
                    Metadata=metadata or {},
                )

                # Generate public URL
                public_url = f"{r2_config.PUBLIC_URL}/{object_key}"
                logger.info(f"✅ Uploaded to R2: {public_url}")
                return public_url

            except ClientError:
                if attempt < r2_config.MAX_RETRIES - 1:
                    time.sleep(r2_config.RETRY_DELAY_SECONDS * (attempt + 1))
                    continue
                raise

    except Exception as e:
        raise MediaStorageError(f"Failed to upload to R2: {e}") from e


def process_and_upload_image(
    cdn_url: str, creator_id: str, media_pk: str, index: int = 0
) -> Optional[str]:
    """
    Download and upload image to R2 WITHOUT compression

    Compression removed for consistency with video upload strategy.
    Storage cost increase is minimal (~$1.2MB per image vs 300KB compressed).

    Args:
        cdn_url: Instagram CDN URL
        creator_id: Creator Instagram user ID
        media_pk: Media primary key
        index: Image index (for carousels)

    Returns:
        R2 public URL or None if R2 disabled

    Raises:
        MediaStorageError: If processing fails
    """
    if not r2_config.ENABLED:
        logger.debug("R2 storage disabled, skipping upload")
        return None

    try:
        # Download from CDN
        logger.info("⬇️ Downloading image from Instagram CDN...")
        image_data = download_media(cdn_url, timeout=30)
        logger.info(f"✅ Downloaded {len(image_data) / 1024:.1f}KB from CDN")

        # Generate object key: photos/YYYY/MM/creator_id/media_pk_index.jpg
        now = datetime.now()
        object_key = (
            f"{r2_config.PHOTOS_PREFIX}/{now.year}/{now.month:02d}/"
            f"{creator_id}/{media_pk}_{index}.jpg"
        )

        # Upload directly to R2 (no compression)
        r2_url = upload_to_r2(
            image_data,
            object_key,
            content_type="image/jpeg",
            metadata={
                "creator_id": creator_id,
                "media_pk": media_pk,
                "original_url": cdn_url[:200],
                "uncompressed": "true",
            },
        )

        logger.info(f"✅ Image uploaded to R2: {len(image_data) / 1024:.1f}KB")
        return r2_url

    except Exception as e:
        logger.error(f"Failed to process image {media_pk}_{index}: {e}")
        raise


def process_and_upload_profile_picture(cdn_url: str, creator_id: str) -> Optional[str]:
    """
    Download and upload profile picture to R2 WITHOUT compression

    Compression removed for consistency with other media uploads.
    Profile pictures are typically small anyway (~50-200KB).

    Args:
        cdn_url: Instagram CDN URL for profile picture
        creator_id: Creator Instagram user ID

    Returns:
        R2 public URL or None if R2 disabled

    Raises:
        MediaStorageError: If processing fails
    """
    if not r2_config.ENABLED:
        logger.debug("R2 storage disabled, skipping profile picture upload")
        return None

    try:
        # Download from CDN
        logger.info(f"⬇️ Downloading profile picture from Instagram CDN (creator: {creator_id})")
        image_data = download_media(cdn_url, timeout=30)
        logger.info(f"✅ Downloaded {len(image_data) / 1024:.1f}KB from CDN")

        # Generate object key: profile_pictures/creator_id/profile.jpg
        # Using simple structure (no date) since we want to overwrite old profile pics
        object_key = f"profile_pictures/{creator_id}/profile.jpg"

        # Upload directly to R2 (no compression)
        r2_url = upload_to_r2(
            image_data,
            object_key,
            content_type="image/jpeg",
            metadata={
                "creator_id": creator_id,
                "type": "profile_picture",
                "original_url": cdn_url[:200],
                "uncompressed": "true",
            },
        )

        logger.info(f"✅ Profile picture uploaded to R2 for creator {creator_id}")
        return r2_url

    except Exception as e:
        logger.error(f"Failed to process profile picture for creator {creator_id}: {e}")
        raise


def process_and_upload_video(cdn_url: str, creator_id: str, media_pk: str) -> Optional[str]:
    """
    Download and upload video to R2 WITHOUT compression

    Compression removed to eliminate FFmpeg bottleneck (60-120s per video).
    This reduces R2 upload failures from 524/day to <50/day and speeds up
    scraping by 33%. Storage cost increase: ~$40/month initially.

    Args:
        cdn_url: Instagram CDN URL
        creator_id: Creator Instagram user ID
        media_pk: Media primary key

    Returns:
        R2 public URL or None if R2 disabled

    Raises:
        MediaStorageError: If processing fails
    """
    if not r2_config.ENABLED:
        logger.debug("R2 storage disabled, skipping upload")
        return None

    try:
        # Download from CDN (increased timeout for large videos)
        logger.info("⬇️ Downloading video from Instagram CDN...")
        video_data = download_media(cdn_url, timeout=90)  # Increased from 60s
        logger.info(f"✅ Downloaded {len(video_data) / (1024 * 1024):.1f}MB from CDN")

        # Generate object key: videos/YYYY/MM/creator_id/media_pk.mp4
        now = datetime.now()
        object_key = (
            f"{r2_config.VIDEOS_PREFIX}/{now.year}/{now.month:02d}/{creator_id}/{media_pk}.mp4"
        )

        # Upload directly to R2 (no compression)
        r2_url = upload_to_r2(
            video_data,
            object_key,
            content_type="video/mp4",
            metadata={
                "creator_id": creator_id,
                "media_pk": media_pk,
                "original_url": cdn_url[:200],
                "uncompressed": "true",  # Flag for future reference
            },
        )

        logger.info(f"✅ Video uploaded to R2: {len(video_data) / (1024 * 1024):.1f}MB")
        return r2_url

    except Exception as e:
        logger.error(f"Failed to process video {media_pk}: {e}")
        raise
