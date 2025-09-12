#!/usr/bin/env python3
"""
B9 Dashboard API - Monitoring & Health Check Utilities
Comprehensive monitoring for production deployment on Render
"""

import os
import time
import asyncio
import psutil
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

@dataclass
class HealthCheck:
    """Health check result"""
    name: str
    status: str  # "healthy", "warning", "error"
    message: str
    timestamp: str
    response_time_ms: Optional[float] = None
    details: Optional[Dict] = None

@dataclass
class SystemMetrics:
    """System performance metrics"""
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_percent: float
    disk_used_gb: float
    disk_free_gb: float
    network_sent_mb: float
    network_recv_mb: float
    process_count: int
    load_average: List[float]
    uptime_seconds: float
    timestamp: str

class HealthMonitor:
    """
    Comprehensive health monitoring for B9 Dashboard API
    """
    
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.last_metrics_update = time.time()
        self.metrics_history = []
        self.max_history_size = 100
        
        # Dependencies to check
        self.dependencies = {
            'supabase': None,
            'redis': None,
            'openai': None
        }
    
    def register_dependency(self, name: str, health_check_func):
        """Register a dependency health check function"""
        self.dependencies[name] = health_check_func
    
    async def check_supabase_health(self) -> HealthCheck:
        """Check Supabase database connectivity"""
        start_time = time.time()
        
        try:
            from supabase import create_client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            if not supabase_url or not supabase_key:
                return HealthCheck(
                    name="supabase",
                    status="error",
                    message="Missing Supabase configuration",
                    timestamp=datetime.now().isoformat(),
                    response_time_ms=0
                )
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Simple health check query
            response = supabase.table('subreddits').select('id').limit(1).execute()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheck(
                name="supabase",
                status="healthy",
                message="Database connection successful",
                timestamp=datetime.now().isoformat(),
                response_time_ms=round(response_time, 2),
                details={
                    "has_data": len(response.data) > 0 if response.data else False,
                    "url": supabase_url.split('@')[-1] if '@' in supabase_url else supabase_url  # Hide credentials
                }
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name="supabase",
                status="error",
                message=f"Database connection failed: {str(e)[:100]}",
                timestamp=datetime.now().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    async def check_redis_health(self) -> HealthCheck:
        """Check Redis cache connectivity"""
        start_time = time.time()
        
        try:
            import redis.asyncio as redis
            from redis.exceptions import RedisError
            
            redis_url = os.getenv('REDIS_URL')
            if not redis_url:
                return HealthCheck(
                    name="redis",
                    status="warning",
                    message="Redis not configured (optional)",
                    timestamp=datetime.now().isoformat(),
                    response_time_ms=0
                )
            
            redis_client = redis.from_url(redis_url, socket_timeout=3)
            
            # Test connection
            await redis_client.ping()
            info = await redis_client.info()
            await redis_client.close()
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheck(
                name="redis",
                status="healthy",
                message="Cache connection successful",
                timestamp=datetime.now().isoformat(),
                response_time_ms=round(response_time, 2),
                details={
                    "memory_used": info.get("used_memory_human"),
                    "connected_clients": info.get("connected_clients"),
                    "version": info.get("redis_version")
                }
            )
            
        except ImportError:
            return HealthCheck(
                name="redis",
                status="warning",
                message="Redis client not installed",
                timestamp=datetime.now().isoformat(),
                response_time_ms=0
            )
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name="redis",
                status="error",
                message=f"Cache connection failed: {str(e)[:100]}",
                timestamp=datetime.now().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    async def check_openai_health(self) -> HealthCheck:
        """Check OpenAI API connectivity"""
        start_time = time.time()
        
        try:
            openai_key = os.getenv("OPENAI_API_KEY")
            if not openai_key:
                return HealthCheck(
                    name="openai",
                    status="error",
                    message="Missing OpenAI API key",
                    timestamp=datetime.now().isoformat(),
                    response_time_ms=0
                )
            
            # Simple check - just validate key format
            if len(openai_key) < 20 or not openai_key.startswith(('sk-', 'sk-proj-')):
                return HealthCheck(
                    name="openai",
                    status="error",
                    message="Invalid OpenAI API key format",
                    timestamp=datetime.now().isoformat(),
                    response_time_ms=0
                )
            
            response_time = (time.time() - start_time) * 1000
            
            return HealthCheck(
                name="openai",
                status="healthy",
                message="OpenAI API key configured",
                timestamp=datetime.now().isoformat(),
                response_time_ms=round(response_time, 2),
                details={
                    "key_prefix": openai_key[:12] + "..." if len(openai_key) > 12 else "***"
                }
            )
            
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return HealthCheck(
                name="openai",
                status="error",
                message=f"OpenAI check failed: {str(e)[:100]}",
                timestamp=datetime.now().isoformat(),
                response_time_ms=round(response_time, 2)
            )
    
    async def get_system_metrics(self) -> SystemMetrics:
        """Get current system performance metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_used_mb = round((memory.total - memory.available) / 1024 / 1024, 2)
            memory_available_mb = round(memory.available / 1024 / 1024, 2)
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_used_gb = round(disk.used / 1024 / 1024 / 1024, 2)
            disk_free_gb = round(disk.free / 1024 / 1024 / 1024, 2)
            
            # Network metrics (approximate)
            try:
                net_io = psutil.net_io_counters()
                network_sent_mb = round(net_io.bytes_sent / 1024 / 1024, 2)
                network_recv_mb = round(net_io.bytes_recv / 1024 / 1024, 2)
            except:
                network_sent_mb = network_recv_mb = 0
            
            # Process metrics
            process_count = len(psutil.pids())
            
            # Load average (Unix systems only)
            try:
                load_average = list(os.getloadavg())
            except (AttributeError, OSError):
                load_average = [0, 0, 0]
            
            # Uptime
            uptime_seconds = time.time() - self.start_time
            
            return SystemMetrics(
                cpu_percent=round(cpu_percent, 2),
                memory_percent=round(memory.percent, 2),
                memory_used_mb=memory_used_mb,
                memory_available_mb=memory_available_mb,
                disk_percent=round(disk.percent, 2),
                disk_used_gb=disk_used_gb,
                disk_free_gb=disk_free_gb,
                network_sent_mb=network_sent_mb,
                network_recv_mb=network_recv_mb,
                process_count=process_count,
                load_average=load_average,
                uptime_seconds=round(uptime_seconds, 2),
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            # Return minimal metrics on error
            return SystemMetrics(
                cpu_percent=0,
                memory_percent=0,
                memory_used_mb=0,
                memory_available_mb=0,
                disk_percent=0,
                disk_used_gb=0,
                disk_free_gb=0,
                network_sent_mb=0,
                network_recv_mb=0,
                process_count=0,
                load_average=[0, 0, 0],
                uptime_seconds=time.time() - self.start_time,
                timestamp=datetime.now().isoformat()
            )
    
    async def comprehensive_health_check(self) -> Dict[str, Any]:
        """Run comprehensive health check"""
        start_time = time.time()
        
        # Run all health checks concurrently
        health_checks = await asyncio.gather(
            self.check_supabase_health(),
            self.check_redis_health(),
            self.check_openai_health(),
            return_exceptions=True
        )
        
        # Get system metrics
        metrics = await self.get_system_metrics()
        
        # Process health check results
        checks_dict = {}
        overall_status = "healthy"
        
        for check in health_checks:
            if isinstance(check, Exception):
                logger.error(f"Health check failed: {check}")
                continue
                
            checks_dict[check.name] = asdict(check)
            
            if check.status == "error":
                overall_status = "error"
            elif check.status == "warning" and overall_status == "healthy":
                overall_status = "warning"
        
        # Application metrics
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        
        error_rate = (
            (self.error_count / self.request_count) * 100 
            if self.request_count > 0 else 0
        )
        
        total_time = time.time() - start_time
        
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "health_check_duration_ms": round(total_time * 1000, 2),
            "checks": checks_dict,
            "system_metrics": asdict(metrics),
            "application_metrics": {
                "uptime_seconds": metrics.uptime_seconds,
                "total_requests": self.request_count,
                "total_errors": self.error_count,
                "error_rate_percent": round(error_rate, 2),
                "average_response_time_ms": round(avg_response_time * 1000, 2)
            },
            "environment": {
                "python_version": os.sys.version.split()[0],
                "platform": os.sys.platform,
                "render_service": os.getenv("RENDER_SERVICE_NAME", "unknown"),
                "render_instance": os.getenv("RENDER_INSTANCE_ID", "unknown")
            }
        }
    
    def record_request(self, response_time: float, is_error: bool = False):
        """Record request metrics"""
        self.request_count += 1
        self.total_response_time += response_time
        
        if is_error:
            self.error_count += 1
    
    async def store_metrics(self):
        """Store current metrics in history"""
        metrics = await self.get_system_metrics()
        self.metrics_history.append(asdict(metrics))
        
        # Keep only recent history
        if len(self.metrics_history) > self.max_history_size:
            self.metrics_history = self.metrics_history[-self.max_history_size:]
        
        self.last_metrics_update = time.time()
    
    def get_metrics_history(self, last_n: int = 10) -> List[Dict]:
        """Get recent metrics history"""
        return self.metrics_history[-last_n:] if self.metrics_history else []
    
    async def readiness_check(self) -> Dict[str, Any]:
        """Quick readiness check for load balancer"""
        try:
            # Quick checks for critical services
            supabase_ok = os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            
            return {
                "status": "ready" if supabase_ok else "not_ready",
                "timestamp": datetime.now().isoformat(),
                "checks": {
                    "supabase_config": supabase_ok,
                    "uptime_seconds": time.time() - self.start_time
                }
            }
        except Exception as e:
            return {
                "status": "not_ready",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def liveness_check(self) -> Dict[str, Any]:
        """Simple liveness check"""
        return {
            "status": "alive",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": time.time() - self.start_time
        }

# Global health monitor instance
health_monitor = HealthMonitor()

@asynccontextmanager
async def request_timer():
    """Context manager to time requests"""
    start_time = time.time()
    error_occurred = False
    
    try:
        yield
    except Exception as e:
        error_occurred = True
        raise
    finally:
        response_time = time.time() - start_time
        health_monitor.record_request(response_time, error_occurred)

def get_health_monitor() -> HealthMonitor:
    """Dependency injection for health monitor"""
    return health_monitor