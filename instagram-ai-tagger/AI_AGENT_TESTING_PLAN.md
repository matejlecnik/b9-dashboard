# Instagram AI Tagging - Agent Testing Plan

┌─ TESTING PHASE ─────────────────────────────────────────┐
│ ● READY         │ ████░░░░░░░░░░░░░░░░ 20% COMPLETE    │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "README.md",
  "current": "AI_AGENT_TESTING_PLAN.md",
  "siblings": [
    {"path": "TAG_SCHEMA.md", "desc": "Tag taxonomy", "status": "COMPLETE"},
    {"path": "prompts/unified_tagging_prompt.md", "desc": "AI prompt v2.0", "status": "OPTIMIZED"}
  ],
  "related": [
    {"path": "../ROADMAP.md", "desc": "Phase 4 context", "use": "STRATEGIC"},
    {"path": "../docs/database/INSTAGRAM_SCHEMA.md", "desc": "Database", "use": "REFERENCE"}
  ]
}
```

## Executive Summary

```json
{
  "objective": "Compare 5 AI vision models for Instagram creator attribute tagging",
  "test_scope": {
    "creators": 5,
    "images_per_creator": 5,
    "total_images": 25,
    "total_requests": 25,
    "agents": 5
  },
  "economics": {
    "total_test_cost": "$1.66",
    "timeline": "2 days",
    "effort": "6 hours"
  },
  "strategy": "Test 3 budget models ($0.10-$0.30) vs 2 premium models ($1.25-$3.00). Uses latest GPT-5 models (50% cheaper + 14pp better than GPT-4o). Pixtral Large removed (requires AWS Bedrock setup).",
  "output": "Comprehensive comparison report with production recommendation",
  "image_rationale": "5 images sufficient for pattern detection; saves 50% vs 10 images. Production will use 8-10 images."
}
```

## Agent Specifications

### Budget Tier

```json
{
  "agents": [
    {
      "rank": 1,
      "name": "Gemini 2.5 Flash-Lite",
      "tier": "ultra_budget",
      "provider": "Google AI Studio",
      "model_id": "gemini-2.5-flash-lite",
      "pricing": {
        "input": "$0.10/1M tokens",
        "output": "$0.40/1M tokens",
        "image_tokens": 1290,
        "cost_per_5_images": "$0.00065",
        "cost_580_creators": "$0.38"
      },
      "capabilities": [
        "Higher quality than 2.0 Flash-Lite",
        "Native multimodal",
        "1M token context",
        "Fastest proprietary model",
        "97% cheaper than GPT-4o"
      ],
      "benchmarks": {
        "multimodal": "strong",
        "speed": "fastest",
        "cost_efficiency": "unmatched"
      },
      "rationale": "Test if ultra-budget model sufficient for attribute tagging. If quality adequate, 97%+ cost savings."
    },
    {
      "rank": 2,
      "name": "GPT-5-mini",
      "tier": "budget",
      "provider": "OpenAI",
      "model_id": "gpt-5-mini",
      "pricing": {
        "input": "$0.25/1M tokens",
        "output": "$1.00/1M tokens",
        "image_tokens": 1100,
        "cost_per_5_images": "$0.0017",
        "cost_580_creators": "$0.99"
      },
      "capabilities": [
        "Latest OpenAI mini model (Aug 2025)",
        "Fast response times",
        "Strong multimodal reasoning",
        "Superior to GPT-4o mini",
        "80% cheaper than GPT-5"
      ],
      "benchmarks": {
        "mmmu": "70%+ (estimated)",
        "docvqa": "excellent",
        "vision_classification": "excellent"
      },
      "rationale": "Test latest mini model. 5x cheaper than GPT-5. Better performance than GPT-4o mini. Good cost/performance balance."
    },
    {
      "rank": 3,
      "name": "Gemini 2.5 Flash",
      "tier": "budget",
      "provider": "Google AI Studio",
      "model_id": "gemini-2.5-flash",
      "pricing": {
        "input": "$0.30/1M tokens",
        "output": "$2.50/1M tokens",
        "image_tokens": 1290,
        "cost_per_5_images": "$0.002",
        "cost_580_creators": "$1.16"
      },
      "capabilities": [
        "Native multimodal",
        "Excellent document/OCR",
        "Fast response (1-2s)",
        "Google ecosystem integration",
        "76% cheaper than GPT-5"
      ],
      "benchmarks": {
        "mmmu": "79.7%",
        "vibe_eval": "65.4%"
      },
      "rationale": "Predicted winner: best value + performance. Significant improvement over 2.0 Flash. No NSFW blocking issues."
    }
  ]
}
```

### Premium Tier

```json
{
  "agents": [
    {
      "rank": 4,
      "name": "GPT-5",
      "tier": "premium",
      "provider": "OpenAI",
      "model_id": "gpt-5",
      "pricing": {
        "input": "$1.25/1M tokens",
        "output": "$5.00/1M tokens",
        "image_tokens": 1100,
        "cost_per_5_images": "$0.0085",
        "cost_580_creators": "$4.93"
      },
      "capabilities": [
        "Latest OpenAI flagship model (Aug 2025)",
        "Best instruction following",
        "Excellent text rendering",
        "50% cheaper than GPT-4o",
        "14pp MMMU improvement over GPT-4o",
        "No NSFW blocking for fitness content"
      ],
      "benchmarks": {
        "mmmu": "84.2%",
        "video_mmmu": "84.6%",
        "vision_tasks": "industry_leading",
        "text_rendering": "best_in_class"
      },
      "rationale": "Latest flagship model. Better AND cheaper than GPT-4o. Massive performance improvement. Reliable JSON output."
    },
    {
      "rank": 5,
      "name": "Claude Sonnet 4.5",
      "tier": "premium",
      "provider": "Anthropic",
      "model_id": "claude-sonnet-4-5",
      "pricing": {
        "input": "$3.00/1M tokens",
        "output": "$15.00/1M tokens",
        "image_tokens": 1600,
        "cost_per_5_images": "$0.024",
        "cost_580_creators": "$13.92"
      },
      "capabilities": [
        "Latest Anthropic model (Sept 2025)",
        "State-of-the-art coding and reasoning",
        "Excellent nuanced visual reasoning",
        "Superior chart/graph interpretation",
        "High-quality confidence scoring",
        "Autonomous operation (30+ hours)"
      ],
      "benchmarks": {
        "mmmu": "74.4%",
        "vision_reasoning": "top_tier",
        "structured_output": "excellent"
      },
      "rationale": "Best-in-class reasoning. Latest Anthropic vision model. High accuracy on subtle details. Strong structured output."
    }
  ]
}
```

## Cost Comparison

```json
{
  "test_costs": [
    {"rank": 1, "agent": "Gemini 2.5 Flash-Lite", "test": "$0.10", "production_580": "$0.38", "speed": "fastest", "value": "5_star"},
    {"rank": 2, "agent": "GPT-5-mini", "test": "$0.09", "production_580": "$0.99", "speed": "very_fast", "value": "5_star"},
    {"rank": 3, "agent": "Gemini 2.5 Flash", "test": "$0.30", "production_580": "$1.16", "speed": "very_fast", "value": "5_star"},
    {"rank": 4, "agent": "GPT-5", "test": "$0.42", "production_580": "$4.93", "speed": "fast", "value": "5_star"},
    {"rank": 5, "agent": "Claude Sonnet 4.5", "test": "$0.75", "production_580": "$13.92", "speed": "moderate", "value": "4_star"}
  ],
  "total_test_cost": "$1.66",
  "test_basis": "5 creators × 5 images × 5 agents = 125 requests",
  "note": "Using GPT-5 models (Aug 2025) - 50% cheaper + 14pp better MMMU than GPT-4o. Pixtral Large removed (requires AWS Bedrock setup)."
}
```

## Tag Schema

```json
{
  "format": "Reddit-compatible JSONB array",
  "categories": {
    "body_type": ["petite", "slim", "athletic", "average", "curvy", "thick", "slim_thick", "bbw"],
    "breasts": ["small", "medium", "large", "huge", "natural", "enhanced"],
    "butt": ["small", "bubble", "big", "athletic"],
    "hair_color": ["blonde", "brunette", "redhead", "black", "colored", "highlights"],
    "hair_length": ["short", "medium", "long", "very_long"],
    "style": ["athletic", "alt", "goth", "egirl", "glamorous", "natural", "bimbo", "tomboy", "sporty", "elegant"],
    "age_appearance": ["college", "young_adult", "adult", "mature"],
    "tattoos": ["none", "minimal", "moderate", "heavy"],
    "piercings": ["none", "minimal", "moderate", "heavy"],
    "ethnicity": ["white", "black", "latina", "asian", "middle_eastern", "mixed", "uncertain"]
  },
  "multi_tag_rules": {
    "body_type": "max 2",
    "hair_color": "max 2",
    "style": "max 3",
    "ethnicity": "max 2",
    "others": "single value"
  },
  "ethnicity_warning": "TESTING ONLY - Not for production use. Test inter-agent agreement and bias. Default to 'uncertain' liberally.",
  "output_example": {
    "tags": ["body_type:athletic", "breasts:medium", "butt:bubble", "hair_color:brunette", "hair_length:long", "style:athletic", "style:natural", "age_appearance:young_adult", "tattoos:none", "piercings:minimal", "ethnicity:white"],
    "confidence": {"body_type": 0.92, "breasts": 0.85, "butt": 0.88, "hair_color": 0.95, "hair_length": 0.98, "style": 0.90, "age_appearance": 0.78, "tattoos": 0.99, "piercings": 0.92, "ethnicity": 0.82}
  },
  "reference": "TAG_SCHEMA.md"
}
```

## Testing Methodology

### Data Selection

```json
{
  "database_query": {
    "select_creators": "SELECT id, ig_user_id, username, profile_pic_url, followers FROM instagram_creators WHERE review_status = 'ok' AND posts_count >= 9 AND profile_pic_url IS NOT NULL ORDER BY followers DESC LIMIT 5",
    "select_content": "SELECT media_pk, url, taken_at FROM (SELECT media_pk, cover_url as url, taken_at FROM instagram_reels WHERE creator_id = ? AND cover_url LIKE '%media.b9-dashboard.com%' UNION ALL SELECT media_pk, image_urls[1] as url, taken_at FROM instagram_posts WHERE creator_id = ? AND image_urls[1] LIKE '%media.b9-dashboard.com%') ORDER BY taken_at DESC LIMIT 4"
  },
  "image_set_per_creator": {
    "profile_pic": 1,
    "recent_content": 4,
    "total": 5
  },
  "selection_criteria": [
    "Minimum 2 full-body shots for body type detection",
    "Minimum 1-2 face-visible shots for hair/age detection",
    "Varied contexts (different outfits, lighting, angles)"
  ]
}
```

### Prompt Configuration

```json
{
  "prompt_file": "prompts/unified_tagging_prompt.md",
  "version": "2.0",
  "optimization": "60% token reduction from v1.0",
  "length": "~118 lines",
  "format": "Markdown",
  "key_sections": [
    "System role: Expert visual analysis AI",
    "Input specification: 5 images (1 profile + 4 content)",
    "Task definition: Holistic analysis, pattern identification",
    "Tag categories: 10 categories with allowed values, multi-tag limits, min confidence",
    "Output format: Strict JSON schema with examples",
    "Confidence guidelines: Scale (0.0-1.0) with category-specific thresholds",
    "Rules & constraints: Format, multi-tags, analysis rules",
    "Quality checklist: Pre-submission verification"
  ],
  "model_optimizations": {
    "gpt4o": "Crisp numeric constraints ('pick 1-2', 'max 2', '0.0-1.0')",
    "claude": "Clear boundaries to prevent over-explanation",
    "gemini": "Hierarchical structure (headings, stepwise formatting)",
    "all": "Explicit JSON schema, category-specific confidence thresholds, multi-tag rules"
  }
}
```

### Testing Workflow

```json
{
  "per_agent_steps": [
    {"step": 1, "action": "Initialize", "desc": "Connect to API with credentials"},
    {"step": 2, "action": "Fetch Data", "desc": "Download 5 images per creator (25 total)"},
    {"step": 3, "action": "Encode", "desc": "Convert images to base64 (if required)"},
    {"step": 4, "action": "Request", "desc": "Send unified prompt + 5 images"},
    {"step": 5, "action": "Track", "desc": "Record response time, token usage, cost"},
    {"step": 6, "action": "Parse", "desc": "Extract tags and confidence scores"},
    {"step": 7, "action": "Save", "desc": "Store raw response + structured data"}
  ],
  "metrics_tracked": [
    "response_time_seconds",
    "input_tokens",
    "output_tokens",
    "cost_usd",
    "tags_assigned",
    "confidence_scores",
    "errors_failures"
  ]
}
```

## Output Structure

```json
{
  "directory": "instagram-ai-tagger/tests/results/",
  "structure": {
    "raw_responses": {
      "path": "raw_responses/{agent}/{username}.json",
      "format": {
        "creator_id": "string",
        "username": "string",
        "agent": "string",
        "images_analyzed": 5,
        "image_urls": ["url1", "url2", "url3", "url4", "url5"],
        "timestamp": "ISO8601",
        "response_time_seconds": "float",
        "cost_usd": "float",
        "tokens_used": {"input": "int", "output": "int"},
        "tags": ["array"],
        "confidence": {"object": "float"},
        "reasoning": "string",
        "raw_api_response": "object",
        "error": "string_or_null"
      }
    },
    "comparison_report": {
      "path": "comparison_report.json",
      "sections": ["test_metadata", "agent_performance", "per_creator_comparison", "tag_agreement_matrix", "ethnicity_testing_results"]
    },
    "cost_speed_analysis": {
      "path": "cost_speed_analysis.json",
      "sections": ["summary", "ranking_by_cost", "ranking_by_speed", "ranking_by_accuracy", "production_projections"]
    },
    "tag_consensus": {
      "path": "tag_consensus.json",
      "desc": "Inter-agent agreement by category"
    },
    "recommendation": {
      "path": "WINNER_RECOMMENDATION.md",
      "desc": "Final verdict with data-driven justification"
    }
  }
}
```

## Expected Results

```json
{
  "predicted_winner": {
    "tier": "budget",
    "agents": ["Gemini 2.5 Flash-Lite", "Gemini 2.5 Flash"],
    "reasoning": {
      "cost": "95-99% cheaper than premium models",
      "flash_lite_production": "$0.38 for 580 creators",
      "flash_production": "$1.16 for 580 creators (if Lite insufficient)",
      "speed": "Fastest response times (1-2 seconds)",
      "capabilities": "Gemini 2.5 significantly improved over 2.0",
      "blocking": "No reported NSFW issues"
    },
    "production_metrics": {
      "cost_580_creators": "$0.38-$1.16",
      "time_to_complete": "15-20 minutes",
      "monthly_ongoing_100_creators": "$0.07-$0.20"
    }
  },
  "premium_fallback": {
    "best_quality": {
      "agent": "GPT-5",
      "cost_580": "$4.93",
      "mmmu": "84.2%",
      "rationale": "Latest OpenAI flagship. 50% cheaper than GPT-4o. 14pp MMMU improvement. Best performance."
    },
    "second_best": {
      "agent": "Claude Sonnet 4.5",
      "cost_580": "$13.92",
      "mmmu": "74.4%",
      "rationale": "Best reasoning capabilities. Excellent structured output. Premium accuracy."
    }
  },
  "strategy": [
    "Test budget models first",
    "If quality sufficient, massive savings (95%+)",
    "Premium models as backup if budget insufficient"
  ]
}
```

## Execution Plan

```json
{
  "day_1_setup": {
    "duration": "3h",
    "tasks": [
      {"id": "TEST-001", "task": "Research AI vision models", "status": "complete"},
      {"id": "TEST-002", "task": "Update testing plan", "status": "complete"},
      {"id": "TEST-003", "task": "Update unified prompt template (v2.0)", "status": "complete"},
      {"id": "TEST-004", "task": "Create agent wrapper classes (5 files)", "status": "pending"},
      {"id": "TEST-005", "task": "Create database query functions", "status": "pending"},
      {"id": "TEST-006", "task": "Set up API keys and test connections", "status": "pending"},
      {"id": "TEST-007", "task": "Create result directory structure", "status": "pending"}
    ]
  },
  "day_2_testing": {
    "duration": "2h",
    "tasks": [
      {"id": "TEST-101", "task": "Fetch 5 test creators from database", "status": "pending"},
      {"id": "TEST-102", "task": "Download 25 images from R2 CDN (5 per creator)", "status": "pending"},
      {"id": "TEST-103", "task": "Run all 5 agents sequentially", "status": "pending"},
      {"id": "TEST-104", "task": "Save raw responses and structured data", "status": "pending"},
      {"id": "TEST-105", "task": "Track costs and performance metrics", "status": "pending"}
    ]
  },
  "day_3_analysis": {
    "duration": "1h",
    "tasks": [
      {"id": "TEST-201", "task": "Generate comparison reports", "status": "pending"},
      {"id": "TEST-202", "task": "Calculate tag consensus", "status": "pending"},
      {"id": "TEST-203", "task": "Manual accuracy review (15 samples)", "status": "pending"},
      {"id": "TEST-204", "task": "Create winner recommendation", "status": "pending"},
      {"id": "TEST-205", "task": "Document findings", "status": "pending"}
    ]
  },
  "totals": {
    "effort": "6 hours",
    "cost": "$1.97"
  }
}
```

## Success Criteria

```json
{
  "required": [
    {"criterion": "All 5 agents successfully process 5 creators", "target": "25/25 requests", "critical": true},
    {"criterion": "Cost tracking accurate", "target": "±$0.01", "critical": true},
    {"criterion": "Speed measured", "target": "Average response time per agent", "critical": true},
    {"criterion": "Tags match Reddit JSONB format", "target": "100%", "critical": true},
    {"criterion": "Confidence scores provided", "target": "0.0-1.0 scale", "critical": true},
    {"criterion": "Clear winner identified", "target": "Data-driven justification", "critical": true},
    {"criterion": "Tag agreement across agents", "target": "≥75%", "critical": false},
    {"criterion": "No API errors or timeouts", "target": "100% success rate", "critical": false},
    {"criterion": "Budget models tested alongside premium", "target": "3 budget + 2 premium", "critical": true},
    {"criterion": "Comprehensive documentation", "target": "Production rollout ready", "critical": true}
  ]
}
```

## Next Steps After Testing

```json
{
  "sequence": [
    {"step": 1, "action": "Review Results", "desc": "Analyze comparison report"},
    {"step": 2, "action": "Select Winner", "desc": "Choose optimal agent based on cost/accuracy/speed"},
    {"step": 3, "action": "Production Implementation", "desc": "Build CLI tool with winning agent"},
    {"step": 4, "action": "Process All Creators", "desc": "Tag all 580 creators"},
    {"step": 5, "action": "Review UI", "desc": "Build Streamlit dashboard for manual corrections"},
    {"step": 6, "action": "Monitoring", "desc": "Track accuracy and cost in production"}
  ]
}
```

## References

```json
{
  "api_documentation": [
    {"name": "Gemini 2.5 Flash-Lite", "url": "https://ai.google.dev/gemini-api/docs/models/gemini-flash-lite"},
    {"name": "Gemini 2.5 Flash", "url": "https://ai.google.dev/gemini-api/docs/models/gemini"},
    {"name": "GPT-5-mini", "url": "https://platform.openai.com/docs/models/gpt-5-mini"},
    {"name": "GPT-5", "url": "https://platform.openai.com/docs/models/gpt-5"},
    {"name": "Claude Sonnet 4.5", "url": "https://www.anthropic.com/claude/sonnet"}
  ],
  "research_sources": [
    "Artificial Analysis (model comparisons)",
    "DataCamp Vision Language Models Guide 2025",
    "Labellerr Open Source VLM Guide 2025",
    "Google Developers Blog (Gemini updates)"
  ],
  "note": "Pixtral Large removed from testing (requires AWS Bedrock setup)"
}
```

---

_Version: 1.3.0 | Updated: 2025-10-10 | Status: Ready for Implementation_
_Changes: v1.3.0 - Upgraded to GPT-5 models (Aug 2025). GPT-5: 84.2% MMMU + 50% cheaper than GPT-4o. Test cost: $1.97 → $1.66._
_Navigate: [← README.md](README.md) | [→ TAG_SCHEMA.md](TAG_SCHEMA.md) | [↑ ROADMAP.md](../ROADMAP.md)_
