# B9 Dashboard Deployment Guide

## Environment Setup

Before deploying, make sure to set up your environment variables. Copy `env.example` to `.env.local`:

```bash
cp env.example .env.local
```

## Environment Variables

The following environment variables are required:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `DASHBOARD_REFRESH_INTERVAL`: Dashboard refresh interval in milliseconds
- `ENABLE_NOTIFICATIONS`: Enable/disable notifications

## GitHub Repository Setup

1. Create a new repository on GitHub called `b9-dashboard`
2. Add the remote and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/b9-dashboard.git
git push -u origin main
```

## Vercel Deployment Options

### Option 1: Deploy as Separate Project (Recommended)

This is the recommended approach for deploying at `b9-agency.com/dashboard`:

1. **Create New Vercel Project:**
   - Go to [vercel.com](https://vercel.com)
   - Import your `b9-dashboard` GitHub repository
   - Configure environment variables in Vercel dashboard

2. **Configure Custom Domain:**
   - In Vercel project settings, go to "Domains"
   - Add `dashboard.b9-agency.com` as a custom domain
   - Or configure a subdirectory redirect in your main site

3. **Environment Variables in Vercel:**
   Set these in your Vercel project dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DASHBOARD_REFRESH_INTERVAL`
   - `ENABLE_NOTIFICATIONS`

### Option 2: Integrate with Existing Site

If you want to integrate with your existing b9-agency.com site:

1. Add this project as a subdirectory in your main site repository
2. Configure your main site's `vercel.json` to include rewrites:

```json
{
  "rewrites": [
    {
      "source": "/dashboard",
      "destination": "/dashboard-app/index"
    },
    {
      "source": "/dashboard/:path*",
      "destination": "/dashboard-app/:path*"
    }
  ]
}
```

## Local Development

```bash
npm install
npm run dev
```

- Development: `http://localhost:3000`
- Production: `https://b9-agency.com/dashboard`

## Configuration Features

The app is configured with:
- **Smart Base Path**: Only applies `/dashboard` in production
- **Asset Prefix**: Handles static assets correctly in subdirectory
- **Standalone Output**: Optimized for Vercel deployment
- **Security Headers**: X-Frame-Options, Content-Type, XSS Protection
- **Image Optimization**: Enabled for better performance
- **Trailing Slash**: Consistent URL structure

## Post-Deployment Checklist

- [ ] Verify dashboard loads at correct URL
- [ ] Test authentication flow
- [ ] Check Supabase connection
- [ ] Verify all pages render correctly
- [ ] Test responsive design on mobile
- [ ] Confirm color scheme (pink, black, gray, white) displays correctly
