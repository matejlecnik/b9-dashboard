#!/usr/bin/env python3
"""
B9 Dashboard - Categorization Task
Celery task wrapper for categorize_all.py script with progress tracking
"""

import os
import sys
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from celery import Task
from celery_app import celery_app

# Add scripts directory to path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'scripts'))

# Configure logging
logger = logging.getLogger(__name__)

class CategorizationTask(Task):
    """Celery task for AI-powered subreddit categorization"""
    
    def __init__(self):
        self.categorizer = None
        self.job_tracker = None
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f"Categorization task {task_id} failed: {exc}")
        # Update job status in database
        if self.job_tracker:
            self.job_tracker.update_job_status(
                task_id, 
                'failed', 
                error_message=str(exc)
            )
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success"""
        logger.info(f"Categorization task {task_id} completed successfully")
        # Update job status in database
        if self.job_tracker:
            self.job_tracker.update_job_status(
                task_id,
                'completed',
                result=retval
            )
    
    def run(self, batch_size: int = 30, limit: Optional[int] = None, **kwargs) -> Dict[str, Any]:
        """
        Execute categorization task
        
        Args:
            batch_size: Number of subreddits to process per batch
            limit: Maximum number of subreddits to categorize
            
        Returns:
            Dict with task results and statistics
        """
        task_id = self.request.id
        start_time = datetime.now()
        
        try:
            # Import and initialize categorizer
            from categorize_all import CompleteCategorizer
            if not self.categorizer:
                self.categorizer = CompleteCategorizer()
            
            # Get uncategorized subreddits count
            total_count = self.categorizer.get_uncategorized_count()
            actual_limit = min(limit, total_count) if limit else total_count
            
            logger.info(f"Starting categorization task {task_id}: {actual_limit} subreddits")
            
            # Update initial progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 0,
                    'total': actual_limit,
                    'status': f'Starting categorization of {actual_limit} subreddits',
                    'phase': 'initialization',
                    'started_at': start_time.isoformat()
                }
            )
            
            processed = 0
            categorized = 0
            errors = []
            
            # Process in batches
            while processed < actual_limit:
                batch_start = processed
                batch_end = min(processed + batch_size, actual_limit)
                current_batch_size = batch_end - batch_start
                
                try:
                    # Process batch
                    batch_results = self.categorizer.categorize_batch(
                        batch_size=current_batch_size,
                        offset=processed
                    )
                    
                    # Update counters
                    batch_categorized = len([r for r in batch_results if r.get('categorized')])
                    categorized += batch_categorized
                    processed += current_batch_size
                    
                    # Calculate progress
                    progress_percent = int((processed / actual_limit) * 100)
                    
                    # Update progress
                    self.update_state(
                        state='PROGRESS',
                        meta={
                            'current': processed,
                            'total': actual_limit,
                            'categorized': categorized,
                            'progress_percent': progress_percent,
                            'status': f'Categorized {categorized}/{processed} subreddits ({progress_percent}%)',
                            'phase': 'processing',
                            'current_batch': len(batch_results),
                            'errors': len(errors)
                        }
                    )
                    
                    logger.info(f"Batch {batch_start}-{batch_end}: {batch_categorized} categorized")
                    
                except Exception as e:
                    error_msg = f"Error in batch {batch_start}-{batch_end}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    
                    # Still update progress even if batch failed
                    processed += current_batch_size
            
            # Final results
            duration = (datetime.now() - start_time).total_seconds()
            
            result = {
                'status': 'completed',
                'total_processed': processed,
                'total_categorized': categorized,
                'success_rate': (categorized / processed * 100) if processed > 0 else 0,
                'duration_seconds': duration,
                'batch_size': batch_size,
                'errors': errors,
                'error_count': len(errors),
                'completed_at': datetime.now().isoformat(),
                'started_at': start_time.isoformat()
            }
            
            logger.info(f"Categorization task {task_id} completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Categorization task {task_id} failed: {e}")
            raise self.retry(exc=e, countdown=300, max_retries=2)

# Register task with Celery
categorize_subreddits = celery_app.register_task(CategorizationTask())