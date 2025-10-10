# Instagram AI Tagging System

┌─ ACTIVE DEVELOPMENT ────────────────────────────────────┐
│ ● TESTING PHASE │ ████░░░░░░░░░░░░░░░░ 20% COMPLETE    │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../docs/INDEX.md",
  "current": "instagram-ai-tagger/README.md",
  "children": [
    {"path": "AI_AGENT_TESTING_PLAN.md", "desc": "6-agent comparison plan", "status": "READY"},
    {"path": "TAG_SCHEMA.md", "desc": "Complete tag taxonomy", "status": "READY"},
    {"path": "prompts/unified_tagging_prompt.md", "desc": "AI vision prompt", "status": "OPTIMIZED"}
  ],
  "related": [
    {"path": "../ROADMAP.md", "desc": "Phase 4 context", "use": "STRATEGIC"},
    {"path": "../docs/database/INSTAGRAM_SCHEMA.md", "desc": "Database structure", "use": "REFERENCE"}
  ]
}
```

## System Metrics

```json
{
  "status": "planning_complete",
  "agents_selected": 5,
  "test_cost": "$1.66",
  "production_cost_range": "$0.38-$13.92",
  "target_creators": 580,
  "images_per_creator": 5,
  "tag_categories": 10,
  "tag_values": 57,
  "prompt_version": "2.0",
  "prompt_optimization": "60% token reduction",
  "note": "Using GPT-5 models (Aug 2025) - 50% cheaper + 14pp better than GPT-4o"
}
```

## Purpose

Automated visual attribute tagging for Instagram creators using AI vision models. Compare 5 production-ready APIs (Gemini, GPT-5, Claude) to determine optimal cost/accuracy balance.

**Target Attributes:**
```json
{
  "physical": ["body_type", "breasts", "butt", "hair_color", "hair_length"],
  "style": ["style", "age_appearance", "tattoos", "piercings"],
  "experimental": ["ethnicity"]
}
```

## Architecture

```json
{
  "components": {
    "agent_wrappers": {
      "status": "pending",
      "files": 5,
      "apis": ["Gemini Flash-Lite", "Gemini Flash", "GPT-5-mini", "GPT-5", "Claude 4.5"]
    },
    "prompt_system": {
      "status": "complete",
      "version": "2.0",
      "optimization": "60% token reduction",
      "images": 5
    },
    "testing_framework": {
      "status": "pending",
      "test_creators": 5,
      "total_requests": 25,
      "metrics": ["cost", "speed", "accuracy", "agreement"]
    },
    "tag_schema": {
      "status": "complete",
      "categories": 10,
      "values": 57,
      "format": "Reddit-compatible JSONB"
    }
  }
}
```

## Execution Plan

```json
{
  "phase_1_planning": {
    "status": "complete",
    "timeline": "2025-10-10",
    "tasks": [
      {"id": "AI-001", "task": "Research vision models", "progress": 100},
      {"id": "AI-002", "task": "Define tag schema", "progress": 100},
      {"id": "AI-003", "task": "Create testing plan", "progress": 100},
      {"id": "AI-004", "task": "Optimize prompt", "progress": 100}
    ]
  },
  "phase_2_implementation": {
    "status": "pending",
    "timeline": "TBD",
    "tasks": [
      {"id": "AI-101", "task": "Create agent wrapper classes", "effort": "3h"},
      {"id": "AI-102", "task": "Database query functions", "effort": "1h"},
      {"id": "AI-103", "task": "Testing framework", "effort": "2h"},
      {"id": "AI-104", "task": "Result analysis tools", "effort": "1h"}
    ]
  },
  "phase_3_testing": {
    "status": "blocked",
    "timeline": "TBD",
    "blockers": ["Implementation incomplete"],
    "tasks": [
      {"id": "AI-201", "task": "Run 6-agent comparison", "effort": "2h"},
      {"id": "AI-202", "task": "Analyze results", "effort": "1h"},
      {"id": "AI-203", "task": "Select production agent", "effort": "30m"}
    ]
  },
  "phase_4_production": {
    "status": "blocked",
    "timeline": "TBD",
    "tasks": [
      {"id": "AI-301", "task": "Tag 580 creators", "effort": "Automated"},
      {"id": "AI-302", "task": "Manual review", "effort": "4h"},
      {"id": "AI-303", "task": "Deploy to database", "effort": "1h"}
    ]
  }
}
```

## Agent Comparison Matrix

```json
{
  "budget_tier": [
    {
      "rank": 1,
      "name": "Gemini 2.5 Flash-Lite",
      "cost_580_creators": "$0.38",
      "speed": "fastest",
      "benchmark_mmmu": "N/A",
      "prediction": "winner_if_sufficient_quality"
    },
    {
      "rank": 2,
      "name": "GPT-5-mini",
      "cost_580_creators": "$0.99",
      "speed": "very_fast",
      "benchmark_mmmu": "70%+",
      "prediction": "strong_contender"
    },
    {
      "rank": 3,
      "name": "Gemini 2.5 Flash",
      "cost_580_creators": "$1.16",
      "speed": "very_fast",
      "benchmark_mmmu": "79.7%",
      "prediction": "best_value"
    }
  ],
  "premium_tier": [
    {
      "rank": 4,
      "name": "GPT-5",
      "cost_580_creators": "$4.93",
      "benchmark_mmmu": "84.2%",
      "use_case": "best_performance"
    },
    {
      "rank": 5,
      "name": "Claude Sonnet 4.5",
      "cost_580_creators": "$13.92",
      "benchmark_mmmu": "74.4%",
      "use_case": "best_reasoning"
    }
  ],
  "removed": [
    {
      "name": "Pixtral Large",
      "reason": "Requires AWS Bedrock setup (not configured)"
    }
  ]
}
```

## Commands

```bash
# Testing (pending implementation)
$ python test_api_connections.py           # Test all API connections
$ python run_agent_comparison.py           # Run full 5-agent test
$ python analyze_results.py                # Generate comparison report

