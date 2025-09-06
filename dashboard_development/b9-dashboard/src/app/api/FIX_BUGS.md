# 🔧 Fix Bugs - API Routes Issues

## 🐛 Bug 1: API Routes Need Null Checks for Supabase

### Affected Files
All API routes using `await createClient()`:
- `/api/ai/accuracy-metrics/route.ts`
- `/api/ai/bulk-categorize/route.ts`
- `/api/ai/categorize/route.ts`
- `/api/ai/export/route.ts`
- `/api/categories/route.ts`
- `/api/categories/[id]/route.ts`
- `/api/filters/route.ts`
- `/api/filters/stats/route.ts`
- `/api/filters/whitelist/route.ts`
- `/api/filters/learning/route.ts`
- `/api/filters/refilter/route.ts`
- `/api/health/route.ts`
- `/api/scraper/status/route.ts`
- `/api/reddit/user/route.ts`
- `/api/users/toggle-creator/route.ts`

### Fix Prompt for Claude
```
Add null checks to all API routes after await createClient():

1. After each: const supabase = await createClient()
2. Add immediately after:
   if (!supabase) {
     return NextResponse.json({ 
       error: 'Database connection not available' 
     }, { status: 503 })
   }
3. Make sure all HTTP methods (GET, POST, PUT, DELETE) have the check
4. Import NextResponse if not already imported
```

---

## 🐛 Bug 2: Unused Variables ESLint Warnings

### Affected Files & Lines
- `accuracy-metrics/route.ts:159` - `sessionsError` 
- `bulk-categorize/route.ts:225` - `suggestionsError`
- `categorize/route.ts:3` - `MARKETING_CATEGORIES`
- `export/route.ts:197` - `includeMetrics`
- `filters/route.ts:4` - `_request` parameter
- `filters/stats/route.ts:9` - `_request` parameter  
- `filters/whitelist/route.ts:4` - `_request` parameter
- `scraper/status/route.ts:43` - `subredditsError`

### Fix Prompt for Claude
```
Clean up unused variables in API routes:

1. For unused error variables like 'sessionsError':
   - Either use them in error handling
   - Or remove the variable assignment: const { data, error } = await... becomes const { data } = await...

2. For unused request parameters:
   - Prefix with underscore: request -> _request
   - Or remove if not needed in function signature

3. For unused imports like MARKETING_CATEGORIES:
   - Remove the import if truly unused
   - Or find where it should be used
```

---

## 🐛 Bug 3: OpenAI Integration in AI Routes

### Affected Files
- `/api/ai/categorize/route.ts`
- `/api/ai/bulk-categorize/route.ts`

### Current Problem
These routes assume OpenAI client is always available

### Fix Prompt for Claude
```
Update AI routes to handle missing OpenAI:

1. Check if OpenAI is configured at start of handler:
   if (!process.env.OPENAI_API_KEY) {
     return NextResponse.json({ 
       error: 'AI features not configured',
       message: 'OpenAI API key is required for this feature'
     }, { status: 503 })
   }

2. In the openai.ts functions, check if client is null:
   if (!openai) {
     throw new Error('OpenAI client not initialized')
   }

3. Wrap OpenAI calls in try-catch blocks
4. Return appropriate error messages when AI is unavailable
```

---

## 📋 Quick Test Commands

### Test Individual API Route
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test with missing Supabase (should return 503)
unset NEXT_PUBLIC_SUPABASE_URL
npm run dev
curl http://localhost:3000/api/health
```

### Test Build
```bash
npm run build
```

### Test Linting Only
```bash
npm run lint
```

## ✅ Success Criteria

1. All API routes handle null Supabase client gracefully
2. No unused variable warnings in ESLint
3. AI routes work without OpenAI key (return appropriate errors)
4. Build succeeds without environment variables