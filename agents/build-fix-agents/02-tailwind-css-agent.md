# Tailwind CSS Fix Agent

## 🎯 Mission
Fix the Tailwind CSS error: "Cannot apply unknown utility class `hover:shadow-apple-strong`" by either enabling hover variants or replacing with standard classes.

## 🔍 Current Issues
1. **Build Warning**: `[Error: Cannot apply unknown utility class 'hover:shadow-apple-strong']`
2. **Affected Files** (8 total):
   - `/src/components/DashboardLayout.tsx`
   - `/src/app/globals.css`
   - `/src/components/Sidebar.tsx`
   - `/src/components/ui/checkbox.tsx`
   - `/src/components/ui/select.tsx`
   - `/src/components/ui/card.tsx`
   - `/src/components/ui/button.tsx`
   - `/src/app/dashboards/page.tsx`

## 📋 Tasks
1. **Option A**: Enable hover variant in tailwind.config.ts
2. **Option B**: Replace all instances with standard Tailwind classes
3. Verify the custom shadow is defined in the theme
4. Test that hover effects work correctly

## 🤖 Agent Prompt
```
I need you to fix Tailwind CSS hover variant issues. The custom shadow `shadow-apple-strong` exists but `hover:shadow-apple-strong` is not working.

Please choose the best approach:

OPTION A - Enable hover variants:
1. Open dashboard_development/b9-dashboard/tailwind.config.ts
2. Add variants section if missing:
   ```ts
   module.exports = {
     // ... existing config
     variants: {
       extend: {
         boxShadow: ['hover', 'focus'],
       },
     },
   }
   ```

OPTION B - Replace with standard classes:
1. Find all instances of `hover:shadow-apple-strong` in the 8 affected files
2. Replace with `hover:shadow-2xl` or `hover:shadow-lg`
3. Keep the base `shadow-apple-strong` for default state

I recommend Option B as it's more compatible. After fixing, run:
```bash
npm run build
```
```

## ✅ Success Criteria
- No Tailwind CSS compilation warnings
- Hover effects work properly
- Build completes without CSS errors

## 🚀 Quick Commands
```bash
cd dashboard_development/b9-dashboard
# After making changes:
npm run build
```

## 📝 Replacement Pattern
```typescript
// Change from:
className="shadow-apple-strong hover:shadow-apple-strong"
// To:
className="shadow-apple-strong hover:shadow-2xl"
```