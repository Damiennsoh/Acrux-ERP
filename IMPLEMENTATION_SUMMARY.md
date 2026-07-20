# Green Land Power ERP - Implementation Summary

## What's Been Built

A complete hybrid offline-first financial management dashboard for **Green Land Power Inc**, built with **Supabase** and **PostgreSQL**.

### Key Features:
- **100% Offline Capability**: Full data management without internet.
- **Incremental Cloud Synchronization**: Incremental bidirectional sync with Supabase and Row Level Security (RLS).
- **Multi-Tenant Isolation**: Enforced organization-level isolation using `orgId` slugs.
- **Secure Authentication**: Supabase Auth with custom **Offline Auth Guard** using IndexedDB.

## Core Architecture

### Authentication System (Hybrid)

**Offline-First Layer** (`lib/auth-context.tsx`)
- **Supabase Auth Integration**: Secure login with organization-based user management.
- **Offline Auth Guard**: Uses the `auth_sessions` store in IndexedDB to restore sessions instantly, allowing users to enter the dashboard before a network handshake.

**Cloud Bridge Layer**
- Automatic Supabase session verification when online.
- Organization metadata is stored in `user_profiles` to link users with specific multi-tenant data.

### Data Persistence (Multi-Layer)

**Layer 1: IndexedDB** (`lib/indexeddb.ts`)
- Primary storage for all application data.
- Stores: `projects`, `revenue`, `materials`, `labor`, `petty_cash`, `broker_payments`, `syncQueue`, `sync_metadata`.
- Native camelCase matching with PostgreSQL tables for seamless object storage.

**Layer 2: Supabase (PostgreSQL)**
- Cloud mirror with Row Level Security (RLS).
- Incremental syncing using `serverUpdatedAt` and `isDeleted` flags.
- PostgreSQL functions and triggers for automatic timestamp management.

### Hybrid Sync Engine (`lib/sync-service.ts`)

**Push Flow (Local → Supabase)**
- Changes committed locally to IndexedDB and queued in `syncQueue`.
- The engine fetches remote state before pushing to resolve conflicts (server wins on newer timestamps).
- Data is standardized (dates converted to ISO strings, orgId slugified) before transmission.

**Pull Flow (Supabase → Local)**
- Background pulls fetch records changed since the last `lastPullTimestamp`.
- Organization filtering is enforced on every query.
- Local records are updated using a native IDB `put` for efficiency.

## File Structure

```
app/                        # Next.js App Router pages
components/                 # UI components (shadcn/ui + custom)
lib/                        # Core logic
├── supabase.ts             # Supabase client & IDB adapter
├── sync-service.ts         # Hybrid Sync Engine (Push/Pull)
├── indexeddb.ts            # IndexedDB schema & access
├── auth-context.tsx        # Auth state & Offline Auth Guard
└── financial-operations.ts # Reconciliation logic
public/                     # Static assets & Service Worker
supabase_schema.sql         # Main PostgreSQL database schema
```

## Security & Performance

### Row Level Security (RLS)
The PostgreSQL schema enforces:
- Users can only access rows where `orgId` (or `organizationName`) matches their profile.
- Admin vs user roles are checked server-side for sensitive operations.

### Incremental Synchronization
Instead of fetching all data, the app uses `serverUpdatedAt` to only pull the minimal delta since the last successful sync, significantly reducing bandwidth and database load.

### Conflict Resolution Strategy
- **Pull Conflicts**: If a remote record has a newer `serverUpdatedAt`, it overwrites the local copy.
- **Push Conflicts**: Before pushing, the engine fetches the remote version. If the server has a newer `updatedAt`, the local change is discarded.
- **Deletes**: Soft-deletes are synced using an `isDeleted` flag; hard deletes occur when a record is synced with `isDeleted: true`.

---

**Green Land Power ERP** - Secure, Reliable, and Built for Offline Efficiency.
