# Green Land Power ERP - Setup Guide

This guide walks you through setting up Green Land Power ERP from scratch using Supabase.

## Prerequisites

- Node.js 18.0 or higher
- pnpm (or npm/yarn)
- A Supabase project
- Git

## Step 1: Supabase Project Setup

### Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Enter project name: "Green Land Power ERP"
4. Create a database password and choose a region
5. Click "Create new project"

### Setup Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Create a "New Query"
3. Copy the contents of the `supabase_schema.sql` file from the project root
4. Click **Run** to execute the schema, which sets up:
   - Tables (`projects`, `revenue`, `materials`, `labor`, `user_profiles`, `organizations`)
   - Functions and Triggers for `serverUpdatedAt`
   - Row Level Security (RLS) policies

### Setup Authentication
1. Go to **Authentication → Providers**
2. Enable **Email** (ensure "Confirm Email" is disabled for easier development setup)
3. Under **Authentication → Configuration → Site URL**, set it to `http://localhost:3000`

### Get API Keys
1. Go to **Project Settings → API**
2. Copy the **Project URL** and **anon public key**

## Step 2: Clone & Install

```bash
# Clone repository
git clone <repository-url>
cd v0-green-land-power-erp

# Install dependencies
pnpm install
```

## Step 3: Configure Environment Variables

Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Important**: All variables starting with `NEXT_PUBLIC_` are exposed to the browser. Never commit `.env.local` to git.

## Step 4: Add Organization Metadata

To enable multi-tenancy, you must add your organization to the `organizations` table:

```sql
INSERT INTO organizations (name, slug) 
VALUES ('Green Land Power Inc', 'green-land-power-inc');
```

Then, you can manually link your first user to this organization in the `user_profiles` table or via the Auth page signup flow.

## Step 5: Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000 in your browser.

## Step 6: Test Offline Mode

1. Open DevTools (F12)
2. Go to **Application → Service Workers**
3. Check **Offline**
4. Create/edit data (changes save locally to IndexedDB)
5. Uncheck **Offline**
6. Watch the logic in `lib/sync-service.ts` auto-sync the data to Supabase.

## Step 7: Deploy to Production

### Deploy to Vercel
1. Push code to GitHub:
   ```bash
   git push origin main
   ```
2. Go to [Vercel](https://vercel.com) and create a "New Project"
3. Select your GitHub repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

### Update Supabase Configuration
After deployment, add your production URL to Supabase:
1. Go to **Supabase Dashboard → Authentication → URL Configuration**
2. Add your production URL to **Redirect URLs** (e.g., `https://your-app.vercel.app`)

## Troubleshooting

### "Supabase configuration is invalid"
- Verify all env variables in `.env.local`
- Ensure no spaces around `=` signs
- Restart dev server after changes

### "Permission denied" errors
- Check that the `supabase_schema.sql` was successfully run
- Verify that Row Level Security (RLS) is correctly enabled on the table
- Ensure the `orgId` matches between the user's profile and the record

### Offline sync not working
- Check the `syncQueue` in IndexedDB via DevTools → Application
- Keep your console open to see logs from the `HybridSyncEngine`

---

**Green Land Power ERP Setup Complete!** Your financial management system is ready for use.
