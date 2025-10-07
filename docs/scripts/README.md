# Documentation Automation Scripts

┌─ AUTOMATION TOOLKIT ────────────────────────────────────┐
│ ● READY       │ ████████████████████ 100% IMPLEMENTED  │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../INDEX.md",
  "current": "scripts/README.md",
  "scripts": {
    "automation": ["metrics-daemon.py", "session-logger.py", "template-processor.py"],
    "search": ["doc-search.py"],
    "validation": ["validate-docs.py", "fix-headers.py"],
    "maintenance": ["cleanup-cache.sh"],
    "legacy": ["nav.sh", "generate-docs.py", "setup-hooks.sh"]
  }
}
```

## Quick Start

```bash
## Install dependencies (one-time)
pip3 install aiohttp psutil black

## Install git hooks (one-time)
lefthook install

## Everything else runs automatically via git hooks!
## Manual commands only when needed:

## Force metrics update (normally automatic)
python3 docs/scripts/automation/metrics-daemon.py

## Search documentation
python3 docs/scripts/search/doc-search.py "instagram quality"

## Rebuild search index (normally automatic)
python3 docs/scripts/search/doc-search.py --rebuild
```

## ⚡ Performance Optimized for One-Time Execution

All scripts are designed to run **once** when triggered, with **no background processes or daemons**:

- **Pre-commit**: Fast checks (< 2 seconds total)
- **Post-commit**: Quick updates (< 1 second)
- **No continuous monitoring**: Everything on-demand
- **Smart caching**: Skip if recent (< 5 min for search, < 30 min for metrics)

## 🚀 New Automation Features

### 1. One-Time Metrics Collector

**File:** `automation/metrics-daemon.py`
**Purpose:** Collects system, API, database, and git metrics when needed

```bash
## Default: Run once (automatically via git hooks)
python3 docs/scripts/automation/metrics-daemon.py

## Watch mode (NOT RECOMMENDED - requires confirmation)
python3 docs/scripts/automation/metrics-daemon.py --watch
```

**Collected Metrics:**
- System resources (CPU, memory, disk, network)
- API health and latency
- Database size and connections
- Git statistics
- Documentation compliance
- Scraper status

**Output:** `docs/data/metrics.json`

### 2. Automatic Session Logger

**File:** `automation/session-logger.py`
**Purpose:** Auto-generates SESSION_LOG.md entries from git commits

```bash
## Log last 5 commits
python3 docs/scripts/automation/session-logger.py --commits 5

## Dry run (preview without updating)
python3 docs/scripts/automation/session-logger.py --dry-run

## Archive old sessions
python3 docs/scripts/automation/session-logger.py --archive
```

**Features:**
- Analyzes commit messages
- Categorizes changes by type
- Tracks file modifications
- Auto-generates achievements

### 3. Documentation Search Engine

**File:** `search/doc-search.py`
**Purpose:** Fast full-text search across all .md files

```bash
## Search for a term
python3 docs/scripts/search/doc-search.py "quality scoring"

## Search code blocks
python3 docs/scripts/search/doc-search.py --code "def calculate"

## Get suggestions
python3 docs/scripts/search/doc-search.py --suggest "inst"

## Interactive mode
python3 docs/scripts/search/doc-search.py
```

**Features:**
- TF-IDF ranking algorithm
- Code block search
- Term suggestions
- JSON output mode
- Cached index for speed

### 4. Template Processor

**File:** `automation/template-processor.py`
**Purpose:** Injects dynamic metrics into documentation

```bash
## Process CLAUDE.md
python3 docs/scripts/automation/template-processor.py CLAUDE.md

## Process all templates
python3 docs/scripts/automation/template-processor.py --process-all

## Create template from existing file
python3 docs/scripts/automation/template-processor.py --create-template CLAUDE.md
```

**Placeholders:**
```
{{CPU_PERCENT}}      - Current CPU usage
{{MEMORY_PERCENT}}   - Current memory usage
{{API_STATUS}}       - API health status
{{DB_SIZE}}          - Database size in GB
{{DOCS_COMPLIANCE}}  - Documentation compliance %
{{GIT_BRANCH}}       - Current git branch
{{LAST_UPDATE}}      - Timestamp
```

### 5. Cache Cleanup Utility

**File:** `cleanup-cache.sh`
**Purpose:** Removes regenerable cache files and temporary artifacts

```bash
## Run cleanup (safe to run anytime)
bash docs/scripts/cleanup-cache.sh

## Or via direct execution
./docs/scripts/cleanup-cache.sh
```

**What It Cleans:**
- Python bytecode (`.pyc` files)
- Python cache directories (`__pycache__`)
- Next.js build cache (`dashboard/.next/cache/`)
- macOS system files (`.DS_Store`)
- Python validation cache in docs/scripts

**Features:**
- Shows before/after statistics
- Safe operation (all files can be regenerated)
- Zero risk to source code or data
- Helpful for troubleshooting build issues

**When to Use:**
- Monthly maintenance routine
- Before/after major dependency updates
- When experiencing build errors
- To reclaim disk space (~MB-GB depending on cache size)

## 🎯 Git Hooks Integration

### Enhanced Lefthook Configuration

**Pre-commit:**
- Documentation validation
- Metrics update
- Search index rebuild
- TypeScript checking
- ESLint fixing
- Secret detection

**Post-commit:**
- Automatic session logging
- CLAUDE.md metrics update

**Manual Commands:**
```bash
## Update all metrics
lefthook run metrics-full

## Search docs interactively
lefthook run search-docs

## Start metrics daemon
lefthook run daemon-start

## Generate documentation report
lefthook run docs-report
```

## 📊 Data Storage

```
docs/
├── data/
│   ├── metrics.json        # Real-time system metrics
│   ├── search-index.json   # Documentation search index
│   └── context.json        # Current work context
└── scripts/
    ├── automation/         # Automation scripts
    ├── search/            # Search functionality
    └── validation/        # Validation tools
```

## 🔧 Dependencies

```json
{
  "python": "3.8+",
  "packages": {
    "aiohttp": "For async HTTP requests",
    "psutil": "For system metrics",
    "black": "For Python formatting"
  },
  "optional": {
    "lefthook": "Git hooks manager",
    "ripgrep": "Fast file searching"
  }
}
```

## 📈 Performance

```json
{
  "metrics_collection": "< 2 seconds",
  "search_index_build": "< 5 seconds for 100 files",
  "search_query": "< 100ms",
  "session_log_update": "< 1 second",
  "template_processing": "< 500ms per file"
}
```

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Metrics not updating | Run `metrics-daemon.py --once` manually |
| Search not finding results | Rebuild index: `doc-search.py --rebuild` |
| Session log not updating | Check git hooks: `lefthook install` |
| Template placeholders not replaced | Ensure metrics.json exists |

## 🎯 Future Enhancements

```json
{
  "planned": [
    "Web dashboard for metrics visualization",
    "AI-powered documentation suggestions",
    "Automatic dependency graph generation",
    "Integration with Claude API for summaries",
    "Real-time collaboration features"
  ]
}
```

---

_Scripts Version: 2.0.0 | Updated: 2025-10-05 | Status: ACTIVE_
_Navigate: [← docs/](../INDEX.md) | [→ automation/](automation/) | [→ search/](search/)_