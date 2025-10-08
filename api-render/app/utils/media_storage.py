"""
Media Storage Utility for Cloudflare R2
Handles downloading, compression, and permanent storage of Instagram media
"""

import os
import tempfile
import time
from datetime import datetime
from io import BytesIO
from typing import Optional

import boto3
import ffmpeg
import requests
from botocore.config import Config
from botocore.exceptions import ClientError
from PIL import Image

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
                # Create S3-compatible client for R2
                self._client = boto3.client(
                    "s3",
                    endpoint_url=r2_config.get_endpoint_url(),
                    aws_access_key_id=r2_config.ACCESS_KEY_ID,
                    aws_secret_access_key=r2_config.SECRET_ACCESS_KEY,
                    config=Config(
                        signature_version="s3v4", retries={"max_attempts": r2_config.MAX_RETRIES}
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


def download_media(url: str, timeout: int = 30) -> bytes:
    """
    Download media from URL

    Args:
        url: Media URL (Instagram CDN)
        timeout: Request timeout

    Returns:
        Raw media bytes

    Raises:
        MediaStorageError: If download fails
    """
    try:
        response = requests.get(url, timeout=timeout, stream=True)
        response.raise_for_status()
        return response.content
    except requests.RequestException as e:
        raise MediaStorageError(f"Failed to download media from {url[:80]}...: {e}") from e


def compress_image(image_data: bytes, target_size_kb: int = 300, quality: int = 85) -> bytes:
    """
    Compress image to target size

    Args:
        image_data: Raw image bytes
        target_size_kb: Target size in KB
        quality: JPEG quality (1-100)

    Returns:
        Compressed image bytes

    Raises:
        MediaStorageError: If compression fails
    """
    try:
        # Open image
        img = Image.open(BytesIO(image_data))

        # Convert RGBA to RGB if needed (for JPEG)
        if img.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = background

        # Compress with decreasing quality until under target size
        output = BytesIO()
        current_quality = quality

        while current_quality > 20:
            output.seek(0)
            output.truncate()

            img.save(output, format="JPEG", quality=current_quality, optimize=True)
            size_kb = output.tell() / 1024

            if size_kb <= target_size_kb:
                break

            current_quality -= 5

        compressed_data = output.getvalue()
        original_size_kb = len(image_data) / 1024
        compressed_size_kb = len(compressed_data) / 1024
        reduction_pct = ((original_size_kb - compressed_size_kb) / original_size_kb) * 100

        logger.info(
            f"🗜️ Image compressed: {original_size_kb:.1f}KB → {compressed_size_kb:.1f}KB "
            f"({reduction_pct:.0f}% reduction, quality={current_quality})"
        )

        return compressed_data

    except Exception as e:
        raise MediaStorageError(f"Failed to compress image: {e}") from e


def compress_video(input_path: str, output_path: str, target_resolution: str = "720") -> None:
    """
    Compress video using FFmpeg

    Args:
        input_path: Path to input video
        output_path: Path to output video
        target_resolution: Target resolution (e.g., "720" for 720p)

    Raises:
        MediaStorageError: If compression fails
    """
    try:
        # Get video info
        probe = ffmpeg.probe(input_path)
        video_info = next(s for s in probe["streams"] if s["codec_type"] == "video")
        width = int(video_info["width"])
        height = int(video_info["height"])

        # Calculate new dimensions (maintain aspect ratio)
        target_height = int(target_resolution)
        logger.info(f"🗜️ Compressing video: {width}x{height} → target {target_resolution}p")

        if height > target_height:
            scale_factor = target_height / height
            new_width = int(width * scale_factor)
            new_height = target_height

            # Make dimensions divisible by 2 (required by H.264)
            new_width = new_width if new_width % 2 == 0 else new_width - 1
            new_height = new_height if new_height % 2 == 0 else new_height - 1
        else:
            # Already smaller than target, keep original size
            new_width = width if width % 2 == 0 else width - 1
            new_height = height if height % 2 == 0 else height - 1

        # Compress video (H.264 for maximum compatibility)
        # H.264 is required for QuickTime/Safari compatibility (H.265 not supported)
        (
            ffmpeg.input(input_path)
            .output(
                output_path,
                vcodec="libx264",  # H.264 for maximum compatibility
                crf=23,  # Constant Rate Factor (lower = better quality, 23 is good balance)
                preset="fast",  # Encoding speed
                pix_fmt="yuv420p",  # Pixel format (REQUIRED for QuickTime/Safari)
                vf=f"scale={new_width}:{new_height}",
                acodec="aac",  # Audio codec
                audio_bitrate="128k",
                movflags="faststart",  # Enable streaming/progressive download
            )
            .overwrite_output()
            .run(quiet=True, capture_stdout=True, capture_stderr=True)
        )

        logger.info(f"✅ Video compressed: {width}x{height} → {new_width}x{new_height}")

    except ffmpeg.Error as e:
        error_message = e.stderr.decode() if e.stderr else str(e)
        raise MediaStorageError(f"FFmpeg compression failed: {error_message}") from e
    except Exception as e:
        raise MediaStorageError(f"Video compression failed: {e}") from e


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
    Download, compress, and upload image to R2

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
        image_data = download_media(cdn_url)
        logger.info(f"✅ Downloaded {len(image_data) / 1024:.1f}KB from CDN")

        # Compress
        compressed_data = compress_image(
            image_data, target_size_kb=r2_config.IMAGE_MAX_SIZE_KB, quality=r2_config.IMAGE_QUALITY
        )

        # Generate object key: photos/YYYY/MM/creator_id/media_pk_index.jpg
        now = datetime.now()
        object_key = (
            f"{r2_config.PHOTOS_PREFIX}/{now.year}/{now.month:02d}/"
            f"{creator_id}/{media_pk}_{index}.jpg"
        )

        # Upload to R2
        r2_url = upload_to_r2(
            compressed_data,
            object_key,
            content_type="image/jpeg",
            metadata={
                "creator_id": creator_id,
                "media_pk": media_pk,
                "original_url": cdn_url[:200],  # Truncate long URLs
            },
        )

        return r2_url

    except Exception as e:
        logger.error(f"Failed to process image {media_pk}_{index}: {e}")
        raise


def process_and_upload_profile_picture(cdn_url: str, creator_id: str) -> Optional[str]:
    """
    Download, compress, and upload profile picture to R2

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
        image_data = download_media(cdn_url)
        logger.info(f"✅ Downloaded {len(image_data) / 1024:.1f}KB from CDN")

        # Compress (smaller target for profile pics)
        compressed_data = compress_image(
            image_data,
            target_size_kb=200,  # Smaller target for profile pictures
            quality=r2_config.IMAGE_QUALITY,
        )

        # Generate object key: profile_pictures/creator_id/profile.jpg
        # Using simple structure (no date) since we want to overwrite old profile pics
        object_key = f"profile_pictures/{creator_id}/profile.jpg"

        # Upload to R2
        r2_url = upload_to_r2(
            compressed_data,
            object_key,
            content_type="image/jpeg",
            metadata={
                "creator_id": creator_id,
                "type": "profile_picture",
                "original_url": cdn_url[:200],
            },
        )

        logger.info(f"✅ Profile picture uploaded to R2 for creator {creator_id}")
        return r2_url

    except Exception as e:
        logger.error(f"Failed to process profile picture for creator {creator_id}: {e}")
        raise


def process_and_upload_video(cdn_url: str, creator_id: str, media_pk: str) -> Optional[str]:
    """
    Download, compress, and upload video to R2

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

    temp_input = None
    temp_output = None

    try:
        # Download from CDN
        logger.info("⬇️ Downloading video from Instagram CDN...")
        video_data = download_media(cdn_url, timeout=60)
        logger.info(f"✅ Downloaded {len(video_data) / (1024 * 1024):.1f}MB from CDN")

        # Save to temp file for FFmpeg
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_in:
            temp_input = temp_in.name
            temp_in.write(video_data)

        # Compress video
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_out:
            temp_output = temp_out.name

        compress_video(temp_input, temp_output, r2_config.VIDEO_RESOLUTION)

        # Read compressed video
        with open(temp_output, "rb") as f:
            compressed_data = f.read()

        # Generate object key: videos/YYYY/MM/creator_id/media_pk.mp4
        now = datetime.now()
        object_key = (
            f"{r2_config.VIDEOS_PREFIX}/{now.year}/{now.month:02d}/{creator_id}/{media_pk}.mp4"
        )

        # Upload to R2
        r2_url = upload_to_r2(
            compressed_data,
            object_key,
            content_type="video/mp4",
            metadata={
                "creator_id": creator_id,
                "media_pk": media_pk,
                "original_url": cdn_url[:200],
            },
        )

        # Log compression ratio
        original_size_mb = len(video_data) / (1024 * 1024)
        compressed_size_mb = len(compressed_data) / (1024 * 1024)
        logger.info(
            f"✅ Video compression complete: {original_size_mb:.1f}MB → {compressed_size_mb:.1f}MB "
            f"({(1 - compressed_size_mb / original_size_mb) * 100:.0f}% reduction)"
        )

        return r2_url

    except Exception as e:
        logger.error(f"Failed to process video {media_pk}: {e}")
        raise

    finally:
        # Clean up temp files
        if temp_input and os.path.exists(temp_input):
            os.unlink(temp_input)
        if temp_output and os.path.exists(temp_output):
            os.unlink(temp_output)
