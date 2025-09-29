# Tag Categorization System

┌─ TAG SYSTEM STATUS ─────────────────────────────────────┐
│ ● DEFINED     │ ████████████████████ 100% COMPLETE     │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "TAG_CATEGORIES.md",
  "related": [
    {"path": "../app/services/tags/TAG_CATEGORIES.md", "desc": "Service implementation", "status": "ACTIVE"},
    {"path": "../app/services/categorization_service_tags.py", "desc": "AI categorization", "status": "STABLE"}
  ]
}
```

## System Overview

```json
{
  "purpose": "Reddit subreddit categorization for OnlyFans marketing",
  "total_tags": 82,
  "categories": 11,
  "format": "category:value",
  "rules": {
    "tags_per_subreddit": {"min": 1, "max": 2},
    "matching": "At least 1 shared tag required",
    "precision": "Prevent inappropriate pairings"
  }
}
```

## Tag Categories

```json
{
  "categories": {
    "niche": {
      "count": 14,
      "description": "Primary content type",
      "tags": [
        "niche:cosplay", "niche:gaming", "niche:anime", "niche:fitness",
        "niche:yoga", "niche:outdoors", "niche:bdsm", "niche:amateur",
        "niche:verified", "niche:sellers", "niche:cnc", "niche:voyeur",
        "niche:rating", "niche:general"
      ]
    },
    "focus": {
      "count": 10,
      "description": "Body part emphasis",
      "tags": [
        "focus:face", "focus:feet", "focus:hands", "focus:legs",
        "focus:pussy", "focus:breasts", "focus:ass", "focus:general",
        "focus:mixed", "focus:full_body"
      ]
    },
    "body": {
      "count": 9,
      "description": "Body build type",
      "tags": [
        "body:petite", "body:slim", "body:athletic", "body:curvy",
        "body:thick", "body:bbw", "body:average", "body:tall",
        "body:muscular"
      ]
    },
    "ass": {
      "count": 4,
      "description": "Ass characteristics",
      "tags": [
        "ass:small", "ass:bubble", "ass:thick", "ass:pawg"
      ]
    },
    "breasts": {
      "count": 7,
      "description": "Breast characteristics",
      "tags": [
        "breasts:flat", "breasts:small", "breasts:medium", "breasts:big",
        "breasts:huge", "breasts:natural", "breasts:enhanced"
      ]
    },
    "age": {
      "count": 5,
      "description": "Age demographics",
      "tags": [
        "age:teen", "age:college", "age:milf", "age:mature",
        "age:general"
      ]
    },
    "ethnicity": {
      "count": 7,
      "description": "Ethnic categories",
      "tags": [
        "ethnicity:white", "ethnicity:asian", "ethnicity:latina",
        "ethnicity:black", "ethnicity:middle_eastern", "ethnicity:indian",
        "ethnicity:mixed"
      ]
    },
    "style": {
      "count": 12,
      "description": "Visual aesthetic",
      "tags": [
        "style:goth", "style:alt", "style:emo", "style:femboy",
        "style:trans", "style:couple", "style:solo", "style:lesbian",
        "style:artsy", "style:casual", "style:glam", "style:natural"
      ]
    },
    "hair": {
      "count": 7,
      "description": "Hair characteristics",
      "tags": [
        "hair:blonde", "hair:brunette", "hair:redhead", "hair:black",
        "hair:colored", "hair:short", "hair:long"
      ]
    },
    "genitals": {
      "count": 3,
      "description": "Genital characteristics",
      "tags": [
        "genitals:shaved", "genitals:hairy", "genitals:mixed"
      ]
    },
    "location": {
      "count": 4,
      "description": "Geographic focus",
      "tags": [
        "location:usa", "location:europe", "location:asia",
        "location:global"
      ]
    }
  }
}
```

## Usage Examples

```json
{
  "subreddit_examples": {
    "r/AsianNSFW": ["ethnicity:asian", "focus:general"],
    "r/pawg": ["ass:pawg", "focus:ass"],
    "r/PetiteGoneWild": ["body:petite", "niche:amateur"],
    "r/gothsluts": ["style:goth", "niche:general"],
    "r/feetpics": ["focus:feet"],
    "r/OnlyFans101": ["niche:sellers"]
  },
  "model_matching": {
    "asian_petite_model": ["ethnicity:asian", "body:petite"],
    "goth_bbw_model": ["style:goth", "body:bbw"],
    "fitness_milf_model": ["niche:fitness", "age:milf"]
  }
}
```

## Matching Rules

```json
{
  "algorithm": {
    "step1": "Extract model characteristics",
    "step2": "Assign 1-2 most relevant tags",
    "step3": "Find subreddits with matching tags",
    "step4": "Require at least 1 shared tag",
    "step5": "Rank by tag overlap"
  },
  "constraints": [
    "Maximum 2 tags per entity",
    "No contradictory tags",
    "Prefer specific over general",
    "Ethnicity tags are high priority"
  ]
}
```

## Tag Statistics

```json
{
  "usage": {
    "most_used": [
      {"tag": "niche:general", "count": 1847},
      {"tag": "focus:ass", "count": 892},
      {"tag": "body:petite", "count": 743}
    ],
    "least_used": [
      {"tag": "genitals:mixed", "count": 12},
      {"tag": "location:asia", "count": 23},
      {"tag": "hair:colored", "count": 45}
    ]
  },
  "coverage": {
    "subreddits_tagged": 5847,
    "subreddits_untagged": 0,
    "models_categorized": 1247
  }
}
```

## Validation

```json
{
  "rules": {
    "format_check": "All tags must follow category:value",
    "category_valid": "Category must be in defined list",
    "value_valid": "Value must be in category's tag list",
    "count_valid": "1-2 tags per entity",
    "no_duplicates": "No duplicate categories"
  },
  "enforcement": {
    "api_validation": true,
    "database_constraints": true,
    "ai_validation": true
  }
}
```

---

_Tag System Version: 2.0.0 | Status: Defined | Updated: 2024-01-29_
_Navigate: [← docs/](README.md) | [→ ../app/services/tags/](../app/services/tags/)_