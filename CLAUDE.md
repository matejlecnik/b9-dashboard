# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🎯 Product Vision & Strategy

### Business Objectives
**Mission**: Automate Reddit discovery and analysis for OnlyFans marketing optimization, providing data-driven insights for content creators and agencies.

**Key Performance Indicators (KPIs)**:
- 4,865+ subreddits discovered and categorized
- 337,803 posts analyzed for engagement patterns
- 77,283 user profiles scored for marketing value
- 425+ "Ok" subreddits ready for marketing campaigns

### User Personas
1. **OnlyFans Creators**: Need optimal subreddits for content posting
2. **Agency Managers**: Require bulk data analysis and team workflow management
3. **Marketing Strategists**: Want engagement metrics and timing optimization

### Revenue Model
- B2B SaaS for OnlyFans agencies
- Data-driven content placement optimization
- Automated subreddit discovery reduces manual research time by 90%

## 🏗️ System Architecture

This is a Reddit analytics system for marketing optimization consisting of:
- **Python scraper** that discovers and analyzes subreddits using multi-account Reddit API access
- **Next.js dashboard** for reviewing, categorizing, and analyzing Reddit data
- **Supabase backend** for data storage with real-time subscriptions

### Technical Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Scraper**: Python 3.13 + AsyncPRAW + Multi-proxy support
- **Deployment**: Vercel (dashboard) + PythonAnywhere (scraper)
- **Performance**: 17,100 requests/hour capacity, real-time updates

### Database Schema
**5 Core Tables** with optimized relationships:
- `subreddits` (4,865 records) - Main discovery target with review status
- `posts` (337,803 records) - Engagement data and content analysis
- `users` (77,283 records) - Quality scoring and behavior patterns
- `engagement_analytics` - Aggregated performance metrics
- `scraper_accounts` (10 accounts) - Multi-account management

**Key Fields**:
- `subreddits.review`: "Ok" | "No Seller" | "Non Related" | "User Feed"
- `subreddits.category_text`: Marketing category assignment
- `users.overall_user_score`: 0-10 quality ranking
- `posts.engagement_velocity`: Performance indicator

## 🔄 Development Workflow

### Code Standards
- **TypeScript**: Strict mode enabled, no implicit any
- **React**: Functional components with hooks, server components where possible
- **Testing**: Run `npm run lint` and `npx tsc --noEmit` before commits
- **Performance**: Use React.memo, useMemo, and useCallback for optimization

### Git Workflow
1. Create feature branch from `main`
2. Implement with comprehensive error handling
3. Test locally with real Supabase data
4. Run linting and type checking
5. Deploy to Vercel for staging review

### Error Handling Pattern
```typescript
const { handleAsyncOperation } = useErrorHandler()
await handleAsyncOperation(async () => {
  // API calls with automatic error boundaries
}, 'Operation failed')
```

## 📋 Commands Reference

### Dashboard Development (Next.js)
```bash
cd dashboard_development/b9-dashboard

# Development
npm run dev           # Start development server with Turbopack

# Build & Deploy
npm run build         # Build for production
npm run lint          # Run ESLint
npx tsc --noEmit     # Type-check without emitting files

# Environment setup
cp env.example .env.local  # Setup environment variables
```

### Python Scraper
```bash
# Install dependencies
pip3 install -r config/requirements.txt

# Run scraper
python3 src/reddit_scraper.py           # Main proxy-enabled scraper
python3 run_scraper.py                  # Easy launcher
python3 tools/simple_category_manager.py # Category management tool
```

## 🗂️ Project Architecture

### Dashboard Structure
- `/dashboard_development/b9-dashboard/` - Next.js 15 app with App Router
  - `/src/app/(dashboard)/` - **Core Pages**: subreddit-review, categorization, posting, analytics
  - `/src/components/` - **Reusable UI**: SubredditTable, MetricsCards, CategorySelector (shadcn/ui)
  - `/src/lib/` - **Core Logic**: Supabase client, error handling, authentication
  - `/src/app/api/` - **API Routes**: categories, health, scraper stats, user data

### Data Flow Architecture
1. **Collection**: Python scraper → Reddit API → Supabase
2. **Processing**: Real-time subscriptions → Dashboard state
3. **Review**: Human categorization → Marketing workflow
4. **Analysis**: Engagement metrics → Strategic decisions

### Core Workflows
1. **Discovery**: Scraper finds new subreddits through user activity analysis
2. **Review**: Manual categorization via dashboard (Ok/No Seller/Non Related)  
3. **Categorization**: Marketing tag assignment for approved subreddits
4. **Optimization**: Posting time and content type recommendations

## 🚀 Feature Roadmap

### Current Sprint (Live Production)
- ✅ **Subreddit Review System**: Bulk categorization with keyboard shortcuts
- ✅ **Real-time Metrics**: Live subscriber counts and engagement data
- ✅ **Advanced Filtering**: Search, status filters, infinite scroll
- ✅ **Multi-account Scraping**: 3 Reddit accounts + proxy rotation

