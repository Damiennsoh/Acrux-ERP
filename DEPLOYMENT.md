# Green Land Power ERP - Deployment Guide

Complete guide for deploying Green Land Power ERP to production with Supabase.

## Pre-Deployment Checklist

### Code Quality
- [ ] All console errors are resolved.
- [ ] No remaining TypeScript errors in the build process.
- [ ] `supabase_schema.sql` has been run on your Supabase project.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.

### Supabase Configuration
- [ ] PostgreSQL tables created via `supabase_schema.sql`.
- [ ] Row Level Security (RLS) policies correctly enabled and tested.
- [ ] Email provider enabled in Supabase Auth.
- [ ] Admin users have correct roles in `user_profiles`.

### Performance
- [ ] SWR cache-hit rate optimized for background sync.
- [ ] IndexedDB indexes created correctly (using `lib/indexeddb.ts`).
- [ ] Service Worker active for offline shell access.

## Vercel Deployment

### Step 1: Prepare Repository

```bash
# Verify clean Git state
git status

# Test local build
pnpm build

# Push changes
git push origin main
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository.
3. Vercel auto-detects the Next.js framework.
4. Click **Continue**.

### Step 3: Add Environment Variables

In Vercel project settings:
1. Go to **Settings → Environment Variables**.
2. Add your Supabase credentials:
   - `NEXT_PUBLIC_SUPABASE_URL` = your_url
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your_anon_key
3. Click **Save**.

### Step 4: Finalize & Deploy

1. Click **Deploy**.
2. Wait for the build and deployment process to complete.
3. Access your deployment URL (e.g., `https://green-land-power-erp.vercel.app`).

### Step 5: Update Supabase Configuration

1. In the Supabase Dashboard, go to **Authentication → URL Configuration**.
2. Add your production URL to the **Redirect URLs** list.
3. Save the changes.

## Manual Deployment

To build the application for a custom server:

```bash
# Build Next.js app
pnpm build

# Start production server
pnpm start

# For process management using PM2
pm2 start "pnpm start" --name green-land-power-erp
```

## Database Maintenance & Backups

### Supabase Backups
Supabase provides automated database backups on the Pro tier. For manual backups:
1. Go to **Database → Backups** in the Supabase Dashboard.
2. Select a point in time or create a manual backup.

### Exporting Data via CLI
```bash
# Install Supabase CLI
npm i supabase --save-dev

# Export SQL schema or database Dump
supabase db dump --file backup_$(date +%s).sql
```

## Rollback Plan

### Rollback on Vercel
1. Vercel Dashboard → Deployments.
2. Find the last stable deployment.
3. Click **Promote to Production** to revert to the previous version instantly.

### Rollback Database
If a schema change causes issues, revert by running your previous SQL schema version in the Supabase SQL Editor.

## Post-Deployment Verification

### Test Authentication
- [ ] Email/Password sign up and sign in work.
- [ ] Session restoration (Offline Auth Guard) works on reload.
- [ ] User role correctly detected (Admin vs User).

### Test Synchronization
- [ ] Changes made online appear in Supabase instantly.
- [ ] Changes made offline sync properly once online is restored.
- [ ] `syncQueue` handles errors and retries gracefully.

### Test PWA Performance
- [ ] Ensure the browser prompts for app installation on mobile.
- [ ] Verify that the app shell loads when the device has no internet access.

---

**Green Land Power ERP Deployment** - Built for professional financial reliability.
