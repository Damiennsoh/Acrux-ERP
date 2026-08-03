# Quick Fix Checklist - Development Tool Save Error

## 🚨 Do This NOW (5 minutes)

### Step 1: Run the Schema SQL Script
- [ ] Open Supabase Project Dashboard
- [ ] Go to **SQL Editor**
- [ ] Open file: `supabase_schema.sql` from project root
- [ ] Copy ALL contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click **Run**
- [ ] Verify: You see "Success" message

### Step 2: Run the RLS Policy Script  
- [ ] In same SQL Editor window
- [ ] Open file: `fix-financial-tables-rls.sql` from project root
- [ ] Copy ALL contents
- [ ] Paste into Supabase SQL Editor
- [ ] Click **Run**
- [ ] Verify: You see "Success" message

### Step 3: Clear Auth and Test
- [ ] Refresh the app (Ctrl+F5)
- [ ] Log out
- [ ] Log back in
- [ ] Navigate to Development Tools
- [ ] Try adding a new tool
- [ ] **Did it work?** ✅ If YES → You're done!

---

## ❌ Still Getting Error? Try This

### Verify Supabase Connection
- [ ] Check `.env.local` file exists in project root
- [ ] Verify it contains:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
  ```
- [ ] Values should NOT be `placeholder` or `https://your-project.supabase.co`
- [ ] Restart dev server: `npm run dev`

### Check Browser Console
- [ ] Open DevTools: Press **F12**
- [ ] Go to **Console** tab
- [ ] Try to save a development tool again
- [ ] Look for error message containing:
  - `[DB] Failed to write to development_tools:`
  - `[DevelopmentToolsTab] Save error:`
  - Specific Supabase error details
- [ ] Copy the error message

### Verify Database Tables
- [ ] Go to Supabase Dashboard
- [ ] Click **Tables** on left sidebar
- [ ] Look for table `development_tools`
- [ ] If missing: Run `supabase_schema.sql` again
- [ ] If exists: Check it has these columns:
  - `id`, `orgId`, `projectId`, `toolName`, `quantity`, `unitCost`, `totalCost`, `currency`

### Verify RLS Policies
- [ ] Go to Supabase Dashboard
- [ ] Click **Authentication** → **Policies**
- [ ] Select table: `development_tools` from dropdown
- [ ] Verify 4 policies exist and are **enabled**:
  - `development_tools_select_policy`
  - `development_tools_insert_policy`
  - `development_tools_update_policy`
  - `development_tools_delete_policy`
- [ ] If missing: Run `fix-financial-tables-rls.sql` again

### Clear Browser Cache
- [ ] Open DevTools: Press **F12**
- [ ] Go to **Application** tab
- [ ] Click **Storage** on left
- [ ] Click **IndexedDB**
- [ ] Right-click **AcruxERPDB** → Delete
- [ ] Go to **Cookies**
- [ ] Right-click site → Clear
- [ ] Close DevTools
- [ ] Press **Ctrl+Shift+Delete** to open Clear Browsing Data
- [ ] Select **Cookies and cached images**
- [ ] Click **Clear data**
- [ ] Close and reopen browser
- [ ] Log back in and try again

---

## 📖 Need More Help?

1. Read: `TROUBLESHOOTING_403_ERROR.md` - Comprehensive guide for all error scenarios
2. Read: `FIX_SUMMARY.md` - Detailed explanation of what was fixed
3. Check: Browser console for specific error codes
4. Reference: `README.md` - General setup instructions

---

## ✅ How to Know It's Fixed

After following the steps above, you should be able to:
1. ✅ Add a new development tool (no error toast)
2. ✅ See the tool appear in the table
3. ✅ Edit the tool without errors
4. ✅ Delete the tool without errors
5. ✅ Refresh the page - data persists
6. ✅ See no errors in DevTools console

---

## 🔧 For Developers: What Changed

**Code improvements** for better error visibility:
- `development-tools-tab.tsx`: Now logs full error to console
- `sync-service.ts`: Logs error code, message, and hint from Supabase
- `useSyncData.ts`: Enhanced fetch error logging

**New files**:
- `fix-financial-tables-rls.sql`: RLS policies for data access control
- `TROUBLESHOOTING_403_ERROR.md`: Comprehensive troubleshooting guide
- `FIX_SUMMARY.md`: Detailed change documentation
- `QUICK_FIX_CHECKLIST.md`: This file!

**No breaking changes** - All existing functionality preserved. Only added better error diagnostics.

---

## ⏱️ Estimated Time to Fix
- **Quick path** (if tables + RLS already exist): 2 minutes
- **Standard path** (if need to run SQL scripts): 5 minutes  
- **Full path** (including browser cache clear): 10 minutes

**Try the quick path first!**
