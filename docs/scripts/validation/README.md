# Code Quality Validation Scripts

┌─ CODE QUALITY ──────────────────────────────────────────┐
│ ● AUTOMATED   │ TypeScript + ESLint + Ruff + Mypy       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "validation/README.md",
  "scripts": [
    {"name": "code-quality-check.py", "desc": "Main validation runner"},
    {"name": "quality-dashboard.py", "desc": "Visual quality dashboard"}
  ],
  "configs": [
    {"path": "../../../dashboard/eslint.config.mjs", "desc": "ESLint rules"},
    {"path": "../../../dashboard/tsconfig.json", "desc": "TypeScript config"},
    {"path": "../../../api-render/ruff.toml", "desc": "Ruff linter config"},
    {"path": "../../../api-render/pyproject.toml", "desc": "Python project config"}
  ]
}
```

## Overview

Automated code quality validation system that checks:
- **TypeScript**: Type errors (`tsc --noEmit`)
- **ESLint**: Code style and potential bugs
- **Ruff**: Python linting (10-100x faster than flake8)
- **Mypy**: Python static type checking

## Quick Start

```bash
## Run full validation
python3 docs/scripts/validation/code-quality-check.py

## Quick check (skip slow checks)
python3 docs/scripts/validation/code-quality-check.py --quick

## Check specific files
python3 docs/scripts/validation/code-quality-check.py --files src/file1.ts api/file2.py

## View dashboard
python3 docs/scripts/validation/quality-dashboard.py

## Using lefthook (recommended)
lefthook run quality-check       # Full check
lefthook run quality-quick       # Quick check
lefthook run quality-dashboard   # Visual dashboard
```

## Scripts

### code-quality-check.py

**Purpose:** Main validation runner that checks all file types

**Features:**
- Runs TypeScript, ESLint, Ruff, Mypy in parallel
- JSON output for automation
- Exit codes for CI/CD integration
- Saves results to `docs/data/code-quality.json`

**Usage:**
```bash
## Full validation (all files)
python3 docs/scripts/validation/code-quality-check.py

## Quick mode (skip mypy)
python3 docs/scripts/validation/code-quality-check.py --quick

## Specific files (for git hooks)
python3 docs/scripts/validation/code-quality-check.py --files src/app.ts

## JSON output only
python3 docs/scripts/validation/code-quality-check.py --json
```

**Output:**
```
==================================================
🔍 CODE QUALITY VALIDATION
==================================================
🔍 Checking TypeScript...
  ✅ TypeScript: 0 errors, 0 warnings
🔍 Checking ESLint...
  ✅ ESLint: 0 errors, 0 warnings
🔍 Checking Python (Ruff)...
  ✅ Ruff: 0 issues
🔍 Checking Python types (Mypy)...
  ✅ Mypy: 0 errors, 0 warnings

==================================================
📊 SUMMARY
==================================================
Total Errors:   0
Total Warnings: 0
Checks Passed:  4/4

✅ ALL CHECKS PASSED!
```

### quality-dashboard.py

**Purpose:** Visual overview of code quality with trend tracking

**Features:**
- Color-coded status display
- Top 10 issues listed
- Trend analysis (last 7 days)
- Quick fix commands
- Historical tracking

**Usage:**
```bash
python3 docs/scripts/validation/quality-dashboard.py
```

**Output:**
```
================================================================================
                           📊 CODE QUALITY DASHBOARD
================================================================================

🕐 Last Check: 2025-10-05 16:30:00

┌─ OVERALL STATUS ──────────────────────────────────────────────────────────┐
│ Status:          ✅ EXCELLENT
│ Total Errors:    0
│ Total Warnings:  0
│ Checks Passed:   4/4
└────────────────────────────────────────────────────────────────────────────┘

┌─ CHECK RESULTS ───────────────────────────────────────────────────────────┐
│ ✅ TypeScript      Errors: 0   Warnings: 0
│ ✅ ESLint          Errors: 0   Warnings: 0
│ ✅ Ruff            Errors: 0   Warnings: 0
│ ✅ Mypy            Errors: 0   Warnings: 0
└────────────────────────────────────────────────────────────────────────────┘

