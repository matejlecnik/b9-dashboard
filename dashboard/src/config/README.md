# Config Directory

## Overview
Configuration files and constants for the B9 Dashboard application. Contains navigation structure, image handling, and environment-dependent settings.

## Current Configuration Files

### UI Configuration
- **`navigation.ts`** - Dashboard sidebar navigation structure, routes, and menu items
- **`images.ts`** - Image optimization settings, allowed domains, and media handling config

## Environment Variables (from CLAUDE.md)
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=same-as-above
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379
```

## API Endpoints
- **Backend**: Python FastAPI (localhost:8000)
- **Frontend**: Next.js (localhost:3000)
- **Database**: Supabase PostgreSQL
- **Cache**: Redis

## TODO List
- [ ] Add API_BASE_URL configuration
- [ ] Create feature flags configuration file
- [ ] Add rate limiting configuration constants
- [ ] Configure Reddit API settings (accounts, rate limits)

## Current Errors
None

## Potential Improvements
- Add environment-specific configs (dev/staging/prod)
- Create centralized API endpoint configuration
- Add validation for required environment variables