### Next Quarter (Q1 2025)
- 🔄 **Automated Categorization**: ML-based subreddit classification
- 🔄 **Content Scheduler**: Optimal posting time recommendations
- 🔄 **Engagement Prediction**: Success probability scoring
- 🔄 **API Monetization**: External access for partner agencies

### Future Vision (2025)
- 📈 **Competitor Analysis**: Track competing OnlyFans creators
- 📈 **Content A/B Testing**: Performance comparison tools
- 📈 **Multi-platform Expansion**: TikTok, Instagram integration
- 📈 **White-label Solution**: Custom branding for agencies

## 📊 Performance Benchmarks

### Current Metrics (Production)
- **Scraping Capacity**: 17,100 requests/hour across 3 accounts
- **Data Processing**: ~150 subreddits analyzed/hour
- **User Profiling**: ~800 user profiles scored/hour  
- **Discovery Rate**: 500-1,000 new subreddits/day
- **Dashboard Response**: <200ms average API response time
- **Real-time Updates**: 30-second refresh + instant subscriptions

### Scalability Targets
- **Next Milestone**: 50,000+ subreddits by Q2 2025
- **Processing Goal**: 500 subreddits/hour with ML automation
- **User Growth**: 200,000+ user profiles by end of year
- **API Performance**: <100ms response time under full load

### Cost Optimization
- **Supabase**: ~$25/month for current data volume
- **Vercel**: Free tier sufficient for dashboard hosting
- **PythonAnywhere**: $5/month for scraper hosting
- **Reddit API**: Free within rate limits (100 req/min per account)

## 🔧 Technical Specifications

### Development Environment
- **Node Version**: >= 20.0.0 (specified in `.nvmrc` and `package.json`)
- **TypeScript**: Strict mode enabled, check types before committing
- **Python**: 3.13+ with asyncio for concurrent scraping
- **Database**: PostgreSQL 15+ with real-time subscriptions

### API Integration
- **Reddit Rate Limits**: 100 requests/minute per account (3 accounts = 300/min)
- **Proxy Support**: Decodo proxy format for IP rotation
- **Authentication**: JWT tokens for dashboard, OAuth2 for Reddit
- **Error Handling**: Exponential backoff with circuit breakers

### Deployment Pipeline
- **Dashboard**: Auto-deploy from `main` branch to Vercel
- **Database**: Supabase with automatic migrations
- **Scraper**: Manual deployment to PythonAnywhere
- **Monitoring**: Real-time error tracking and performance metrics

## Project Planning

Refer to `Plan.md` for:
- Current deployment status and URLs
- Feature roadmap and completed tasks
- Performance metrics and projections
- System architecture decisions

The Plan.md file should be continuously updated with task progress and new requirements.

## MCP Servers

The project has configured MCP (Model Context Protocol) servers for enhanced capabilities:

### Active MCP Servers

- **Filesystem** - Enhanced file operations with security controls
  - `npx @modelcontextprotocol/server-filesystem /Users/matejlecnik/Desktop/B9 Agencija d.o.o./Dashboard`
  - Provides secure file access to project directory with explicit root path

- **Sequential Thinking** - Advanced reasoning capabilities
  - `npx @modelcontextprotocol/server-sequential-thinking`
  - Enables structured problem-solving workflows and complex analysis

- **Supabase** - Direct database access and management
  - `npx -y @supabase/mcp-server-supabase@latest --project-ref=cetrhongdrjztsrsffuh`
  - Direct access to Reddit analytics database with service role permissions
  - Environment: `SUPABASE_ACCESS_TOKEN` configured

- **Playwright** - Browser automation and testing
  - `npx @playwright/mcp@latest`
  - Web scraping and automated testing capabilities for dashboard QA

- **GitHub** - Repository and CI/CD management
  - `npx @modelcontextprotocol/server-github`
  - Issue tracking, PR management, and automated workflow setup
  - Environment: `GITHUB_TOKEN` configured for API access

- **Vercel** - Deployment and hosting integration
  - SSE server at `https://mcp.vercel.com`
  - Requires authentication for deployment management

- **shadcn/ui** - Component library and UI tooling
  - Initialized via `npx shadcn@latest mcp init --client claude`
  - Configuration saved to `.mcp.json`
  - Provides enhanced component management and development tools

### Additional Development Tools Installed

- **Brave Search MCP** - Web search capabilities (deprecated but functional)
- **PostgreSQL MCP** - Direct database operations (deprecated but functional)

### MCP Server Status

Use `claude mcp list` to check server health. Currently active servers provide:
- Enhanced file system operations beyond standard Claude Code tools
- Direct Supabase database queries and management
- Browser automation for testing and data collection
- Structured reasoning for complex problem-solving

### MCP Configuration

MCP servers are configured in `~/.claude.json` with appropriate environment variables and authentication tokens. The Supabase server has direct access to the project database using service role credentials.

## 🚀 Development Roadmap & Agent Management

### Current Development Priority: PHASE 1 - Immediate Fixes
**Status**: Ready to begin implementation
**Timeline**: Week 1-2 (Current Focus)

### 📋 Master Implementation Plan

