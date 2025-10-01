# Tag System Implementation

┌─ TAG SERVICE ───────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% SYNCED       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "README.md",
  "siblings": [
    {"path": "TAG_CATEGORIES.md", "desc": "Complete tag documentation", "status": "SOURCE_OF_TRUTH"},
    {"path": "tag_definitions.py", "desc": "Python implementation", "status": "SYNCED"}
  ],
  "related": [
    {"path": "../../../dashboard/src/lib/tagCategories.ts", "desc": "Frontend implementation", "status": "SYNCED"}
  ]
}
```

## Overview

```json
{
  "purpose": "Reddit subreddit categorization for OnlyFans marketing",
  "total_tags": 82,
  "categories": 11,
  "implementations": {
    "python": "tag_definitions.py",
    "typescript": "dashboard/src/lib/tagCategories.ts",
    "documentation": "TAG_CATEGORIES.md"
  },
  "rules": {
    "min_tags": 1,
    "max_tags": 2,
    "preferred": 1,
    "matching": "At least 1 shared tag"
  }
}
```

## File Structure

```json
{
  "files": {
    "TAG_CATEGORIES.md": {
      "role": "SOURCE_OF_TRUTH",
      "description": "Complete documentation and tag registry",
      "format": "Terminal + JSON style",
      "editable": "YES - But requires sync"
    },
    "tag_definitions.py": {
      "role": "PYTHON_IMPLEMENTATION",
      "description": "Python functions for tag operations",
      "format": "Python module",
      "editable": "NO - Generated from source"
    },
    "README.md": {
      "role": "GUIDE",
      "description": "How to use the tag system",
      "format": "Terminal + JSON style",
      "editable": "YES"
    }
  }
}
```

## Usage Examples

### Python Usage

```python
from api_render.services.tags.tag_definitions import (
    get_all_tags,
    validate_tags,
    match_subreddit_to_model
)

## Get all tags
all_tags = get_all_tags()  # Returns 82 tags

## Validate subreddit tags
result = validate_tags(["ethnicity:asian", "body:petite"])
## {"valid": True, "errors": [], "tag_count": 2}

## Match subreddit to model
subreddit_tags = ["ethnicity:asian", "focus:full_body"]
model_tags = ["ethnicity:asian", "body:petite"]
matches = match_subreddit_to_model(subreddit_tags, model_tags)
## True (shared tag: ethnicity:asian)
```

### Database Queries

```sql
-- Find subreddits matching model
SELECT * FROM reddit_subreddits
WHERE tags && '["body:petite", "style:goth"]'::jsonb

-- Count subreddits by tag
SELECT tag, COUNT(*)
FROM reddit_subreddits, jsonb_array_elements_text(tags) tag
GROUP BY tag
ORDER BY COUNT(*) DESC
```

## Synchronization

```json
{
  "sync_requirements": [
    {"step": 1, "action": "Edit TAG_CATEGORIES.md (source of truth)"},
    {"step": 2, "action": "Update tag_definitions.py to match"},
    {"step": 3, "action": "Update dashboard/src/lib/tagCategories.ts"},
    {"step": 4, "action": "Test both implementations"},
    {"step": 5, "action": "Deploy changes"}
  ],
  "current_status": {
    "python_tags": 82,
    "typescript_tags": 82,
    "synchronized": true,
    "last_sync": "2024-01-28"
  }
}
```

## API Integration

```json
{
  "endpoints": {
    "/api/tags/all": {
      "method": "GET",
      "returns": "All 82 tags with categories",
      "cached": true
    },
    "/api/tags/validate": {
      "method": "POST",
      "body": {"tags": ["tag1", "tag2"]},
      "returns": "Validation result"
    },
    "/api/tags/match": {
      "method": "POST",
      "body": {"subreddit_tags": [], "model_tags": []},
      "returns": "Boolean match result"
    }
  }
}
```

## Common Operations

```python
## Import everything needed
from tag_definitions import (
    TAG_REGISTRY,
    get_all_tags,
    get_tags_by_category,
    validate_tags,
    match_subreddit_to_model
)

## Get specific category tags
niche_tags = get_tags_by_category("niche")  # 14 tags
body_tags = get_tags_by_category("body")    # 9 tags

## Validate before saving
tags_to_save = ["niche:gaming", "style:egirl"]
validation = validate_tags(tags_to_save)
if validation["valid"]:
    # Save to database
    pass

## Find matching subreddits for model
model_tags = ["ethnicity:latina", "body:curvy"]
## Use in SQL query with tags && operator
```

## Testing

```bash
## Test Python implementation
python -m pytest api-render/services/tags/test_tags.py

## Verify sync
python api-render/services/tags/verify_sync.py

## Count tags
python -c "from tag_definitions import TOTAL_TAGS; print(f'Total tags: {TOTAL_TAGS}')"
```

## Maintenance

```json
{
  "tasks": {
    "daily": [],
    "weekly": [
      {"task": "Verify tag sync across implementations", "automated": false}
    ],
    "on_change": [
      {"task": "Update all implementations", "priority": "CRITICAL"},
      {"task": "Test matching algorithm", "priority": "HIGH"},
      {"task": "Update documentation", "priority": "MEDIUM"}
    ]
  }
}
```

## Important Notes

```json
{
  "warnings": [
    "DO NOT modify tags without updating all implementations",
    "TAG_CATEGORIES.md is the source of truth",
    "Both Python and TypeScript must have exactly 82 tags",
    "Tag format must be 'category:value'",
    "Maximum 2 tags per subreddit is a hard limit"
  ],
  "reminders": [
    "Tags are carefully selected - do not add/remove casually",
    "Test matching algorithm after any changes",
    "Keep implementations synchronized"
  ]
}
```

---

_Tag System Version: 2.0.0 | Tags: 82 | Categories: 11 | Updated: 2024-01-28_
_Navigate: [← Services](../README.md) | [→ TAG_CATEGORIES.md](TAG_CATEGORIES.md)_