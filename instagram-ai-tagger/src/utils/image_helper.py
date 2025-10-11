"""Image downloading and encoding utilities for AI vision agents"""
import requests
import base64
from pathlib import Path
from typing import Optional
import hashlib


class ImageHelper:
    """Utilities for downloading and encoding images"""

    def __init__(self, cache_dir: Optional[Path] = None):
        """
        Initialize image helper.

        Args:
            cache_dir: Directory to cache downloaded images (optional)
        """
        self.cache_dir = cache_dir
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)

    def download_image(self, url: str, timeout: int = 15) -> bytes:
        """
        Download image from URL.

        Args:
            url: Image URL
            timeout: Request timeout in seconds

        Returns:
            Image bytes

        Raises:
            requests.RequestException: If download fails
        """
        # Check cache first
        if self.cache_dir:
            cache_key = hashlib.md5(url.encode()).hexdigest()
            cache_path = self.cache_dir / f"{cache_key}.jpg"

            if cache_path.exists():
                return cache_path.read_bytes()

        # Download
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()

        image_bytes = response.content

        # Save to cache
        if self.cache_dir:
            cache_path.write_bytes(image_bytes)

        return image_bytes

    def encode_base64(self, image_bytes: bytes) -> str:
        """
        Encode image bytes to base64 string.

        Args:
            image_bytes: Raw image bytes

        Returns:
            Base64 encoded string
        """
        return base64.b64encode(image_bytes).decode("utf-8")

    def create_data_url(self, url: str, content_type: str = "image/jpeg") -> str:
        """
        Download image and convert to base64 data URL.

        This is required for OpenAI and Anthropic APIs.

        Args:
            url: Image URL
            content_type: MIME type

        Returns:
            Data URL string (data:image/jpeg;base64,...)
        """
        image_bytes = self.download_image(url)
        encoded = self.encode_base64(image_bytes)
        return f"data:{content_type};base64,{encoded}"

    def validate_url(self, url: str) -> bool:
        """
        Check if URL is accessible.

        Args:
            url: Image URL

        Returns:
            True if URL is valid and accessible
        """
        try:
            response = requests.head(url, timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def clear_cache(self):
        """Delete all cached images"""
        if self.cache_dir and self.cache_dir.exists():
            for file in self.cache_dir.glob("*.jpg"):
                file.unlink()
            print(f"✅ Cleared cache: {self.cache_dir}")
