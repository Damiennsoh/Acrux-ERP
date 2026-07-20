# ACRUX ERP — Financial Management Dashboard

**ACRUX ERP** is a professional, mobile-first financial management platform designed for **ACRUX IT SOLUTIONS**, a software development company. Built with modern web technologies, it provides real-time financial insights, multi-currency tracking, project management, and comprehensive expense/revenue management with **offline-first** capability.

---

## ✨ Key Features

### Financial Management (Multi-Currency)
- **Multi-Currency Support**: All financial modules (Development Tools, Development Costs, Revenue, Expenses, Miscellaneous, Broker Payments) support USD, EUR, GBP, GHS, ZWL, and other currencies independently. Totals are aggregated per-currency in every tab header and the Summary dashboard.
- **Revenue Tab**: Track payments received per project with currency breakdown, source, and invoice status.
- **Expenses Tab**: Categorized expense tracking with currency selection and vendor management.
- **Development Tools Tab**: Per-item cost tracking with quantity × unit cost = total cost, supporting multiple currencies.
- **Development Costs Tab**: Developer payment records with currency-per-developer support.
- **Miscellaneous Tab**: Small expense tracking with customizable categories and currency selection.
- **Broker Payments Tab**: Commission tracking with multi-currency header totals.

### Financial Summary Dashboard
- **KPI Cards**: Total Budget, Total Costs (by currency), Net Revenue, Active/Completed Projects.
- **Cost Breakdown** (Pie Chart): Visual breakdown of Development Tools, Development Costs, Broker, Miscellaneous in the active currency.
- **6-Month Trend** (Area Chart): Revenue vs. Costs vs. Profit tracked monthly.
- **Financial Health Score**: Profit margin %, progress toward 20% target margin.
- **Detailed Cost Table**: Currency-breakdown table showing exact totals per-currency for every cost category.

### Audit Log & Traceability
- **Audit Log Tab**: Full system-wide audit trail tracking every CREATE, UPDATE, and DELETE action.
- Every write operation records: `userId`, `entityType`, `entityId`, `action`, `changes.old`, `changes.new`, and `timestamp`.
- Searchable by collection, document ID, action type, or data contents.
- Synced to Supabase `audit_logs` table for persistent cross-device traceability.

### Offline-First Architecture (IndexedDB + Supabase)
- **IndexedDB Storage**: Full local copy of all data — instant loading even without internet.
- **Hybrid Sync Engine** (`lib/sync-service.ts`):
  - **Push**: Changes are queued in `syncQueue`, then intelligently pushed to Supabase when online.
  - **Pull**: Incremental pull using `serverUpdatedAt` timestamps — only fetches what changed.
  - **Conflict Resolution**: Server state checked before every push. Stale local changes and server-deleted records are discarded gracefully.
- **Cascading Deletes**: Deleting a project cascades to remove all child financial records (materials, labor, revenue, expenses, petty cash, broker payments) — enforced both client-side and via a PostgreSQL AFTER UPDATE trigger on the `projects` table.

### Data Integrity & Security
- **orgId Slugification**: All organization identifiers are slugified (`green-land-power-inc`) before storage, ensuring consistent multi-tenant isolation across IndexedDB and Supabase.
- **Date Standardization**: All dates are sanitized to ISO 8601 TIMESTAMPTZ format before sync to prevent Postgres type casting errors.
- **Soft Deletes**: Records are never hard-deleted from Supabase. `isDeleted: true` is set and the sync engine propagates this to IndexedDB on the next pull.
- **Offline Auth Guard**: Session restored from IndexedDB instantly, preventing UI flicker before Supabase responds.

### Project Management
- PRJ-XXX-2026 automatic project ID generation.
- Status tracking: Active, Completed, On Hold, Cancelled.
- Budget management with document attachment support.
- Project-scoped filtering across all financial modules.

---

## 🛠 Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Next.js 16 (App Router), TypeScript |
| Styling | Tailwind CSS v4, shadcn/ui components |
| Backend | Supabase (Auth + PostgreSQL) |
| Offline Storage | IndexedDB via `idb` library |
| Data Sync | Custom Hybrid Sync Engine |
| State / Cache | SWR + React Context |
| Charts | Recharts |
| PWA | Service Worker + Web App Manifest |

> **Note**: The codebase is 100% migrated from Firebase. There are **no Firebase dependencies**. All data flows through Supabase and IndexedDB.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and `pnpm` (or `npm`)
- Supabase project (free tier works)

### 1. Clone & Install

```bash
git clone <repository-url>
cd Acrux-ERP
pnpm install
```

### 2. Configure Environment

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Initialize the Database

Run the full schema in your Supabase SQL Editor:

```bash
# Open supabase_schema.sql and execute it in Supabase > SQL Editor
```

This creates all tables, the `serverUpdatedAt` sync trigger, and the cascading soft-delete trigger for projects.

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 📁 Project Structure