# Development
$ pip install -r requirements.txt          # Install dependencies
$ export OPENAI_API_KEY=sk-...            # Configure API keys
$ export GOOGLE_API_KEY=...
$ export ANTHROPIC_API_KEY=...

# Database
$ psql $DATABASE_URL -f queries/get_test_creators.sql
```

## File Structure

```
instagram-ai-tagger/
├── README.md                              # This file
├── AI_AGENT_TESTING_PLAN.md              # Comprehensive test plan
├── TAG_SCHEMA.md                          # Complete tag taxonomy
├── requirements.txt                       # Python dependencies
├── test_api_connections.py                # API connection test script
├── prompts/
│   └── unified_tagging_prompt.md         # Optimized v2.0 prompt
├── agents/ (pending)
│   ├── gemini_flash_lite.py
│   ├── gemini_flash.py
│   ├── gpt5_mini.py
│   ├── gpt5.py
│   └── claude_sonnet45.py
└── tests/ (pending)
    ├── run_comparison.py
    ├── analyze_results.py
    └── results/
```

## Success Criteria

```json
{
  "testing": [
    {"metric": "All 5 agents complete 5 creators", "target": "25/25 requests"},
    {"metric": "Cost tracking accuracy", "target": "±$0.01"},
    {"metric": "Inter-agent tag agreement", "target": "≥75%"},
    {"metric": "Response time measurement", "target": "Per-agent average"},
    {"metric": "Zero API errors", "target": "100% success rate"}
  ],
  "production": [
    {"metric": "Winner selection", "target": "Data-driven justification"},
    {"metric": "Production deployment", "target": "580 creators tagged"},
    {"metric": "Manual review accuracy", "target": "≥90%"},
    {"metric": "Reddit JSONB compatibility", "target": "100%"}
  ]
}
```

## Dependencies

```json
{
  "python": "3.9+",
  "apis": {
    "openai": "GPT-5, GPT-5-mini",
    "google": "Gemini 2.5 Flash, Flash-Lite",
    "anthropic": "Claude Sonnet 4.5"
  },
  "storage": {
    "database": "Supabase Postgres",
    "media": "Cloudflare R2 CDN"
  }
}
```

## Cost Analysis

```json
{
  "test_phase": {
    "total": "$1.66",
    "per_agent": "$0.09-$0.75",
    "images": 125
  },
  "production_projections": {
    "budget_winner": "$0.38-$1.16",
    "premium_fallback": "$4.93-$13.92",
    "monthly_ongoing": "$0.07-$0.20",
    "basis": "580 creators initial, 100 creators/month ongoing",
    "note": "Using GPT-5 models (Aug 2025) - 50% cheaper + 14pp better than GPT-4o"
  }
}
```

## Related Documentation

```json
{
  "internal": [
    {"path": "AI_AGENT_TESTING_PLAN.md", "desc": "Full test methodology"},
    {"path": "TAG_SCHEMA.md", "desc": "Tag definitions and rules"},
    {"path": "../docs/database/INSTAGRAM_SCHEMA.md", "desc": "Database structure"}
  ],
  "external": [
    {"url": "https://ai.google.dev/gemini-api/docs", "desc": "Gemini API"},
    {"url": "https://platform.openai.com/docs", "desc": "OpenAI API"},
    {"url": "https://docs.anthropic.com/claude", "desc": "Claude API"},
    {"url": "https://docs.mistral.ai/capabilities/vision/", "desc": "Pixtral API"}
  ]
}
```

---

_Version: 1.2.0 | Updated: 2025-10-10 | Status: Planning Complete_
_Changes: v1.2.0 - Upgraded to GPT-5 models (Aug 2025). 84.2% MMMU + 50% cheaper than GPT-4o. Test cost: $1.97 → $1.66._
_Navigate: [→ AI_AGENT_TESTING_PLAN.md](AI_AGENT_TESTING_PLAN.md) | [→ TAG_SCHEMA.md](TAG_SCHEMA.md) | [← ROADMAP.md](../ROADMAP.md)_
