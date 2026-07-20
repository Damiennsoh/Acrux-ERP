# Green Land Power ERP - Hybrid Offline-First Setup Guide

This guide walks you through setting up the hybrid architecture with Supabase.

## Global Setup

### 1. Identify Environment
The app uses **Supabase** for its cloud backend. Ensure you have a Supabase project ready.

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Deploy PostgreSQL Schema
Go to the **SQL Editor** in your Supabase Dashboard and run the contents of `supabase_schema.sql`. This will:
- Create all necessary tables (`user_profiles`, `organizations`, `projects`, etc.).
- Set up **Row Level Security (RLS)** policies.
- Create helper functions and triggers for `serverUpdatedAt` timestamps.

## Authentication Setup

The app utilizes **Supabase Authentication** (Email/Password).
1. Go to **Authentication → Providers** in Supabase and enable "Email".
2. **Offline Auth Guard**: The app automatically caches sessions in IndexedDB, allowing for instant offline login restoration.

## Multi-Tenant Configuration

All data is isolated by **Organization Name**.
1. After running the schema, add your organization to the `organizations` table:
   ```sql
   INSERT INTO organizations (name, slug) 
   VALUES ('Green Land Power Inc', 'green-land-power-inc');
   ```
2. When creating user profiles, ensure the `organizationName` matches a valid organization slug.

## Data Synchronization

### How it Works
- **PUSH**: Changes made locally are queued in IndexedDB and sent to Supabase whenever the browser detects an `online` event.
- **PULL**: The app performs incremental pulls to fetch remote changes made by other users in the same organization.

### Testing Sync
1. Open the app and log in.
2. Go offline using DevTools (Network → Offline).
3. Create a project. Notice it appears instantly in the UI.
4. Go online. The `HybridSyncEngine` will automatically push the change.
5. Check your Supabase database table to verify the record is there.

## Troubleshooting

### Schema Inconsistencies
If you change the PostgreSQL schema (e.g., adding a column), you MUST update the mapping in the UI as the system relies on exact camelCase to snake_case matching for seamless object storage.

### Sync Failures
- Verify that `navigator.onLine` is true.
- Check the `syncQueue` in IndexedDB via DevTools → Application.
- Ensure the `orgId` matches between the user profile and the records.

### Resetting Local State
If you need a fresh start, clear the site data in DevTools (Application → Clear storage → Clear site data). This will wipe IndexedDB and force a fresh sync from Supabase.

---

**Green Land Power ERP Setup** - Ready for high-performance financial management.
