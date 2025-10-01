# GitHub Actions + Claude Code Integration Plan

┌─ AUTOMATION BLUEPRINT ──────────────────────────────────┐
│ ● PLANNED     │ ████░░░░░░░░░░░░░░░░ 20% DESIGNED      │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "SYSTEM_IMPROVEMENT_PLAN.md",
  "current": "GITHUB_ACTIONS_CLAUDE_PLAN.md",
  "related": [
    {"path": "DOCUMENTATION_AGENT_GUIDE.md", "desc": "Agent usage patterns", "status": "ACTIVE"},
    {"path": "../../ROADMAP.md", "desc": "Strategic context", "status": "ACTIVE"},
    {"path": "../../lefthook.yml", "desc": "Local automation", "status": "NEW"}
  ]
}
```

## Executive Summary

```json
{
  "objective": "Integrate Claude Code agents into GitHub Actions for automated development tasks",
  "inspiration": "https://depot.dev/blog/claude-code-in-github-actions",
  "benefits": [
    "Automated documentation generation on every PR",
    "Parallel agent execution in CI/CD",
    "Cost-efficient ($0.02/session vs $0.04)",
    "Tag @claude in issues for automated fixes"
  ],
  "timeline": "Phase 3.5 (v3.8.5) - 4-6h implementation",
  "status": "PLANNED"
}
```

## Current State Analysis

```json
{
  "local_automation": {
    "tool": "Lefthook",
    "hooks": ["pre-commit", "pre-push", "post-checkout", "commit-msg"],
    "capabilities": [
      "Doc validation on commit",
      "TypeScript + ESLint checks",
      "Console.log detection",
      "Python formatting"
    ],
    "limitation": "Only runs locally on developer machines"
  },
  "agent_usage": {
    "current": "Manual spawning via Claude Code locally",
    "example": "Documentation agent processed 93 files",
    "limitation": "Requires developer to trigger"
  },
  "gap": "No automated agent execution in CI/CD pipeline"
}
```

## Target State

```json
{
  "github_actions": {
    "triggers": [
      "PR opened/updated",
      "Issue tagged with @claude",
      "Push to main",
      "Scheduled cron (weekly)"
    ],
    "agents": [
      "Documentation agent",
      "Code review agent",
      "Test generation agent",
      "Refactoring agent"
    ],
    "output": "Auto-commits or PR comments"
  }
}
```

## Use Case Scenarios

### Use Case 1: Auto-Documentation on PR

```json
{
  "trigger": "PR opened with 'needs-docs' label",
  "workflow": {
    "step_1": "GitHub Action detects label",
    "step_2": "Spawn Claude agent with PR context",
    "step_3": "Agent generates missing .md files",
    "step_4": "Agent validates compliance (95%+ target)",
    "step_5": "Auto-commit to PR branch",
    "step_6": "Comment with summary"
  },
  "implementation": {
    "file": ".github/workflows/auto-docs.yml",
    "agent_prompt": "Generate compliant documentation for new files in this PR",
    "validation": "Run validate-docs.py on agent output"
  },
  "benefit": "Zero manual documentation work"
}
```

### Use Case 2: @claude Issue Tagging

```json
{
  "trigger": "Issue comment contains @claude [task]",
  "workflow": {
    "step_1": "Parse @claude tag and extract task",
    "step_2": "Spawn appropriate agent (docs/code/refactor)",
    "step_3": "Agent performs task autonomously",
    "step_4": "Create PR with changes",
    "step_5": "Link PR to original issue"
  },
  "examples": [
    {"tag": "@claude docs", "action": "Generate/update documentation"},
    {"tag": "@claude fix types", "action": "Fix TypeScript errors"},
    {"tag": "@claude refactor", "action": "Suggest refactorings"}
  ],
  "benefit": "Natural language task delegation to AI"
}
```

### Use Case 3: Weekly Documentation Audit

```json
{
  "trigger": "Cron schedule (every Sunday 00:00 UTC)",
  "workflow": {
    "step_1": "Run validate-docs.py on entire codebase",
    "step_2": "If compliance <90%, spawn agent",
    "step_3": "Agent fixes non-compliant files",
    "step_4": "Create PR: 'Weekly docs audit'",
    "step_5": "Notify team via Slack/Discord"
  },
  "benefit": "Continuous documentation hygiene"
}
```

### Use Case 4: New Component Auto-Doc

```json
{
  "trigger": "New .tsx file created in components/",
  "workflow": {
    "step_1": "Detect new component via git diff",
    "step_2": "Spawn agent with component analysis",
    "step_3": "Generate README.md with usage, props, examples",
    "step_4": "Add navigation links",
    "step_5": "Commit alongside component"
  },
  "benefit": "Components always have up-to-date docs"
}
```

## Implementation Plan

### Phase 3.5.1: GitHub App Setup (1h)

```json
{
  "tasks": [
    {
      "id": "GHA-101",
      "task": "Install Claude GitHub App on repository",
      "steps": [
        "Visit github.com/apps/claude",
        "Install on b9_dashboard repo",
        "Grant required permissions",
        "Test with @claude comment"
      ]
    },
    {
      "id": "GHA-102",
      "task": "Configure workflow permissions",
      "permissions": [
        "contents: write (for commits)",
        "pull-requests: write (for PR comments)",
        "issues: write (for issue comments)"
      ]
    }
  ]
}
```

### Phase 3.5.2: Basic Workflow (2h)

```json
{
  "workflow_file": ".github/workflows/claude-docs.yml",
  "triggers": ["pull_request", "issue_comment"],
  "jobs": {
    "auto-docs": {
      "runs-on": "ubuntu-latest",
      "steps": [
        "Checkout code",
        "Setup Claude Code CLI",
        "Detect changes requiring docs",
        "Spawn documentation agent",
        "Validate output",
        "Commit changes",
        "Comment on PR"
      ]
    }
  }
}
```

### Phase 3.5.3: Agent Integration (2h)

```json
{
  "agent_invocation": {
    "method": "Claude Code CLI in GitHub Actions",
    "prompt_source": "docs/agent-output/agent-prompt.txt (template)",
    "context_injection": [
      "PR diff",
      "Changed files list",
      "DOCUMENTATION_STANDARDS.md",
      "Validation results"
    ]
  },
  "output_handling": {
    "success": "Auto-commit to PR branch",
    "failure": "Comment on PR with errors",
    "partial": "Commit successful files, flag issues"
  }
}
```

### Phase 3.5.4: Depot Runners (Optional, 30m)

```json
{
  "upgrade": "Use Depot GitHub Actions runners",
  "benefits": {
    "speed": "Faster builds",
    "cost": "$0.02 per session (vs $0.04 standard)",
    "efficiency": "Better for parallel agent execution"
  },
  "implementation": {
    "runs-on": "depot-ubuntu-latest",
    "config": "Add depot.yml configuration"
  }
}
```

## Workflow Templates

### Template 1: Auto-Documentation

```yaml
## .github/workflows/auto-docs.yml
name: Auto-Documentation