#### **Phase 1: Critical Infrastructure (CURRENT)**
**Goal**: Fix broken functionality and establish stable foundation

1. **Scraper Monitoring Recovery** 🔧
   - **Status**: BROKEN - Scraper page not working
   - **Agent**: Scraper Monitoring Agent
   - **Priority**: URGENT
   - **Outcome**: Real-time backend status dashboard

2. **Bug Prevention System** 🛡️
   - **Status**: Missing error handling
   - **Agent**: Testing & Protection Agent  
   - **Priority**: HIGH
   - **Outcome**: Zero-crash guarantee

3. **File Protection Framework** 📁
   - **Status**: No safeguards in place
   - **Agent**: Protection Agent
   - **Priority**: MEDIUM
   - **Outcome**: Prevent accidental breaking changes

#### **Phase 2: User Experience Enhancement (NEXT)**
**Goal**: Apple-style aesthetic and smooth workflows

1. **Apple UI Design System** 🎨
   - **Status**: Basic styling exists
   - **Agent**: Apple UI Agent
   - **Priority**: HIGH  
   - **Outcome**: Frosted glass, smooth animations, spacious layouts

2. **Dashboard Filter Improvements** ⚙️
   - **Status**: Functional but basic
   - **Agent**: Website Filter Agent
   - **Priority**: MEDIUM
   - **Outcome**: Advanced filtering and search capabilities

3. **Performance Optimization** ⚡
   - **Status**: Good but can improve
   - **Agent**: Performance Agent
   - **Priority**: MEDIUM
   - **Outcome**: Sub-200ms page loads

#### **Phase 3: Intelligence & Automation (FUTURE)**
**Goal**: AI-powered assistance and smart workflows

1. **Smart Subreddit Filtering** 🧠
   - **Status**: Manual review of 10k subreddits
   - **Agent**: Smart Filter Agent
   - **Priority**: HIGH
   - **Outcome**: 70% reduction in manual review time

2. **AI Categorization System** 🤖
   - **Status**: Manual categorization only
   - **Agent**: AI Categorization Agent  
   - **Priority**: HIGH
   - **Outcome**: Automated category suggestions

3. **Advanced Monitoring** 📊
   - **Status**: Basic monitoring exists
   - **Agent**: Monitoring Agent
   - **Priority**: MEDIUM
   - **Outcome**: Comprehensive system health tracking

#### **Phase 4: DevOps & Testing Automation (FINAL)**
**Goal**: Professional development and deployment workflow

1. **CI/CD Pipeline** 🚀
   - **Status**: Manual deployment
   - **Agent**: GitHub/Vercel Deploy Agent
   - **Priority**: MEDIUM
   - **Outcome**: Automated testing and deployment

2. **E2E Testing Framework** 🎭
   - **Status**: Manual testing only
   - **Agent**: Playwright Testing Agent
   - **Priority**: MEDIUM  
   - **Outcome**: Automated regression testing

3. **Platform Expansion Prep** 🌐
   - **Status**: Reddit-only currently
   - **Agent**: Multi-Platform Agent
   - **Priority**: LOW
   - **Outcome**: TikTok/Instagram integration ready

### 🤖 Specialized Agent Assignments

#### **Currently Active Agents**
1. **Scraper Monitoring Agent** - Fixing broken scraper page
2. **Apple UI Agent** - Design system implementation
3. **Protection Agent** - File safety and error prevention

#### **Planned Agent Creation**
4. **Website Filter Agent** - Dashboard filtering improvements
5. **Smart Filter Agent** - Subreddit pre-filtering (careful keywords only)
6. **AI Categorization Agent** - Automated category detection
7. **GitHub/Vercel Deploy Agent** - Deployment automation
8. **Playwright Testing Agent** - Automated site testing

### 📊 Progress Tracking System

#### **Current Sprint Metrics**
- **Broken Features**: 1 (Scraper page)
- **Critical Bugs**: TBD (needs assessment)
- **Manual Tasks**: Subreddit review (10k items)
- **Testing Coverage**: 0% (manual only)

#### **Success Criteria by Phase**
- **Phase 1**: Zero broken pages, stable error handling
- **Phase 2**: Apple aesthetic achieved, smooth UX
- **Phase 3**: 70% reduction in manual work, AI assistance
- **Phase 4**: Automated deployment, comprehensive testing

### 📁 Implementation Strategy

Each component will receive a `DEVELOPMENT_PLAN.md` file containing:
- **Current State Analysis** - What works/doesn't work
- **Target Goals** - Specific outcomes desired  
- **User Questions** - What I need to know from you
- **Technical Requirements** - Implementation details
- **Agent Assignment** - Which specialist handles it
- **Timeline** - Expected completion dates

### 🎯 Immediate Next Steps

1. **Create DEVELOPMENT_PLAN.md files** for each major component
2. **Define specific questions** for user input on each plan
3. **Activate Scraper Monitoring Agent** to fix broken page
4. **Begin Apple UI Agent development** for design system
5. **Establish bug prevention** framework

This roadmap ensures systematic improvement of your OnlyFans agency dashboard while maintaining focus on immediate business needs and long-term scalability goals.