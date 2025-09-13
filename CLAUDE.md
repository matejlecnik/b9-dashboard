# B9 Dashboard - Developer Guide

Reddit marketing analytics platform for B9 Agency. OnlyFans creator audience discovery on Reddit. 500K+ posts analyzed, 5,800+ subreddits discovered.

> ⚠️ **Note**: This file is mirrored as `.cursor/rules/plan.mdc` for Cursor AI.

---

## 🚨 Ground Rules

### 📁 DIRECTORY DOCUMENTATION RULE (MANDATORY)
Every substantial directory MUST have a README.md containing:
- **Overview**: What this directory does and why it exists
- **TODO List**: Current tasks and priorities
- **Current Errors**: Known issues and their status/fixes
- **Potential Improvements**: Ideas that need discussion before implementing

**CRITICAL**: ALWAYS ask before implementing improvements - don't just code them!

### ❌ NEVER Do This
- **Don't implement keyboard navigation in tables** - We explicitly disabled this per user preference. Mouse/touch only.
- **Don't add AI review functionality back** - We removed it deliberately. Categorization only.
- **Don't create standalone scripts** - Everything goes through the API now. No more `/scripts` folder.
- **Don't bypass rate limiting** - Reddit will ban our accounts if you do.
- **Don't commit secrets** - Even in .env files. Use .env.example instead.
- **Don't implement improvements without asking** - Always discuss changes first.

### ✅ ALWAYS Do This
- **Create README.md for every major directory** - Follow the mandatory documentation rule above
- **Run linting before committing** - `npm run lint` and `npx tsc --noEmit`
- **Test builds after ANY change** - Dependencies break constantly, catch it early
- **Test with real data** - We have a Supabase instance loaded with actual Reddit data
- **Use direct Supabase calls** - Always use direct Supabase queries instead of API routes for better performance and reliability
- **Use the error handler pattern** - Every API call should use our error boundaries
- **Check performance** - React.memo, useMemo, useCallback are your friends
- **Review all imports** - AI-generated code often has redundant/conflicting imports
- **Ask before implementing** - This is an internal tool, requirements change often
- **Use number abbreviations in UI** - Format large numbers as 1.2K, 500M, etc. for ALL filter counts and stats displays

---

## 🧠 Stack

- **Frontend**: Next.js 15 + TypeScript + shadcn/ui (Vercel)
- **Backend**: Python FastAPI + Redis (Render)
- **Database**: Supabase PostgreSQL
- **Architecture**: Dashboard → API → Supabase + Background Workers

---

## 🔥 Build Error Fixes

**Thousands of build errors are normal** - here's how to fix them:

### Nuclear Option
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps

# Still broken?
npm install --force
npm install --legacy-peer-deps --no-optional
```

### Common Fixes
```bash
npm install next@15.5.x react@18.x react-dom@18.x --save-exact
npm install typescript@5.x --save-exact
npm install @radix-ui/react-* --legacy-peer-deps
npm install eslint-config-next@15.x --save-exact
```

### Error Patterns
- "Module not found" → Check import paths
- "Peer dependency" → Use `--legacy-peer-deps`
- "Cannot resolve" → Delete node_modules, reinstall
- "TypeScript error" → Check tsconfig.json paths

### Emergency: `npm install --legacy-peer-deps --force --no-audit --no-fund`

---

## 🤖 AI-Generated Codebase

**CRITICAL**: Entire codebase built by AI. Expect:
- Inconsistent patterns
- Redundant imports (might break if removed)
- Over-engineered solutions
- Missing error handling
- Conflicting dependencies

**Before changing anything**:
1. Review ALL imports
2. Test in isolation
3. Verify backend endpoints exist
4. Check TypeScript strict mode

---

## 🚀 Setup

**Prerequisites**: Node.js 20+, Python 3.12+

```bash
# Clone
git clone <repo-url> && cd B9-Dashboard

# Frontend
cd dashboard && npm install && cp .env.example .env.local
npm run dev  # localhost:3000

# Backend
cd api && pip3 install -r requirements.txt && cp .env.example .env
python3 main.py  # localhost:8000
```

**Environment Variables**:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=same-as-above
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
REDIS_URL=redis://localhost:6379
```

---

## 🏗️ Project Structure

```
B9-Dashboard/
├── dashboard/               # Next.js frontend
│   ├── src/app/(dashboard)/ # Main pages (review, categorization, posting, etc.)
│   └── src/components/      # Reusable UI
├── api/                     # Python FastAPI backend
│   ├── services/            # Business logic (categorization, scraping, users)
│   ├── tasks/               # Background jobs
│   └── main.py             # FastAPI app
├── scraper/                 # Reddit data collection
└── config/                  # Setup files
```

**Note**: `/scripts` folder removed - everything now goes through API endpoints.

---

## 💼 The Business Context (Important!)

### What B9 Agency Actually Does
This is an **internal tool for B9 Agency ONLY** - not a public platform or SaaS product.

1. **Discover** new subreddits through Reddit scraping and analysis
2. **Score** each subreddit based on proprietary algorithms (your secret sauce)
3. **Review** them manually (Ok/No Seller/Non Related/User Feed)
4. **Track** top-performing subreddits for OnlyFans marketing campaigns
5. **Keep tabs** on community changes and performance over time

### Reality Check - The Numbers
- **5,819 subreddits** discovered and analyzed
- **Only 10-20% are actually useful** (you mentioned this realistic conversion rate)
- **500+ "Ok" subreddits** have been approved for campaigns
- **Scraper currently doesn't work reliably** (known issue)
- **Site breaks frequently** when adding new features

