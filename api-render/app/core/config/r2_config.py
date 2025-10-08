"""
Cloudflare R2 Storage Configuration
Manages R2 credentials and bucket settings for permanent media storage
"""

import os
from typing import Optional

from dotenv import load_dotenv


load_dotenv()


class R2Config:
    """Cloudflare R2 storage configuration"""

    # R2 Credentials
    ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "b9-instagram-media")
    PUBLIC_URL: str = os.getenv("R2_PUBLIC_URL", "https://media.b9dashboard.com")

    # R2 is always enabled in production - no toggle needed
    # If credentials are missing, uploads will fail fast and alert
    ENABLED: bool = True

    # Compression settings
    IMAGE_MAX_SIZE_KB: int = 300  # Target 300KB for photos
    IMAGE_QUALITY: int = 85  # JPEG quality (1-100)
    VIDEO_TARGET_SIZE_MB: int = 3  # Target 3MB for videos
    VIDEO_RESOLUTION: str = "720"  # 720p output
    VIDEO_CODEC: str = "libx264"  # H.264 for QuickTime/Safari compatibility

    # Upload settings
    MAX_RETRIES: int = 3
    RETRY_DELAY_SECONDS: int = 2
    UPLOAD_TIMEOUT_SECONDS: int = 300  # 5 minutes

    # Folder structure
    PHOTOS_PREFIX: str = "photos"
    VIDEOS_PREFIX: str = "videos"

    @classmethod
    def is_configured(cls) -> bool:
        """Check if R2 credentials are configured"""
        return bool(
            cls.ACCOUNT_ID and cls.ACCESS_KEY_ID and cls.SECRET_ACCESS_KEY and cls.BUCKET_NAME
        )

    @classmethod
    def get_endpoint_url(cls) -> str:
        """Get R2 endpoint URL"""
        return f"https://{cls.ACCOUNT_ID}.r2.cloudflarestorage.com"

    @classmethod
    def validate_config(cls) -> tuple[bool, Optional[str]]:
        """
        Validate R2 configuration

        R2 is always enabled, so this always validates credentials

        Returns:
            (is_valid, error_message)
        """
        if not cls.ACCOUNT_ID:
            return False, "R2_ACCOUNT_ID not set"
        if not cls.ACCESS_KEY_ID:
            return False, "R2_ACCESS_KEY_ID not set"
        if not cls.SECRET_ACCESS_KEY:
            return False, "R2_SECRET_ACCESS_KEY not set"
        if not cls.BUCKET_NAME:
            return False, "R2_BUCKET_NAME not set"

        return True, None


# Create singleton instance
r2_config = R2Config()
