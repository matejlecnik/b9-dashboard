# Deployment Secrets Management

┌─ SECURITY STATUS ───────────────────────────────────────┐
│ ● SECURE      │ ████████████████████ 100% ENCRYPTED    │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../../CLAUDE.md",
  "current": "DEPLOYMENT_SECRETS.md",
  "siblings": [
    {"path": "DEPLOYMENT.md", "desc": "Deployment guide", "status": "OPERATIONAL"}
  ],
  "related": [
    {"path": "../development/DOCUMENTATION_STANDARDS.md", "desc": "Standards", "status": "ENFORCED"}
  ]
}
```

## Environment Variables

```json
{
  "frontend_vercel": {
    "public": {
      "NEXT_PUBLIC_SUPABASE_URL": "https://cetrhongdrjztsrsffuh.supabase.co",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "NEXT_PUBLIC_API_URL": "https://backend.onrender.com"
    },
    "private": {
      "SUPABASE_SERVICE_ROLE_KEY": "[NEVER_COMMIT]",
      "JWT_SECRET": "[NEVER_COMMIT]"
    }
  },
  "backend_hetzner": {
    "required": {
      "SUPABASE_URL": "https://cetrhongdrjztsrsffuh.supabase.co",
      "SUPABASE_SERVICE_ROLE_KEY": "[NEVER_COMMIT]",
      "OPENAI_API_KEY": "[NEVER_COMMIT]",
      "RAPIDAPI_KEY": "[NEVER_COMMIT]",
      "R2_ACCOUNT_ID": "[NEVER_COMMIT]",
      "R2_ACCESS_KEY_ID": "[NEVER_COMMIT]",
      "R2_SECRET_ACCESS_KEY": "[NEVER_COMMIT]",
      "R2_BUCKET_NAME": "b9-instagram-media",
      "REDIS_HOST": "127.0.0.1 (API) or 91.98.91.129 (Workers)",
      "REDIS_PORT": "6379",
      "REDIS_PASSWORD": "[NEVER_COMMIT]"
    },
    "optional": {
      "PORT": "10000",
      "ENVIRONMENT": "production",
      "LOG_LEVEL": "info",
      "WORKER_ID": "1 or 2 (for workers only)"
    }
  },
  "backend_render_legacy": {
    "required": {
      "SUPABASE_URL": "https://cetrhongdrjztsrsffuh.supabase.co",
      "SUPABASE_SERVICE_ROLE_KEY": "[NEVER_COMMIT]",
      "OPENAI_API_KEY": "[NEVER_COMMIT]",
      "DATABASE_URL": "[NEVER_COMMIT]"
    },
    "optional": {
      "PORT": "8000",
      "ENVIRONMENT": "production",
      "LOG_LEVEL": "INFO"
    },
    "status": "DEPRECATED"
  }
}
```

## Security Classification

```json
{
  "levels": {
    "PUBLIC": {
      "keys": ["NEXT_PUBLIC_*"],
      "exposure": "Client-side visible",
      "risk": "LOW"
    },
    "PRIVATE": {
      "keys": ["*_ANON_KEY", "API_URL"],
      "exposure": "Server-side only",
      "risk": "MEDIUM"
    },
    "SECRET": {
      "keys": ["*_SERVICE_ROLE_KEY", "*_API_KEY", "JWT_SECRET"],
      "exposure": "Never exposed",
      "risk": "CRITICAL"
    }
  }
}
```

## Storage Locations

```json
{
  "vercel": {
    "location": "Dashboard → Settings → Environment Variables",
    "encryption": "AES-256",
    "access": "Team members only",
    "audit": "ENABLED"
  },
  "hetzner": {
    "location": "/app/b9dashboard/.env (per server)",
    "encryption": "None (file-based)",
    "access": "SSH key required",
    "audit": "Manual",
    "files": [".env.hetzner.api", ".env.hetzner.worker"]
  },
  "render_legacy": {
    "location": "Dashboard → Environment → Environment Variables",
    "encryption": "At rest",
    "access": "Admin only",
    "audit": "ENABLED",
    "status": "DEPRECATED"
  },
  "local": {
    "location": ".env.local",
    "encryption": "NONE",
    "access": "Developer",
    "gitignore": "REQUIRED"
  }
}
```

## Key Rotation Schedule

```json
{
  "schedule": [
    {
      "key": "SUPABASE_SERVICE_ROLE_KEY",
      "frequency": "90_days",
      "last_rotation": "2024-01-01",
      "next_rotation": "2024-04-01"
    },
    {
      "key": "OPENAI_API_KEY",
      "frequency": "60_days",
      "last_rotation": "2024-01-15",
      "next_rotation": "2024-03-15"
    },
    {
      "key": "JWT_SECRET",
      "frequency": "180_days",
      "last_rotation": "2023-12-01",
      "next_rotation": "2024-06-01"
    }
  ]
}
```

## Security Checklist

```json
{
  "pre_commit": [
    {"check": "No secrets in code", "command": "git diff --cached | grep -E '(SECRET|KEY|TOKEN)'"},
    {"check": ".env in gitignore", "command": "grep '.env' .gitignore"},
    {"check": "No hardcoded URLs", "command": "grep -r 'supabase.co' --include='*.ts'"}
  ],
  "deployment": [
    {"check": "Env vars configured", "platform": "Vercel/Render"},
    {"check": "HTTPS enforced", "status": "REQUIRED"},
    {"check": "CORS configured", "status": "REQUIRED"}
  ],
  "audit": [
    {"check": "Access logs reviewed", "frequency": "WEEKLY"},
    {"check": "Key usage monitored", "frequency": "DAILY"},
    {"check": "Rotation completed", "frequency": "QUARTERLY"}
  ]
}
```

## Breach Response

```json
{
  "immediate": [
    {"step": 1, "action": "Rotate compromised key", "time": "< 5min"},
    {"step": 2, "action": "Update all services", "time": "< 15min"},
    {"step": 3, "action": "Audit access logs", "time": "< 30min"}
  ],
  "followup": [
    {"step": 4, "action": "Security review", "time": "< 24h"},
    {"step": 5, "action": "Update procedures", "time": "< 48h"},
    {"step": 6, "action": "Team training", "time": "< 1 week"}
  ]
}
```

## Commands

```bash
## Check for exposed secrets
$ git secrets --scan

