#!/usr/bin/env python3
"""
Tag-based Categorization Service - Multi-tag subreddit categorization system
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass

from openai import AsyncOpenAI
from supabase import Client


@dataclass
class TagCategorizationResult:
    """Result of a tag-based categorization operation"""
    subreddit_id: int
    subreddit_name: str
    tags: List[str]
    primary_category: str
    confidence: float
    success: bool
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None
    cost: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None


class TagCategorizationService:
    """AI-powered multi-tag subreddit categorization service"""

    # New simplified tag structure (82 tags total - removed duplicates, kept focus:feet)
    TAG_STRUCTURE = {
        "niche": ["cosplay", "gaming", "anime", "fitness", "yoga", "outdoors", "bdsm",
                 "amateur", "verified", "sellers", "cnc", "voyeur",
                 "rating", "general"],
        "focus": ["breasts", "ass", "pussy", "legs", "thighs", "feet", "face", "belly",
                 "curves", "full_body"],
        "body": ["petite", "slim", "athletic", "average", "curvy", "thick", "slim_thick",
                "bbw", "ssbbw"],
        "ass": ["small", "bubble", "big", "jiggly"],
        "breasts": ["small", "medium", "large", "huge", "natural", "enhanced", "perky"],
        "age": ["college", "adult", "milf", "mature", "gilf"],
        "ethnicity": ["asian", "latina", "ebony", "white", "indian", "middle_eastern", "mixed"],
        "style": ["alt", "goth", "egirl", "tattooed", "pierced", "natural", "bimbo",
                 "tomboy", "femdom", "submissive", "lingerie", "uniform"],
        "hair": ["blonde", "redhead", "brunette", "colored"],
        "special": ["hairy", "flexible", "tall", "short",
                   "breeding", "slutty", "clothed", "bent_over"],
        "content": ["oc", "professional"]
    }

    def __init__(self, supabase_client: Client, openai_api_key: str):
        self.supabase = supabase_client
        self.openai = AsyncOpenAI(api_key=openai_api_key)

        # Configuration
        self.model = "gpt-5-mini-2025-08-07"
        # Temperature removed - GPT-5-mini only supports default (1.0)
        # GPT-5-mini uses reasoning tokens internally before generating output
        # We need enough tokens for both reasoning AND the actual JSON response
        # With all 247 tags shown, responses may be longer (5-8 tags per subreddit)
        self.max_completion_tokens = 2000  # Increased for better responses
        self.delay_between_requests = 0.4

        # Pricing per 1K tokens (GPT-5-mini)
        self.price_per_1k_prompt_tokens = 0.00125  # $1.25 per million
        self.price_per_1k_completion_tokens = 0.01     # $10 per million

        self.logger = logging.getLogger(__name__)

        # Build flat tag list for validation
        self.valid_tags = self._build_valid_tags_list()

    def _build_valid_tags_list(self) -> set:
        """Build a set of all valid tags"""
        valid_tags = set()
        for category, values in self.TAG_STRUCTURE.items():
            for value in values:
                tag = f"{category}:{value}"
                valid_tags.add(tag)
        return valid_tags

    def _generate_complete_tag_reference(self) -> str:
        """Generate complete list of all available tags - shows ALL 84 tags"""
        lines = []
        category_names = {
            "niche": "CONTENT/NICHE",
            "focus": "BODY FOCUS",
            "body": "BODY TYPE",
            "ass": "ASS SPECIFIC",
            "breasts": "BREASTS SPECIFIC",
            "age": "AGE GROUP",
            "ethnicity": "ETHNICITY",
            "style": "STYLE/AESTHETIC",
            "hair": "HAIR",
            "special": "SPECIAL ATTRIBUTES",
            "content": "CONTENT TYPE"
        }

        for category, values in self.TAG_STRUCTURE.items():
            lines.append(f"\n{category_names.get(category, category.upper())}:")
            tags = [f"{category}:{v}" for v in values]
            if tags:
                # Show all tags for this category
                lines.append(f"{', '.join(tags)}")
        return '\n'.join(lines)

    def _build_tag_prompt(self, subreddit: Dict[str, Any]) -> str:
        """Build the tag assignment prompt for OpenAI"""
        name = subreddit.get('name', 'Unknown')
        title = subreddit.get('title') or 'N/A'
        description = subreddit.get('public_description') or 'N/A'

        # Extract rules if available
        rules_text = 'N/A'
        rules_data = subreddit.get('rules_data')
        if rules_data and isinstance(rules_data, dict):
            rules_text = rules_data.get('combined_text', 'N/A')
            if rules_text and len(rules_text) > 2000:
                # Truncate very long rules to keep prompt reasonable
                rules_text = rules_text[:2000] + '...'

        # Generate complete tag reference
        tag_reference = self._generate_complete_tag_reference()

        return f"""Analyze this Reddit subreddit and assign relevant tags for OnlyFans creator marketing.

