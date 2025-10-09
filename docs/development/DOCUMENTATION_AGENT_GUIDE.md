# Documentation Agent Guide

┌─ AGENT OPERATIONS ──────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% READY         │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../INDEX.md",
  "current": "DOCUMENTATION_AGENT_GUIDE.md",
  "siblings": [
    {"path": "DOCUMENTATION_STANDARDS.md", "desc": "Rules & compliance", "status": "ENFORCED"},
    {"path": "SYSTEM_IMPROVEMENT_PLAN.md", "desc": "Technical plan", "status": "ACTIVE"}
  ],
  "related": [
    {"path": "../../ROADMAP.md", "desc": "Strategic vision", "status": "NEW"},
    {"path": "../../CLAUDE.md", "desc": "Mission control", "status": "ACTIVE"}
  ]
}
```

## What are Claude Code Agents?

```json
{
  "definition": "Background workers that autonomously execute complex multi-step tasks",
  "built_in": true,
  "setup_required": false,
  "vs_mcp": {
    "agents": "Built into Claude Code, instant availability",
    "mcp": "External servers, requires configuration",
    "choice": "Use agents for doc generation (simpler, no setup)"
  },
  "capabilities": [
    "Read and analyze multiple files",
    "Generate compliant documentation",
    "Follow detailed instructions autonomously",
    "Process 70+ files in single session",
    "Return structured results for review"
  ]
}
```

## Agent Architecture

```json
{
  "invocation": "Task tool with prompt",
  "execution": "Agent runs in background, invisible to user",
  "monitoring": "Progress available via tool output",
  "results": "Agent returns single comprehensive report",
  "stateless": "Each agent invocation is independent",
  "customization": "Full control via prompt engineering"
}
```

## Documentation Agent Use Cases

```json
{
  "primary": {
    "task": "Convert 72 non-compliant .md files to terminal/JSON style",
    "agent_type": "general-purpose",
    "input": "List of file paths + standards reference",
    "output": "Compliant .md files for review",
    "duration": "2-3h agent runtime"
  },
  "secondary": [
    {
      "task": "Generate missing documentation for new modules",
      "input": "Directory path + module context",
      "output": "Complete README.md with metrics"
    },
    {
      "task": "Update navigation JSON across all docs",
      "input": "Directory structure + current docs",
      "output": "Updated navigation blocks"
    },
    {
      "task": "Add semantic versions to unversioned docs",
      "input": "List of files + git history",
      "output": "Files with appropriate versions"
    }
  ]
}
```

## How to Spawn a Documentation Agent

### Step 1: Prepare the Context

```json
{
  "required_files": [
    "docs/development/DOCUMENTATION_STANDARDS.md",
    "docs/development/DOCUMENTATION_TEMPLATE.md",
    "List of target files (via validation script)"
  ],
  "context_gathering": {
    "command": "python3 docs/scripts/validate-docs.py --list-non-compliant",
    "output": "72 file paths",
    "additional": "Directory structure, existing metrics"
  }
}
```

### Step 2: Craft the Agent Prompt

```json
{
  "prompt_template": {
    "task_description": "Convert non-compliant .md files to terminal/JSON style per DOCUMENTATION_STANDARDS.md v2.0.0",
    "requirements": [
      "Add status box with accurate progress bars",
      "Generate navigation JSON with correct parent/siblings/children",
      "Create metrics section with real data (file counts, LOC)",
      "Use professional tone, no emojis except status",
      "Add semantic version in footer",
      "Token-efficient content (300-500 tokens target)"
    ],
    "input_format": {
      "file_list": "Array of 72 file paths",
      "standards": "Full DOCUMENTATION_STANDARDS.md content",
      "context": "Directory tree, existing metrics"
    },
    "output_format": {
      "structure": "One .md file per input file",
      "location": "docs/agent-output/[original-path]",
      "manifest": "JSON file listing all changes"
    },
    "constraints": [
      "Do not modify files outside target list",
      "Preserve git history (create new commits)",
      "Flag files requiring manual review",
      "Generate validation report"
    ]
  }
}
```

### Step 3: Invoke the Agent

```bash
## Via Claude Code interface
User: "Spawn a documentation agent to convert the 72 non-compliant files"