┌─ TREND (Last 7 Days) ─────────────────────────────────────────────────────┐
│ 📈 IMPROVING (5 fewer errors)
│
│ Error Count:
│ 10/01: ██████████████████ 15
│ 10/02: ████████████ 10
│ 10/03: ████████ 7
│ 10/04: ████ 3
│ 10/05:  0
└────────────────────────────────────────────────────────────────────────────┘
```

## Git Hooks Integration

Automatic validation via lefthook:

### Pre-commit (Quick Checks)
- TypeScript type checking (staged files)
- ESLint with auto-fix
- Ruff with auto-fix
- Black formatting

**Timing:** < 3 seconds

### Pre-push (Full Validation)
- Complete code quality check
- Blocks push if errors found
- Allows warnings

**Timing:** ~10 seconds

### Manual Commands
```bash
lefthook run quality-check        # Full validation
lefthook run quality-quick        # Quick check
lefthook run quality-dashboard    # Visual dashboard
```

## Configuration

### TypeScript (dashboard/tsconfig.json)
```json
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true
  },
  "exclude": [".next/cache", "node_modules"]
}
```

### ESLint (dashboard/eslint.config.mjs)
```javascript
{
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",  // Allow _unused vars
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }
    ]
  }
}
```

### Ruff (api-render/ruff.toml)
```toml
line-length = 100
select = ["E", "W", "F", "I", "N", "UP", "B", "C4", "SIM", "RUF"]
ignore = ["E501"]  # Line too long
```

### Mypy (api-render/pyproject.toml)
```toml
[tool.mypy]
python_version = "3.8"
warn_return_any = true
ignore_missing_imports = true
```

## Data Files

### code-quality.json
Latest validation results (JSON format)

**Location:** `docs/data/code-quality.json`

**Structure:**
```json
{
  "timestamp": "2025-10-05T16:30:00",
  "checks": {
    "typescript": {
      "tool": "TypeScript",
      "errors": [],
      "warnings": [],
      "error_count": 0,
      "warning_count": 0,
      "passed": true
    }
  },
  "summary": {
    "total_errors": 0,
    "total_warnings": 0,
    "passed": ["typescript", "eslint", "ruff", "mypy"]
  }
}
```

### code-quality-history.json
Historical trend data (last 30 days)

**Location:** `docs/data/code-quality-history.json`

## Performance

```json
{
  "full_check": "~10 seconds",
  "quick_check": "~3 seconds",
  "pre_commit_hooks": "<3 seconds",
  "dashboard_render": "<1 second"
}
```

## Installation

### Python Tools (Development Only)
```bash
cd api-render
pip install -r requirements.txt
```

This installs:
- `ruff` (fast Python linter)
- `mypy` (static type checker)
- `black` (code formatter)
- `isort` (import sorter)

### Verify Installation
```bash
ruff --version
mypy --version
black --version
```

## Troubleshooting

### "Ruff not installed" warning
```bash
pip install ruff
```

### "Mypy not installed" warning
```bash
pip install mypy
```

### ESLint errors not auto-fixing
```bash
cd dashboard
npx eslint src --fix
```

### TypeScript cache issues
```bash
cd dashboard
rm -rf .next
npx tsc --noEmit
```

## Best Practices

1. **Run before committing:** `lefthook run quality-quick`
2. **Fix errors immediately:** Don't accumulate technical debt
3. **Use underscore prefix:** For intentionally unused variables (`_error`)
4. **Check dashboard weekly:** Track quality trends
5. **Fix warnings:** They often indicate real bugs

## Exit Codes

- `0` - All checks passed, no errors
- `1` - Errors found, fix required

## Integration with CI/CD

```yaml
## GitHub Actions example
- name: Code Quality Check
  run: python3 docs/scripts/validation/code-quality-check.py

- name: Upload Quality Report
  uses: actions/upload-artifact@v3
  with:
    name: code-quality
    path: docs/data/code-quality.json
```

---

_Code Quality System v1.0.0 | Created: 2025-10-05 | Philosophy: ZERO_ERRORS_
_Navigate: [← scripts/README.md](../README.md) | [→ CLAUDE.md](../../../CLAUDE.md)_
