# ESLint Cleanup Agent

## 🎯 Mission
Clean up all ESLint warnings by removing unused variables, imports, and fixing unused ESLint directives.

## 🔍 Current Issues
24 unused variable warnings across multiple files:

### Files with unused imports/variables:
1. **apple-showcase/page.tsx** - `Toast`, `Pause`
2. **categorization/page.tsx** - `aiSuggestions`
3. **filters/page.tsx** - `Filter`, `Settings`, `Users`, `index`
4. **scraper/page.tsx** - `Zap`, `TrendingDown`
5. **subreddit-review/page.tsx** - `observerRef`
6. **API routes** - Various `Error` variables and unused parameters
7. **Components** - `AISuggestionBadge`, unused props
8. **CategorySelector.tsx** - Unused ESLint directives

## 📋 Tasks
1. Remove unused imports from all affected files
2. Remove or use unused variables
3. Fix unused ESLint disable directives
4. Verify code still functions after cleanup

## 🤖 Agent Prompt
```
I need you to clean up all ESLint warnings in the Next.js project. Here's the systematic approach:

1. **Remove unused imports** in these files:
   - `src/app/(dashboard)/apple-showcase/page.tsx` - Remove `Toast`, `Pause`
   - `src/app/(dashboard)/categorization/page.tsx` - Remove `aiSuggestions` or use it
   - `src/app/(dashboard)/filters/page.tsx` - Remove `Filter`, `Settings`, `Users`, unused `index`
   - `src/app/(dashboard)/scraper/page.tsx` - Remove `Zap`, `TrendingDown`
   - `src/app/(dashboard)/subreddit-review/page.tsx` - Remove `observerRef` or use it

2. **Fix API route warnings**:
   - Remove unused error variables like `sessionsError`, `suggestionsError`
   - Remove unused `request` parameters where not needed
   - Remove unused constants like `MARKETING_CATEGORIES`

3. **Fix component warnings**:
   - Remove unused imports in `SubredditTable.tsx`
   - Fix unused ESLint directives in `CategorySelector.tsx`

4. **Test after cleanup**:
   ```bash
   npm run build
   npm run lint
   ```

Focus on removing imports/variables that are clearly not used. For variables that might be used in the future, add a comment or underscore prefix.
```

## ✅ Success Criteria
- Zero ESLint warnings
- Code still functions properly
- Clean import statements
- No unused variables

## 🚀 Quick Commands
```bash
cd dashboard_development/b9-dashboard
# After cleanup:
npm run lint
npm run build
```

## 📝 Common Patterns to Remove
```typescript
// Remove unused imports:
import { Toast, Pause } from '...' // if not used

// Remove unused variables:
const [unused, setUnused] = useState() // if not referenced

// Remove unused parameters:
export async function GET(request: NextRequest) // if request not used
// Change to:
export async function GET(_request: NextRequest)

// Remove unused ESLint directives:
// eslint-disable-next-line no-var // if no violation exists
```