## Agent receives:
## - Task description
## - File list
## - Standards document
## - Directory context
## - Output requirements

## Agent executes autonomously for 2-3h
```

### Step 4: Monitor Progress (Optional)

```json
{
  "monitoring": {
    "method": "Agent reports progress milestones",
    "frequency": "Every 10 files processed",
    "visibility": "Progress shown in agent output",
    "no_interaction": "Agent runs completely autonomously"
  }
}
```

### Step 5: Review Agent Output

```json
{
  "review_process": [
    {
      "step": "Read agent's final report",
      "checks": [
        "Files processed count (should be 72)",
        "Validation results",
        "Flagged files requiring manual review"
      ]
    },
    {
      "step": "Spot-check 10 random generated files",
      "validate": [
        "Status box present and accurate",
        "Navigation JSON correct",
        "Metrics realistic",
        "Professional tone",
        "Version number present"
      ]
    },
    {
      "step": "Run validation script on agent output",
      "command": "python3 docs/scripts/validate-docs.py docs/agent-output/",
      "target": "95%+ compliance"
    },
    {
      "step": "Address edge cases",
      "action": "Manually fix flagged files",
      "typical_issues": [
        "Complex nested navigation",
        "Missing metrics data",
        "Unusual file structures"
      ]
    }
  ]
}
```

### Step 6: Merge Approved Changes

```bash
## After validation passes
$ rsync -av docs/agent-output/ ./
$ git add docs/
$ git commit -m "docs: Agent-generated compliance updates (72 files)

- Converted 72 non-compliant .md files to terminal/JSON style
- Added status boxes with progress bars
- Generated navigation JSON
- Added semantic versioning
- Achieved 95%+ documentation compliance

🤖 Generated with Claude Code Agent
Co-Authored-By: Claude <noreply@anthropic.com>"
```

## Agent Prompt Engineering Best Practices

```json
{
  "specificity": {
    "good": "Add status box with format: ┌─ [TYPE] ─┐",
    "bad": "Make the docs look nice",
    "principle": "Precise instructions = better results"
  },
  "examples": {
    "good": "Include 3 good examples from ROADMAP.md, CLAUDE.md",
    "bad": "Follow the style",
    "principle": "Show don't tell"
  },
  "constraints": {
    "good": "Do not modify files in backend/",
    "bad": "Be careful",
    "principle": "Explicit boundaries prevent errors"
  },
  "validation": {
    "good": "Run validate-docs.py on each generated file",
    "bad": "Check if it looks right",
    "principle": "Automated validation catches issues"
  },
  "error_handling": {
    "good": "If file is too complex, flag for manual review",
    "bad": "Try your best",
    "principle": "Graceful degradation maintains quality"
  }
}
```

## Common Agent Patterns

### Pattern 1: Batch File Processing

```json
{
  "scenario": "Convert 72 non-compliant docs",
  "agent_prompt": "Process each file: read current content, generate compliant version, save to output dir, track progress",
  "parallelization": "Agent processes sequentially but autonomously",
  "duration": "2-3h for 72 files"
}
```

### Pattern 2: Context-Aware Generation

```json
{
  "scenario": "Generate README.md for new module",
  "agent_prompt": "Analyze directory structure, count files, detect dependencies, generate metrics, create README with navigation",
  "intelligence": "Agent infers context from codebase",
  "accuracy": "95%+ with good prompts"
}
```

### Pattern 3: Incremental Updates

```json
{
  "scenario": "Add semantic versions to 50 docs",
  "agent_prompt": "For each file: analyze git history, determine appropriate version (MAJOR/MINOR/PATCH), add footer",
  "intelligence": "Agent uses git log to make versioning decisions",
  "review": "Spot-check 10 files to validate logic"
}
```

## Agent Limitations & Mitigations

```json
{
  "limitations": [
    {
      "issue": "May misinterpret complex navigation structures",
      "mitigation": "Provide explicit parent/sibling examples",
      "fallback": "Flag for manual review"
    },
    {
      "issue": "Cannot access external APIs for real-time metrics",
      "mitigation": "Provide pre-fetched metrics in context",
      "fallback": "Use placeholder values"
    },
    {
      "issue": "May over-optimize for token efficiency",
      "mitigation": "Set minimum content length requirements",
      "fallback": "Manual content expansion"
    },
    {
      "issue": "Cannot make subjective decisions (e.g., status)",
      "mitigation": "Provide decision rules (complete % thresholds)",
      "fallback": "Conservative defaults (ACTIVE DEV)"
    }
  ]
}
```

## Success Metrics

```json
{
  "compliance": {
    "baseline": "21.7% (20/92 files)",
    "target": "95%+ (87/92 files)",
    "measurement": "validate-docs.py --threshold 95"
  },
  "accuracy": {
    "target": "90%+ files need no manual edits",
    "measurement": "Manual review of 10 random samples"
  },
  "efficiency": {
    "baseline": "Manual: 2-3h for 5 files",
    "target": "Agent: 2-3h for 72 files",
    "improvement": "14x faster"
  },
  "quality": {
    "target": "Zero breaking changes to doc structure",
    "measurement": "Git diff review + validation"
  }
}
```

## Example Agent Session

```json
{
  "invocation": {
    "user": "Spawn documentation agent for 72 non-compliant files",
    "system": "Launching general-purpose agent with documentation generation prompt"
  },
  "agent_execution": {
    "phase_1": "Reading DOCUMENTATION_STANDARDS.md v2.0.0",
    "phase_2": "Loading 72 target files and directory context",
    "phase_3": "Processing files 1-10: dashboard/src/app/*/README.md",
    "phase_4": "Processing files 11-20: dashboard/src/components/*/README.md",
    "phase_n": "Processing files 70-72: backend/docs/*.md",
    "validation": "Running validate-docs.py on generated files"
  },
  "agent_report": {
    "summary": "Processed 72 files, 69 fully compliant, 3 flagged for review",
    "compliance": "95.8% (69/72)",
    "flagged_files": [
      "dashboard/src/app/models/[id]/README.md - complex nested navigation",
      "backend/docs/ARCHITECTURE.md - missing metrics data",
      "docs/database/SUPABASE_FUNCTIONS.md - unusual structure"
    ],
    "next_steps": "Review flagged files, run final validation, merge changes"
  }
}
```

## Quick Reference

```bash
## Validate current docs
$ python3 docs/scripts/validate-docs.py

