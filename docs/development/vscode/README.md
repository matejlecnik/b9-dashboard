# VSCode Development Setup

┌─ VSCODE CONFIG ─────────────────────────────────────────┐
│ ● CONFIGURED  │ ████████████████████ 100% READY        │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "vscode/README.md",
  "files": [
    {"path": "extensions.json", "desc": "Recommended extensions", "status": "ACTIVE"}
  ]
}
```

## Setup Instructions

```json
{
  "quick_setup": {
    "step1": "Open project in VSCode",
    "step2": "Create .vscode directory in project root",
    "step3": "Copy extensions.json from this directory",
    "step4": "VSCode will prompt to install recommended extensions",
    "step5": "Restart VSCode for all extensions to activate"
  }
}
```

## Manual Setup

```bash
# Create .vscode directory in project root
mkdir -p .vscode

# Copy the extensions configuration
cp docs/development/vscode/extensions.json .vscode/

# Or create a symlink (recommended)
ln -s docs/development/vscode/extensions.json .vscode/extensions.json
```

## Recommended Extensions

```json
{
  "frontend": {
    "eslint": "dbaeumer.vscode-eslint",
    "tailwind": "bradlc.vscode-tailwindcss",
    "prettier": "esbenp.prettier-vscode"
  },
  "backend": {
    "python": "ms-python.python",
    "pylance": "ms-python.vscode-pylance",
    "ruff": "charliermarsh.ruff",
    "black": "ms-python.black-formatter"
  },
  "database": {
    "supabase": "supabase.vscode-supabase",
    "sqltools": "mtxr.sqltools",
    "postgres": "mtxr.sqltools-driver-pg"
  },
  "devtools": {
    "docker": "ms-azuretools.vscode-docker",
    "gitlens": "eamodio.gitlens",
    "dotenv": "mikestead.dotenv",
    "errorlens": "usernamehw.errorlens"
  },
  "utilities": {
    "rest_client": "humao.rest-client",
    "path_intellisense": "christian-kohler.path-intellisense",
    "yaml": "redhat.vscode-yaml",
    "toml": "tamasfe.even-better-toml"
  }
}
```

## Extension Descriptions

```json
{
  "extensions": [
    {
      "name": "ESLint",
      "id": "dbaeumer.vscode-eslint",
      "purpose": "JavaScript/TypeScript linting",
      "config": "Uses project .eslintrc"
    },
    {
      "name": "Tailwind CSS IntelliSense",
      "id": "bradlc.vscode-tailwindcss",
      "purpose": "Tailwind class autocomplete",
      "config": "Reads tailwind.config.js"
    },
    {
      "name": "Prettier",
      "id": "esbenp.prettier-vscode",
      "purpose": "Code formatting",
      "config": "Uses .prettierrc if present"
    },
    {
      "name": "Python",
      "id": "ms-python.python",
      "purpose": "Python language support",
      "config": "Auto-detects virtual environments"
    },
    {
      "name": "Ruff",
      "id": "charliermarsh.ruff",
      "purpose": "Fast Python linter",
      "config": "Uses ruff.toml or pyproject.toml"
    },
    {
      "name": "Black Formatter",
      "id": "ms-python.black-formatter",
      "purpose": "Python code formatting",
      "config": "Follows Black's style guide"
    },
    {
      "name": "Supabase",
      "id": "supabase.vscode-supabase",
      "purpose": "Supabase integration",
      "config": "Connects to Supabase projects"
    },
    {
      "name": "GitLens",
      "id": "eamodio.gitlens",
      "purpose": "Enhanced Git integration",
      "config": "Shows blame, history inline"
    },
    {
      "name": "Error Lens",
      "id": "usernamehw.errorlens",
      "purpose": "Inline error display",
      "config": "Shows errors next to code"
    }
  ]
}
```

## Workspace Settings

```json
{
  "recommended_settings": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "python.linting.enabled": true,
    "python.formatting.provider": "black",
    "[python]": {
      "editor.defaultFormatter": "ms-python.black-formatter"
    },
    "[typescript]": {
      "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[typescriptreact]": {
      "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "tailwindCSS.experimental.classRegex": [
      ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"],
      ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
      ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
    ]
  }
}
```

## Create Settings File

To use recommended workspace settings:

```bash
# Create settings.json in .vscode directory
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "python.linting.enabled": true,
  "python.formatting.provider": "black",
  "[python]": {
    "editor.defaultFormatter": "ms-python.black-formatter"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
EOF
```

## Troubleshooting

```json
{
  "common_issues": [
    {
      "issue": "Extensions not installing",
      "solution": "Manually install from Extensions view (Cmd+Shift+X)"
    },
    {
      "issue": "ESLint not working",
      "solution": "Run 'npm install' in dashboard directory"
    },
    {
      "issue": "Python extensions not finding interpreter",
      "solution": "Select interpreter: Cmd+Shift+P > 'Python: Select Interpreter'"
    },
    {
      "issue": "Prettier conflicts with ESLint",
      "solution": "Ensure eslint-config-prettier is installed"
    }
  ]
}
```

## Benefits

```json
{
  "consistency": "All team members use same tools",
  "productivity": "Auto-formatting and linting save time",
  "quality": "Catch errors before commit",
  "integration": "Direct Supabase and Git integration"
}
```

---

_VSCode Config Version: 1.0.0 | Status: Active | Updated: 2024-01-29_
_Navigate: [← development/](../README.md) | [→ extensions.json](extensions.json)_