# Green Land Power ERP - Hybrid Offline-First Architecture

This document describes the **hybrid offline-first synchronization and authentication system** for Green Land Power ERP. The system is designed to provide a seamless experience where the local device remains the primary interactive layer, while Supabase acts as the authoritative cloud mirror.

## Architecture Principles

1. **Local-First Interaction**: Every user action is committed to IndexedDB immediately, ensuring zero-latency UI updates.
2. **Offline-Safe Authentication**: Authenticated sessions are cached locally, allowing users to restart the app and stay logged in without internet.
3. **Incremental Cloud Synchronization**: Only changed records are transmitted using a `serverUpdatedAt` strategy to minimize bandwidth.
4. **Tenant Isolation**: Multi-tenancy is enforced at every layer using organization-specific slugs (`orgId`).
5. **Intelligent Conflict Resolution**: Conflict handling occurs during the sync cycle, prioritizing the server's state if remote changes are newer.

## Core Components

### 1. Authentication Layer (`lib/auth-context.tsx`)

#### Supabase Auth with Offline Guard
- **Storage**: `auth_sessions` store in IndexedDB.
- **Offline Guard**: On app initialization, the system checks IndexedDB for a saved session. If found, it populates the Auth Context immediately, allowing the user to enter the dashboard before the Supabase client even attempts a network handshake.
- **Organization Association**: User metadata (stored in `user_profiles`) links users to specific organizations, which is then used to filter all subsequent data requests.

### 2. Hybrid Sync Engine (`lib/sync-service.ts`)

The `HybridSyncEngine` is a singleton service that manages bidirectional data flow.

#### A. The PUSH Cycle (Local → Supabase)
Every time a document is created, updated, or deleted, an entry is added to the `syncQueue` in IndexedDB.
1. **Queue Retrieval**: The engine pulls unsynced items from the queue, sorted by timestamp.
2. **Pre-Sync Validation**: For each item, the engine fetches the remote state from Supabase.
   - If the record was deleted on the server, the local change is discarded.
   - If the server has a newer version, the local change is discarded to prevent overwriting fresher data.
3. **Sanitization**: Dates are normalized to ISO strings and `orgId` is slugified to ensure PostgreSQL compatibility.
4. **Upsert**: The data is pushed to Supabase. Upon success, the queue entry is removed.

#### B. The PULL Cycle (Supabase → Local)
The pull cycle ensures the local device has the latest data from other users.
1. **Metadata Tracking**: The `sync_metadata` store keeps track of the `lastPullTimestamp` for each table.
2. **Incremental Query**: The engine queries Supabase for records WHERE `serverUpdatedAt > lastPullTimestamp` AND `orgId = currentOrg`.
3. **Local Update**: 
   - New or updated records are written directly to IndexedDB.
   - Records marked with `isDeleted: true` are removed from the local store.
4. **Timestamp Update**: The `lastPullTimestamp` is updated to the latest record's server time.

### 3. Data Storage Layer (`lib/indexeddb.ts`)

#### IndexedDB Schema
- **Projects/Revenue/Materials/Labor/etc.**: Main data stores.
- **syncQueue**: Tracks pending operations (`create`, `update`, `delete`).
- **sync_metadata**: Stores sync progress (timestamps).
- **auth_sessions**: Stores the Supabase session object.

### 4. Security & Isolation

- **Row Level Security (RLS)**: Enforced in Supabase. PostgreSQL policies prevent users from accessing or modifying data outside their own `orgId`.
- **Slugification**: The `slugifyOrg` utility ensures that organization names are converted to a consistent URL-friendly format, preventing manual entry inconsistencies.

## Data Synchronization Workflow

### Typical User Journey

1. **Account Setup**: User signs up. A profile is created in `user_profiles` associated with an organization.
2. **Offline Work**: User enters a forest or construction site with no signal. They add an expense.
   - Expense is saved to IDB `materials` store.
   - Entry is added to `syncQueue`.
3. **Auto-Reconnect**: User returns to the office. The browser detects the `online` event.
4. **Sync Trigger**: The `HybridSyncEngine` automatically triggers `pushLocalChanges()`.
5. **Reconciliation**: The expense is uploaded to Supabase, receiving a `serverUpdatedAt` timestamp.

## Conflict Scenarios

| Scenario | Resolution |
|----------|------------|
| Record deleted on server while local user was editing | Local change is discarded; local record is deleted during next Pull cycle. |
| Two users update the same record offline | The user who syncs first updates the server; the second user's sync will see a newer server timestamp and discard their local change. |
| User creates a record offline with a duplicate ID | Supabase `upsert` handles the conflict based on the primary key. |

## Performance Considerations

- **Memory Efficiency**: The sync engine processes the queue sequentially to avoid memory spikes.
- **Network Efficiency**: Incremental pulls mean only a few kilobytes are transferred during routine syncs.
- **UI Responsiveness**: By using SWR with IndexedDB as a fallback, the UI is always interactive, with data appearing "instantly" while sync happens in the background.

---

**Green Land Power ERP Architecture** - Reliable, Offline-First, and Scalable.
