#!/usr/bin/env python3
"""
Reddit Scraper Monitoring & Observability
Provides metrics collection, structured logging, and performance tracking
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from collections import defaultdict, deque
from dataclasses import dataclass, asdict
import traceback
from enum import Enum

try:
    from prometheus_client import Counter, Histogram, Gauge, start_http_server
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False

from supabase import Client

class MetricType(Enum):
    """Types of metrics to track"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"

@dataclass
class ScraperMetrics:
    """Container for scraper metrics"""
    # Counters
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    rate_limited_requests: int = 0
    proxy_failures: int = 0

    # Data counters
    subreddits_analyzed: int = 0
    posts_analyzed: int = 0
    users_analyzed: int = 0
    users_skipped: int = 0

    # Timing
    total_processing_time_ms: int = 0
    avg_response_time_ms: float = 0
    last_request_time: Optional[datetime] = None

    # Current state
    active_accounts: int = 0
    rate_limited_accounts: int = 0
    current_batch: int = 0
    total_batches: int = 0

    # Error tracking
    consecutive_failures: int = 0
    last_error: Optional[str] = None
    error_rate: float = 0.0

    def to_dict(self) -> dict:
        """Convert metrics to dictionary"""
        data = asdict(self)
        if self.last_request_time:
            data['last_request_time'] = self.last_request_time.isoformat()
        return data

