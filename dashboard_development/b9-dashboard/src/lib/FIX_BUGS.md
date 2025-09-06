# 🔧 Fix Bugs - Library Initialization Issues

## 🐛 Bug 1: Supabase Client Fails During Build

### Error
```
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

### Location
`/src/lib/supabase.ts`

### Current Problem
- Lines 3-5: Environment variables accessed with fallback to empty string
- Line 11: Client creation attempts even with empty strings
- Line 19: Server client returns null but TypeScript doesn't know

### Fix Prompt for Claude
```
Fix the Supabase client initialization in /src/lib/supabase.ts to:
1. Handle missing environment variables gracefully during build time
2. Return null when env vars are missing but don't throw errors
3. Make TypeScript understand the client can be null
4. Don't break runtime functionality when env vars ARE present

The client should:
- Return null during build when env vars are missing
- Work normally at runtime when env vars exist
- Not cause TypeScript errors in consuming code
```

---

## 🐛 Bug 2: OpenAI Client Fails During Build

### Error  
```
Error: Missing credentials. Please pass an apiKey, or set the OPENAI_API_KEY environment variable.
```

### Location
`/src/lib/openai.ts`

### Current Problem
- Lines 3-9: OpenAI client created immediately even without API key
- Functions using `openai` don't check if it's null

### Fix Prompt for Claude
```
Fix the OpenAI client initialization in /src/lib/openai.ts to:
1. Only create the OpenAI client if OPENAI_API_KEY exists
2. Make all functions handle the case where openai is null
3. Return appropriate error responses when OpenAI is unavailable
4. Don't break the build when the API key is missing

Functions should:
- Check if openai is null before using it
- Return error results indicating AI features are unavailable
- Not throw exceptions during build
```

---

## 🐛 Bug 3: TypeScript Strict Null Checks

### Error
```
Type error: 'supabase' is possibly 'null'
```

### Affected Files
- Any file importing and using the Supabase client
- Any file importing and using the OpenAI client

### Fix Prompt for Claude
```
Update all files that use createClient() or the openai client to:
1. Add null checks after getting the client
2. Handle the null case appropriately (return error, redirect, etc.)
3. Ensure TypeScript is satisfied with the null handling

Pattern to follow:
const client = await createClient()
if (!client) {
  // Handle missing client appropriately
  return error response or redirect
}
// Continue with client usage
```

---

## 📋 Testing Instructions

1. **Test without env vars**:
   ```bash
   unset NEXT_PUBLIC_SUPABASE_URL
   unset NEXT_PUBLIC_SUPABASE_ANON_KEY
   unset OPENAI_API_KEY
   npm run build
   ```

2. **Test with env vars**:
   ```bash
   # Set your actual env vars
   npm run build
   npm run dev
   ```

3. **Verify both scenarios work**:
   - Build completes without env vars
   - App works normally with env vars