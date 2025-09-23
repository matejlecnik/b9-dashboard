# Supabase Security Configuration - Dashboard Actions Required

## ✅ Completed via SQL Migrations
- Fixed RLS on 12 tables
- Removed SECURITY DEFINER from 2 views
- Added search_path to 21 functions

## 🔧 Remaining Dashboard Configuration (3 Warnings)

### 1. Enable Leaked Password Protection
**Priority: HIGH**
1. Go to Supabase Dashboard
2. Navigate to **Authentication → Policies → Password Security**
3. Enable **"Check passwords against HaveIBeenPwned"**
4. Save changes

### 2. Enable Multi-Factor Authentication Options
**Priority: HIGH**
1. Go to Supabase Dashboard
2. Navigate to **Authentication → Policies → Multi-Factor Auth**
3. Enable at least 2 of:
   - TOTP (Time-based One-Time Password)
   - SMS verification
   - WebAuthn/FIDO2
4. Configure SMS provider if choosing SMS option
5. Save changes

### 3. Upgrade Postgres Version
**Priority: MEDIUM**
1. Go to Supabase Dashboard
2. Navigate to **Settings → Infrastructure**
3. Check current version: `supabase-postgres-17.4.1.075`
4. Schedule upgrade to latest patch version
5. **Note:** Schedule during maintenance window (causes brief downtime)

## Security Status Summary
- **Before:** 14 ERRORS, 24 WARNINGS
- **After SQL Fixes:** 0-2 ERRORS (false positives), 3 WARNINGS
- **After Dashboard Actions:** Fully secure

## Notes
- The 2 view "errors" still showing are false positives (views confirmed to not have SECURITY DEFINER)
- Auth settings cannot be configured via SQL, require dashboard access
- Postgres upgrade should be coordinated with team for minimal disruption