class PerformanceTracker:
    """Track performance metrics with sliding windows"""

    def __init__(self, window_size: int = 1000):
        self.window_size = window_size
        self.response_times = deque(maxlen=window_size)
        self.error_times = deque(maxlen=window_size)
        self.request_timestamps = deque(maxlen=window_size)

    def add_request(self, response_time_ms: float, success: bool = True):
        """Add a request to tracking"""
        timestamp = time.time()
        self.request_timestamps.append(timestamp)
        self.response_times.append(response_time_ms)

        if not success:
            self.error_times.append(timestamp)

    def get_stats(self) -> dict:
        """Get performance statistics"""
        if not self.response_times:
            return {
                'avg_response_time_ms': 0,
                'p50_response_time_ms': 0,
                'p95_response_time_ms': 0,
                'p99_response_time_ms': 0,
                'requests_per_minute': 0,
                'error_rate': 0
            }

        sorted_times = sorted(self.response_times)
        n = len(sorted_times)

        # Calculate request rate
        if len(self.request_timestamps) >= 2:
            time_span = self.request_timestamps[-1] - self.request_timestamps[0]
            requests_per_minute = (len(self.request_timestamps) / time_span) * 60 if time_span > 0 else 0
        else:
            requests_per_minute = 0

        # Calculate error rate
        recent_errors = sum(1 for t in self.error_times if t > time.time() - 300)  # Last 5 minutes
        error_rate = recent_errors / max(1, len(self.request_timestamps))

        return {
            'avg_response_time_ms': sum(self.response_times) / n,
            'p50_response_time_ms': sorted_times[n // 2],
            'p95_response_time_ms': sorted_times[int(n * 0.95)],
            'p99_response_time_ms': sorted_times[int(n * 0.99)],
            'requests_per_minute': round(requests_per_minute, 2),
            'error_rate': round(error_rate, 4)
        }

class MonitoringService:
    """Main monitoring service for the Reddit scraper"""

    def __init__(self, config: Any, supabase_client: Optional[Client] = None):
        self.config = config
        self.supabase = supabase_client
        self.metrics = ScraperMetrics()
        self.performance = PerformanceTracker()

        # Account health tracking
        self.account_health = defaultdict(lambda: {
            'requests': 0,
            'failures': 0,
            'rate_limits': 0,
            'last_used': None,
            'health_score': 100.0
        })

        # Setup logging
        self._setup_logging()

        # Setup Prometheus metrics if available
        if PROMETHEUS_AVAILABLE and config.monitoring.enable_metrics:
            self._setup_prometheus_metrics()

    def _setup_logging(self):
        """Configure structured logging"""
        log_level = getattr(logging, self.config.monitoring.log_level, logging.INFO)

        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # Setup handlers
        handlers = []

        if self.config.monitoring.log_to_console:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            handlers.append(console_handler)

        if self.config.monitoring.log_to_file:
            try:
                from logging.handlers import RotatingFileHandler
                file_handler = RotatingFileHandler(
                    self.config.monitoring.log_file_path,
                    maxBytes=self.config.monitoring.log_max_bytes,
                    backupCount=self.config.monitoring.log_backup_count
                )
                file_handler.setFormatter(formatter)
                handlers.append(file_handler)
            except Exception as e:
                print(f"Failed to setup file logging: {e}")

        # Configure root logger
        logging.basicConfig(level=log_level, handlers=handlers)
        self.logger = logging.getLogger('reddit_scraper')

    def _setup_prometheus_metrics(self):
        """Setup Prometheus metrics collectors"""
        # Counters
        self.prom_requests = Counter('scraper_requests_total', 'Total number of requests', ['status'])
        self.prom_data_processed = Counter('scraper_data_processed_total', 'Total data processed', ['type'])

        # Gauges
        self.prom_active_accounts = Gauge('scraper_active_accounts', 'Number of active accounts')
        self.prom_error_rate = Gauge('scraper_error_rate', 'Current error rate')

        # Histograms
        self.prom_response_time = Histogram('scraper_response_time_ms', 'Response time in milliseconds')

        # Start metrics server
        try:
            start_http_server(self.config.monitoring.metrics_port)
            self.logger.info(f"Prometheus metrics server started on port {self.config.monitoring.metrics_port}")
        except Exception as e:
            self.logger.error(f"Failed to start Prometheus metrics server: {e}")

    async def log_request(self, endpoint: str, success: bool, response_time_ms: float,
                          account_name: Optional[str] = None, error: Optional[str] = None):
        """Log a request with metrics"""
        # Update metrics
        self.metrics.total_requests += 1
        if success:
            self.metrics.successful_requests += 1
        else:
            self.metrics.failed_requests += 1
            if error and 'rate limit' in error.lower():
                self.metrics.rate_limited_requests += 1

        self.metrics.last_request_time = datetime.now(timezone.utc)

        # Update performance tracking
        self.performance.add_request(response_time_ms, success)

        # Update account health if account specified
        if account_name:
            self._update_account_health(account_name, success, error)

        # Update Prometheus metrics if available
        if PROMETHEUS_AVAILABLE and self.config.monitoring.enable_metrics:
            status = 'success' if success else 'error'
            self.prom_requests.labels(status=status).inc()
            self.prom_response_time.observe(response_time_ms)

        # Log to Supabase if configured
        if self.config.monitoring.log_to_supabase and self.supabase:
            await self._log_to_supabase(endpoint, success, response_time_ms, account_name, error)

        # Log to standard logger
        level = logging.INFO if success else logging.ERROR
        self.logger.log(
            level,
            f"Request to {endpoint}: {'SUCCESS' if success else 'FAILED'} "
            f"({response_time_ms:.2f}ms) "
            f"[Account: {account_name or 'N/A'}]"
            + (f" Error: {error}" if error else "")
        )

    async def log_data_processed(self, data_type: str, count: int):
        """Log data processing metrics"""
        if data_type == 'subreddits':
            self.metrics.subreddits_analyzed += count
        elif data_type == 'posts':
            self.metrics.posts_analyzed += count
        elif data_type == 'users':
            self.metrics.users_analyzed += count

        # Update Prometheus metrics
        if PROMETHEUS_AVAILABLE and self.config.monitoring.enable_metrics:
            self.prom_data_processed.labels(type=data_type).inc(count)

        self.logger.debug(f"Processed {count} {data_type}")

    def _update_account_health(self, account_name: str, success: bool, error: Optional[str] = None):
        """Update account health metrics"""
        health = self.account_health[account_name]
        health['requests'] += 1
        health['last_used'] = datetime.now(timezone.utc)

        if not success:
            health['failures'] += 1
            if error and 'rate limit' in error.lower():
                health['rate_limits'] += 1

        # Calculate health score (0-100)
        total = health['requests']
        if total > 0:
            success_rate = (total - health['failures']) / total
            rate_limit_penalty = min(health['rate_limits'] * 10, 50)  # Max 50 point penalty
            health['health_score'] = max(0, (success_rate * 100) - rate_limit_penalty)

    async def _log_to_supabase(self, endpoint: str, success: bool, response_time_ms: float,
                               account_name: Optional[str], error: Optional[str]):
        """Log metrics to Supabase"""
        try:
            log_entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'endpoint': endpoint,
                'success': success,
                'response_time_ms': response_time_ms,
                'account_name': account_name,
                'error': error[:500] if error else None,  # Truncate long errors
                'metrics': self.metrics.to_dict()
            }

            self.supabase.table(self.config.supabase.logs_table).insert(log_entry).execute()
        except Exception as e:
            self.logger.error(f"Failed to log to Supabase: {e}")

    def get_account_health_report(self) -> Dict[str, Any]:
        """Get health report for all accounts"""
        report = {}
        for account_name, health in self.account_health.items():
            report[account_name] = {
                'health_score': round(health['health_score'], 2),
                'total_requests': health['requests'],
                'failures': health['failures'],
                'rate_limits': health['rate_limits'],
                'last_used': health['last_used'].isoformat() if health['last_used'] else None
            }
        return report

    def get_healthiest_account(self, exclude: Optional[List[str]] = None) -> Optional[str]:
        """Get the healthiest available account"""
        exclude = exclude or []
        available_accounts = [
            (name, health['health_score'])
            for name, health in self.account_health.items()
            if name not in exclude and health['health_score'] > 20  # Minimum health threshold
        ]

        if not available_accounts:
            return None

        # Sort by health score and return the best
        available_accounts.sort(key=lambda x: x[1], reverse=True)
        return available_accounts[0][0]

    async def log_error(self, error: Exception, context: Optional[Dict[str, Any]] = None):
        """Log an error with full context"""
        error_details = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'traceback': traceback.format_exc(),
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'context': context or {}
        }

        # Update metrics
        self.metrics.consecutive_failures += 1
        self.metrics.last_error = str(error)[:200]

        # Log to standard logger
        self.logger.error(f"Error occurred: {error}", exc_info=True)

        # Log to Supabase errors table
        if self.config.monitoring.log_to_supabase and self.supabase:
            try:
                self.supabase.table(self.config.supabase.errors_table).insert(error_details).execute()
            except Exception as e:
                self.logger.error(f"Failed to log error to Supabase: {e}")

    def reset_consecutive_failures(self):
        """Reset consecutive failure counter on success"""
        self.metrics.consecutive_failures = 0

    def update_batch_progress(self, current: int, total: int):
        """Update batch processing progress"""
        self.metrics.current_batch = current
        self.metrics.total_batches = total

        # Update Prometheus gauge if available
        if PROMETHEUS_AVAILABLE and self.config.monitoring.enable_metrics:
            progress = (current / max(1, total)) * 100
            self.prom_error_rate.set(progress)

        self.logger.info(f"Batch progress: {current}/{total} ({(current/max(1, total)*100):.1f}%)")

    def get_status_report(self) -> Dict[str, Any]:
        """Get comprehensive status report"""
        perf_stats = self.performance.get_stats()

        # Calculate uptime
        if self.metrics.last_request_time:
            uptime_seconds = (datetime.now(timezone.utc) - self.metrics.last_request_time).total_seconds()
            uptime_hours = uptime_seconds / 3600
        else:
            uptime_hours = 0

        return {
            'status': self._determine_health_status(),
            'uptime_hours': round(uptime_hours, 2),
            'metrics': self.metrics.to_dict(),
            'performance': perf_stats,
            'account_health': self.get_account_health_report(),
            'batch_progress': {
                'current': self.metrics.current_batch,
                'total': self.metrics.total_batches,
                'percentage': round((self.metrics.current_batch / max(1, self.metrics.total_batches)) * 100, 2)
            }
        }

    def _determine_health_status(self) -> str:
        """Determine overall health status"""
        error_rate = self.metrics.failed_requests / max(1, self.metrics.total_requests)

        if self.metrics.consecutive_failures >= self.config.health_check.max_consecutive_failures:
            return 'critical'
        elif error_rate > self.config.health_check.unhealthy_error_rate:
            return 'unhealthy'
        elif error_rate > self.config.monitoring.error_rate_threshold:
            return 'degraded'
        else:
            return 'healthy'

    async def periodic_status_report(self, interval_seconds: int = 300):
        """Generate periodic status reports"""
        while True:
            await asyncio.sleep(interval_seconds)
            status = self.get_status_report()
            self.logger.info(f"Status Report: {json.dumps(status, indent=2)}")

            # Check for alerts
            if status['status'] in ['critical', 'unhealthy']:
                self.logger.error(f"ALERT: Scraper is {status['status'].upper()}")

    def __enter__(self):
        """Context manager entry"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - log final stats"""
        final_report = self.get_status_report()
        self.logger.info(f"Final monitoring report: {json.dumps(final_report, indent=2)}")