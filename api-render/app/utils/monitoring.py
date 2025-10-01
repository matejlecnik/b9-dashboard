"""
Monitoring utilities - Stub implementation
"""
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Dict, Any, Optional


@dataclass
class SystemMetrics:
    """System metrics data"""
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    disk_percent: float = 0.0
    network_io: Dict[str, int] = None

    def __post_init__(self):
        if self.network_io is None:
            self.network_io = {"bytes_sent": 0, "bytes_recv": 0}


@dataclass
class HealthCheck:
    """Health check result"""
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None


class HealthMonitor:
    """Health monitoring service - stub implementation"""

    def __init__(self):
        self.dependencies = {}
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0

    def register_dependency(self, name: str, check_func):
        """Register a dependency health check"""
        self.dependencies[name] = check_func

    async def check_supabase_health(self) -> HealthCheck:
        """Check Supabase connection health"""
        return HealthCheck(status="healthy", message="Supabase connection OK")

    async def check_openai_health(self) -> HealthCheck:
        """Check OpenAI API health"""
        return HealthCheck(status="healthy", message="OpenAI API OK")

    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        uptime = time.time() - self.start_time
        return {
            "status": "healthy",
            "uptime_seconds": uptime,
            "dependencies": {
                name: {"status": "healthy"}
                for name in self.dependencies.keys()
            },
            "timestamp": time.time()
        }

    async def readiness_check(self) -> Dict[str, Any]:
        """Readiness check for load balancers"""
        return {
            "status": "ready",
            "timestamp": time.time()
        }

    async def liveness_check(self) -> Dict[str, Any]:
        """Liveness check for load balancers"""
        return {
            "status": "alive",
            "timestamp": time.time()
        }

    async def get_system_metrics(self) -> SystemMetrics:
        """Get current system metrics"""
        return SystemMetrics()

    def get_stats(self) -> Dict[str, Any]:
        """Get application statistics"""
        return {
            "requests": self.request_count,
            "errors": self.error_count,
            "uptime": time.time() - self.start_time
        }

    def increment_request(self):
        """Increment request counter"""
        self.request_count += 1

    def increment_error(self):
        """Increment error counter"""
        self.error_count += 1


# Global health monitor instance
health_monitor = HealthMonitor()


@asynccontextmanager
async def request_timer():
    """Context manager for timing requests"""
    start = time.time()
    try:
        yield
    finally:
        duration = time.time() - start
        health_monitor.increment_request()


def get_health_monitor() -> HealthMonitor:
    """Get the global health monitor instance"""
    return health_monitor