## List non-compliant files
$ python3 docs/scripts/validate-docs.py --list-non-compliant

## Spawn agent (via Claude Code)
User: "Spawn documentation agent to convert 72 non-compliant files to terminal/JSON style per DOCUMENTATION_STANDARDS.md v2.0.0"

## Review agent output
$ ls docs/agent-output/
$ python3 docs/scripts/validate-docs.py docs/agent-output/

## Merge approved changes
$ rsync -av docs/agent-output/ ./
$ git add docs/ && git commit -m "docs: Agent-generated compliance updates"
```

## Troubleshooting

```json
{
  "issue_low_quality": {
    "symptom": "Generated docs are generic or inaccurate",
    "cause": "Insufficient context in agent prompt",
    "fix": "Provide more examples, metrics, and directory structure"
  },
  "issue_wrong_format": {
    "symptom": "Docs don't follow terminal/JSON style",
    "cause": "Agent didn't receive DOCUMENTATION_STANDARDS.md",
    "fix": "Explicitly include standards doc in prompt"
  },
  "issue_navigation_errors": {
    "symptom": "Navigation JSON has broken links",
    "cause": "Agent inferred structure incorrectly",
    "fix": "Provide explicit navigation examples, enable manual review"
  },
  "issue_timeout": {
    "symptom": "Agent stops mid-processing",
    "cause": "Too many files in single session",
    "fix": "Split into batches of 20-30 files"
  }
}
```

---

_Guide Version: 1.0.0 | Updated: 2025-10-01 | For: Claude Code Agents_
_Navigate: [← DOCUMENTATION_STANDARDS.md](DOCUMENTATION_STANDARDS.md) | [→ SYSTEM_IMPROVEMENT_PLAN.md](SYSTEM_IMPROVEMENT_PLAN.md) | [→ ROADMAP.md](../../ROADMAP.md)_
