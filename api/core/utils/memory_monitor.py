"""
Memory Monitor for Reddit Scraper
Tracks memory usage and triggers cleanup when thresholds are exceeded
"""
import logging
import asyncio
import psutil
import os
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class MemoryMonitor:
    """
    Monitors process memory usage and triggers cleanup actions when thresholds are exceeded.
    """

    def __init__(self,
                 warning_threshold: float = 0.70,  # 70% memory usage
                 error_threshold: float = 0.85,    # 85% memory usage
                 critical_threshold: float = 0.90,  # 90% memory usage
                 check_interval: int = 60):         # Check every 60 seconds
        """
        Initialize memory monitor.

        Args:
            warning_threshold: Memory usage percentage to trigger warnings (0.0-1.0)
            error_threshold: Memory usage percentage to trigger errors (0.0-1.0)
            critical_threshold: Memory usage percentage to trigger cleanup (0.0-1.0)
            check_interval: Interval between checks in seconds
        """
        self.warning_threshold = warning_threshold
        self.error_threshold = error_threshold
        self.critical_threshold = critical_threshold
        self.check_interval = check_interval

        # Get process handle
        self.process = psutil.Process(os.getpid())

        # Cleanup callbacks
        self.cleanup_callbacks = []

        # Statistics
        self.stats = {
            'checks_performed': 0,
            'warnings_triggered': 0,
            'errors_triggered': 0,
            'cleanups_triggered': 0,
            'peak_memory_mb': 0,
            'current_memory_mb': 0
        }

        # Background monitoring task
        self._running = False
        self._monitor_task = None

    def register_cleanup_callback(self, callback: Callable):
        """Register a callback to be called when memory cleanup is needed"""
        self.cleanup_callbacks.append(callback)
        logger.info(f"Registered cleanup callback: {callback.__name__}")

    async def start(self):
        """Start the memory monitoring task"""
        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info(f"🔍 Memory monitor started (thresholds: warning={self.warning_threshold*100}%, "
                   f"error={self.error_threshold*100}%, critical={self.critical_threshold*100}%)")

    async def stop(self):
        """Stop the memory monitoring task"""
        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        logger.info("🔍 Memory monitor stopped")

    async def _monitor_loop(self):
        """Background loop that monitors memory usage"""
        logger.info(f"📊 Memory monitor loop started (checking every {self.check_interval}s)")

        while self._running:
            try:
                await asyncio.sleep(self.check_interval)
                await self.check_memory()
                self.stats['checks_performed'] += 1

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in memory monitor loop: {e}")

        logger.info("📊 Memory monitor loop stopped")

    async def check_memory(self) -> Dict[str, Any]:
        """
        Check current memory usage and trigger actions if needed.

        Returns:
            Dict with memory statistics
        """
        try:
            # Get memory info
            memory_info = self.process.memory_info()
            memory_percent = self.process.memory_percent() / 100.0  # Convert to 0-1 range
            memory_mb = memory_info.rss / (1024 * 1024)

            # Update stats
            self.stats['current_memory_mb'] = memory_mb
            if memory_mb > self.stats['peak_memory_mb']:
                self.stats['peak_memory_mb'] = memory_mb

            # Get system memory info
            system_memory = psutil.virtual_memory()
            available_mb = system_memory.available / (1024 * 1024)

            memory_status = {
                'process_memory_mb': round(memory_mb, 2),
                'process_memory_percent': round(memory_percent * 100, 2),
                'system_available_mb': round(available_mb, 2),
                'system_percent_used': round(system_memory.percent, 2),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

            # Check thresholds and take action
            if memory_percent >= self.critical_threshold:
                self.stats['cleanups_triggered'] += 1
                logger.error(f"🚨 CRITICAL: Memory usage at {memory_percent*100:.1f}% "
                           f"({memory_mb:.1f}MB) - triggering cleanup!")
                await self._trigger_cleanup(memory_status)

            elif memory_percent >= self.error_threshold:
                self.stats['errors_triggered'] += 1
                logger.error(f"❌ ERROR: Memory usage at {memory_percent*100:.1f}% "
                           f"({memory_mb:.1f}MB) - approaching critical threshold!")

            elif memory_percent >= self.warning_threshold:
                self.stats['warnings_triggered'] += 1
                logger.warning(f"⚠️ WARNING: Memory usage at {memory_percent*100:.1f}% "
                             f"({memory_mb:.1f}MB) - consider reducing load")

            else:
                # Log normal memory usage periodically (every 10 checks)
                if self.stats['checks_performed'] % 10 == 0:
                    logger.info(f"💾 Memory status: {memory_percent*100:.1f}% "
                               f"({memory_mb:.1f}MB) - OK")

            return memory_status

        except Exception as e:
            logger.error(f"Error checking memory: {e}")
            return {}

    async def _trigger_cleanup(self, memory_status: Dict[str, Any]):
        """Trigger cleanup callbacks when memory threshold is exceeded"""
        logger.info("🧹 Triggering memory cleanup callbacks...")

        cleanup_results = []
        for callback in self.cleanup_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    result = await callback(memory_status)
                else:
                    result = callback(memory_status)
                cleanup_results.append(f"✅ {callback.__name__}")
            except Exception as e:
                logger.error(f"Error in cleanup callback {callback.__name__}: {e}")
                cleanup_results.append(f"❌ {callback.__name__}: {e}")

        # Log cleanup results
        if cleanup_results:
            logger.info("🧹 Cleanup results:")
            for result in cleanup_results:
                logger.info(f"  {result}")

        # Check memory again after cleanup
        await asyncio.sleep(5)  # Wait a bit for cleanup to take effect
        new_status = await self.check_memory()

        if new_status:
            old_mb = memory_status['process_memory_mb']
            new_mb = new_status['process_memory_mb']
            freed_mb = old_mb - new_mb

            if freed_mb > 0:
                logger.info(f"✅ Cleanup freed {freed_mb:.1f}MB of memory")
            else:
                logger.warning(f"⚠️ Cleanup did not free memory (still at {new_mb:.1f}MB)")

    def get_memory_info(self) -> Dict[str, Any]:
        """Get current memory information synchronously"""
        try:
            memory_info = self.process.memory_info()
            memory_mb = memory_info.rss / (1024 * 1024)
            memory_percent = self.process.memory_percent() / 100.0

            return {
                'process_memory_mb': round(memory_mb, 2),
                'process_memory_percent': round(memory_percent * 100, 2),
                'peak_memory_mb': round(self.stats['peak_memory_mb'], 2),
                **self.stats
            }
        except Exception as e:
            logger.error(f"Error getting memory info: {e}")
            return self.stats

    def get_stats(self) -> Dict[str, Any]:
        """Get memory monitoring statistics"""
        return {
            **self.get_memory_info(),
            'thresholds': {
                'warning': f"{self.warning_threshold*100}%",
                'error': f"{self.error_threshold*100}%",
                'critical': f"{self.critical_threshold*100}%"
            }
        }


# Global instance for easy access
_memory_monitor = None


def get_memory_monitor() -> Optional[MemoryMonitor]:
    """Get the global memory monitor instance"""
    return _memory_monitor


def set_memory_monitor(monitor: MemoryMonitor):
    """Set the global memory monitor instance"""
    global _memory_monitor
    _memory_monitor = monitor