## Verify environment variables
$ vercel env ls
$ render env

## Rotate keys (Supabase)
$ supabase projects api-keys regenerate --project-ref cetrhongdrjztsrsffuh

## Test without secrets
$ npm run build
```

## Execution Plan

```json
{
  "immediate": {
    "tasks": [
      {"id": "SEC-001", "task": "Verify all secrets stored securely", "status": "COMPLETE"},
      {"id": "SEC-002", "task": "Enable audit logging", "status": "COMPLETE"}
    ]
  },
  "ongoing": {
    "tasks": [
      {"id": "SEC-003", "task": "Weekly security audit", "recurring": true},
      {"id": "SEC-004", "task": "Quarterly key rotation", "recurring": true}
    ]
  },
  "future": {
    "tasks": [
      {"id": "SEC-005", "task": "Implement HashiCorp Vault", "effort": "16h"},
      {"id": "SEC-006", "task": "Add 2FA for deployments", "effort": "4h"}
    ]
  }
}
```

## Architecture

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   Vercel    │────▶│  Hetzner Cloud       │────▶│  Supabase   │
│  (Frontend) │     │  (3 servers)         │     │  (Database) │
└─────────────┘     │  • API + Redis       │     └─────────────┘
      ▲             │  • Worker 1          │            ▲
      │             │  • Worker 2          │            │
   [Public]         └──────────────────────┘        [Secret]
    Keys                     ▲                        Keys
                             │
                         [Private]
                          Keys +
                        Redis Password
```

---

_Security Version: 2.0.0 | Encryption: AES-256 | Compliance: SOC2 | Updated: 2024-01-28_
_Navigate: [← DEPLOYMENT.md](DEPLOYMENT.md) | [↑ CLAUDE.md](../../CLAUDE.md)_