on:
  pull_request:
    types: [opened, synchronize, labeled]
  issue_comment:
    types: [created]

jobs:
  generate-docs:
    if: |
      (github.event_name == 'pull_request' && contains(github.event.pull_request.labels.*.name, 'needs-docs')) ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '@claude docs'))

    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}

      - name: Setup Claude Code
        run: |
          # Install Claude Code CLI
          # Configure API key from secrets

      - name: Detect files needing docs
        id: detect
        run: |
          python3 docs/scripts/validate-docs.py --list-non-compliant > files.txt
          echo "files=$(cat files.txt | wc -l)" >> $GITHUB_OUTPUT

      - name: Generate documentation
        if: steps.detect.outputs.files > 0
        run: |
          # Spawn Claude agent with prompt
          # Agent generates compliant docs
          # Validate output

      - name: Commit changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "docs: Auto-generated documentation

🤖 Generated by Claude Code Agent via GitHub Actions"

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Documentation generated successfully'
            })
```

### Template 2: Weekly Audit

```yaml
## .github/workflows/weekly-audit.yml
name: Weekly Documentation Audit

on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at midnight UTC

jobs:
  audit-docs:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Run compliance check
        id: audit
        run: |
          python3 docs/scripts/validate-docs.py --json > report.json
          COMPLIANCE=$(jq '.summary.compliance_rate' report.json)
          echo "compliance=$COMPLIANCE" >> $GITHUB_OUTPUT

      - name: Fix non-compliant docs
        if: steps.audit.outputs.compliance < 90
        run: |
          # Spawn Claude agent
          # Generate fixes

      - name: Create PR
        uses: peter-evans/create-pull-request@v5
        with:
          title: "docs: Weekly compliance audit"
          body: "Automated documentation fixes"
          branch: "automated/docs-audit"
