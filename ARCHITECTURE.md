# Green Land Power ERP — Architecture Overview

Last updated: March 2026

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER (PWA)                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  React 19 + Next.js 16 (App Router)                           │   │
│  │  - /auth          → Login / Register                           │   │
│  │  - /dashboard     → All financial tabs                         │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                              ↓                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  State Management                                              │   │
│  │  - AuthContext     (Supabase Auth + Offline Guard)             │   │
│  │  - CurrencyContext (LRD / USD base currency toggle)            │   │
│  │  - useSyncData     (SWR + IndexedDB hook)                      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                              ↓                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Hybrid Sync Engine  (lib/sync-service.ts)                     │   │
│  │  - createOrUpdateDoc()   → Write to IDB + syncQueue + audit    │   │
│  │  - deleteDocWithSync()   → Soft-delete in IDB + syncQueue      │   │
│  │  - deleteProjectWithCascade() → Client-side cascading delete   │   │
│  │  - HybridSyncEngine.pushLocalChanges()  → IDB → Supabase      │   │
│  │  - HybridSyncEngine.pullRemoteChanges() → Supabase → IDB      │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                              ↓                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  IndexedDB  (lib/indexeddb.ts)  ←— Source of Truth Offline    │   │
│  │  Stores: projects, revenue, expenses, materials, labor,        │   │
│  │          petty_cash, broker_payments, user_profiles,           │   │
│  │          organizations, audit_logs, syncQueue,                 │   │
│  │          auth_sessions, sync_metadata                          │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                              ↓ (Network)                               │
└──────────────────────────────────────────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                              │
├──────────────────────────────────────────────────────────────────────┤
│  - Supabase Auth (Email/Password, JWT)                                │
│  - PostgreSQL tables (mirroring IDB schema with TIMESTAMPTZ)         │
│  - update_sync_timestamp() trigger → serverUpdatedAt auto-update     │
│  - cascade_project_soft_delete() trigger → child records auto-delete │
│  - revenue_report view → server-side financial aggregation           │
│  - Row Level Security (defined, currently disabled for dev)           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

### Write Flow (User Action → Persisted Locally → Queued for Sync)

```
User submits form
       ↓
Component calls createOrUpdateDoc() / deleteDocWithSync()
       ↓
1. Write/delete record in IndexedDB (instant UI update via mutate())
2. Append entry to IndexedDB syncQueue
3. Write audit_log entry to IndexedDB audit_logs store
4. Append audit_log to syncQueue (for remote tracing)
       ↓
SWR hook reflects new IDB state immediately (no reload needed)
       ↓
[On next online event or scheduled interval]
HybridSyncEngine.pushLocalChanges():
   - For each unsynced syncQueue item:
     - DELETE: soft-delete via Supabase UPDATE isDeleted=true
     - CREATE/UPDATE: fetch remote conflict state first
       → If remote is deleted → discard local change, delete from IDB
       → If remote is newer (timestamp) → discard stale local change
       → Otherwise: sanitize dates, slugify orgId, upsert to Supabase
   - On success: remove item from syncQueue
```

### Pull Flow (Remote → Local)

```
HybridSyncEngine.pullRemoteChanges(orgId):
   For each collection in ['projects', 'revenue', 'materials', ...]:
       ↓
   Read lastPullTimestamp from sync_metadata
       ↓
   Query Supabase WHERE serverUpdatedAt > lastPullTimestamp AND orgId = ...
       ↓
   For each remote record:
     - isDeleted = true  → db.delete() from IDB
     - otherwise         → db.put() into IDB (native camelCase, no mapping)
       ↓
   Update sync_metadata.lastPullTimestamp to newest serverUpdatedAt
```

### Read Flow (Component → IDB → UI)

```
Component mounts → useCollection('expenses')
       ↓
useSyncData hook:
   1. SWR checks cache (5min dedup interval)
   2. Fetches all records from IDB for the collection
   3. Filters: isDeleted !== true AND orgId === currentOrgId
   4. Returns sorted, filtered data to component
       ↓
[Background] Sync Engine checks for remote updates
```

---

## Multi-Currency Financial Logic

All financial modules independently track amounts per currency. There is **no conversion** — LRD and USD are stored and displayed separately.

```
Each financial record: { amount: number, currency: 'LRD' | 'USD' }

calculateMultiCurrencyTotals(items, amountField):
   → returns: { LRD: total_lrd_amount, USD: total_usd_amount, ... }

Tab Headers: Show totals per currency
   "Total (LRD): L$5,000    Total (USD): $200"

SummaryTab: Uses base currency for charts, shows breakdown table
   - mainCurrency = useCurrency().currency  (user-selected)
   - Charts display mainCurrency values only
   - Breakdown table shows all currencies side by side
```

