"""
Centralized Supabase Client Manager
Provides a single, shared Supabase client instance to prevent connection overload
"""
import os
import logging
from typing import Optional
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseClientManager:
    """
    Singleton manager for Supabase client to prevent multiple connections.
    Ensures only one client instance is created and shared across the application.
    """
    
    _instance: Optional['SupabaseClientManager'] = None
    _client: Optional[Client] = None
    _initialized: bool = False
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_client(self) -> Client:
        """
        Get the shared Supabase client instance.
        Creates the client if it doesn't exist.
        
        Returns:
            Supabase client instance
            
        Raises:
            Exception: If Supabase credentials are not configured
        """
        if not self._initialized:
            self._initialize_client()
        
        return self._client
    
    def _initialize_client(self):
        """Initialize the Supabase client with proper configuration"""
        if self._client is not None:
            return

        # Get credentials from environment
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if not supabase_url or not supabase_key:
            raise Exception(
                "Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )

        # Create client with basic configuration (Supabase handles connection pooling internally)
        self._client = create_client(supabase_url, supabase_key)

        self._initialized = True
        logger.info("✅ Centralized Supabase client initialized with connection optimization")

    def refresh_client(self):
        """Force refresh the Supabase client to clear schema cache"""
        logger.info("🔄 Force refreshing Supabase client to clear schema cache...")

        # Close existing client
        self._client = None
        self._initialized = False

        # Reinitialize with fresh client
        self._initialize_client()
        logger.info("✅ Supabase client refreshed with cleared schema cache")
    
    def close(self):
        """Close the client connection (for cleanup)"""
        if self._client:
            try:
                # Supabase client doesn't have explicit close method
                # But we can reset for cleanup
                self._client = None
                self._initialized = False
                logger.info("🔒 Supabase client connection closed")
            except Exception as e:
                logger.error(f"Error closing Supabase client: {e}")
    
    def get_connection_info(self) -> dict:
        """Get information about the current connection"""
        return {
            'initialized': self._initialized,
            'has_client': self._client is not None,
            'url': os.getenv("SUPABASE_URL", "Not configured")
        }


# Global instance for easy access
_supabase_manager = SupabaseClientManager()

def get_supabase_client() -> Client:
    """
    Get the shared Supabase client instance.
    This is the main function that should be used throughout the application.
    
    Returns:
        Supabase client instance
    """
    return _supabase_manager.get_client()

def close_supabase_client():
    """Close the shared Supabase client (for cleanup)"""
    _supabase_manager.close()

def refresh_supabase_client():
    """Force refresh the Supabase client to clear schema cache"""
    _supabase_manager.refresh_client()

def get_supabase_connection_info() -> dict:
    """Get information about the Supabase connection"""
    return _supabase_manager.get_connection_info()


# Connection health monitoring
class ConnectionHealthMonitor:
    """Monitor database connection health and implement circuit breaker pattern"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.is_circuit_open = False
        
    def record_success(self):
        """Record a successful database operation"""
        self.failure_count = 0
        self.is_circuit_open = False
        
    def record_failure(self):
        """Record a failed database operation"""
        import time
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.is_circuit_open = True
            logger.warning(f"🚨 Database circuit breaker OPEN after {self.failure_count} failures")
            
    def should_allow_request(self) -> bool:
        """Check if database requests should be allowed"""
        if not self.is_circuit_open:
            return True
            
        # Check if enough time has passed to try again
        import time
        if time.time() - self.last_failure_time > self.recovery_timeout:
            logger.info("🔄 Database circuit breaker attempting recovery")
            self.is_circuit_open = False
            return True
            
        return False
    
    def get_status(self) -> dict:
        """Get current circuit breaker status"""
        return {
            'is_circuit_open': self.is_circuit_open,
            'failure_count': self.failure_count,
            'failure_threshold': self.failure_threshold,
            'last_failure_time': self.last_failure_time
        }

# Global circuit breaker instance
_circuit_breaker = ConnectionHealthMonitor()

def get_circuit_breaker() -> ConnectionHealthMonitor:
    """Get the global circuit breaker instance"""
    return _circuit_breaker
