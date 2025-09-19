#!/usr/bin/env python3
"""
Migration script to convert existing categories to the new tag system
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Any
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class CategoryToTagMigrator:
    """Migrate existing categories to new tag system"""

    # Mapping from old categories to new tags
    CATEGORY_TO_TAGS_MAPPING = {
        "Feet & Foot Fetish": {
            "tags": ["body:feet:general"],
            "primary_category": "body"
        },
        "Ass & Booty": {
            "tags": ["body:ass:general"],
            "primary_category": "body"
        },
        "Boobs & Chest": {
            "tags": ["body:breasts:general"],
            "primary_category": "body"
        },
        "Lingerie & Underwear": {
            "tags": ["style:clothing:lingerie"],
            "primary_category": "style"
        },
        "Selfie & Amateur": {
            "tags": ["platform:type:selfie", "platform:type:amateur"],
            "primary_category": "platform"
        },
        "Full Body & Nude": {
            "tags": ["body:full:nude"],
            "primary_category": "body"
        },
        "Clothed & Dressed": {
            "tags": ["style:nudity:clothed"],
            "primary_category": "style"
        },
        "Gym & Fitness": {
            "tags": ["theme:lifestyle:gym", "physical:body_type:athletic"],
            "primary_category": "theme"
        },
        "Goth & Alternative": {
            "tags": ["style:subculture:goth", "style:subculture:alt"],
            "primary_category": "style"
        },
        "Cosplay & Fantasy": {
            "tags": ["style:cosplay:generic"],
            "primary_category": "style"
        },
        "Ethnic & Cultural": {
            "tags": ["demo:ethnicity:mixed"],  # Will be refined by name
            "primary_category": "demo"
        },
        "Age Demographics": {
            "tags": ["demo:age:teen"],  # Will be refined by name
            "primary_category": "demo"
        },
        "Body Types & Features": {
            "tags": ["physical:body_type:average"],  # Will be refined by name
            "primary_category": "physical"
        },
        "Specific Body Parts": {
            "tags": ["body:full:general"],  # Will be refined by name
            "primary_category": "body"
        },
        "Lifestyle & Themes": {
            "tags": ["theme:lifestyle:general"],  # Will be refined by name
            "primary_category": "theme"
        },
        "OnlyFans Promotion": {
            "tags": ["platform:of:promo"],
            "primary_category": "platform"
        },
        "Interactive & Personalized": {
            "tags": ["platform:interaction:rating"],
            "primary_category": "platform"
        }
    }

    # Specific subreddit name patterns for better tagging
    NAME_PATTERNS = {
        # Body parts
        "ass": ["body:ass:general"],
        "booty": ["body:ass:general"],
        "bigasses": ["body:ass:big"],
        "pawg": ["body:ass:pawg", "demo:ethnicity:white"],
        "paag": ["body:ass:paag", "demo:ethnicity:asian"],
        "bubblebutts": ["body:ass:bubble"],
        "feet": ["body:feet:general"],
        "soles": ["body:feet:soles"],
        "toes": ["body:feet:toes"],
        "boobs": ["body:breasts:general"],
        "tits": ["body:breasts:general"],
        "bigtits": ["body:breasts:large"],
        "smallboobs": ["body:breasts:small"],
        "thickthighs": ["body:legs:thick_thighs"],
        "legs": ["body:legs:general"],

        # Physical attributes
        "redhead": ["physical:hair:redhead"],
        "blonde": ["physical:hair:blonde"],
        "brunette": ["physical:hair:brunette"],
        "pale": ["physical:skin:pale"],
        "ebony": ["physical:skin:ebony", "demo:ethnicity:ebony"],
        "petite": ["physical:body_type:petite"],
        "curvy": ["physical:body_type:curvy"],
        "thick": ["physical:body_type:thick"],
        "slim": ["physical:body_type:slim"],
        "bbw": ["physical:body_type:bbw"],
        "chubby": ["physical:body_type:chubby"],
        "athletic": ["physical:body_type:athletic"],
        "fit": ["physical:body_type:athletic"],
        "tattoo": ["physical:mod:tattoos"],
        "piercing": ["physical:mod:piercings"],
        "freckles": ["physical:feature:freckles"],
        "glasses": ["physical:feature:glasses"],

        # Demographics
        "asian": ["demo:ethnicity:asian"],
        "latina": ["demo:ethnicity:latina"],
        "indian": ["demo:ethnicity:indian"],
        "japanese": ["demo:asian:japanese"],
        "korean": ["demo:asian:korean"],
        "chinese": ["demo:asian:chinese"],
        "thai": ["demo:asian:thai"],
        "teen": ["demo:age:teen"],
        "18": ["demo:age:teen", "demo:age:barely_legal"],
        "19": ["demo:age:teen", "demo:age:barely_legal"],
        "milf": ["demo:age:milf"],
        "mature": ["demo:age:mature"],
        "gilf": ["demo:age:gilf"],
        "college": ["demo:age:college"],

        # Style
        "lingerie": ["style:clothing:lingerie"],
        "bikini": ["style:clothing:bikini"],
        "yoga": ["style:clothing:yoga_pants", "theme:lifestyle:yoga"],
        "stockings": ["style:clothing:stockings"],
        "heels": ["style:clothing:heels"],
        "dress": ["style:clothing:dress"],
        "jeans": ["style:clothing:jeans"],
        "goth": ["style:subculture:goth"],
        "alt": ["style:subculture:alt"],
        "emo": ["style:subculture:emo"],
        "egirl": ["style:subculture:egirl"],
        "bimbo": ["style:subculture:bimbo"],
        "cosplay": ["style:cosplay:generic"],
        "nude": ["style:nudity:nude"],
        "naked": ["style:nudity:nude"],
        "topless": ["style:nudity:topless"],
        "clothed": ["style:nudity:clothed"],

        # Themes
        "bdsm": ["theme:fetish:bdsm"],
        "ddlg": ["theme:roleplay:ddlg", "theme:dynamic:daddy"],
        "daddy": ["theme:dynamic:daddy"],
        "mommy": ["theme:dynamic:mommy"],
        "breeding": ["theme:fetish:breeding"],
        "worship": ["theme:fetish:worship"],
        "housewife": ["theme:lifestyle:housewife"],
        "hotwife": ["theme:lifestyle:hotwife"],
        "gym": ["theme:lifestyle:gym"],
        "outdoor": ["theme:lifestyle:outdoor"],
        "office": ["theme:lifestyle:office"],

        # Platform
        "onlyfans": ["platform:of:promo"],
        "selfie": ["platform:type:selfie"],
        "amateur": ["platform:type:amateur"],
        "oc": ["platform:type:oc"],
        "tribute": ["platform:interaction:tribute"],
        "rate": ["platform:interaction:rating"],
    }

    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.logger = logging.getLogger(__name__)

    def extract_tags_from_name(self, subreddit_name: str) -> List[str]:
        """Extract tags based on subreddit name patterns"""
        tags = []
        name_lower = subreddit_name.lower()

        # Check each pattern
        for pattern, pattern_tags in self.NAME_PATTERNS.items():
            if pattern in name_lower:
                for tag in pattern_tags:
                    if tag not in tags:
                        tags.append(tag)

        return tags

    def determine_tags_for_subreddit(self, subreddit: Dict[str, Any]) -> Dict[str, Any]:
        """Determine tags for a subreddit based on category and name"""
        category = subreddit.get('category_text')
        name = subreddit.get('name', '')

        # Start with category-based tags
        if category and category in self.CATEGORY_TO_TAGS_MAPPING:
            base_mapping = self.CATEGORY_TO_TAGS_MAPPING[category]
            tags = base_mapping['tags'].copy()
            primary_category = base_mapping['primary_category']
        else:
            tags = []
            primary_category = "platform"

        # Add name-based tags
        name_tags = self.extract_tags_from_name(name)
        for tag in name_tags:
            if tag not in tags:
                tags.append(tag)

        # Refine based on specific subreddits
        if name.lower() in ["realgirls"]:
            tags = ["platform:type:oc", "platform:type:amateur", "body:full:nude"]
            primary_category = "platform"
        elif name.lower() in ["gonewild"]:
            tags = ["platform:type:amateur", "platform:type:oc", "body:full:nude"]
            primary_category = "platform"
        elif name.lower() in ["asianhotties"]:
            tags = ["demo:ethnicity:asian", "body:full:general", "style:nudity:nude"]
            primary_category = "demo"
        elif name.lower() in ["latinas"]:
            tags = ["demo:ethnicity:latina", "body:full:general"]
            primary_category = "demo"
        elif name.lower() in ["palegirls"]:
            tags = ["physical:skin:pale", "body:full:artistic", "style:nudity:nude"]
            primary_category = "physical"
        elif name.lower() in ["redheads"]:
            tags = ["physical:hair:redhead", "body:full:general"]
            primary_category = "physical"
        elif name.lower() in ["rapefantasies"]:
            tags = ["theme:fetish:cnc", "theme:mood:aggressive"]
            primary_category = "theme"
        elif name.lower() in ["dadwouldbeproud"]:
            tags = ["theme:roleplay:ddlg", "theme:dynamic:daddy", "platform:of:friendly"]
            primary_category = "theme"
        elif name.lower() in ["daughtertraining"]:
            tags = ["theme:roleplay:ddlg", "theme:dynamic:daddy", "demo:age:teen"]
            primary_category = "theme"

        # Update primary category based on most common tag prefix
        if tags:
            category_counts = {}
            for tag in tags:
                if ':' in tag:
                    cat = tag.split(':')[0]
                    category_counts[cat] = category_counts.get(cat, 0) + 1
            if category_counts:
                primary_category = max(category_counts.items(), key=lambda x: x[1])[0]

        return {
            'tags': tags[:8],  # Limit to 8 tags max
            'primary_category': primary_category
        }

    async def migrate_categories_to_tags(self, limit: int = None) -> Dict[str, Any]:
        """Migrate existing categorized subreddits to tag system"""
        start_time = datetime.now(timezone.utc)

        try:
            # Get categorized subreddits that don't have tags yet
            query = self.supabase.table('reddit_subreddits').select(
                'id, name, category_text, over18'
            ).eq('review', 'Ok').not_.is_('category_text', 'null')

            if limit:
                query = query.limit(limit)

            response = query.execute()
            subreddits = response.data or []

            self.logger.info(f"Found {len(subreddits)} categorized subreddits to migrate")

            successful = 0
            errors = 0

            for i, subreddit in enumerate(subreddits):
                try:
                    # Determine tags
                    tag_info = self.determine_tags_for_subreddit(subreddit)

                    if not tag_info['tags']:
                        self.logger.warning(f"No tags determined for r/{subreddit['name']}")
                        continue

                    # Update subreddit
                    self.supabase.table('reddit_subreddits').update({
                        'tags': tag_info['tags'],
                        'primary_category': tag_info['primary_category'],
                        'tags_updated_at': datetime.now(timezone.utc).isoformat(),
                        'tags_updated_by': 'migration_script'
                    }).eq('id', subreddit['id']).execute()

                    # Update posts
                    self.supabase.table('reddit_posts').update({
                        'sub_tags': tag_info['tags'],
                        'sub_primary_category': tag_info['primary_category']
                    }).eq('subreddit_name', subreddit['name']).execute()

                    successful += 1
                    self.logger.info(f"[{i+1}/{len(subreddits)}] Migrated r/{subreddit['name']} with {len(tag_info['tags'])} tags")

                except Exception as e:
                    errors += 1
                    self.logger.error(f"Error migrating r/{subreddit.get('name')}: {e}")

                # Progress update
                if (i + 1) % 100 == 0:
                    self.logger.info(f"Progress: {i+1}/{len(subreddits)} processed")

            # Final stats
            end_time = datetime.now(timezone.utc)
            duration = (end_time - start_time).total_seconds()

            return {
                'status': 'completed',
                'total_processed': len(subreddits),
                'successful': successful,
                'errors': errors,
                'duration_seconds': duration,
                'message': f"Migration completed: {successful} successful, {errors} errors"
            }

        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }

    async def verify_migration(self) -> Dict[str, Any]:
        """Verify the migration results"""
        try:
            # Count subreddits with tags
            tagged_response = self.supabase.table('reddit_subreddits').select(
                'id', count='exact'
            ).not_.is_('tags', 'null').execute()

            # Count posts with tags
            posts_tagged_response = self.supabase.table('reddit_posts').select(
                'id', count='exact'
            ).not_.is_('sub_tags', 'null').limit(1).execute()

            # Get sample of tagged subreddits
            sample_response = self.supabase.table('reddit_subreddits').select(
                'name, tags, primary_category'
            ).not_.is_('tags', 'null').limit(10).execute()

            return {
                'subreddits_with_tags': tagged_response.count or 0,
                'sample_tagged_subreddits': sample_response.data or [],
                'status': 'verification_complete'
            }

        except Exception as e:
            self.logger.error(f"Verification failed: {e}")
            return {
                'status': 'error',
                'error': str(e)
            }


async def main():
    """Run the migration"""
    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not supabase_url or not supabase_key:
        logger.error("Missing Supabase credentials in environment variables")
        return

    supabase = create_client(supabase_url, supabase_key)

    # Create migrator
    migrator = CategoryToTagMigrator(supabase)

    # Run migration
    logger.info("Starting category to tag migration...")
    result = await migrator.migrate_categories_to_tags(limit=None)  # Remove limit for full migration
    logger.info(f"Migration result: {result}")

    # Verify
    logger.info("Verifying migration...")
    verification = await migrator.verify_migration()
    logger.info(f"Verification result: {verification}")


if __name__ == "__main__":
    asyncio.run(main())