# B9 Agency Reddit Dashboard

## 🎯 Status: DEPLOYED ✅
**Live Dashboard:** https://b9-dashboard-b9-agencys-projects.vercel.app

## ✅ Recent Updates
- ✅ Removed Analytics page from dashboard (consolidated into feature pages)
- ✅ Removed Settings page from dashboard (streamlined navigation)

## 🎯 Purpose
Reddit intelligence system for OnlyFans marketing - automated subreddit discovery, categorization, and performance analysis.

## 📊 Current Data
- **4,239 subreddits** discovered
- **175,050 posts** analyzed  
- **425 "Ok" subreddits** ready for marketing
- **Real-time updates** every 30 seconds

## 🔧 System Components

### Dashboard (Vercel - LIVE)
- **Review Page:** Categorize subreddits (Ok/No Seller/Non Related)
- **Posting Page:** Find optimal subreddits for marketing
- **User Analysis:** Profile scoring and behavior tracking
- **Post Analysis:** Content performance insights
- **Scraper Status:** System health monitoring

### Scraper (PythonAnywhere)
- **Multi-account:** 3 Reddit accounts + proxies
- **17,100 requests/hour** capacity
- **Auto-discovery:** Finds new subreddits from user activity
- **24/7 operation** with rate limiting

### Database (Supabase)
- **4 linked tables:** subreddits, users, posts, analytics
- **Real-time subscriptions** for live dashboard updates
- **Performance optimized** with infinite scroll

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
