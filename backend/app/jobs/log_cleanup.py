"""
Log Cleanup Job - CRON-001
Automated log cleanup to prevent disk overflow

CRITICAL: Deadline 2025-10-15 | Risk: DISK_OVERFLOW
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict

from app.core.database.supabase_client import get_supabase_client


logger = logging.getLogger(__name__)


async def cleanup_old_logs(retention_days: int = 30, batch_size: int = 1000) -> Dict[str, Any]:
    """
    Delete logs older than retention_days from Supabase

    Args:
        retention_days: Number of days to retain logs (default: 30)
        batch_size: Number of records to delete per batch (default: 1000)

    Returns:
        Dict with cleanup statistics

    Example:
        result = await cleanup_old_logs(retention_days=30)
        # {'deleted': 1500, 'retention_days': 30, 'cutoff_date': '2024-10-01'}
    """
    logger.info(f"Starting log cleanup - retention: {retention_days} days")

    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        cutoff_iso = cutoff_date.isoformat()

        # Get Supabase client
        db = get_supabase_client()
        assert db is not None, "Supabase client required for log cleanup"

        # Count logs to be deleted (for reporting)
        count_result = (
            db.table("logs")
            .select("id", count="exact")  # type: ignore[arg-type]
            .lt("timestamp", cutoff_iso)
            .execute()
        )

        total_to_delete = count_result.count if count_result.count else 0

        if total_to_delete == 0:
            logger.info("No old logs to delete")
            return {
                "deleted": 0,
                "retention_days": retention_days,
                "cutoff_date": cutoff_iso,
                "status": "success",
            }

        logger.info(f"Found {total_to_delete} old log entries to delete")

        # Delete in batches to avoid timeouts
        total_deleted = 0
        while total_deleted < total_to_delete:
            delete_result = (
                db.table("logs").delete().lt("timestamp", cutoff_iso).limit(batch_size).execute()
            )

            batch_deleted = len(delete_result.data) if delete_result.data else 0
            total_deleted += batch_deleted

            logger.info(
                f"Deleted batch: {batch_deleted} entries (total: {total_deleted}/{total_to_delete})"
            )

            # Break if no more records deleted
            if batch_deleted == 0:
                break

        logger.info(f"✅ Log cleanup complete: {total_deleted} entries deleted")

        return {
            "deleted": total_deleted,
            "retention_days": retention_days,
            "cutoff_date": cutoff_iso,
            "status": "success",
        }

    except Exception as e:
        logger.error(f"❌ Log cleanup failed: {e}", exc_info=True)
        return {"deleted": 0, "retention_days": retention_days, "error": str(e), "status": "failed"}


def cleanup_local_log_files(log_dir: str = "logs", retention_days: int = 30) -> Dict[str, Any]:
    """
    Delete local log files older than retention_days

    Args:
        log_dir: Directory containing log files (default: 'logs')
        retention_days: Number of days to retain files (default: 30)

    Returns:
        Dict with cleanup statistics
    """
    logger.info(
        f"Starting local log file cleanup - dir: {log_dir}, retention: {retention_days} days"
    )

    if not os.path.exists(log_dir):
        logger.warning(f"Log directory does not exist: {log_dir}")
        return {
            "deleted_files": 0,
            "deleted_bytes": 0,
            "retention_days": retention_days,
            "status": "skipped",
            "reason": "directory_not_found",
        }

    try:
        cutoff_time = (datetime.now() - timedelta(days=retention_days)).timestamp()

        deleted_files = 0
        deleted_bytes = 0
        errors = []

        for filename in os.listdir(log_dir):
            filepath = os.path.join(log_dir, filename)

            # Only process files (not directories)
            if not os.path.isfile(filepath):
                continue

            # Check if file is old enough to delete
            file_mtime = os.path.getmtime(filepath)
            if file_mtime < cutoff_time:
                try:
                    file_size = os.path.getsize(filepath)
                    os.remove(filepath)
                    deleted_files += 1
                    deleted_bytes += file_size
                    logger.info(f"Deleted old log file: {filename} ({file_size} bytes)")
                except Exception as e:
                    error_msg = f"Failed to delete {filename}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)

        logger.info(
            f"✅ Local log cleanup complete: "
            f"{deleted_files} files deleted ({deleted_bytes / 1024 / 1024:.2f} MB)"
        )

        return {
            "deleted_files": deleted_files,
            "deleted_bytes": deleted_bytes,
            "deleted_mb": round(deleted_bytes / 1024 / 1024, 2),
            "retention_days": retention_days,
            "errors": errors if errors else None,
            "status": "success",
        }

    except Exception as e:
        logger.error(f"❌ Local log cleanup failed: {e}", exc_info=True)
        return {"deleted_files": 0, "deleted_bytes": 0, "error": str(e), "status": "failed"}


async def full_log_cleanup(retention_days: int = 30) -> Dict[str, Any]:
    """
    Run complete log cleanup: Supabase + local files

    Args:
        retention_days: Number of days to retain logs (default: 30)

    Returns:
        Dict with combined cleanup statistics
    """
    logger.info(f"🧹 Starting full log cleanup (retention: {retention_days} days)")

    # Cleanup Supabase logs
    supabase_result = await cleanup_old_logs(retention_days=retention_days)

    # Cleanup local log files
    local_result = cleanup_local_log_files(retention_days=retention_days)

    result = {
        "supabase": supabase_result,
        "local": local_result,
        "retention_days": retention_days,
        "timestamp": datetime.now().isoformat(),
        "status": "success"
        if supabase_result["status"] == "success" and local_result["status"] == "success"
        else "partial",
    }

    logger.info("✅ Full log cleanup complete")
    return result
