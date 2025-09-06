# B9 Agency Reddit Dashboard

## 🎯 Status: DEPLOYED ✅
**Live Dashboard:** https://b9-dashboard-b9-agencys-projects.vercel.app
**GitHub Repo:** https://github.com/matejlecnik/b9-dashboard

## ✅ Recent Updates
- ✅ Removed Analytics page from dashboard (consolidated into feature pages)
- ✅ Removed Settings page from dashboard (streamlined navigation)
- ✅ Scraper page upgraded: real-time stats, time-range filters, skeletons, toasts
- ✅ Categorization: now loads only `review = 'Ok'` subreddits; added All/Uncategorized/Categorized filters
- ✅ Category editing: `category_text` is a single-select fed by `/api/categories`, with clear and add-new options
- ✅ Routing cleanup: removed duplicate top-level routes `/categorization` and `/users` in favor of `(dashboard)/categorization` and `(dashboard)/users` to fix Next.js path conflicts
- ✅ Node runtime upgraded to 20+ to address `@supabase/supabase-js` Node 18 deprecations (package.json engines, .nvmrc, Vercel functions)
- ✅ ESLint cleanup: removed unused imports on Analytics/Settings pages and cleaned unused directives in components

## 🎯 Purpose
Reddit intelligence system for OnlyFans marketing - automated subreddit discovery, categorization, and performance analysis.

## 📊 Current Data
- **4,239 subreddits** discovered
- **175,050 posts** analyzed  
- **425 "Ok" subreddits** ready for marketing
- **Real-time updates** every 30 seconds + live subscriptions

## 🔧 System Components

### Dashboard (Vercel - LIVE)
- **Subreddit Review Page:** Review-only workflow to set `review` status on discovered subreddits. This page is not related to the `category` field and does not display or manage categories. Allowed statuses: `Ok`, `No Seller`, `Non Related`. Excludes user profile feeds (`name ilike 'u_%'`). Infinite scroll, search, live updates.
- **Categorization Page:** Shows only `review = 'Ok'` subreddits and lets you set `category_text` via a single-select populated from existing categories (fallback to defaults). Filters: All, Uncategorized, Categorized. Infinite scroll, search.
- **Posting Page:** Find optimal subreddits for marketing
- **User Analysis:** Profile scoring and behavior tracking
- **Post Analysis:** Content performance insights
- **Scraper Status:** System health monitoring with time-range filtering, account status, and recent activity

## 🔄 Improvements (Scraper Page)
- ✅ Added robust loading skeletons and error/empty states
- ✅ Added toast notifications for refresh success/failure
- ✅ Time-range filter (24h/7d/30d) drives queries and metrics
- ✅ Top Subreddits list computed from recent posts with pagination
- ✅ Account status surfaced from `config/accounts_config.json` via API route
- ✅ Throughput metric (approx posts/min) shown
- 🔄 Next: add subreddit filter chip and server-side pagination

### Scraper (PythonAnywhere)
- **Multi-account:** 3 Reddit accounts + proxies
- **17,100 requests/hour** capacity
- **Auto-discovery:** Finds new subreddits from user activity
- **24/7 operation** with rate limiting

### Database (Supabase)
- **4 linked tables:** subreddits, users, posts, analytics
- **Real-time subscriptions** for live dashboard updates
- **Performance optimized** with infinite scroll
- **Fields of interest:** `review` (enum-like: Ok | No Seller | Non Related | User Feed), `category_text` (varchar; used by categorization). No `category` column.

## 🎨 Design
- **Colors:** Pink (#FF8395), Black, White, Grey
- **Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui

## 🚀 Quick Start
1. **Access:** https://b9-dashboard-b9-agencys-projects.vercel.app
2. **Login:** demo@b9agency.com / demopassword123
3. **Review:** Categorize uncategorized subreddits
4. **Post:** Find "Ok" subreddits for marketing
5. **Monitor:** Check scraper health and performance

## 📁 Project Structure
```
Dashboard/
├── pythonanywhere_upload/    # Python scraper
├── dashboard_development/    # Next.js dashboard  
├── config/                   # Configuration
└── Plan.md                   # This file
```

## 🔄 Workflow
1. **Scrape** "Ok" subreddits → Extract posts/users
2. **Discover** new subreddits from user history
3. **Review** new discoveries via dashboard
4. **Categorize** as Ok/No Seller/Non Related
5. **Repeat** continuously for fresh data

---
**Next:** Deploy scraper to PythonAnywhere for 24/7 operation
