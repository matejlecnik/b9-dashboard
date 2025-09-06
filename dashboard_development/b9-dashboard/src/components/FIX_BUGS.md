# 🔧 Fix Bugs - Component Issues

## 🐛 Bug 1: Unused Imports in SubredditTable

### Location
`/src/components/SubredditTable.tsx`

### ESLint Warnings
- Line 10: `AISuggestionBadge` imported but never used
- Line 47: `showAISuggestions` prop defined but never used
- Line 48: `onAIFeedback` prop defined but never used

### Fix Prompt for Claude
```
Clean up SubredditTable.tsx:

1. Remove unused import: AISuggestionBadge
2. Either:
   a) Remove showAISuggestions and onAIFeedback from props if not needed
   b) Or implement the AI suggestion feature using these props
3. If removing props, also remove them from parent components that pass them

Check where SubredditTable is used and update those files too.
```

---

## 🐛 Bug 2: Unused Prop in AISuggestionBadge

### Location  
`/src/components/AISuggestionBadge.tsx`

### ESLint Warning
- Line 26: `subredditName` prop defined but never used

### Fix Prompt for Claude
```
Fix AISuggestionBadge.tsx:

1. Check if subredditName prop is used in the component
2. If not used, remove it from the interface
3. If it should be used, implement its usage
4. Update any components passing this prop
```

---

## 🐛 Bug 3: ESLint Directive Issues in CategorySelector

### Location
`/src/components/CategorySelector.tsx`

### ESLint Warnings
- Line 11: Unused eslint-disable directive (no problems from 'no-var')
- Line 13: Unused eslint-disable directive (no problems from 'no-var')

### Current Code
```typescript
// eslint-disable-next-line no-var
var __b9_categories_cache_names: string[] | null | undefined
// eslint-disable-next-line no-var
var __b9_categories_cache_promise: Promise<string[]> | null | undefined
```

### Fix Prompt for Claude
```
Fix CategorySelector.tsx ESLint directives:

Option 1 - Remove the directives if var is allowed:
1. Remove the // eslint-disable-next-line no-var comments
2. Keep the var declarations as they are needed for global state

Option 2 - Configure ESLint properly:
1. Add proper ESLint configuration for global vars
2. Or use a different pattern that doesn't require var

Option 3 - Suppress at file level if intentional:
1. Add /* eslint-disable no-var */ at top of file
2. Remove individual line suppressions
```

---

## 📋 Component Dependencies

### SubredditTable is used in:
- `/src/app/(dashboard)/subreddit-review/page.tsx`
- `/src/app/(dashboard)/categorization/page.tsx`
- Possibly other dashboard pages

### When fixing, check:
1. Props passed to SubredditTable
2. Whether AI features are implemented or planned
3. If removing features, ensure no broken functionality

---

## 🧪 Testing Components

### Check for TypeScript errors:
```bash
npx tsc --noEmit
```

### Check for ESLint issues:
```bash
npm run lint
```

### Test component rendering:
```bash
npm run dev
# Navigate to pages using these components
# Ensure no console errors
```

---

## ✅ Success Criteria

1. No ESLint warnings for unused variables/imports
2. No unused ESLint directives
3. Components work as expected
4. Parent components updated if props removed
5. Build succeeds without warnings