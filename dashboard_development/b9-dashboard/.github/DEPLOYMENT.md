# 🚀 Deployment Guide

This document outlines the complete CI/CD pipeline and deployment process for the B9 Reddit Analytics Dashboard.

## 📋 Overview

Our deployment system provides:
- ✅ Automated testing on all pull requests
- 🔒 Security scanning and vulnerability detection
- 🚀 Automatic deployment to Vercel
- 🔄 Rollback capabilities
- 📊 Performance monitoring
- 🛡️ Branch protection rules

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Developer     │    │   GitHub Actions  │    │     Vercel      │
│   Push/PR       │───▶│   CI/CD Pipeline  │───▶│   Deployment    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   Notifications  │
                       │   & Monitoring   │
                       └──────────────────┘
```

## 🔧 Setup Instructions

### 1. GitHub Repository Secrets

Add the following secrets to your GitHub repository (`Settings` > `Secrets and variables` > `Actions`):

#### Required Secrets
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

#### Optional Secrets (for enhanced features)
- `SLACK_WEBHOOK_URL`: For Slack notifications
- `DISCORD_WEBHOOK_URL`: For Discord notifications

### 2. Vercel Setup

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel@latest
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Link your project**:
   ```bash
   cd dashboard_development/b9-dashboard
   vercel link
   ```

4. **Get project information**:
   ```bash
   vercel project ls
   cat .vercel/project.json
   ```

5. **Set environment variables in Vercel**:
   - Go to your Vercel dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add the same environment variables from your `.env.local`

### 3. Branch Protection Rules

Apply branch protection rules using the configuration in `.github/branch-protection.json`:

1. Navigate to your repository settings
2. Go to "Branches"
3. Click "Add rule" for the `main` branch
4. Configure the settings as specified in the JSON file

## 🔄 Workflow Details

### Main Workflows

#### 1. `deploy.yml` - Main Deployment Pipeline

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**
- 🔒 **Security Scan**: Vulnerability scanning with Trivy
- 🧪 **Test & Validate**: TypeScript checking, ESLint, and build verification
- 🔍 **Deploy Preview**: Deploy PR previews to Vercel
- 🌟 **Deploy Production**: Deploy to production on main branch
- 🏥 **Health Check**: Post-deployment verification
- 🔄 **Rollback**: Manual rollback capability

#### 2. `pr-checks.yml` - Pull Request Validation

**Features:**
- PR title and description validation
- Code quality checks
- Security scanning
- Bundle size analysis
- Automated labeling

#### 3. `security-monitoring.yml` - Continuous Security

**Schedule:** Daily at 2 AM UTC

**Features:**
- Dependency vulnerability scanning
- Outdated dependency detection
- License compliance checking
- Code quality metrics

## 🚀 Deployment Process

### For Pull Requests

1. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin feat/your-feature-name
   ```

4. **Create a Pull Request**:
   - The PR checks will run automatically
   - A preview deployment will be created
   - Review comments will include the preview URL

5. **Review and merge**:
   - Ensure all checks pass
   - Get approval from a team member
   - Merge the PR (squash and merge recommended)

### For Production Deployment

1. **Merge to main**:
   - Production deployment triggers automatically
   - Health checks verify the deployment

2. **Monitor deployment**:
   - Check GitHub Actions for deployment status
   - Verify the production URL is working
   - Monitor for any error notifications

## 🛡️ Security Features

### Automated Security Scanning

- **Vulnerability Detection**: Daily scans for security vulnerabilities
- **Dependency Auditing**: Check for known security issues in dependencies
- **Secret Detection**: Prevent hardcoded secrets from being committed
- **License Compliance**: Ensure all dependencies use approved licenses

### Branch Protection

- **Required Reviews**: At least 1 approval required
- **Status Checks**: All CI checks must pass
- **Up-to-date Branches**: Branches must be current with main
- **No Direct Pushes**: Main branch is protected from direct commits

## 📊 Monitoring & Alerts

### Automated Issue Creation

The system automatically creates GitHub issues for:
- 🚨 Security vulnerabilities found
- 📦 Outdated dependencies
- ❌ Failed health checks
- 🔄 Rollback notifications

### Performance Monitoring

- **Bundle Size Tracking**: Alerts if build size increases significantly
- **Build Time Monitoring**: Track CI/CD pipeline performance
- **Deployment Success Rate**: Monitor deployment reliability

## 🔄 Rollback Procedures

### Automatic Rollback

- Health checks fail after deployment
- Critical errors detected in monitoring

### Manual Rollback

1. **Via GitHub Actions**:
   - Go to Actions tab
   - Select "Deploy to Vercel" workflow
   - Click "Run workflow"
   - Select "Rollback" option

2. **Via Vercel CLI**:
   ```bash
   cd dashboard_development/b9-dashboard
   vercel rollback
   ```

3. **Via Vercel Dashboard**:
   - Go to your project in Vercel dashboard
   - Click on "Deployments"
   - Find the previous stable deployment
   - Click "Promote to Production"

## 🏃‍♂️ Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd dashboard_development/b9-dashboard
   cp env.example .env.local
   npm install
   ```

2. **Test locally**:
   ```bash
   npm run dev
   npm run build
   npm run lint
   npx tsc --noEmit
   ```

3. **Create a PR**:
   ```bash
   git checkout -b feat/my-feature
   # Make changes
   git commit -m "feat: my new feature"
   git push origin feat/my-feature
   # Create PR on GitHub
   ```

## 📞 Troubleshooting

### Common Issues

#### Failed Health Check
```bash
# Check deployment logs
vercel logs <deployment-url>

# Check application status
curl -I <deployment-url>
```

#### Build Failures
```bash
# Run build locally to debug
npm run build

# Check TypeScript errors
npx tsc --noEmit

# Check ESLint issues
npm run lint
```

#### Environment Variable Issues
```bash
# Verify Vercel environment variables
vercel env ls

# Pull environment variables
vercel env pull .env.local
```

### Getting Help

1. **Check GitHub Actions logs**: Look at the failed job details
2. **Review Vercel deployment logs**: Check the Vercel dashboard
3. **Verify environment variables**: Ensure all secrets are correctly set
4. **Test locally**: Reproduce the issue in your development environment

## 📈 Performance Best Practices

### Code Quality
- Follow TypeScript strict mode
- Use ESLint recommended rules
- Keep bundle size under control
- Regular dependency updates

### Security
- Regular security audits
- Rotate API keys quarterly
- Monitor for vulnerabilities
- Use environment variables for secrets

### Deployment
- Test changes in preview environments
- Monitor deployment metrics
- Have rollback procedures ready
- Keep documentation updated

## 🔮 Future Enhancements

- **Performance Testing**: Add Lighthouse CI for performance metrics
- **E2E Testing**: Implement Playwright tests in CI/CD
- **Database Migrations**: Automated Supabase migration deployment
- **Advanced Monitoring**: Integration with monitoring services
- **Multi-environment**: Staging environment setup
- **Feature Flags**: Dynamic feature toggling