---

## Cascading Delete Architecture

Project deletion is guarded at **two layers**:

### Layer 1 — Client-Side (`deleteProjectWithCascade`)
```typescript
// lib/sync-service.ts
async function deleteProjectWithCascade(projectId, userId) {
  await deleteDocWithSync('projects', projectId, userId);
  const collections = ['expenses', 'revenue', 'materials', 'labor', 'petty_cash', 'broker_payments'];
  for (const col of collections) {
    const orphans = (await db.getAll(col)).filter(r => r.projectId === projectId);
    for (const r of orphans) await deleteDocWithSync(col, r.id, userId);
  }
}
```

### Layer 2 — Server-Side (PostgreSQL Trigger)
```sql
-- supabase_schema.sql
CREATE TRIGGER tr_cascade_project_delete
AFTER UPDATE OF "isDeleted" ON projects
FOR EACH ROW
EXECUTE FUNCTION cascade_project_soft_delete();
-- Automatically marks all linked records isDeleted=true in Supabase
```

---

## Audit Log Architecture

Every write via `createOrUpdateDoc()` and `deleteDocWithSync()` creates a structured audit entry:

```typescript
{
  id: 'audit-{timestamp}-{random}',
  orgId: string,
  userId: string,          // Who made the change
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityType: string,      // e.g. 'expenses', 'labor'
  entityId: string,        // Document ID
  changes: {
    old: Record<string, any> | null,   // Full record before change
    new: Record<string, any> | null,   // Full record after change
  },
  timestamp: ISO string,
}
```

- Stored in IDB `audit_logs` and synced to Supabase `audit_logs` table.
- The `AuditLogTab` component reads from IDB and displays with action badges + diff summary.
- UPDATE entries show only the **changed fields** by comparing `changes.new` vs `changes.old`.

---

## Component Architecture

```
dashboard/page.tsx
├── Sidebar (tabs/navigation)         # Desktop
├── MobileNav (bottom bar)            # Mobile
└── Tab Panels:
    ├── SummaryTab
    │   ├── KPI Cards (multi-currency aware)
    │   ├── CostBreakdown PieChart
    │   ├── ProjectStatus PieChart
    │   ├── 6-Month Trend AreaChart
    │   ├── Financial Summary BarChart
    │   └── Detailed Cost Table (per-currency breakdown)
    ├── ProjectsTab (CRUD + cascade delete)
    ├── RevenuetTab (CRUD + multi-currency)
    ├── ExpensesTab (CRUD + multi-currency)
    ├── MaterialsTab (CRUD + multi-currency + qty×cost)
    ├── LaborTab (CRUD + multi-currency)
    ├── PettyCashTab (CRUD + multi-currency + custom categories)
    ├── BrokerTab (CRUD + multi-currency)
    └── AuditLogTab (READ-ONLY, searchable audit trail)
```

---

## Security Model

### Authentication
- **Primary**: Supabase Auth (email/password).
- **Offline Guard**: `auth-context.tsx` reads from IDB `auth_sessions` on mount. If a cached session exists, it restores the user instantly without waiting for Supabase's network response. Supabase then validates in the background.

### Authorization
- **`isAdmin`**: Stored on `user_profiles` in IDB. All destructive operations (edit, delete) check `user?.isAdmin` before rendering.
- **orgId Isolation**: The `useSyncData` hook filters IDB data using `slugifyOrg(user.organizationName)`. Only records matching the logged-in user's org are returned.
- **RLS Policies**: Defined in `supabase_schema.sql` (commented out for development). Enable for production to enforce server-side isolation.

---

## Conflict Resolution

| Scenario | Resolution |
|---|---|
| Record modified locally AND on another device | Newest `updatedAt` wins. SyncEngine discards stale local push. |
| Record deleted on server, modified locally | Server delete wins. Local change is discarded. Record is removed from IDB. |
| Network down during write | Records stay in IDB + syncQueue. Pushed automatically on `window.online` event. |
| Same record updated twice offline | Last local write wins (most recent IDB state is pushed). |

---

## Deployment Checklist

- [ ] `.env.local` with Supabase URL and anon key
- [ ] `supabase_schema.sql` executed in Supabase SQL Editor
- [ ] Supabase Email/Password auth enabled
- [ ] First admin user created and `isAdmin: true` set in `user_profiles`
- [ ] Organization entry created in `organizations` table
- [ ] Service Worker registered (auto via `layout.tsx`)
- [ ] RLS policies enabled for production (`supabase_schema.sql` section 15)
- [ ] Vercel environment variables configured

---

**Green Land Power ERP Architecture** — Offline-first, multi-currency, fully auditable. ⚡
