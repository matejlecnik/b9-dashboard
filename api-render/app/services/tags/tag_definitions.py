"""
Tag Categorization System - Python Implementation
Exact mirror of the 82 tags defined in TAG_CATEGORIES.md
DO NOT MODIFY - This is a direct implementation of the carefully selected tags
"""

from typing import Any, Dict, List, Optional


# Tag registry - 82 tags across 11 categories (EXACT copy from TAG_CATEGORIES.md)
TAG_REGISTRY = {
    "niche": [
        "niche:cosplay",
        "niche:gaming",
        "niche:anime",
        "niche:fitness",
        "niche:yoga",
        "niche:outdoors",
        "niche:bdsm",
        "niche:amateur",
        "niche:verified",
        "niche:sellers",
        "niche:cnc",
        "niche:voyeur",
        "niche:rating",
        "niche:general"
    ],
    "focus": [
        "focus:breasts",
        "focus:ass",
        "focus:pussy",
        "focus:legs",
        "focus:thighs",
        "focus:feet",
        "focus:face",
        "focus:belly",
        "focus:curves",
        "focus:full_body"
    ],
    "body": [
        "body:petite",
        "body:slim",
        "body:athletic",
        "body:average",
        "body:curvy",
        "body:thick",
        "body:slim_thick",
        "body:bbw",
        "body:ssbbw"
    ],
    "ass": [
        "ass:small",
        "ass:bubble",
        "ass:big",
        "ass:jiggly"
    ],
    "breasts": [
        "breasts:small",
        "breasts:medium",
        "breasts:large",
        "breasts:huge",
        "breasts:natural",
        "breasts:enhanced",
        "breasts:perky"
    ],
    "age": [
        "age:college",
        "age:adult",
        "age:milf",
        "age:mature",
        "age:gilf"
    ],
    "ethnicity": [
        "ethnicity:asian",
        "ethnicity:latina",
        "ethnicity:ebony",
        "ethnicity:white",
        "ethnicity:indian",
        "ethnicity:middle_eastern",
        "ethnicity:mixed"
    ],
    "style": [
        "style:alt",
        "style:goth",
        "style:egirl",
        "style:tattooed",
        "style:pierced",
        "style:natural",
        "style:bimbo",
        "style:tomboy",
        "style:femdom",
        "style:submissive",
        "style:lingerie",
        "style:uniform"
    ],
    "hair": [
        "hair:blonde",
        "hair:redhead",
        "hair:brunette",
        "hair:colored"
    ],
    "special": [
        "special:hairy",
        "special:flexible",
        "special:tall",
        "special:short",
        "special:breeding",
        "special:slutty",
        "special:clothed",
        "special:bent_over"
    ],
    "content": [
        "content:oc",
        "content:professional"
    ]
}


def get_all_tags() -> List[str]:
    """Returns all 82 tags as a flat list"""
    tags = []
    for category_tags in TAG_REGISTRY.values():
        tags.extend(category_tags)
    return tags


def get_tags_by_category(category: str) -> List[str]:
    """Returns tags for a specific category"""
    return TAG_REGISTRY.get(category, [])


def validate_tags(tags: List[str]) -> Dict[str, Any]:
    """
    Validates tags according to rules:
    - Minimum 1 tag
    - Maximum 2 tags
    - Tags must exist in registry
    """
    valid_tags = get_all_tags()

    errors = []
    if len(tags) < 1:
        errors.append("At least 1 tag required")
    if len(tags) > 2:
        errors.append("Maximum 2 tags allowed")

    for tag in tags:
        if tag not in valid_tags:
            errors.append(f"Invalid tag: {tag}")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "tag_count": len(tags)
    }


def match_subreddit_to_model(subreddit_tags: List[str], model_tags: List[str]) -> bool:
    """
    Returns True if subreddit and model share at least 1 tag
    This is the core matching algorithm
    """
    return bool(set(subreddit_tags) & set(model_tags))


def extract_category(tag: str) -> Optional[str]:
    """Extract category from tag (e.g., 'niche' from 'niche:gaming')"""
    if ':' in tag:
        return tag.split(':')[0]
    return None


def extract_value(tag: str) -> Optional[str]:
    """Extract value from tag (e.g., 'gaming' from 'niche:gaming')"""
    if ':' in tag:
        return tag.split(':')[1]
    return None


# Statistics
TOTAL_TAGS = 82
TOTAL_CATEGORIES = 11
MIN_TAGS_PER_SUBREDDIT = 1
MAX_TAGS_PER_SUBREDDIT = 2
PREFERRED_TAGS_PER_SUBREDDIT = 1
