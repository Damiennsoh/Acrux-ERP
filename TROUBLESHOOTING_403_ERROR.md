# Troubleshooting Guide: Failed to Save Development Tool (403 Error)

## Symptoms
- Error message: "Failed to save development tool"
- Browser console shows: `Failed to load resource: ...development_tools:1` with status `403`
- Auth token errors with status `400`

## Root Causes & Solutions

### Issue #1: Missing or Incomplete Database Schema

**Symptom**: 403 error when trying to write to development_tools table.

**Solution**:
1. Go to your Supabase project → SQL Editor
2. Open the file `supabase_schema.sql` from the Acrux-ERP repository
3. Copy the entire contents and paste into the Supabase SQL Editor
4. Click "Run" to execute the schema
5. Wait for it to complete (you should see "Success" message)
6. Refresh your app and try again

**Verification**:
- Go to Supabase Dashboard → Tables
- You should see tables like: `projects`, `development_tools`, `expenses`, `revenue`, etc.
- Each table should have columns like `id`, `orgId`, `projectId`, `createdAt`, `updatedAt`

---

### Issue #2: Missing RLS Policies

**Symptom**: 403 error even after schema is created, or after migrating to a new Supabase project.

**Solution**:
1. Go to your Supabase project → SQL Editor
2. Open the file `fix-financial-tables-rls.sql` from the Acrux-ERP repository root
3. Copy the entire contents and paste into the Supabase SQL Editor
4. Click "Run" to execute all policies
5. Refresh your app and try again

**Verification**:
- Go to Supabase Dashboard → Authentication → Policies
- Select `development_tools` table from dropdown
- You should see 4 policies: `select`, `insert`, `update`, `delete`
- All should have the status "Enabled"

---

### Issue #3: Stale or Invalid Auth Token

**Symptom**: 400 error on auth token refresh, followed by 403 on data writes.

**Solution**:
1. Open your browser's Developer Tools (F12)
2. Go to "Application" tab → "Storage" → "IndexedDB" → "AcruxERPDB"
3. Delete all data in `auth_sessions` store
4. Close all tabs with the Acrux app
5. Close your browser completely
6. Reopen the app and log in again with fresh credentials
7. Try saving a development tool again

**Alternative if the above doesn't work**:
- Go to Supabase Dashboard → Authentication → Users
- Delete your user account and re-register
- This ensures a fresh auth session is created

---

### Issue #4: Organization Name Mismatch

**Symptom**: Data appears to save but doesn't show up in the table, or you see "No data found".

**Solution**:
1. Make sure all records are created with the same organization name
2. When logging in, the organization name must match what's stored in your user profile
3. Go to Supabase Dashboard → SQL Editor
4. Run this query to check your user profile:
```sql
SELECT id, staffId, name, organizationName, isAdmin FROM user_profiles LIMIT 5;
```
5. The `organizationName` should be a consistent slug like `acrux-it-solutions` (lowercase, hyphens instead of spaces)
6. Check that all your development_tools records also have the same `orgId` value

---

### Issue #5: .env.local Configuration

**Symptom**: All operations get 400-500 errors consistently.

**Solution**:
1. Create (or edit) `.env.local` file in the project root (same level as `package.json`)
2. Add these two environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
3. To find your values:
   - Go to Supabase Dashboard → Project Settings → API
   - Copy the Project URL (it looks like `https://nskbbbfecyamzkdvbyi.supabase.co`)
   - Copy the anon public key (it's on the same page)
4. Stop your dev server (Ctrl+C)
5. Restart with `npm run dev` or `pnpm dev`
6. Try saving again

**Verification**:
- Check that your Supabase project ID matches the URL in `.env.local`
- The URL should NOT be `https://placeholder.supabase.co`
- The anon key should NOT be `placeholder`

---

## Step-by-Step Debug Checklist

Run these checks in order:

- [ ] **Step 1**: .env.local exists with valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **Step 2**: `development_tools` table exists in Supabase Dashboard → Tables
- [ ] **Step 3**: `development_tools` table has at least 8 columns (id, orgId, projectId, toolName, quantity, unitCost, totalCost, currency, etc.)
- [ ] **Step 4**: Clear browser IndexedDB: DevTools → Application → Storage → IndexedDB → AcruxERPDB → Right-click → Delete
- [ ] **Step 5**: Log out completely and log back in with fresh session
- [ ] **Step 6**: Open Developer Tools Console and check for any new error messages
- [ ] **Step 7**: Copy the full error message and check the sync-service.ts logs for detailed error info
- [ ] **Step 8**: Try creating a new project first (in Projects tab) - if that works, the table structure is correct

---

## If Still Failing After All Steps

1. Open your browser DevTools → Console
2. Try to add a development tool
3. Copy the **complete error message** that appears in the console
4. Go to Supabase Dashboard → Database → Query Results (or Logs section)
5. Look for recent errors related to `development_tools`
6. Check the RLS policies are correct (all should allow authenticated users)

---

## Quick Fix: Run These Two SQL Scripts

**Script 1 - Ensure tables exist** (in Supabase SQL Editor):
```sql
-- Verify development_tools table exists
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'development_tools';
```
Should return 1 row.

**Script 2 - Ensure RLS policies allow writes** (in Supabase SQL Editor):
```sql
-- Copy entire contents of fix-financial-tables-rls.sql and run
```

---

## Contact Support

If you're still seeing errors after following all steps:
1. Check the browser console for the exact error message
2. Check Supabase logs for backend errors
3. Ensure your Supabase project is on an active plan (not just free tier with limits)
4. Verify your auth token hasn't expired (try logging out and back in)
