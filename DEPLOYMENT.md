# Deployment Workflow

## Branch Strategy

- **`preview` branch** → For testing changes before production
  - Auto-deploys to: `b9-dashboard-preview-*.vercel.app`
  - Used for testing and client review

- **`main` branch** → Production environment
  - Auto-deploys to: `b9-dashboard.com`
  - Only merge after preview is approved

## Deployment Process

### 1. Development & Testing
```bash
# Make your changes on preview branch
git checkout preview
# ... make changes ...

# Commit and push to preview
git add .
git commit -m "feat: your changes"
git push origin preview
```

### 2. Preview Deployment
After pushing to `preview` branch:
- Vercel automatically builds and deploys
- Access preview at the generated URL
- Test all functionality
- Share with client for approval

### 3. Production Deployment
Once preview is approved:
```bash
# Switch to main branch
git checkout main

# Merge preview changes
git merge preview

# Push to production
git push origin main
```

### 4. Vercel URLs
- **Preview**: Check Vercel dashboard or GitHub PR for preview URL
- **Production**: `b9-dashboard.com` (after domain setup)

## Quick Commands

```bash
# Deploy to preview
./deploy-preview.sh

# Deploy to production (after approval)
./deploy-production.sh
```

## Environment Variables
Make sure both environments have the same env vars configured in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BYPASS_AUTH` (set to `false` for production)

## Rollback
If something goes wrong in production:
```bash
git checkout main
git revert HEAD
git push origin main
```
Or use Vercel dashboard to instantly rollback to previous deployment.