SUBREDDIT: r/{name}
TITLE: {title}
DESCRIPTION: {description}
RULES: {rules_text}

AVAILABLE TAGS (choose from these ONLY):
{tag_reference}

Instructions:
1. PREFER 1 TAG when it sufficiently describes the subreddit's core focus
2. Use 2 tags ONLY when both are absolutely essential to prevent mismatches
3. Priority order: niche/focus first, then body/demographic, then style
4. For highly specific subreddits (e.g., cosplay-only), 1 tag is often sufficient
5. Consider the rules - "no sellers" means this is NOT "niche:sellers"
6. Return ONLY a JSON array of 1 or 2 tags, nothing else

Example responses:
- r/AsianHotties: ["ethnicity:asian"]
- r/gothsluts: ["style:goth", "special:slutty"]
- r/XMenCosplayers: ["niche:cosplay"]
- r/paag: ["ethnicity:asian"]
- r/BigBoobsGW: ["focus:breasts", "breasts:large"]
- r/fuckdoll: ["special:slutty"]

Tags for r/{name}:"""

    async def get_uncategorized_subreddits(self, limit: int = 1000) -> List[Dict[str, Any]]:
        """Get subreddits that need tag categorization"""
        try:
            self.logger.info(f"🔍 Fetching subreddits without tags (limit={limit})")

            # Get subreddits that are approved but don't have tags yet
            response = self.supabase.table('reddit_subreddits').select(
                'id, name, title, public_description, subscribers, display_name_prefixed, over18, rules_data'
            ).eq('review', 'Ok').filter('tags', 'is', 'null').limit(limit).execute()

            self.logger.info(f"📊 Query 1 (null tags): Found {len(response.data or [])} subreddits")

            # Also get subreddits with empty tags array
            response2 = self.supabase.table('reddit_subreddits').select(
                'id, name, title, public_description, subscribers, display_name_prefixed, over18, rules_data'
            ).eq('review', 'Ok').eq('tags', '[]').limit(limit).execute()

            self.logger.info(f"📊 Query 2 (empty tags): Found {len(response2.data or [])} subreddits")

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

            self.logger.info(f"Found {len(unique_subreddits)} subreddits without tags")
            return unique_subreddits

        except Exception as e:
            self.logger.error(f"Error fetching untagged subreddits: {e}")
            return []

    def _determine_primary_category(self, tags: List[str]) -> str:
        """Determine primary category from tags"""
        if not tags:
            return "niche"

        # Priority order for primary category
        priority_order = ["niche", "focus", "body", "ethnicity", "age", "style", "ass", "breasts", "special", "hair", "content"]

        # Get categories from tags
        tag_categories = []
        for tag in tags:
            if ':' in tag:
                category = tag.split(':')[0]
                tag_categories.append(category)

        # Return first category based on priority
        for priority_cat in priority_order:
            if priority_cat in tag_categories:
                return priority_cat

        # Fallback to first category found
        return tag_categories[0] if tag_categories else "niche"

    def _validate_and_clean_tags(self, tags_raw: Any) -> Tuple[List[str], float]:
        """Validate and clean tags from AI response"""
        tags = []
        confidence = 1.0

        try:
            # Handle markdown code blocks
            if isinstance(tags_raw, str):
                if "```json" in tags_raw:
                    # Extract JSON from markdown
                    tags_raw = tags_raw.split("```json")[1].split("```")[0].strip()
                elif "```" in tags_raw:
                    # Extract from generic code block
                    tags_raw = tags_raw.split("```")[1].split("```")[0].strip()

            # Handle different response formats
            if isinstance(tags_raw, str):
                # Try to parse as JSON
                if tags_raw.strip().startswith('['):
                    tags_list = json.loads(tags_raw)
                else:
                    # Single tag or comma-separated
                    tags_list = [t.strip() for t in tags_raw.split(',')]
            elif isinstance(tags_raw, list):
                tags_list = tags_raw
            else:
                self.logger.warning(f"Unexpected tag format: {type(tags_raw)}")
                return [], 0.5

            # Log what we're validating
            self.logger.debug(f"Validating tags: {tags_list}")

            # Validate each tag
            invalid_tags = []
            for tag in tags_list:
                tag = tag.strip().lower()
                if tag in self.valid_tags:
                    tags.append(tag)
                else:
                    invalid_tags.append(tag)
                    confidence *= 0.9

            # Log invalid tags for debugging
            if invalid_tags:
                self.logger.warning(f"Invalid tags rejected: {invalid_tags}")
                # Try to find close matches
                for invalid_tag in invalid_tags:
                    if ':' in invalid_tag:
                        parts = invalid_tag.split(':')
                        if len(parts) >= 2:
                            close_matches = [t for t in self.valid_tags if t.startswith(f"{parts[0]}:{parts[1]}:")]
                            if close_matches:
                                self.logger.info(f"  Possible alternatives for '{invalid_tag}': {close_matches[:3]}")

            # If no valid tags found, it's a failure
            if not tags:
                self.logger.error("No valid tags found - categorization failed")
                raise ValueError(f"No valid tags could be extracted from: {tags_raw[:200]}")

        except json.JSONDecodeError as e:
            self.logger.error(f"JSON parsing error: {e}")
            self.logger.error(f"Raw response was: {tags_raw[:500] if isinstance(tags_raw, str) else tags_raw}")
            raise
        except Exception as e:
            self.logger.error(f"Error parsing tags: {e}")
            self.logger.error(f"Raw input was: {tags_raw if 'tags_raw' in locals() else 'Not available'}")
            raise

        return tags, confidence

    async def categorize_subreddit(self, subreddit: Dict[str, Any],
                                   batch_number: Optional[int] = None) -> TagCategorizationResult:
        """Categorize a single subreddit with multiple tags"""
        start_time = time.time()
        subreddit_name = subreddit.get('name', 'Unknown')
        subreddit_id = subreddit.get('id', 0)

        self.logger.info(f"🤖 Tagging r/{subreddit_name}")

        try:
            prompt = self._build_tag_prompt(subreddit)

            response = await self.openai.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at tagging adult content subreddits for marketing. Always respond with a JSON array of 1-2 relevant tags in the format category:value. Prefer 1 tag when sufficient."
                    },
                    {"role": "user", "content": prompt}
                ],
                # temperature parameter removed - model only supports default (1)
                max_completion_tokens=self.max_completion_tokens
            )

            # Validate response structure
            if not response.choices or len(response.choices) == 0:
                self.logger.error(f"❌ No choices in OpenAI response for r/{subreddit_name}")
                raise ValueError("OpenAI returned no choices")

            if not response.choices[0].message:
                self.logger.error(f"❌ No message in OpenAI response for r/{subreddit_name}")
                raise ValueError("OpenAI returned no message")

            # Handle None content
            content = response.choices[0].message.content
            if content is None:
                self.logger.error(f"❌ OpenAI returned None content for r/{subreddit_name}")
                self.logger.error(f"Full response: {response}")
                raise ValueError("OpenAI returned None content")

            # Log raw content before stripping
            self.logger.debug(f"Raw content before strip: [{repr(content)}]")

            tags_raw = content.strip()

            # Log after stripping
            self.logger.debug(f"Content after strip: [{repr(tags_raw)}]")

            if not tags_raw:
                self.logger.error(f"❌ OpenAI returned empty content for r/{subreddit_name}")
                self.logger.error(f"Raw content was: [{repr(content)}]")
                raise ValueError("OpenAI returned empty content")

            # Log the raw response for debugging
            self.logger.info(f"🤖 Raw OpenAI response for r/{subreddit_name}: {tags_raw[:200]}")

            # Validate and clean tags
            tags, confidence = self._validate_and_clean_tags(tags_raw)

            # Determine primary category
            primary_category = self._determine_primary_category(tags)

            # Calculate costs
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0

            cost = (
                (prompt_tokens / 1000) * self.price_per_1k_prompt_tokens +
                (completion_tokens / 1000) * self.price_per_1k_completion_tokens
            )

            processing_time_ms = int((time.time() - start_time) * 1000)

            # Update database
            update_success = await self._update_subreddit_tags(
                subreddit_id,
                subreddit_name,
                tags,
                primary_category,
                subreddit.get('over18', False)
            )

            result = TagCategorizationResult(
                subreddit_id=subreddit_id,
                subreddit_name=subreddit_name,
                tags=tags,
                primary_category=primary_category,
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

            # Log the full error details for debugging
            self.logger.error(f"❌ Failed to tag r/{subreddit_name}: {error_message}")
            self.logger.error(f"Error type: {type(e).__name__}")

            # Check if it's an OpenAI API error
            if "max_tokens" in error_message:
                error_message = "OpenAI API parameter error: Use max_completion_tokens instead of max_tokens"
            elif "temperature" in error_message:
                error_message = "OpenAI API parameter error: Temperature must be default (1) for this model"

            result = TagCategorizationResult(
                subreddit_id=subreddit_id,
                subreddit_name=subreddit_name,
                tags=[],  # No fallback tags - AI must choose
                primary_category="",  # No category if no tags
                confidence=0.0,
                success=False,
                error_message=error_message,
                processing_time_ms=processing_time_ms
            )

            await self._log_categorization_result(result, batch_number)

            return result

    async def _update_subreddit_tags(self, subreddit_id: int, subreddit_name: str,
                                     tags: List[str], primary_category: str,
                                     over18: bool) -> bool:
        """Update tags in database for both subreddit and its posts"""
        try:

            # Update the subreddit with tags
            self.supabase.table('reddit_subreddits').update({
                'tags': tags,
                'primary_category': primary_category,
                'tags_updated_at': datetime.now(timezone.utc).isoformat(),
                'tags_updated_by': 'ai_tagger',
                'updated_at': datetime.now(timezone.utc).isoformat()
            }).eq('id', subreddit_id).execute()

            # Update all posts for this subreddit with tags
            self.logger.info(f"Updating posts for r/{subreddit_name} with {len(tags)} tags")

            posts_update_response = self.supabase.table('reddit_posts').update({
                'sub_tags': tags,
                'sub_primary_category': primary_category,
                'sub_over18': over18
            }).eq('subreddit_name', subreddit_name).execute()

            posts_updated = len(posts_update_response.data) if posts_update_response.data else 0
            self.logger.info(f"✅ Updated {posts_updated} posts for r/{subreddit_name}")

            return True

        except Exception as e:
            self.logger.error(f"Error updating tags for subreddit {subreddit_id}: {e}")
            return False

    async def _log_categorization_result(self, result: TagCategorizationResult,
                                       batch_number: Optional[int] = None):
        """Log categorization result to Supabase"""
        if result.success:
            self.logger.info(f"✅ Tagged r/{result.subreddit_name} with {len(result.tags)} tags (confidence: {result.confidence:.2f})")
        else:
            self.logger.error(f"❌ Failed to tag r/{result.subreddit_name}: {result.error_message}")

        try:
            log_entry = {
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'source': 'reddit_tagger',
                'script_name': 'tag_categorization_service',
                'level': 'info' if result.success else 'error',
                'message': f"Tagged r/{result.subreddit_name} with {len(result.tags)} tags" if result.success else f"Failed to tag r/{result.subreddit_name}",
                'context': {
                    'subreddit_name': result.subreddit_name,
                    'subreddit_id': result.subreddit_id,
                    'tags': result.tags,
                    'primary_category': result.primary_category,
                    'tag_count': len(result.tags),
                    'ai_model': self.model,
                    'prompt_tokens': result.prompt_tokens,
                    'completion_tokens': result.completion_tokens,
                    'cost': float(result.cost) if result.cost else 0.00,
                    'confidence_score': float(result.confidence),
                    'batch_number': batch_number,
                    'success': result.success,
                    'error_message': result.error_message
                },
                'duration_ms': result.processing_time_ms,
                'items_processed': 1
            }

            self.supabase.table('system_logs').insert(log_entry).execute()

        except Exception as e:
            self.logger.error(f"Failed to log to Supabase: {e}")

    async def categorize_batch(self, subreddits: List[Dict[str, Any]],
                             batch_number: int = 1) -> List[TagCategorizationResult]:
        """Categorize a batch of subreddits with rate limiting"""
        results = []

        for i, subreddit in enumerate(subreddits):
            try:
                result = await self.categorize_subreddit(subreddit, batch_number)
                results.append(result)

                status = "✓" if result.success else "✗"
                self.logger.info(
                    f"[{i+1:3d}/{len(subreddits)}] r/{result.subreddit_name} → "
                    f"{len(result.tags)} tags {status} (${result.cost:.4f})"
                )

                # Rate limiting
                if i < len(subreddits) - 1:
                    await asyncio.sleep(self.delay_between_requests)

            except Exception as e:
                self.logger.error(f"Error processing subreddit {subreddit.get('name')}: {e}")

                error_result = TagCategorizationResult(
                    subreddit_id=subreddit.get('id', 0),
                    subreddit_name=subreddit.get('name', 'Unknown'),
                    tags=["platform:type:amateur"],
                    primary_category="platform",
                    confidence=0.0,
                    success=False,
                    error_message=str(e)
                )
                results.append(error_result)

        return results

    async def tag_all_uncategorized(self, batch_size: int = 30,
                                    limit: Optional[int] = None,
                                    subreddit_ids: Optional[List[int]] = None) -> Dict[str, Any]:
        """Tag all uncategorized subreddits in batches"""
        start_time = datetime.now(timezone.utc)

        self.logger.info(f"🎯 Starting tag categorization: batch_size={batch_size}, limit={limit}")

        # Get untagged subreddits
        if subreddit_ids:
            self.logger.info(f"📝 Fetching specific subreddits by IDs: {subreddit_ids}")
            subreddits = []
            for subreddit_id in subreddit_ids:
                try:
                    response = self.supabase.table('reddit_subreddits').select('*').eq('id', subreddit_id).execute()
                    if response.data:
                        subreddits.extend(response.data)
                except Exception as e:
                    self.logger.error(f"Failed to fetch subreddit {subreddit_id}: {e}")
        else:
            subreddits = await self.get_uncategorized_subreddits(limit or 10000)

        if not subreddits:
            return {
                'status': 'completed',
                'message': 'No untagged subreddits found',
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

        estimated_cost = total_count * 0.010  # Slightly higher for tag system
        self.logger.info(f"Starting tagging of {total_count} subreddits")
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

        # Tag distribution
        tag_distribution = {}
        for result in all_results:
            if result.success:
                for tag in result.tags:
                    tag_distribution[tag] = tag_distribution.get(tag, 0) + 1

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
            'top_tags': dict(sorted(tag_distribution.items(), key=lambda x: x[1], reverse=True)[:20])
        }

        self.logger.info(f"Tagging complete! Processed: {len(all_results)}, Success: {successful_count}, Errors: {error_count}")
        self.logger.info(f"Total cost: ${total_cost:.4f}, Duration: {duration/60:.1f} minutes")

        # If all results were errors, include error details in message
        message = f'Successfully tagged {successful_count} out of {len(all_results)} subreddits'
        if error_count > 0 and successful_count == 0:
            # Get the first error message for display
            first_error = next((r.error_message for r in all_results if not r.success), "Unknown error")
            message = f'Failed to tag subreddits. Error: {first_error}'
            self.logger.error(f"All categorization attempts failed. First error: {first_error}")

        return {
            'status': 'completed',
            'message': message,
            'stats': stats,
            'results': all_results
        }

    def get_all_tags(self) -> Dict[str, Any]:
        """Get the complete tag structure"""
        return self.TAG_STRUCTURE

    async def get_tag_stats(self) -> Dict[str, Any]:
        """Get tag usage statistics from database"""
        try:
            # Get total counts
            total_response = self.supabase.table('reddit_subreddits').select('id', count='exact').eq('review', 'Ok').execute()
            total_approved = total_response.count or 0

            tagged_response = self.supabase.table('reddit_subreddits').select('id', count='exact').eq('review', 'Ok').not_.is_('tags', 'null').execute()
            total_tagged = tagged_response.count or 0

            untagged = total_approved - total_tagged

            # Get tag distribution (this would need a more complex query in production)
            tags_response = self.supabase.table('reddit_subreddits').select('tags').eq('review', 'Ok').not_.is_('tags', 'null').limit(1000).execute()

            tag_counts = {}
            for row in tags_response.data:
                if row.get('tags'):
                    for tag in row['tags']:
                        tag_counts[tag] = tag_counts.get(tag, 0) + 1

            return {
                'total_approved_subreddits': total_approved,
                'total_tagged': total_tagged,
                'untagged_remaining': untagged,
                'tagging_progress_percent': (total_tagged / max(total_approved, 1)) * 100,
                'top_tags': dict(sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:30]),
                'tag_structure': self.TAG_STRUCTURE
            }

        except Exception as e:
            self.logger.error(f"Error getting tag stats: {e}")
            return {
                'error': str(e),
                'total_approved_subreddits': 0,
                'total_tagged': 0,
                'untagged_remaining': 0,
                'tagging_progress_percent': 0,
                'top_tags': {},
                'tag_structure': self.TAG_STRUCTURE
            }