### Internal Team Workflow
1. Agency team logs in → reviews new discoveries
2. Analyzes subreddit scores → identifies top performers
3. Manually reviews questionable ones → categorizes appropriately
4. Uses approved subreddits for client campaigns
5. Tracks performance and adjusts scoring algorithm

### Future Vision - Multiple Dashboards
This Reddit dashboard is just the beginning. Plans include:
- **Multiple dashboard instances** with different Supabase URLs
- **Different social media platforms** (Instagram, TikTok, etc.)
- **Custom dashboards** for whatever the agency needs
- **Scalable architecture** to handle multiple data sources

This context matters because every feature decision should help B9 Agency find and track the best subreddits more efficiently.

---


## ⚡ **STANDARDIZED PATTERNS** (Required Reading)

After resolving persistent errors with React 19 + Next.js 15, these patterns are **MANDATORY** to prevent future issues:

### 🛠️ **Server Actions Pattern (FIXED)**
```typescript
// Server Action File (actions.ts)
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function actionName(
  prevState: { error: string | null },
  formData: FormData
) {
  // Implementation here
  
  // Always handle errors properly
  if (error) {
    return { error: "User-friendly message" }
  }
  
  // On success, revalidate and redirect
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
```

```typescript
// Client Component (page.tsx)
'use client'

import { useFormState } from 'react-dom' // ← NEVER use useActionState
import { actionName } from './actions'

export default function MyPage() {
  const [state, formAction] = useFormState(actionName, { error: "" })
  
  return (
    <form action={formAction}>
      {state?.error && <div>{state.error}</div>}
      {/* Form fields */}
    </form>
  )
}
```

### 🚨 **NEVER Use These (Causes Errors)**
- ❌ `useActionState` from React (experimental, incompatible with Next.js 15)
- ❌ Version mismatches in package.json
- ❌ Mixing server/client boundaries incorrectly

### ✅ **ALWAYS Use These (Stable)**
- ✅ `useFormState` from `react-dom` for server actions
- ✅ `React.startTransition()` for performance-critical state updates
- ✅ Exact version pinning for Next.js in package.json
- ✅ `'use server'` and `'use client'` directives explicitly

### 🔧 **Performance Patterns**
```typescript
// For frequent state updates (like search, filters)
React.startTransition(() => {
  setSearchQuery(newValue)
  setFilters(newFilters)
})

// For expensive computations
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

// For optimized event handlers
const handleChange = useCallback((value) => {
  React.startTransition(() => {
    onChange(value)
  })
}, [onChange])

// For formatting large numbers in UI (ALWAYS use this)
const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0'
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}
```

### 📋 **Pre-Commit Checklist**
Before every commit, ensure:
- [ ] No experimental React hooks used
- [ ] All server actions use `useFormState`
- [ ] Package.json versions match installed versions
- [ ] `npm run build` succeeds
- [ ] No console errors in development

---

## 🔥 Common Tasks

**New Dashboard Page**: Create in `dashboard/src/app/(dashboard)/your-page/`, add README.md, update navigation
**New API Endpoint**: Add to `api/main.py`, use error handling + rate limiting, test with curl
**Categorization**: `curl -X POST localhost:8000/api/categorization/start -d '{"batchSize":30}'`

---

## 📊 Performance

**Frontend**: Use `react-window` for >1000 rows, `useMemo`/`React.memo`, proper caching
**Backend**: Index queries, limit results, Redis caching, Reddit 100req/min per account  
**Database**: Always `LIMIT` queries, use indexes

---

## ⚠️ Known Issues

**Major Problems**:
- **Scraper doesn't work** (proxy config, API creds, account rotation)
- **Site breaks when adding features** (architecture fragility)
- **Build errors constantly** (dependency conflicts)
- **Low conversion rate** (10-20% useful discoveries)

**Before Development**: `npm run build`, test scraper, verify DB connection
**Emergency**: Delete node_modules, `npm install --legacy-peer-deps`, `git checkout -- files`

---

## 🚨 Gotchas

**Reddit**: Rate limits per account (10 accounts = 1000req/min), use `display_name`, check `[removed]`
**Next.js**: Use `'use client'`, `NEXT_PUBLIC_` for client vars, `next/image`
**Supabase**: RLS policies, clean up subscriptions, connection pooling
**Errors**: Check import paths, rate_limit decorator, null checks, env vars

---

## 📈 Monitoring

**Metrics**: API <200ms, Reddit <1000req/min, Errors <1%
**Debug**: `npm run dev`, `LOG_LEVEL=debug python3 main.py`  
**Logs**: Browser console, Render logs, Supabase dashboard

---

## 🎯 Pre-Commit Checklist

- [ ] `npm run build` + `npm run lint` + `npx tsc --noEmit`
- [ ] Review imports, test existing pages, verify endpoints exist  
- [ ] Real data tested, error handling added, README updated
- [ ] No secrets committed

---

## 🤝 Getting Help

Check CLAUDE.md → folder READMEs → browser console/API logs
Workflow: discover → review → categorize → recommend
Priority: creator experience for OnlyFans marketing

---

## 🏆 Quick Wins

Loading states, user-friendly errors, data validation, performance optimization, test coverage

---

## 📚 Resources

**Docs**: Next.js, FastAPI, Supabase, Reddit API docs  
**Internal**: `api/README.md`, component READMEs, Supabase dashboard, Render/Vercel

---

## 🎬 Recent Changes

- Manual research (4hrs) → automated (10min)
- Scripts → API endpoints  
- Railway → Render deployment
- Removed AI review (categorization only)
- **FIXED: React 19 + Next.js 15 compatibility**

---

*Built for B9 Agency - Optimizing OnlyFans marketing through Reddit intelligence.*
- Always rememember to clen the dead code