# 🔒 B9 Dashboard - Reddit Marketing Analytics Platform

## ⚠️ CRITICAL: REDDIT DASHBOARD IS LOCKED
**The Reddit dashboard is 100% complete and functional. DO NOT MODIFY any Reddit dashboard features without explicit approval.**

## 🎯 Project Overview
Internal analytics platform for B9 Agency's OnlyFans marketing operations on Reddit. Analyzes 500K+ posts across 5,800+ subreddits to identify optimal marketing opportunities.

## 📊 Key Metrics
- **5,819** subreddits discovered and analyzed
- **500+** subreddits approved for campaigns
- **337,803+** Reddit posts analyzed
- **10-20%** useful discovery conversion rate

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.12+ (for API backend)
- Supabase account
- Reddit API credentials

### Installation
```bash
# Clone repository
git clone <repo-url>
cd b9_dashboard

# Frontend setup
cd dashboard
npm install --legacy-peer-deps
cp .env.example .env.local
npm run dev

# Backend setup (if needed)
cd ../api
pip3 install -r requirements.txt
cp .env.example .env
python3 main.py
```

## 🏗️ Architecture

```
b9_dashboard/
├── dashboard/           # Next.js 15 frontend (Vercel)
│   └── src/app/
│       ├── (dashboard)/ # 🔒 LOCKED - Reddit dashboard pages
│       └── api/        # Next.js API routes
├── api/                # Python FastAPI backend (Render)
├── scraper/            # Reddit data collection
└── config/             # Database schemas & setup
```

## 🔒 Reddit Dashboard Features (100% Complete)

### ✅ Completed Pages
- **Subreddit Review** - Classify discoveries (Ok/No Seller/Non Related/User Feed)
- **Categorization** - Assign marketing categories to approved subreddits
- **Posting** - Smart recommendations and content scheduling
- **User Analysis** - Reddit user quality scoring and creator detection
- **Post Analysis** - Performance metrics and engagement tracking
- **API Status** - System health monitoring
- **Users** - Team member management

### 🛠️ Technology Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python FastAPI, Redis
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (frontend), Render (backend)
- **Scraping**: AsyncPRAW, multi-account rotation

## 📚 Documentation

### Required Reading
- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines and patterns
- **[Dashboard README](./dashboard/src/app/(dashboard)/README.md)** - Dashboard-specific documentation
- **[API README](./api/README.md)** - Backend API documentation
- **[Scraper README](./scraper/README.md)** - Reddit scraper documentation

### Development Rules
1. **DO NOT MODIFY** Reddit dashboard functionality
2. **ALWAYS** read CLAUDE.md before making changes
3. **USE** `--legacy-peer-deps` for npm installs
4. **TEST** builds before committing
5. **FOLLOW** existing patterns exactly

## ⚠️ Known Issues
- Scraper reliability issues (proxy/account rotation)
- Build errors common (use `npm install --legacy-peer-deps --force`)
- Multiple dev server instances may accumulate

## 🔐 Environment Variables

### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Backend (.env)
```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379
```

## 🚨 CRITICAL WARNINGS

### Never Do This
- ❌ Modify Reddit dashboard pages
- ❌ Implement keyboard navigation in tables
- ❌ Add AI review functionality back
- ❌ Create standalone scripts
- ❌ Bypass rate limiting
- ❌ Commit secrets

### Always Do This
- ✅ Check existing documentation
- ✅ Test builds before committing
- ✅ Use direct Supabase calls
- ✅ Format large numbers (1.2K, 500M)
- ✅ Ask before implementing improvements

## 📈 Future Dashboards
This Reddit dashboard is the first of multiple planned dashboards:
- Instagram analytics (planned)
- TikTok analytics (planned)
- Twitter/X analytics (planned)
- Custom client dashboards (planned)

## 🤝 Support
- Check documentation in order: CLAUDE.md → README files → Console logs
- Internal tool - no external support available
- Contact B9 Agency team for assistance

---

**Status**: 🔒 Reddit Dashboard LOCKED - 100% Complete
**Last Updated**: 2025-01-13
**Version**: 1.0.0

*Built for B9 Agency - Optimizing OnlyFans marketing through Reddit intelligence.*