```
├── app/
│   ├── auth/                     # Login / Register pages
│   └── dashboard/                # Main dashboard (App Router)
├── components/
│   ├── dashboard/
│   │   ├── tabs/                 # All financial module tabs
│   │   │   ├── summary-tab.tsx   # KPIs, charts, multi-currency totals
│   │   │   ├── revenue-tab.tsx   # Payment received tracking
│   │   │   ├── expenses-tab.tsx  # Expense management
│   │   │   ├── development-tools-tab.tsx # Development tool cost tracking
│   │   │   ├── development-costs-tab.tsx # Developer payment tracking
│   │   │   ├── miscellaneous-tab.tsx # Small expense management
│   │   │   ├── broker-tab.tsx    # Commission tracking
│   │   │   ├── projects-tab.tsx  # Project CRUD
│   │   │   └── audit-log-tab.tsx # System-wide audit trail
│   │   ├── sidebar.tsx           # Desktop navigation
│   │   └── mobile-nav.tsx        # Mobile bottom navigation
│   └── ui/                       # shadcn/ui + custom components
├── hooks/
│   └── useSyncData.ts            # SWR + IndexedDB data hook
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── indexeddb.ts              # IndexedDB schema & access layer
│   ├── sync-service.ts           # Hybrid Sync Engine (Push/Pull + Audit)
│   ├── auth-context.tsx          # Auth state & Offline Auth Guard
│   ├── currency-context.tsx      # Global currency selection (USD/EUR/GBP/GHS/ZWL)
│   └── utils/
│       ├── org.ts                # slugifyOrg() utility
│       └── date.ts               # toISODate(), formatDate() utilities
├── public/
│   ├── sw.js                     # Service Worker (Supabase-aware)
│   └── manifest.json             # PWA manifest
├── supabase_schema.sql           # Full PostgreSQL schema + triggers
└── package.json
```

---

## 🔑 Key Architectural Decisions

### Multi-Currency Financial Mirror
Each financial tab independently calculates totals **per currency**. The `SummaryTab` aggregates these into a full financial picture using `calculateMultiCurrencyTotals()`, always scoping to the user's selected base currency for charts while displaying all currencies in breakdown tables.

### Audit Logging
Every call to `createOrUpdateDoc()` or `deleteDocWithSync()` in `lib/sync-service.ts` automatically writes an audit entry to IndexedDB (`audit_logs` store) and queues it for Supabase sync. The log records the **full before and after state** of a record (`changes.old`, `changes.new`).

### Cascading Soft-Delete
When a project is deleted:
1. **Client-side** (`deleteProjectWithCascade`): Iterates all child collections and calls `deleteDocWithSync()` for each orphaned record.
2. **Server-side** (PostgreSQL trigger `tr_cascade_project_delete`): AFTER UPDATE on `projects.isDeleted = true`, automatically marks all linked expenses, revenue, development_tools, development_costs, miscellaneous, and broker_payments as `isDeleted = true` in Supabase — a safety net for any records missed by the sync queue.

---

## 🗃 Supabase Tables

| Table | Purpose |
|---|---|
| `organizations` | Multi-tenant root; slug-based org isolation |
| `user_profiles` | User roles, admin flag, organization membership |
| `projects` | Core project records with budget tracking |
| `revenue` | Income entries (multi-currency) |
| `expenses` | Expense entries (multi-currency) |
| `development_tools` | Development tool cost entries (multi-currency, totalCost = qty × unitCost) |
| `development_costs` | Developer payment records (multi-currency) |
| `miscellaneous` | Small expense records (multi-currency) |
| `broker_payments` | Commission/broker payment records (multi-currency) |
| `audit_logs` | Immutable change trail (CREATE / UPDATE / DELETE) |

---

## 🔒 Security Model

- **Supabase Auth**: Email/Password with organization-based user management.
- **Offline Auth Guard**: Session read from IndexedDB `auth_sessions` store before Supabase handshake, eliminating loading flicker.
- **orgId Isolation**: All queries (IDB and Supabase) filter by `orgId` = slugified organization name.
- **Role-Based Access**: `isAdmin` flag gates all write/delete operations in the UI.
- **RLS**: Row Level Security policies are defined in `supabase_schema.sql` and can be enabled for production hardening. Currently commented out for development.

---

## 🐛 Troubleshooting

### Data Not Appearing
1. Check IndexedDB in DevTools → Application → Storage → IndexedDB → `erpDB`.
2. Verify `orgId` slug matches between your user profile and the stored records.
3. Check `syncQueue` for failed operations.

### Sync Errors
Open DevTools Console and look for `[SyncEngine]` prefixed logs. Common causes:
- Supabase RLS blocking the request (check Supabase logs).
- Date format mismatch (check `sanitizedData` in sync logs).

### Service Worker Issues
Clear site data in DevTools → Application → Storage → Clear site data.

---

## 🚀 Deployment

Deploy to Vercel:
1. Connect your GitHub repository.
2. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy.

---

**ACRUX ERP** — Built for reliability, offline-first, and financial accuracy. ⚡
