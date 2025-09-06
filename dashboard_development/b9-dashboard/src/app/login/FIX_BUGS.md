# 🔧 Fix Bugs - Login Actions

## 🐛 Bug: Supabase Client Null Check Missing

### Error
```
Type error: 'supabase' is possibly 'null'.
Line 18: const { error } = await supabase.auth.signInWithPassword(data)
```

### Location
`/src/app/login/actions.ts`

### Current Problem
- Line 9: Gets Supabase client with `await createClient()`
- Line 18: Uses `supabase.auth` without checking if null
- TypeScript complains because client can be null now

### Fix Prompt for Claude
```
Fix the login action in /src/app/login/actions.ts:

1. After: const supabase = await createClient()
2. Add null check:
   if (!supabase) {
     redirect('/error')
   }
3. This ensures supabase is not null for the rest of the function
4. Check if there are other auth-related files with similar issues

Also check for similar patterns in:
- Any signup actions
- Any logout actions  
- Any other auth-related server actions
```

---

## 📋 Related Files to Check

Look for similar patterns in:
- `/src/app/signup/` (if exists)
- `/src/app/logout/` (if exists)
- `/src/app/auth/` (if exists)
- Any other files using `supabase.auth`

### Fix Pattern
```typescript
export async function authAction(formData: FormData) {
  const supabase = await createClient()
  
  // Add this check
  if (!supabase) {
    redirect('/error') // or return error response
  }
  
  // Now safe to use supabase
  const { error } = await supabase.auth.someMethod()
  // ...
}
```

---

## 🧪 Testing

1. **Test without Supabase env vars**:
   ```bash
   unset NEXT_PUBLIC_SUPABASE_URL
   unset NEXT_PUBLIC_SUPABASE_ANON_KEY
   npm run build
   ```
   - Should build successfully
   - Login should redirect to error page

2. **Test with Supabase env vars**:
   ```bash
   # Set your env vars
   npm run dev
   ```
   - Login should work normally

## ✅ Success Criteria

- TypeScript no longer complains about possibly null supabase
- Build succeeds without environment variables
- Login works normally when env vars are present
- Graceful error handling when Supabase is unavailable