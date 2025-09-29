# Maintenance Scripts

┌─ SCRIPTS STATUS ────────────────────────────────────────┐
│ ● UTILITY     │ ████████████████████ 100% FUNCTIONAL   │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "scripts/README.md",
  "subdirectories": [
    {"path": "reddit-analysis/", "desc": "Reddit data analysis", "status": "ACTIVE"},
    {"path": "results/", "desc": "Script output storage", "status": "ARCHIVE"}
  ]
}
```

## Script Overview

```json
{
  "purpose": "Maintenance and analysis utilities",
  "frequency": "On-demand",
  "categories": {
    "analysis": ["reddit-analysis/recheck_non_related.py"],
    "maintenance": [],
    "migration": [],
    "reporting": []
  },
  "last_run": "2024-01-17",
  "total_scripts": 1
}
```

## Available Scripts

```json
{
  "reddit_analysis": {
    "recheck_non_related.py": {
      "purpose": "Re-analyze miscategorized subreddits",
      "language": "Python 3.11",
      "dependencies": ["openai", "supabase"],
      "ai_model": "GPT-4",
      "status": "ACTIVE"
    }
  }
}
```

## Reddit Recategorization Script

```json
{
  "script": "reddit-analysis/recheck_non_related.py",
  "configuration": {
    "target": "Non Related subreddits",
    "goal": "Identify self-posting communities",
    "batch_size": 100,
    "ai_analysis": true,
    "resumable": true
  },
  "capabilities": {
    "analyze_descriptions": true,
    "filter_nsfw": true,
    "batch_processing": true,
    "resume_on_interrupt": true,
    "export_formats": ["TXT", "JSON"]
  },
  "execution": {
    "command": "python3 recheck_non_related.py",
    "directory": "one-time-scripts/reddit-analysis",
    "runtime": "~30min for 1000 subreddits",
    "api_calls": "1000 (GPT-4)"
  }
}
```

## Resume Configuration

```json
{
  "interrupt_recovery": {
    "method": "Variable update",
    "variables": {
      "RESUME_FROM": "subreddit_name",
      "RESUME_INDEX": "numeric_index"
    },
    "file_location": "Script header",
    "persistence": "Manual edit required"
  }
}
```

## Output Structure

```json
{
  "output_directory": "results/",
  "file_formats": {
    "text": {
      "pattern": "self_posting_subreddits_*.txt",
      "content": "Human-readable analysis",
      "includes": ["subreddit_name", "description", "decision", "reasoning"]
    },
    "json": {
      "pattern": "recheck_results_*.json",
      "content": "Structured data",
      "schema": {
        "subreddit_id": "string",
        "name": "string",
        "is_self_posting": "boolean",
        "confidence": "float",
        "timestamp": "ISO8601"
      }
    }
  }
}
```

## Usage Guidelines

```json
{
  "when_to_run": [
    "Monthly categorization review",
    "After criteria updates",
    "Discovering missed communities",
    "Quality assurance checks"
  ],
  "prerequisites": [
    "Valid OpenAI API key",
    "Supabase credentials",
    "Python 3.11+",
    "Network access"
  ],
  "best_practices": [
    "Run during low-traffic hours",
    "Monitor API usage",
    "Review results before applying",
    "Keep backups of categorization data"
  ]
}
```

## Performance Metrics

```json
{
  "typical_run": {
    "subreddits_analyzed": 1000,
    "processing_time": "30min",
    "api_cost": "$2.50",
    "accuracy_rate": "94%",
    "false_positives": "< 5%"
  },
  "resource_usage": {
    "memory": "< 500MB",
    "cpu": "Single core",
    "network": "Minimal",
    "disk": "< 10MB output"
  }
}
```

---

_Scripts Version: 1.0.0 | Status: Utility | Updated: 2024-01-29_
_Navigate: [← api-render/](../README.md) | [→ reddit-analysis/](reddit-analysis/)_