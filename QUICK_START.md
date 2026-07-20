# Green Land Power ERP - Quick Start Guide

## 5-Minute Setup

### Step 1: Install & Run
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser to http://localhost:3000
```

### Step 2: Configure Environment
- Go to [Supabase Console](https://supabase.com/dashboard)
- Create a project and get your API keys.
- Create a `.env.local` file:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
  ```

### Step 3: Run SQL Schema
In Supabase SQL Editor, run `supabase_schema.sql` to initialize your database and RLS policies.

### Step 4: First Login
- Navigate to the `/auth` page.
- Create an account or sign in.
- Your organization slug (e.g. `green-land-power-inc`) must be correctly configured in the `user_profiles` table to see data.

## Key Features

### For Everyone
- ✓ Secure offline login (Supabase Auth Offline Guard)
- ✓ Add/edit/delete projects, expenses, materials, labor
- ✓ View financial charts and trends
- ✓ Works without internet (IndexedDB local storage)
- ✓ Installable as a Progressive Web App (PWA)

### For Admins
- ✓ Create and manage user organization associations
- ✓ Comprehensive revenue and expense oversight
- ✓ Export professional financial reports (Excel, CSV, PDF)
- ✓ Real-time data synchronization across all devices

## Offline vs Online

### Offline Mode (Works Without Internet)
```
User Login          ✓ (Cached session in IndexedDB)
View Local Data     ✓ (Stored in IndexedDB)
Add Records         ✓ (Saved to Sync Queue)
Track Expenses      ✓ (Saved to Sync Queue)
View Charts         ✓ (From local state)
```

### Online Mode (+ Supabase)
```
Cloud Push          ✓ (Auto-syncs Sync Queue to Supabase)
Cloud Pull          ✓ (Incremental fetches via updatedAt)
Team Collaboration  ✓ (Changes appear as they are synced)
Multi-Device Sync   ✓ (Cloud as source of truth)
Row Level Security  ✓ (PostgreSQL-enforced isolation)
```

## Common Tasks

### Add a Project
1. Navigate to the **Projects** tab.
2. Click **Add Project**.
3. Fill out the details (budget, duration, type).
4. The project appears instantly (local-first).

### Track Material Costs
1. Navigate to **Expenses → Materials**.
2. Click **Record Material**.
3. Associate with a project and enter the cost.
4. Auto-syncs to the cloud whenever online.

### View Financial Summary
1. Navigate to the **Summary** tab.
2. View the **Revenue vs Expenses** trend chart.
3. Use filters to adjust the period (30/90 days).

## Troubleshooting

### "Sync Not Working"
- Check the `HybridSyncEngine` logs in the browser console.
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct.
- Verify your network status (icon appears in top right).

### "Data Disappeared"
- Data is stored in **IndexedDB**. If you clear your browser storage, local changes not yet synced to the cloud will be lost.
- Check the **Application** tab in DevTools → IndexedDB.

---

**Green Land Power ERP** - Built for efficiency, designed for the field. ⚡
