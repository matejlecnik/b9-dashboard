# GitHub Actions + Vercel Deployment Setup

This document explains how to configure GitHub Actions to automatically deploy your B9 Dashboard to Vercel for both preview and production deployments.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository settings:

### 1. VERCEL_TOKEN
- **What it is**: Personal Access Token for Vercel CLI
- **How to get it**:
  1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)
  2. Click "Create Token"
  3. Name it "GitHub Actions Deploy"
  4. Select appropriate scope (usually "Full Account")
  5. Copy the generated token

### 2. VERCEL_ORG_ID
- **What it is**: Your Vercel organization/team ID
- **How to get it**:
  1. Run `vercel whoami` in your terminal (after `npm i -g vercel` and `vercel login`)
  2. Or find it in your Vercel dashboard URL: `vercel.com/{ORG_ID}`
  3. For personal accounts, this is usually your username

### 3. VERCEL_PROJECT_ID
- **What it is**: Your specific project's ID in Vercel
- **How to get it**:
  1. Go to your project in Vercel dashboard
  2. Click on "Settings"
  3. Scroll down to "General" section
  4. Copy the "Project ID"

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Click on "Settings" tab
3. In the left sidebar, click "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each of the three secrets above

## How the Workflows Work

### Preview Deployments (`vercel-preview.yml`)
- **Triggers**: When you open/update a pull request to `main` branch
- **What it does**:
  - Deploys to Vercel preview environment
  - Comments on the PR with the preview URL
  - Only runs if files in `dashboard_development/b9-dashboard/` change

### Production Deployments (`vercel-production.yml`)
- **Triggers**: When you push/merge to `main` branch
- **What it does**:
  - Deploys to Vercel production environment
  - Updates commit status with deployment URL
  - Only runs if files in `dashboard_development/b9-dashboard/` change

## Environment Variables

Your Vercel project should already have these environment variables configured:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DASHBOARD_REFRESH_INTERVAL`
- `ENABLE_NOTIFICATIONS`

The GitHub Actions will automatically pull these from your Vercel project configuration.

## Directory Structure

The workflows are configured to work with your current directory structure:
```
Dashboard/
├── dashboard_development/
│   └── b9-dashboard/          # Next.js app (gets deployed)
└── .github/
    └── workflows/
        ├── vercel-preview.yml
        └── vercel-production.yml
```

## Testing the Setup

1. **First time setup**: 
   - Add the GitHub secrets
   - Push these workflow files to your `main` branch
   - The production deployment should trigger automatically

2. **Testing preview deployments**:
   - Create a new branch: `git checkout -b test-deployment`
   - Make a small change to any file in `dashboard_development/b9-dashboard/`
   - Push the branch and create a pull request
   - The preview deployment should trigger and comment on the PR

## Troubleshooting

### Common Issues:

1. **"Error: Invalid token"**
   - Verify `VERCEL_TOKEN` is correct and hasn't expired
   - Make sure the token has appropriate permissions

2. **"Project not found"**
   - Check `VERCEL_PROJECT_ID` matches your actual project ID
   - Verify `VERCEL_ORG_ID` is correct

3. **Build fails**
   - Check if your `package.json` scripts are correct
   - Ensure all dependencies are properly listed
   - Verify Node.js version compatibility (workflow uses Node 18)

4. **Deployment URL not accessible**
   - Check if your Vercel project has the correct domain configuration
   - Verify environment variables are set in Vercel dashboard

### Getting Help:

- Check the GitHub Actions logs in the "Actions" tab of your repository
- Review Vercel deployment logs in your Vercel dashboard
- Ensure your local build works: `npm run build` in the `dashboard_development/b9-dashboard/` directory

## Next Steps

After setting up the secrets:

1. **Commit and push** the workflow files to trigger the first deployment
2. **Verify** the production deployment works
3. **Create a test PR** to verify preview deployments work
4. **Monitor** the deployments in both GitHub Actions and Vercel dashboard

Your dashboard will now automatically deploy:
- 🔄 **Preview** deployments for every pull request
- 🚀 **Production** deployments for every push to main branch
