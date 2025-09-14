#!/usr/bin/env python3
"""
Centralized Logging Service with Supabase Integration

Provides structured logging to different Supabase tables based on operation type.
"""

import asyncio
import logging
import json
import time
import threading
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from supabase import Client

class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class LogType(str, Enum):
    AI_REVIEW = "ai_review"
    CATEGORIZATION = "categorization"
    USER_DISCOVERY = "user_discovery"
    SCRAPER_OPERATION = "scraper_operation"
    API_OPERATION = "api_operation"

@dataclass
class LogEntry:
    """Structured log entry"""
    log_type: LogType
    message: str
    level: LogLevel = LogLevel.INFO
    success: bool = True
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    context: Optional[Dict[str, Any]] = None
    
    # AI-specific fields
    ai_model: Optional[str] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    cost: Optional[float] = None
    
    # Operation-specific fields
    subreddit_name: Optional[str] = None
    username: Optional[str] = None
    operation_type: Optional[str] = None
    batch_number: Optional[int] = None

class SupabaseLoggingService:
    """Centralized logging service for Supabase"""
    
    def __init__(self, supabase_client: Client, buffer_size: int = 20, flush_interval: float = 30.0):
        self.supabase = supabase_client
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval
        
        # Separate buffers for each log type
        self.buffers: Dict[LogType, List[Dict[str, Any]]] = {
            log_type: [] for log_type in LogType
        }
        
        self.last_flush_time = time.time()
        self.lock = threading.Lock()
        self.flush_timer = None
        self._setup_periodic_flush()
        
        # Standard Python logger
        self.logger = logging.getLogger(__name__)
    
    def _setup_periodic_flush(self):
        """Set up periodic flushing of logs"""
        self._schedule_next_flush()
    
    def _schedule_next_flush(self):
        """Schedule the next periodic flush"""
        def flush_periodically():
            with self.lock:
                self._flush_all_buffers()
            self._schedule_next_flush()
        
        self.flush_timer = threading.Timer(self.flush_interval, flush_periodically)
        self.flush_timer.daemon = True
        self.flush_timer.start()
    
    def log(self, entry: LogEntry):
        """Add a log entry to the appropriate buffer"""
        log_data = self._prepare_log_data(entry)
        
        with self.lock:
            self.buffers[entry.log_type].append(log_data)
            
            # Check if we need to flush any buffer
            if self._should_flush():
                self._flush_all_buffers()
    
    def _prepare_log_data(self, entry: LogEntry) -> Dict[str, Any]:
        """Prepare log data for the specific table"""
        base_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'success': entry.success,
            'error_message': entry.error_message,
            'processing_time_ms': entry.processing_time_ms,
            'context': entry.context or {}
        }
        
        # Add operation-specific fields based on log type
        if entry.log_type == LogType.AI_REVIEW:
            return {
                **base_data,
                'review_type': entry.operation_type or 'unknown',
                'subreddit_name': entry.subreddit_name,
                'ai_model': entry.ai_model or 'gpt-4-turbo-preview',
                'prompt_tokens': entry.prompt_tokens or 0,
                'completion_tokens': entry.completion_tokens or 0,
                'cost': entry.cost or 0.0,
                'batch_number': entry.batch_number,
                'old_status': entry.context.get('old_status') if entry.context else None,
                'new_status': entry.context.get('new_status') if entry.context else None,
            }
        
        elif entry.log_type == LogType.CATEGORIZATION:
            return {
                **base_data,
                'subreddit_name': entry.subreddit_name,
                'ai_model': entry.ai_model or 'gpt-4-turbo-preview',
                'prompt_tokens': entry.prompt_tokens or 0,
                'completion_tokens': entry.completion_tokens or 0,
                'cost': entry.cost or 0.0,
                'batch_number': entry.batch_number,
                'category_assigned': entry.context.get('category') if entry.context else None,
                'confidence_score': entry.context.get('confidence') if entry.context else None,
            }
        
        elif entry.log_type == LogType.USER_DISCOVERY:
            return {
                **base_data,
                'username': entry.username,
                'source_operation': entry.operation_type or 'manual',
                'discovered_subreddits': entry.context.get('discovered_subreddits', 0) if entry.context else 0,
                'is_creator': entry.context.get('is_creator', False) if entry.context else False,
                'is_suspended': entry.context.get('is_suspended', False) if entry.context else False,
                'account_used': entry.context.get('account_used') if entry.context else None,
                'proxy_used': entry.context.get('proxy_used') if entry.context else None,
                'source_subreddit': entry.context.get('source_subreddit') if entry.context else None,
            }
        
        elif entry.log_type == LogType.SCRAPER_OPERATION:
            return {
                **base_data,
                'operation_type': entry.operation_type or 'unknown',
                'target_name': entry.subreddit_name or entry.username or 'unknown',
                'account_used': entry.context.get('account_used') if entry.context else None,
                'proxy_used': entry.context.get('proxy_used') if entry.context else None,
                'requests_made': entry.context.get('requests_made', 0) if entry.context else 0,
                'successful_requests': entry.context.get('successful_requests', 0) if entry.context else 0,
                'failed_requests': entry.context.get('failed_requests', 0) if entry.context else 0,
                'data_points_collected': entry.context.get('data_points_collected', 0) if entry.context else 0,
                'rate_limited': entry.context.get('rate_limited', False) if entry.context else False,
            }
        
        elif entry.log_type == LogType.API_OPERATION:
            return {
                **base_data,
                'endpoint': entry.context.get('endpoint', '/unknown') if entry.context else '/unknown',
                'method': entry.context.get('method', 'GET') if entry.context else 'GET',
                'user_agent': entry.context.get('user_agent') if entry.context else None,
                'ip_address': entry.context.get('ip_address') if entry.context else None,
                'request_body': entry.context.get('request_body') if entry.context else None,
                'response_status': entry.context.get('response_status', 200) if entry.context else 200,
            }
        
        return base_data
    
    def _should_flush(self) -> bool:
        """Check if we should flush buffers"""
        # Flush if any buffer is full
        for buffer in self.buffers.values():
            if len(buffer) >= self.buffer_size:
                return True
        
        # Flush if enough time has passed
        return time.time() - self.last_flush_time >= self.flush_interval
    
    def _flush_all_buffers(self):
        """Flush all non-empty buffers to Supabase"""
        for log_type, buffer in self.buffers.items():
            if buffer:
                self._flush_buffer(log_type, buffer)
                buffer.clear()
        
        self.last_flush_time = time.time()
    
    def _flush_buffer(self, log_type: LogType, buffer: List[Dict[str, Any]]):
        """Flush a specific buffer to its Supabase table"""
        if not buffer:
            return
        
        table_map = {
            LogType.AI_REVIEW: 'reddit_ai_review_logs',
            LogType.CATEGORIZATION: 'reddit_categorization_logs',
            LogType.USER_DISCOVERY: 'reddit_user_discovery_logs',
            LogType.SCRAPER_OPERATION: 'scraper_operation_logs',
            LogType.API_OPERATION: 'api_operation_logs',
        }
        
        table_name = table_map.get(log_type)
        if not table_name:
            self.logger.error(f"Unknown log type: {log_type}")
            return
        
        try:
            response = self.supabase.table(table_name).insert(buffer).execute()
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error flushing {len(buffer)} logs to {table_name}: {response.error}")
            else:
                self.logger.debug(f"✅ Flushed {len(buffer)} logs to {table_name}")
        
        except Exception as e:
            self.logger.error(f"Exception flushing logs to {table_name}: {e}")
    
    def log_ai_review(self, review_type: str, subreddit_name: str, 
                      old_status: str = None, new_status: str = None,
                      cost: float = 0.0, prompt_tokens: int = 0, completion_tokens: int = 0,
                      success: bool = True, error_message: str = None,
                      batch_number: int = None, processing_time_ms: int = None):
        """Log AI review operation"""
        entry = LogEntry(
            log_type=LogType.AI_REVIEW,
            message=f"AI review: {subreddit_name} ({review_type})",
            operation_type=review_type,
            subreddit_name=subreddit_name,
            cost=cost,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            success=success,
            error_message=error_message,
            batch_number=batch_number,
            processing_time_ms=processing_time_ms,
            context={
                'old_status': old_status,
                'new_status': new_status
            }
        )
        self.log(entry)
    
    def log_categorization(self, subreddit_name: str, category: str = None,
                          cost: float = 0.0, prompt_tokens: int = 0, completion_tokens: int = 0,
                          confidence: float = None, success: bool = True, error_message: str = None,
                          batch_number: int = None, processing_time_ms: int = None):
        """Log categorization operation"""
        entry = LogEntry(
            log_type=LogType.CATEGORIZATION,
            message=f"Categorization: {subreddit_name} -> {category}",
            subreddit_name=subreddit_name,
            cost=cost,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            success=success,
            error_message=error_message,
            batch_number=batch_number,
            processing_time_ms=processing_time_ms,
            context={
                'category': category,
                'confidence': confidence
            }
        )
        self.log(entry)
    
    def log_user_discovery(self, username: str, operation_type: str = 'manual',
                          discovered_subreddits: int = 0, is_creator: bool = False,
                          is_suspended: bool = False, account_used: str = None,
                          proxy_used: str = None, source_subreddit: str = None,
                          success: bool = True, error_message: str = None,
                          processing_time_ms: int = None):
        """Log user discovery operation"""
        entry = LogEntry(
            log_type=LogType.USER_DISCOVERY,
            message=f"User discovery: {username} (via {operation_type})",
            username=username,
            operation_type=operation_type,
            success=success,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
            context={
                'discovered_subreddits': discovered_subreddits,
                'is_creator': is_creator,
                'is_suspended': is_suspended,
                'account_used': account_used,
                'proxy_used': proxy_used,
                'source_subreddit': source_subreddit
            }
        )
        self.log(entry)
    
    def log_scraper_operation(self, operation_type: str, target_name: str,
                             requests_made: int = 0, successful_requests: int = 0,
                             failed_requests: int = 0, data_points_collected: int = 0,
                             account_used: str = None, proxy_used: str = None,
                             rate_limited: bool = False, success: bool = True,
                             error_message: str = None, processing_time_ms: int = None):
        """Log scraper operation"""
        entry = LogEntry(
            log_type=LogType.SCRAPER_OPERATION,
            message=f"Scraper: {operation_type} on {target_name}",
            operation_type=operation_type,
            subreddit_name=target_name if not target_name.startswith('u_') else None,
            username=target_name if target_name.startswith('u_') else None,
            success=success,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
            context={
                'requests_made': requests_made,
                'successful_requests': successful_requests,
                'failed_requests': failed_requests,
                'data_points_collected': data_points_collected,
                'account_used': account_used,
                'proxy_used': proxy_used,
                'rate_limited': rate_limited
            }
        )
        self.log(entry)
    
    def log_api_operation(self, endpoint: str, method: str = 'GET',
                         response_status: int = 200, user_agent: str = None,
                         ip_address: str = None, request_body: dict = None,
                         success: bool = True, error_message: str = None,
                         processing_time_ms: int = None):
        """Log API operation"""
        entry = LogEntry(
            log_type=LogType.API_OPERATION,
            message=f"API: {method} {endpoint} -> {response_status}",
            success=success,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
            context={
                'endpoint': endpoint,
                'method': method,
                'response_status': response_status,
                'user_agent': user_agent,
                'ip_address': ip_address,
                'request_body': request_body
            }
        )
        self.log(entry)
    
    def force_flush(self):
        """Force flush all buffers immediately"""
        with self.lock:
            self._flush_all_buffers()
    
    def close(self):
        """Close the logging service and flush remaining logs"""
        if self.flush_timer:
            self.flush_timer.cancel()
        
        self.force_flush()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get logging statistics"""
        with self.lock:
            return {
                'buffer_sizes': {log_type.value: len(buffer) for log_type, buffer in self.buffers.items()},
                'last_flush_time': self.last_flush_time,
                'next_flush_in': max(0, self.flush_interval - (time.time() - self.last_flush_time))
            }