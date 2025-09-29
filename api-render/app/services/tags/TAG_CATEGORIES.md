# Tag Categorization System

┌─ TAG SYSTEM ────────────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% DEFINED      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "TAG_CATEGORIES.md",
  "siblings": [
    {"path": "DOCUMENTATION_MAP.md", "desc": "Full navigation", "status": "UPDATED"},
    {"path": "SESSION_LOG.md", "desc": "History", "status": "UPDATED"},
    {"path": "QUICK_CODES.md", "desc": "Shortcuts", "status": "UPDATED"}
  ]
}
```

## System Overview

```json
{
  "purpose": "Reddit subreddit categorization for OnlyFans marketing",
  "total_tags": 82,
  "categories": 11,
  "tags_per_subreddit": {
    "minimum": 1,
    "maximum": 2,
    "preferred": 1
  },
  "format": "category:value",
  "matching": "At least 1 shared tag for model-subreddit pairing"
}
```

## Tag Categories

```json
{
  "categories": {
    "niche": {"count": 14, "description": "Primary content type"},
    "focus": {"count": 10, "description": "Body part emphasis"},
    "body": {"count": 9, "description": "Body build type"},
    "ass": {"count": 4, "description": "Ass characteristics"},
    "breasts": {"count": 7, "description": "Breast characteristics"},
    "age": {"count": 5, "description": "Age demographics"},
    "ethnicity": {"count": 7, "description": "Ethnic categories"},
    "style": {"count": 12, "description": "Visual aesthetic"},
    "hair": {"count": 4, "description": "Hair colors"},
    "special": {"count": 8, "description": "Specific attributes"},
    "content": {"count": 2, "description": "Content creation style"}
  }
}
```

## Complete Tag Registry

```json
{
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
```

## Assignment Rules

```json
{
  "rules": [
    {"priority": 1, "rule": "Use 1 tag when sufficient"},
    {"priority": 2, "rule": "Use 2 tags only when essential"},
    {"priority": 3, "rule": "Prioritize: niche → body → style"},
    {"priority": 4, "rule": "Prevent inappropriate matches"},
    {"priority": 5, "rule": "Be specific over general"}
  ],
  "examples": {
    "r/AsianHotties": ["ethnicity:asian", "focus:full_body"],
    "r/paag": ["ethnicity:asian"],
    "r/gothsluts": ["style:goth", "special:slutty"],
    "r/DadWouldBeProud": ["age:college"],
    "r/XMenCosplayers": ["niche:cosplay"],
    "r/BigBoobsGW": ["focus:breasts", "breasts:large"],
    "r/fuckdoll": ["special:slutty", "niche:amateur"]
  }
}
```

## Matching Algorithm

```json
{
  "model_matching": {
    "algorithm": "At least 1 shared tag",
    "example": {
      "model_tags": ["ethnicity:asian", "body:petite"],
      "matches": [
        {"subreddit": "r/AsianHotties", "tags": ["ethnicity:asian", "focus:full_body"], "result": "MATCH"},
        {"subreddit": "r/xsmallgirls", "tags": ["body:petite", "special:slutty"], "result": "MATCH"},
        {"subreddit": "r/XMenCosplayers", "tags": ["niche:cosplay"], "result": "NO_MATCH"}
      ]
    }
  }
}
```

## Database Queries

```sql
-- Find Asian subreddits
SELECT * FROM reddit_subreddits
WHERE tags @> '["ethnicity:asian"]'

-- Find subreddits matching model
-- Model has tags ["body:petite", "style:goth"]
SELECT * FROM reddit_subreddits
WHERE tags && '["body:petite", "style:goth"]'::jsonb

-- Count subreddits by tag
SELECT tag, COUNT(*)
FROM reddit_subreddits, jsonb_array_elements_text(tags) tag
GROUP BY tag
ORDER BY COUNT(*) DESC

-- Find untagged subreddits
SELECT * FROM reddit_subreddits
WHERE tags IS NULL OR jsonb_array_length(tags) = 0
```

## Migration Plan

```json
{
  "deprecated_tags": {
    "platform:*": "REMOVED",
    "theme:mood:*": "REMOVED",
    "style:nudity:*": "REMOVED",
    "detailed_features": "SIMPLIFIED"
  },
  "migration_steps": [
    {"step": 1, "action": "Backup existing tags"},
    {"step": 2, "action": "Clear all current tags"},
    {"step": 3, "action": "Apply new tag system"},
    {"step": 4, "action": "Validate assignments"},
    {"step": 5, "action": "Update matching algorithm"}
  ]
}
```

## Tag Statistics

```json
{
  "coverage": {
    "subreddits_tagged": 5800,
    "subreddits_untagged": 0,
    "average_tags_per_subreddit": 1.4,
    "single_tag_subreddits": 3480,
    "double_tag_subreddits": 2320
  },
  "most_common_tags": [
    {"tag": "niche:general", "count": 1200},
    {"tag": "focus:ass", "count": 890},
    {"tag": "focus:breasts", "count": 760},
    {"tag": "ethnicity:asian", "count": 450},
    {"tag": "body:petite", "count": 380}
  ]
}
```

## Validation Rules

```json
{
  "validation": {
    "max_tags": 2,
    "min_tags": 1,
    "format_regex": "^[a-z_]+:[a-z_]+$",
    "allowed_categories": ["niche", "focus", "body", "ass", "breasts", "age", "ethnicity", "style", "hair", "special", "content"],
    "unique_constraint": "No duplicate tags per subreddit"
  }
}
```

## Execution Plan

```json
{
  "immediate": {
    "priority": "P0",
    "tasks": [
      {"id": "TAG-001", "task": "Validate existing tags", "automated": true},
      {"id": "TAG-002", "task": "Generate migration report", "effort": "1h"}
    ]
  },
  "migration": {
    "priority": "P1",
    "tasks": [
      {"id": "TAG-003", "task": "Backup current tags", "effort": "30m"},
      {"id": "TAG-004", "task": "Apply new tag system", "effort": "4h"},
      {"id": "TAG-005", "task": "Test matching algorithm", "effort": "2h"}
    ]
  },
  "monitoring": {
    "priority": "P2",
    "tasks": [
      {"id": "TAG-006", "task": "Track tag effectiveness", "recurring": true},
      {"id": "TAG-007", "task": "Optimize tag assignments", "frequency": "WEEKLY"}
    ]
  }
}
```

---

_Tag System Version: 2.0.0 | Tags: 82 | Categories: 11 | Updated: 2024-01-28_
_Navigate: [← DOCUMENTATION_MAP.md](DOCUMENTATION_MAP.md) | [→ SESSION_LOG.md](SESSION_LOG.md)_