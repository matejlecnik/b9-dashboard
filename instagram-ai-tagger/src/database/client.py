"""Supabase database client for Instagram AI Tagger"""
import os
from typing import Optional
from supabase import Client, create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class SupabaseConnection:
    """Manages Supabase database connection"""

    _instance: Optional['SupabaseConnection'] = None
    _client: Optional[Client] = None

    def __new__(cls):
        """Singleton pattern to ensure single connection"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> Client:
        """
        Get or create Supabase client.

        Returns:
            Supabase client instance

        Raises:
            ValueError: If credentials are not configured
        """
        if self._client is None:
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_SERVICE_KEY')

            if not url or not key:
                raise ValueError(
                    "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file.\n"
                    "Copy .env.example to .env and fill in your credentials."
                )

            self._client = create_client(url, key)
            print(f"✅ Connected to Supabase: {url}")

        return self._client

    def close(self):
        """Close connection (if needed)"""
        # Supabase client doesn't need explicit closing
        pass


# Singleton instance for easy import
_connection = SupabaseConnection()
supabase = _connection.get_client()
