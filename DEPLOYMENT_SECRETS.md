# Deployment Environment Secrets

## Required for Vercel Deployment

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

### Essential Variables (Required)
```
NEXT_PUBLIC_SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTU4MTMsImV4cCI6MjA3MjM5MTgxM30.DjuEhcfDpdd7gmHFVaqcZP838FXls9-HiXJg-QF-vew
SUPABASE_SERVICE_ROLE_KEY=[REPLACE_WITH_YOUR_SERVICE_ROLE_KEY_FROM_SUPABASE_DASHBOARD]
NEXT_PUBLIC_API_URL=https://b9-dashboard.onrender.com
```

### Optional Variables
```
NODE_ENV=production  (already set in vercel.json)
BYPASS_AUTH=false
```

## Required for GitHub Repository

No secrets needed in GitHub repository - all deployment happens through Vercel.

## Notes

1. **SUPABASE_SERVICE_ROLE_KEY**: Keep this secret! Never commit to repository.
2. **Single API URL**: We use one Render service for all platforms (cost-efficient).
3. **Database**: All tables are now prefixed with `reddit_` for multi-platform support.

## Deployment Checklist

- [ ] Add environment variables in Vercel dashboard
- [ ] Ensure Render backend is deployed and running
- [ ] Verify Supabase tables are renamed with `reddit_` prefix
- [ ] Check that build succeeds locally with `npm run build`
- [ ] Confirm no sensitive data in repository

## Architecture Overview

```
Frontend (Vercel) → Backend API (Render) → Database (Supabase)
     ↓                      ↓                      ↓
  Next.js 15          Python FastAPI         PostgreSQL
                                            (reddit_* tables)
```