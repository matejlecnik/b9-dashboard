#!/usr/bin/env python3
"""
Scraper control module for managing the Reddit scraper process via supervisor or Redis
"""

import subprocess
import logging
import os
import json
import redis.asyncio as redis
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ScraperController:
    """Controls the Reddit scraper process via supervisor with Redis fallback"""

    @staticmethod
    async def _get_redis_client():
        """Get Redis client for fallback control"""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        return await redis.from_url(redis_url)

    @staticmethod
    def get_status() -> Dict[str, Any]:
        """Get current status of the scraper process"""
        try:
            # Check supervisor status for scraper program
            result = subprocess.run(
                ['supervisorctl', 'status', 'scraper'],
                capture_output=True,
                text=True,
                check=False
            )

            output = result.stdout.strip()

            # Parse supervisor status output
            if 'RUNNING' in output:
                return {
                    "status": "running",
                    "message": "Scraper is running continuously",
                    "details": output
                }
            elif 'STOPPED' in output:
                return {
                    "status": "stopped",
                    "message": "Scraper is stopped",
                    "details": output
                }
            elif 'STARTING' in output:
                return {
                    "status": "starting",
                    "message": "Scraper is starting up",
                    "details": output
                }
            elif 'FATAL' in output:
                return {
                    "status": "error",
                    "message": "Scraper encountered a fatal error",
                    "details": output
                }
            else:
                return {
                    "status": "unknown",
                    "message": "Unable to determine scraper status",
                    "details": output
                }

        except Exception as e:
            logger.error(f"Error checking scraper status: {e}")
            return {
                "status": "error",
                "message": f"Error checking status: {str(e)}",
                "details": None
            }

    @staticmethod
    def start() -> Dict[str, Any]:
        """Start the scraper process for 24/7 operation"""
        try:
            # Start scraper via supervisor
            result = subprocess.run(
                ['supervisorctl', 'start', 'scraper'],
                capture_output=True,
                text=True,
                check=False
            )

            if result.returncode == 0:
                logger.info("Scraper started successfully")
                return {
                    "success": True,
                    "message": "Scraper started for 24/7 operation",
                    "details": result.stdout.strip()
                }
            else:
                logger.error(f"Failed to start scraper: {result.stderr}")
                return {
                    "success": False,
                    "message": "Failed to start scraper",
                    "details": result.stderr.strip()
                }

        except Exception as e:
            logger.error(f"Error starting scraper: {e}")
            return {
                "success": False,
                "message": f"Error starting scraper: {str(e)}",
                "details": None
            }

    @staticmethod
    def stop() -> Dict[str, Any]:
        """Stop the scraper process"""
        try:
            # Stop scraper via supervisor
            result = subprocess.run(
                ['supervisorctl', 'stop', 'scraper'],
                capture_output=True,
                text=True,
                check=False
            )

            if result.returncode == 0:
                logger.info("Scraper stopped successfully")
                return {
                    "success": True,
                    "message": "Scraper stopped",
                    "details": result.stdout.strip()
                }
            else:
                logger.error(f"Failed to stop scraper: {result.stderr}")
                return {
                    "success": False,
                    "message": "Failed to stop scraper",
                    "details": result.stderr.strip()
                }

        except Exception as e:
            logger.error(f"Error stopping scraper: {e}")
            return {
                "success": False,
                "message": f"Error stopping scraper: {str(e)}",
                "details": None
            }

    @staticmethod
    def restart() -> Dict[str, Any]:
        """Restart the scraper process"""
        try:
            # Restart scraper via supervisor
            result = subprocess.run(
                ['supervisorctl', 'restart', 'scraper'],
                capture_output=True,
                text=True,
                check=False
            )

            if result.returncode == 0:
                logger.info("Scraper restarted successfully")
                return {
                    "success": True,
                    "message": "Scraper restarted",
                    "details": result.stdout.strip()
                }
            else:
                logger.error(f"Failed to restart scraper: {result.stderr}")
                return {
                    "success": False,
                    "message": "Failed to restart scraper",
                    "details": result.stderr.strip()
                }

        except Exception as e:
            logger.error(f"Error restarting scraper: {e}")
            return {
                "success": False,
                "message": f"Error restarting scraper: {str(e)}",
                "details": None
            }

    @staticmethod
    def get_logs(lines: int = 100) -> Dict[str, Any]:
        """Get recent logs from the scraper"""
        try:
            log_file = "/var/log/supervisor/scraper.log"

            if os.path.exists(log_file):
                # Get last N lines of log file
                result = subprocess.run(
                    ['tail', '-n', str(lines), log_file],
                    capture_output=True,
                    text=True,
                    check=False
                )

                return {
                    "success": True,
                    "logs": result.stdout.split('\n'),
                    "lines": lines
                }
            else:
                return {
                    "success": False,
                    "message": "Log file not found",
                    "logs": []
                }

        except Exception as e:
            logger.error(f"Error reading logs: {e}")
            return {
                "success": False,
                "message": f"Error reading logs: {str(e)}",
                "logs": []
            }