```

## Cost Analysis

```json
{
  "github_actions_minutes": {
    "free_tier": "2000 min/month",
    "typical_run": "3-5 minutes",
    "runs_per_month": "~100 PRs + 4 cron",
    "total_minutes": "~520 minutes",
    "cost": "Within free tier"
  },
  "claude_api": {
    "cost_per_session": "$0.02 (with Depot runners)",
    "sessions_per_month": "~100",
    "total_cost": "$2.00/month"
  },
  "total_monthly_cost": "$2.00",
  "roi": {
    "time_saved": "~10h documentation work",
    "value_at_$50_per_hour": "$500",
    "roi_multiple": "250x"
  }
}
```

## Risk Mitigation

```json
{
  "risks": [
    {
      "risk": "Agent generates incorrect documentation",
      "probability": "Medium",
      "mitigation": [
        "Always validate with validate-docs.py",
        "Require PR review before merge",
        "Flag suspicious changes for manual review"
      ]
    },
    {
      "risk": "API rate limits or costs spike",
      "probability": "Low",
      "mitigation": [
        "Set max runs per day limit",
        "Monitor costs via GitHub billing",
        "Fail gracefully if quota exceeded"
      ]
    },
    {
      "risk": "Workflow permissions too broad",
      "probability": "Low",
      "mitigation": [
        "Use minimal required permissions",
        "Review commits from bot",
        "Require approval for sensitive changes"
      ]
    }
  ]
}
```

## Success Metrics

```json
{
  "kpis": {
    "automation_rate": {
      "target": "80% of PRs get auto-docs",
      "measurement": "Count PRs with bot commits"
    },
    "compliance": {
      "target": "95%+ maintained automatically",
      "measurement": "Weekly audit results"
    },
    "response_time": {
      "target": "<10 minutes from PR open to docs commit",
      "measurement": "Workflow duration"
    },
    "manual_effort": {
      "target": "90% reduction in manual doc writing",
      "measurement": "Developer survey"
    }
  }
}
```

## Next Steps

```json
{
  "immediate": [
    {"task": "Install Claude GitHub App", "owner": "User", "eta": "10m"},
    {"task": "Create .github/workflows/claude-docs.yml", "owner": "Claude", "eta": "30m"},
    {"task": "Test with sample PR", "owner": "Both", "eta": "20m"}
  ],
  "short_term": [
    {"task": "Deploy to production", "eta": "1 week"},
    {"task": "Monitor for issues", "eta": "Ongoing"},
    {"task": "Iterate based on feedback", "eta": "2 weeks"}
  ],
  "long_term": [
    {"task": "Expand to code review agents", "eta": "1 month"},
    {"task": "Add test generation agents", "eta": "2 months"},
    {"task": "Full CI/CD agent integration", "eta": "3 months"}
  ]
}
```

## References

```json
{
  "documentation": [
    "https://depot.dev/blog/claude-code-in-github-actions",
    "https://docs.github.com/en/actions",
    "https://docs.claude.com/en/docs/claude-code/mcp"
  ],
  "related_docs": [
    "docs/development/DOCUMENTATION_AGENT_GUIDE.md",
    "docs/development/SYSTEM_IMPROVEMENT_PLAN.md",
    "ROADMAP.md"
  ]
}
```

---

_Plan Version: 1.0.0 | Updated: 2025-10-01 | Phase: 3.5 (v3.8.5)_
_Navigate: [← SYSTEM_IMPROVEMENT_PLAN.md](SYSTEM_IMPROVEMENT_PLAN.md) | [→ DOCUMENTATION_AGENT_GUIDE.md](DOCUMENTATION_AGENT_GUIDE.md) | [→ ROADMAP.md](../../ROADMAP.md)_
