#!/usr/bin/env python3
"""
Categorization Service - AI-powered subreddit categorization with Supabase logging
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any
from dataclasses import dataclass

from openai import AsyncOpenAI
from supabase import Client

from .logging_service import SupabaseLoggingService, LogEntry, LogType


@dataclass
class CategorizationResult:
    """Result of a categorization operation"""
    subreddit_id: int
    subreddit_name: str
    category: str
    confidence: float
    success: bool
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    cost: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class CategorizationService:
    """AI-powered subreddit categorization service with comprehensive logging"""
    
    # Marketing categories optimized for OnlyFans content
    CATEGORIES = [
        "Ass & Booty",
        "Boobs & Chest", 
        "Lingerie & Underwear",
        "Feet & Foot Fetish",
        "Selfie & Amateur",
        "Full Body & Nude",
        "Clothed & Dressed",
        "Gym & Fitness",
        "Goth & Alternative", 
        "Cosplay & Fantasy",
        "Ethnic & Cultural",
        "Age Demographics",
        "Body Types & Features",
        "Specific Body Parts",
        "Lifestyle & Themes",
        "OnlyFans Promotion",
        "Interactive & Personalized"
    ]
    
    def __init__(self, supabase_client: Client, openai_api_key: str, 
                 logging_service: SupabaseLoggingService):
        self.supabase = supabase_client
        self.openai = AsyncOpenAI(api_key=openai_api_key)
        self.logging_service = logging_service
        
        # Configuration
        self.model = "gpt-4-turbo-preview"
        self.temperature = 0.1
        self.max_tokens = 50
        self.delay_between_requests = 0.4
        
        # Pricing per 1K tokens (GPT-4-turbo-preview)
        self.price_per_1k_prompt_tokens = 0.01
        self.price_per_1k_completion_tokens = 0.03
        
        self.logger = logging.getLogger(__name__)
    
    async def get_uncategorized_subreddits(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get subreddits that need categorization"""
        try:
            self.logger.info(f"🔍 Fetching uncategorized subreddits (limit={limit})")
            
            # Get subreddits that are approved (Ok) but not yet categorized
            # Using filter for null or empty category_text
            response = self.supabase.table('reddit_subreddits').select(
                'id, name, title, public_description, subscribers, display_name_prefixed'
            ).eq('review', 'Ok').filter('category_text', 'is', 'null').order('subscribers', desc=True).limit(limit).execute()
            
            self.logger.info(f"📊 Query 1 (null category_text): Found {len(response.data or [])} subreddits")
            
            # Also get subreddits with empty category_text
            response2 = self.supabase.table('reddit_subreddits').select(
                'id, name, title, public_description, subscribers, display_name_prefixed'
            ).eq('review', 'Ok').eq('category_text', '').order('subscribers', desc=True).limit(limit).execute()
            
            self.logger.info(f"📊 Query 2 (empty category_text): Found {len(response2.data or [])} subreddits")
            
            # Combine results and remove duplicates
            all_subreddits = response.data or []
            all_subreddits.extend(response2.data or [])
            
            # Remove duplicates based on id
            seen = set()
            unique_subreddits = []
            for sub in all_subreddits:
                if sub['id'] not in seen:
                    seen.add(sub['id'])
                    unique_subreddits.append(sub)
            
            # Sort by subscribers and limit
            unique_subreddits.sort(key=lambda x: x.get('subscribers', 0), reverse=True)
            unique_subreddits = unique_subreddits[:limit]
            
            self.logger.info(f"Found {len(unique_subreddits)} uncategorized subreddits")
            return unique_subreddits
            
        except Exception as e:
            self.logger.error(f"Error fetching uncategorized subreddits: {e}")
            return []
    
    def _build_categorization_prompt(self, subreddit: Dict[str, Any]) -> str:
        """Build the categorization prompt for OpenAI"""
        category_list = "\n".join([f"- {cat}" for cat in self.CATEGORIES])
        
        name = subreddit.get('name', 'Unknown')
        title = subreddit.get('title') or 'N/A'
        description = subreddit.get('public_description') or 'N/A'
        subscribers = subreddit.get('subscribers') or 'N/A'
        
        return f"""Analyze this Reddit subreddit and assign it to ONE category for OnlyFans marketing.

SUBREDDIT: r/{name}
TITLE: {title}  
DESCRIPTION: {description}
SUBSCRIBERS: {subscribers}

AVAILABLE CATEGORIES:
{category_list}

Instructions:
1. Return ONLY the exact category name from the list above
2. Focus on the primary content type that would be most relevant for OnlyFans marketing
3. Choose the most specific category that fits the content
4. If unsure, default to "Selfie & Amateur"

Category:"""
    
    async def categorize_subreddit(self, subreddit: Dict[str, Any], 
                                   batch_number: Optional[int] = None) -> CategorizationResult:
        """Categorize a single subreddit using AI"""
        start_time = time.time()
        subreddit_name = subreddit.get('name', 'Unknown')
        subreddit_id = subreddit.get('id', 0)
        
        try:
            prompt = self._build_categorization_prompt(subreddit)
            
            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert at categorizing adult content subreddits for OnlyFans marketing purposes. Always respond with exactly one category name from the provided list."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            category = response.choices[0].message.content.strip()
            
            # Calculate costs and tokens
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            
            cost = (
                (prompt_tokens / 1000) * self.price_per_1k_prompt_tokens +
                (completion_tokens / 1000) * self.price_per_1k_completion_tokens
            )
            
            # Validate category
            confidence = 1.0
            if category not in self.CATEGORIES:
                self.logger.warning(f"Invalid category '{category}' for r/{subreddit_name}, using default")
                category = "Selfie & Amateur"
                confidence = 0.5
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Update database
            update_success = await self._update_subreddit_category(subreddit_id, category)
            
            result = CategorizationResult(
                subreddit_id=subreddit_id,
                subreddit_name=subreddit_name,
                category=category,
                confidence=confidence,
                success=update_success,
                processing_time_ms=processing_time_ms,
                cost=cost,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens
            )
            
            # Log to Supabase
            await self._log_categorization_result(result, batch_number)
            
            return result
            
        except Exception as e:
            processing_time_ms = int((time.time() - start_time) * 1000)
            error_message = str(e)
            
            result = CategorizationResult(
                subreddit_id=subreddit_id,
                subreddit_name=subreddit_name,
                category="Selfie & Amateur",
                confidence=0.0,
                success=False,
                error_message=error_message,
                processing_time_ms=processing_time_ms
            )
            
            # Log error to Supabase
            await self._log_categorization_result(result, batch_number)
            
            return result
    
    async def _update_subreddit_category(self, subreddit_id: int, category: str) -> bool:
        """Update the category in the database"""
        try:
            self.supabase.table('reddit_subreddits').update({
                'category_text': category,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', subreddit_id).execute()
            return True
        except Exception as e:
            self.logger.error(f"Error updating category for subreddit {subreddit_id}: {e}")
            return False
    
    async def _log_categorization_result(self, result: CategorizationResult, 
                                       batch_number: Optional[int] = None):
        """Log categorization result to Supabase"""
        try:
            self.logging_service.log_categorization(
                subreddit_name=result.subreddit_name,
                category=result.category if result.success else None,
                cost=result.cost or 0.0,
                prompt_tokens=result.prompt_tokens or 0,
                completion_tokens=result.completion_tokens or 0,
                confidence=result.confidence,
                success=result.success,
                error_message=result.error_message,
                batch_number=batch_number,
                processing_time_ms=result.processing_time_ms
            )
        except Exception as e:
            self.logger.error(f"Error logging categorization result: {e}")
    
    async def categorize_batch(self, subreddits: List[Dict[str, Any]], 
                             batch_number: int = 1) -> List[CategorizationResult]:
        """Categorize a batch of subreddits with rate limiting"""
        results = []
        
        for i, subreddit in enumerate(subreddits):
            try:
                result = await self.categorize_subreddit(subreddit, batch_number)
                results.append(result)
                
                status = "✓" if result.success else "✗"
                self.logger.info(
                    f"[{i+1:3d}/{len(subreddits)}] r/{result.subreddit_name} → "
                    f"{result.category} {status} (${result.cost:.4f})"
                )
                
                # Rate limiting
                if i < len(subreddits) - 1:  # Don't delay after the last item
                    await asyncio.sleep(self.delay_between_requests)
                
            except Exception as e:
                self.logger.error(f"Error processing subreddit {subreddit.get('name')}: {e}")
                
                # Create error result
                error_result = CategorizationResult(
                    subreddit_id=subreddit.get('id', 0),
                    subreddit_name=subreddit.get('name', 'Unknown'),
                    category="Selfie & Amateur",
                    confidence=0.0,
                    success=False,
                    error_message=str(e)
                )
                results.append(error_result)
        
        return results
    
    async def categorize_all_uncategorized(self, batch_size: int = 30, 
                                         limit: Optional[int] = None,
                                         subreddit_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Categorize all uncategorized subreddits in batches"""
        start_time = datetime.now(timezone.utc)
        
        self.logger.info(f"🎯 categorize_all_uncategorized called: batch_size={batch_size}, limit={limit}, subreddit_ids={subreddit_ids}")
        
        # Get uncategorized subreddits
        if subreddit_ids:
            # If specific IDs are provided, fetch those subreddits
            self.logger.info(f"📝 Fetching specific subreddits by IDs: {subreddit_ids}")
            subreddits = []
            for subreddit_id in subreddit_ids:
                try:
                    response = self.supabase.table('reddit_subreddits').select('*').eq('id', subreddit_id).execute()
                    if response.data:
                        subreddits.extend(response.data)
                        self.logger.info(f"✅ Found subreddit {subreddit_id}: {response.data[0].get('name')}")
                    else:
                        self.logger.warning(f"⚠️ Subreddit {subreddit_id} not found")
                except Exception as e:
                    self.logger.error(f"Failed to fetch subreddit {subreddit_id}: {e}")
        else:
            # Otherwise get all uncategorized subreddits
            self.logger.info(f"📋 Fetching all uncategorized subreddits")
            subreddits = await self.get_uncategorized_subreddits(limit or 10000)
        
        if not subreddits:
            return {
                'status': 'completed',
                'message': 'No uncategorized subreddits found',
                'stats': {
                    'total_processed': 0,
                    'successful': 0,
                    'errors': 0,
                    'total_cost': 0.0,
                    'duration_minutes': 0.0
                }
            }
        
        total_count = len(subreddits)
        if limit:
            total_count = min(total_count, limit)
            subreddits = subreddits[:limit]
        
        estimated_cost = total_count * 0.008
        self.logger.info(f"Starting categorization of {total_count} subreddits")
        self.logger.info(f"Estimated cost: ${estimated_cost:.2f}")
        
        # Process in batches
        all_results = []
        total_cost = 0.0
        successful_count = 0
        error_count = 0
        
        for i in range(0, len(subreddits), batch_size):
            batch_num = (i // batch_size) + 1
            batch = subreddits[i:i + batch_size]
            
            self.logger.info(f"Processing batch {batch_num} - {len(batch)} subreddits")
            
            batch_results = await self.categorize_batch(batch, batch_num)
            all_results.extend(batch_results)
            
            # Update stats
            for result in batch_results:
                if result.success:
                    successful_count += 1
                else:
                    error_count += 1
                if result.cost:
                    total_cost += result.cost
            
            progress = len(all_results)
            progress_pct = (progress / total_count) * 100
            
            self.logger.info(f"Batch {batch_num} complete. Progress: {progress}/{total_count} ({progress_pct:.1f}%)")
            
            # Brief pause between batches
            if i + batch_size < len(subreddits):
                await asyncio.sleep(2.0)
        
        # Calculate final stats
        end_time = datetime.now(timezone.utc)
        duration = (end_time - start_time).total_seconds()
        success_rate = (successful_count / len(all_results)) * 100 if all_results else 0
        
        # Category distribution
        category_distribution = {}
        for result in all_results:
            if result.success:
                cat = result.category
                category_distribution[cat] = category_distribution.get(cat, 0) + 1
        
        stats = {
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'duration_minutes': duration / 60,
            'total_processed': len(all_results),
            'successful': successful_count,
            'errors': error_count,
            'success_rate_percent': success_rate,
            'total_cost': total_cost,
            'average_cost_per_subreddit': total_cost / max(len(all_results), 1),
            'category_distribution': dict(sorted(category_distribution.items(), key=lambda x: x[1], reverse=True))
        }
        
        self.logger.info(f"Categorization complete! Processed: {len(all_results)}, Success: {successful_count}, Errors: {error_count}")
        self.logger.info(f"Total cost: ${total_cost:.4f}, Duration: {duration/60:.1f} minutes")
        
        return {
            'status': 'completed',
            'message': f'Successfully categorized {successful_count} out of {len(all_results)} subreddits',
            'stats': stats,
            'results': all_results
        }
    
    def get_category_list(self) -> List[str]:
        """Get the list of available categories"""
        return self.CATEGORIES.copy()
    
    async def get_categorization_stats(self) -> Dict[str, Any]:
        """Get categorization statistics from the database"""
        try:
            # Get total counts
            total_response = self.supabase.table('reddit_subreddits').select('id', count='exact').eq('review', 'Ok').execute()
            total_approved = total_response.count or 0
            
            categorized_response = self.supabase.table('reddit_subreddits').select('id', count='exact').eq('review', 'Ok').not_.is_('category_text', 'null').execute()
            total_categorized = categorized_response.count or 0
            
            uncategorized = total_approved - total_categorized
            
            # Get category distribution
            categories_response = self.supabase.table('reddit_subreddits').select('category_text').eq('review', 'Ok').not_.is_('category_text', 'null').execute()
            
            category_counts = {}
            for row in categories_response.data:
                cat = row.get('category_text')
                if cat:
                    category_counts[cat] = category_counts.get(cat, 0) + 1
            
            return {
                'total_approved_subreddits': total_approved,
                'total_categorized': total_categorized,
                'uncategorized_remaining': uncategorized,
                'categorization_progress_percent': (total_categorized / max(total_approved, 1)) * 100,
                'category_distribution': dict(sorted(category_counts.items(), key=lambda x: x[1], reverse=True)),
                'available_categories': self.CATEGORIES
            }
            
        except Exception as e:
            self.logger.error(f"Error getting categorization stats: {e}")
            return {
                'error': str(e),
                'total_approved_subreddits': 0,
                'total_categorized': 0,
                'uncategorized_remaining': 0,
                'categorization_progress_percent': 0,
                'category_distribution': {},
                'available_categories': self.CATEGORIES
            }