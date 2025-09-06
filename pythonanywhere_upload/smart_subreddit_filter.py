#!/usr/bin/env python3
"""
Smart Subreddit Filter for Reddit Analytics System
Implements conservative keyword-based pre-filtering with learning capabilities
"""

import re
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime
from collections import defaultdict
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SmartSubredditFilter:
    """
    Conservative keyword-based filtering system for subreddits.
    Filters AFTER basic data collection with learning capabilities.
    """
    
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.filter_keywords = {}
        self.whitelist = set()
        self.learning_patterns = []
        
        # Conservative filtering - require 2+ keywords to filter
        self.min_keywords_to_filter = 2
        
        # Load filter settings from database
        self._load_filter_settings()
        self._load_whitelist()
        
    def _load_filter_settings(self):
        """Load filter keywords from database"""
        try:
            if self.supabase:
                response = self.supabase.table('filter_settings').select('*').eq('is_active', True).execute()
                
                for setting in response.data:
                    category = setting['category']
                    keywords = setting['keywords']
                    weight = float(setting.get('weight', 1.0))
                    
                    self.filter_keywords[category] = {
                        'keywords': [kw.lower().strip() for kw in keywords],
                        'weight': weight
                    }
                    
                logger.info(f"✅ Loaded filter settings for {len(self.filter_keywords)} categories")
            else:
                # Fallback default keywords if no database connection
                self._load_default_keywords()
                
        except Exception as e:
            logger.error(f"❌ Error loading filter settings: {e}")
            self._load_default_keywords()
    
    def _load_default_keywords(self):
        """Load default keyword categories as fallback"""
        self.filter_keywords = {
            'explicit_porn': {
                'keywords': ['gonewild', 'nsfw', 'nude', 'naked', 'porn', 'sex', 'hardcore', 'xxx', 'amateur', 'hookup'],
                'weight': 1.5
            },
            'male_focused': {
                'keywords': ['cock', 'dick', 'penis', 'gay', 'men', 'dudes', 'bros', 'male', 'masculine', 'straight guys'],
                'weight': 1.2
            },
            'unrelated': {
                'keywords': ['gaming', 'politics', 'news', 'sports', 'crypto', 'stocks', 'tech', 'programming', 'food', 'recipes', 'cooking', 'travel'],
                'weight': 1.0
            },
            'seller_ban_indicators': {
                'keywords': ['no sellers', 'no onlyfans', 'no selling', 'sellers banned', 'no promotion'],
                'weight': 2.0  # Higher weight for seller bans
            }
        }
        logger.info("📦 Using default filter keywords")
        
    def _load_whitelist(self):
        """Load whitelisted subreddits from database"""
        try:
            if self.supabase:
                response = self.supabase.table('subreddit_whitelist').select('subreddit_name').execute()
                self.whitelist = {item['subreddit_name'] for item in response.data}
                logger.info(f"✅ Loaded {len(self.whitelist)} whitelisted subreddits")
        except Exception as e:
            logger.error(f"❌ Error loading whitelist: {e}")
            self.whitelist = set()
    
    def analyze_subreddit_text(self, subreddit_data: Dict[str, Any]) -> Tuple[bool, Dict[str, Any]]:
        """
        Analyze subreddit text fields for filtering keywords.
        Returns (should_filter, analysis_results)
        """
        name = subreddit_data.get('name', '').lower()
        title = subreddit_data.get('title', '').lower()
        description = subreddit_data.get('description', '').lower()
        public_description = subreddit_data.get('public_description', '').lower()
        rules_data = subreddit_data.get('rules_data', {})
        
        # Combine all text for analysis
        combined_text = f"{name} {title} {description} {public_description}".lower()
        
        # Extract rules text
        rules_text = ""
        if isinstance(rules_data, dict):
            rules_text = " ".join(str(v).lower() for v in rules_data.values() if v)
        elif isinstance(rules_data, str):
            rules_text = rules_data.lower()
            
        analysis = {
            'matched_keywords': defaultdict(list),
            'total_matches': 0,
            'confidence_score': 0.0,
            'seller_ban_detected': False,
            'verification_required': False,
            'filter_reason': []
        }
        
        # Check each keyword category
        for category, config in self.filter_keywords.items():
            keywords = config['keywords']
            weight = config['weight']
            
            for keyword in keywords:
                # Check in combined text and rules
                if keyword in combined_text or keyword in rules_text:
                    analysis['matched_keywords'][category].append(keyword)
                    analysis['total_matches'] += 1
                    analysis['confidence_score'] += weight
        
        # Special detection for seller bans and verification
        self._detect_special_conditions(combined_text, rules_text, analysis)
        
        # Conservative filtering logic: need 2+ keywords OR high confidence score
        should_filter = self._determine_if_should_filter(analysis)
        
        return should_filter, dict(analysis)
    
    def _detect_special_conditions(self, combined_text: str, rules_text: str, analysis: Dict):
        """Detect special conditions like seller bans and verification requirements"""
        
        # Seller ban patterns
        seller_ban_patterns = [
            r'no\s+sellers?\b',
            r'no\s+onlyfans\b',
            r'sellers?\s+banned?\b',
            r'no\s+promotion\b',
            r'no\s+advertising\b',
            r'sellers?\s+will\s+be\s+banned\b'
        ]
        
        for pattern in seller_ban_patterns:
            if re.search(pattern, rules_text) or re.search(pattern, combined_text):
                analysis['seller_ban_detected'] = True
                analysis['filter_reason'].append('Seller ban detected in rules')
                analysis['confidence_score'] += 3.0  # High confidence for seller bans
                break
        
        # Verification requirement patterns
        verification_patterns = [
            r'verification\s+required\b',
            r'must\s+verify\b',
            r'verified\s+only\b',
            r'need\s+verification\b'
        ]
        
        for pattern in verification_patterns:
            if re.search(pattern, rules_text) or re.search(pattern, combined_text):
                analysis['verification_required'] = True
                # Don't filter for verification - just mark it
                break
    
    def _determine_if_should_filter(self, analysis: Dict) -> bool:
        """Conservative filtering logic - requires multiple signals"""
        
        # Special case: seller bans auto-filter
        if analysis['seller_ban_detected']:
            analysis['filter_reason'].append('Seller ban detected')
            return True
        
        # Count categories with matches (not just total keywords)
        categories_with_matches = len([cat for cat in analysis['matched_keywords'] if analysis['matched_keywords'][cat]])
        
        # Conservative approach: need matches in 2+ categories OR high confidence score
        if categories_with_matches >= 2:
            analysis['filter_reason'].append(f'Keywords matched in {categories_with_matches} categories')
            return True
        
        # High confidence single-category matches (e.g., multiple explicit keywords)
        if analysis['confidence_score'] >= 4.0:
            analysis['filter_reason'].append(f'High confidence score: {analysis["confidence_score"]:.1f}')
            return True
        
        # Count total keyword matches within categories
        total_keyword_count = sum(len(keywords) for keywords in analysis['matched_keywords'].values())
        if total_keyword_count >= self.min_keywords_to_filter:
            analysis['filter_reason'].append(f'Multiple keywords matched: {total_keyword_count}')
            return True
        
        return False
    
    def filter_subreddit(self, subreddit_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main filtering method. Returns updated subreddit data with filter results.
        """
        name = subreddit_data.get('name', '')
        
        # Always pass whitelisted subreddits
        if name in self.whitelist:
            return {
                **subreddit_data,
                'filter_status': 'whitelist',
                'filter_reason': 'Whitelisted subreddit',
                'filtered_at': datetime.now().isoformat()
            }
        
        # Always pass subreddits already marked as "Ok"
        if subreddit_data.get('review') == 'Ok':
            return {
                **subreddit_data,
                'filter_status': 'whitelist',
                'filter_reason': 'Already marked as Ok',
                'filtered_at': datetime.now().isoformat()
            }
        
        # Analyze the subreddit
        should_filter, analysis = self.analyze_subreddit_text(subreddit_data)
        
        # Update subreddit data with filter results
        result = {
            **subreddit_data,
            'filter_status': 'filtered' if should_filter else 'passed',
            'filter_reason': '; '.join(analysis['filter_reason']) if analysis['filter_reason'] else None,
            'filter_keywords': list(set([kw for keywords in analysis['matched_keywords'].values() for kw in keywords])),
            'seller_ban_detected': analysis['seller_ban_detected'],
            'verification_required_detected': analysis['verification_required'],
            'filtered_at': datetime.now().isoformat(),
            'manual_override': False
        }
        
        # Auto-categorize seller bans
        if analysis['seller_ban_detected']:
            result['review'] = 'No Seller'
        
        return result
    
    def batch_filter_subreddits(self, subreddits: List[Dict[str, Any]]) -> Tuple[List[Dict], List[Dict]]:
        """
        Filter a batch of subreddits.
        Returns (passed_subreddits, filtered_subreddits)
        """
        passed = []
        filtered = []
        
        for subreddit in subreddits:
            result = self.filter_subreddit(subreddit)
            
            if result['filter_status'] in ['passed', 'whitelist']:
                passed.append(result)
            else:
                filtered.append(result)
        
        logger.info(f"🔍 Filtered {len(subreddits)} subreddits: {len(passed)} passed, {len(filtered)} filtered")
        return passed, filtered
    
    def update_filter_from_database(self, subreddit_name: str) -> Dict[str, Any]:
        """
        Update an existing subreddit's filter status by re-analyzing from database.
        """
        try:
            if not self.supabase:
                raise Exception("No database connection")
            
            # Get subreddit data from database
            response = self.supabase.table('subreddits').select('*').eq('name', subreddit_name).execute()
            
            if not response.data:
                raise Exception(f"Subreddit {subreddit_name} not found")
            
            subreddit_data = response.data[0]
            
            # Re-analyze with current filter settings
            result = self.filter_subreddit(subreddit_data)
            
            # Update database with new filter results
            update_data = {
                'filter_status': result['filter_status'],
                'filter_reason': result['filter_reason'],
                'filter_keywords': result['filter_keywords'],
                'seller_ban_detected': result['seller_ban_detected'],
                'verification_required_detected': result['verification_required_detected'],
                'filtered_at': result['filtered_at']
            }
            
            self.supabase.table('subreddits').update(update_data).eq('name', subreddit_name).execute()
            
            logger.info(f"✅ Updated filter status for {subreddit_name}: {result['filter_status']}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Error updating filter for {subreddit_name}: {e}")
            return {'error': str(e)}
    
    def add_to_whitelist(self, subreddit_name: str, reason: str = None, added_by: str = None):
        """Add a subreddit to the whitelist"""
        try:
            if self.supabase:
                self.supabase.table('subreddit_whitelist').insert({
                    'subreddit_name': subreddit_name,
                    'reason': reason or 'Manually added',
                    'added_by': added_by or 'system'
                }).execute()
            
            self.whitelist.add(subreddit_name)
            logger.info(f"✅ Added {subreddit_name} to whitelist")
            
        except Exception as e:
            logger.error(f"❌ Error adding {subreddit_name} to whitelist: {e}")
    
    def remove_from_whitelist(self, subreddit_name: str):
        """Remove a subreddit from the whitelist"""
        try:
            if self.supabase:
                self.supabase.table('subreddit_whitelist').delete().eq('subreddit_name', subreddit_name).execute()
            
            self.whitelist.discard(subreddit_name)
            logger.info(f"✅ Removed {subreddit_name} from whitelist")
            
        except Exception as e:
            logger.error(f"❌ Error removing {subreddit_name} from whitelist: {e}")
    
    def record_learning_pattern(self, subreddit_name: str, predicted_filter: bool, actual_decision: str, keywords_matched: List[str] = None, confidence_score: float = 0.0):
        """Record a learning pattern for improving filter accuracy"""
        try:
            if self.supabase:
                self.supabase.table('filter_learning_patterns').insert({
                    'subreddit_name': subreddit_name,
                    'predicted_filter': predicted_filter,
                    'actual_user_decision': actual_decision,
                    'keywords_matched': keywords_matched or [],
                    'confidence_score': confidence_score
                }).execute()
            
            logger.info(f"📊 Recorded learning pattern for {subreddit_name}: predicted={predicted_filter}, actual={actual_decision}")
            
        except Exception as e:
            logger.error(f"❌ Error recording learning pattern: {e}")
    
    def get_filter_stats(self) -> Dict[str, Any]:
        """Get filtering statistics"""
        try:
            if not self.supabase:
                return {'error': 'No database connection'}
            
            # Get filter status counts
            response = self.supabase.table('subreddits').select('filter_status, COUNT(*)', count='exact').execute()
            
            stats = {
                'total_subreddits': 0,
                'by_status': {},
                'whitelist_count': len(self.whitelist),
                'seller_bans_detected': 0,
                'verification_required': 0
            }
            
            # Status distribution
            status_response = self.supabase.rpc('get_filter_status_stats').execute()
            if status_response.data:
                for item in status_response.data:
                    stats['by_status'][item['filter_status']] = item['count']
                    stats['total_subreddits'] += item['count']
            
            # Special conditions
            seller_ban_response = self.supabase.table('subreddits').select('COUNT(*)', count='exact').eq('seller_ban_detected', True).execute()
            stats['seller_bans_detected'] = seller_ban_response.count or 0
            
            verification_response = self.supabase.table('subreddits').select('COUNT(*)', count='exact').eq('verification_required_detected', True).execute()
            stats['verification_required'] = verification_response.count or 0
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error getting filter stats: {e}")
            return {'error': str(e)}

# Helper function for creating database RPC function
def create_filter_stats_rpc():
    """SQL function to create for getting filter statistics"""
    return """
    CREATE OR REPLACE FUNCTION get_filter_status_stats()
    RETURNS TABLE(filter_status TEXT, count BIGINT) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            COALESCE(s.filter_status::TEXT, 'unprocessed'::TEXT) as filter_status,
            COUNT(*) as count
        FROM subreddits s
        GROUP BY s.filter_status;
    END;
    $$ LANGUAGE plpgsql;
    """