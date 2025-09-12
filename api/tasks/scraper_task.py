#!/usr/bin/env python3
"""
B9 Dashboard - Scraper Task
Celery task wrapper for Reddit scraping operations with progress tracking
"""

import os
import sys
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from celery import Task
from celery_app import celery_app

# Configure logging
logger = logging.getLogger(__name__)

class ScraperTask(Task):
    """Celery task for Reddit scraping operations"""
    
    def __init__(self):
        self.scraper = None
        self.job_tracker = None
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Handle task failure"""
        logger.error(f"Scraper task {task_id} failed: {exc}")
        if self.job_tracker:
            self.job_tracker.update_job_status(
                task_id, 
                'failed', 
                error_message=str(exc)
            )
    
    def on_success(self, retval, task_id, args, kwargs):
        """Handle task success"""
        logger.info(f"Scraper task {task_id} completed successfully")
        if self.job_tracker:
            self.job_tracker.update_job_status(
                task_id,
                'completed',
                result=retval
            )
    
    def run(self, 
           operation: str = "analyze_subreddits",
           subreddit_names: Optional[List[str]] = None,
           user_names: Optional[List[str]] = None,
           limit: Optional[int] = None,
           **kwargs) -> Dict[str, Any]:
        """
        Execute scraper task
        
        Args:
            operation: Type of scraping operation
            subreddit_names: List of subreddit names to analyze
            user_names: List of usernames to analyze
            limit: Maximum number of items to process
            
        Returns:
            Dict with task results and statistics
        """
        task_id = self.request.id
        start_time = datetime.now()
        
        try:
            # Import scraper service
            from services.scraper_service import RedditScraperService
            from services.logging_service import SupabaseLoggingService
            from supabase import create_client
            
            # Initialize services
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
            supabase = create_client(supabase_url, supabase_key)
            
            logging_service = SupabaseLoggingService(supabase)
            scraper_service = RedditScraperService(supabase, logging_service)
            
            # Determine what to process
            if operation == "analyze_subreddits" and subreddit_names:
                items = subreddit_names
                total_count = len(items)
            elif operation == "discover_from_users" and user_names:
                items = user_names
                total_count = len(items)
            else:
                raise ValueError(f"Invalid operation or missing parameters: {operation}")
            
            logger.info(f"Starting {operation} task {task_id}: {total_count} items")
            
            # Update initial progress
            self.update_state(
                state='PROGRESS',
                meta={
                    'current': 0,
                    'total': total_count,
                    'status': f'Starting {operation} for {total_count} items',
                    'phase': 'initialization',
                    'operation': operation,
                    'started_at': start_time.isoformat()
                }
            )
            
            processed = 0
            successful = 0
            errors = []
            results = []
            
            # Process items
            for i, item in enumerate(items):
                try:
                    if operation == "analyze_subreddits":
                        result = await scraper_service.analyze_subreddit(item)
                        if result:
                            successful += 1
                            results.append(result)
                    
                    elif operation == "discover_from_users":
                        discovered = await scraper_service.discover_subreddits_from_users([item], 50)
                        if discovered:
                            successful += len(discovered)
                            results.extend(discovered)
                    
                    processed += 1
                    progress_percent = int((processed / total_count) * 100)
                    
                    # Update progress
                    self.update_state(
                        state='PROGRESS',
                        meta={
                            'current': processed,
                            'total': total_count,
                            'successful': successful,
                            'progress_percent': progress_percent,
                            'status': f'Processed {processed}/{total_count} ({progress_percent}%) - {successful} successful',
                            'phase': 'processing',
                            'current_item': item,
                            'errors': len(errors)
                        }
                    )
                    
                    logger.info(f"Processed {item}: {'success' if result else 'failed'}")
                    
                except Exception as e:
                    error_msg = f"Error processing {item}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
                    processed += 1
            
            # Final results
            duration = (datetime.now() - start_time).total_seconds()
            
            final_result = {
                'status': 'completed',
                'operation': operation,
                'total_processed': processed,
                'successful': successful,
                'success_rate': (successful / processed * 100) if processed > 0 else 0,
                'duration_seconds': duration,
                'results_count': len(results),
                'errors': errors,
                'error_count': len(errors),
                'completed_at': datetime.now().isoformat(),
                'started_at': start_time.isoformat()
            }
            
            logger.info(f"Scraper task {task_id} completed: {final_result}")
            return final_result
            
        except Exception as e:
            logger.error(f"Scraper task {task_id} failed: {e}")
            raise self.retry(exc=e, countdown=300, max_retries=2)

# Register tasks with Celery
analyze_subreddits = celery_app.register_task(ScraperTask())
discover_from_users = celery_app.register_task(ScraperTask())