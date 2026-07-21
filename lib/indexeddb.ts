import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface FinManageDBSchema extends DBSchema {
  users: {
    key: string;
    value: any;
  };
  projects: {
    key: string;
    value: any;
    indexes: { 'by-status': string; 'by-date': number };
  };
  expenses: {
    key: string;
    value: any;
    indexes: { 'by-projectId': string; 'by-date': number };
  };
  revenue: {
    key: string;
    value: any;
    indexes: { 'by-projectId': string; 'by-date': number };
  };
  development_tools: {
    key: string;
    value: any;
    indexes: { 'by-projectId': string; 'by-date': number };
  };
  development_costs: {
    key: string;
    value: any;
    indexes: { 'by-projectId': string; 'by-date': number };
  };
  broker_payments: {
    key: string;
    value: any;
    indexes: { 'by-projectId': string; 'by-date': number };
  };
  miscellaneous: {
    key: string;
    value: any;
    indexes: { 'by-projectId': string; 'by-date': number };
  };
  user_profiles: {
    key: string;
    value: any;
    indexes: { 'by-orgId': string };
  };
  organizations: {
    key: string;
    value: any;
  };
  summaries: {
    key: string;
    value: any;
  };
  audit_logs: {
    key: string;
    value: any;
    indexes: { 'by-timestamp': number; 'by-entityId': string };
  };
  auth_sessions: {
    key: string;
    value: {
      id: string;
      userId: string;
      sessionData: any;
      createdAt: number;
      expiresAt: number;
    };
  };
  sync_metadata: {
    key: string;
    value: {
      id: string;
      collection: string;
      lastPullTimestamp: number;
      lastPushTimestamp: number;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'create' | 'update' | 'delete';
      collection: string;
      documentId: string;
      data: any;
      timestamp: number;
      synced: boolean;
    };
  };
}

let dbInstance: IDBPDatabase<FinManageDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<FinManageDBSchema>> {
  // If we have an instance, test it with a dummy transaction
  if (dbInstance) {
    try {
      // Try to get a store name – if it fails, the connection is dead
      await dbInstance.get('sync_metadata', 'health-check');
      return dbInstance;
    } catch (err) {
      // Connection is dead, clear instance and reopen
      dbInstance = null;
    }
  }

  // Open fresh connection
  dbInstance = await openDB<FinManageDBSchema>('AcruxERPDB', 6, {
    upgrade(db, oldVersion) {
      // Users store
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'uid' });
      }

      // New standardized stores
      if (!db.objectStoreNames.contains('user_profiles')) {
        const userProfiles = db.createObjectStore('user_profiles', { keyPath: 'id' });
        userProfiles.createIndex('by-orgId', 'organizationName'); // consistent with profiles table
      }

      if (!db.objectStoreNames.contains('organizations')) {
        db.createObjectStore('organizations', { keyPath: 'id' });
      }

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('by-status', 'status');
        projectStore.createIndex('by-date', 'startDate');
      }

      // Expenses store
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('by-projectId', 'projectId');
        expenseStore.createIndex('by-date', 'date');
      }

      // Revenue store
      if (!db.objectStoreNames.contains('revenue')) {
        const revenueStore = db.createObjectStore('revenue', { keyPath: 'id' });
        revenueStore.createIndex('by-projectId', 'projectId');
        revenueStore.createIndex('by-date', 'date');
      }

      // Development Tools store (renamed from materials)
      if (!db.objectStoreNames.contains('development_tools')) {
        const toolsStore = db.createObjectStore('development_tools', { keyPath: 'id' });
        toolsStore.createIndex('by-projectId', 'projectId');
        toolsStore.createIndex('by-date', 'date');
      }

      // Development Costs store (renamed from labor)
      if (!db.objectStoreNames.contains('development_costs')) {
        const costsStore = db.createObjectStore('development_costs', { keyPath: 'id' });
        costsStore.createIndex('by-projectId', 'projectId');
        costsStore.createIndex('by-date', 'date');
      }

      // Broker Payments store
      if (!db.objectStoreNames.contains('broker_payments')) {
        const brokerStore = db.createObjectStore('broker_payments', { keyPath: 'id' });
        brokerStore.createIndex('by-projectId', 'projectId');
        brokerStore.createIndex('by-date', 'date');
      }

      // Miscellaneous store (renamed from petty_cash)
      if (!db.objectStoreNames.contains('miscellaneous')) {
        const miscStore = db.createObjectStore('miscellaneous', { keyPath: 'id' });
        miscStore.createIndex('by-projectId', 'projectId');
        miscStore.createIndex('by-date', 'date');
      }

      // Summaries store
      if (!db.objectStoreNames.contains('summaries')) {
        db.createObjectStore('summaries', { keyPath: 'id' });
      }

      // Audit Logs store (NEW)
      if (!db.objectStoreNames.contains('audit_logs')) {
        const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
        auditStore.createIndex('by-timestamp', 'timestamp');
        auditStore.createIndex('by-entityId', 'entityId');
      }

      // Auth sessions store (NEW - for offline auth)
      if (!db.objectStoreNames.contains('auth_sessions')) {
        db.createObjectStore('auth_sessions', { keyPath: 'id' });
      }

      // Sync metadata store (NEW - tracks per-collection sync timestamps)
      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'id' });
      }

      // Sync queue store
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });

  return dbInstance;
}

export async function saveToLocal(
  collection: string,
  documentId: string,
  data: any,
  timestamp: number
) {
  const db = await getDB();
  const dataWithTimestamp = { ...data, id: documentId, _lastSync: timestamp };
  await db.put(collection as any, dataWithTimestamp);
}

export async function getFromLocal(collection: string, documentId: string) {
  const db = await getDB();
  return db.get(collection as any, documentId);
}

export async function getAllFromLocal(collection: string) {
  const db = await getDB();
  return db.getAll(collection as any);
}

export async function deleteFromLocal(collection: string, documentId: string) {
  const db = await getDB();
  await db.delete(collection as any, documentId);
}

export async function addToSyncQueue(
  action: 'create' | 'update' | 'delete',
  collection: string,
  documentId: string,
  data?: any
) {
  const db = await getDB();
  const syncItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    action,
    collection,
    documentId,
    data: data || null,
    timestamp: Date.now(),
    synced: false,
  };
  await db.add('syncQueue', syncItem);
}

export async function getSyncQueue() {
  const db = await getDB();
  return db.getAll('syncQueue');
}

export async function markSyncItemAsSynced(id: string) {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.synced = true;
    await db.put('syncQueue', item);
  }
}

export async function clearSyncQueue() {
  const db = await getDB();
  await db.clear('syncQueue');
}

export async function clearAllLocalData() {
  const db = await getDB();
  const stores = ['users', 'projects', 'expenses', 'revenue', 'development_tools', 'development_costs', 'broker_payments', 'miscellaneous', 'summaries'];
  for (const store of stores) {
    await db.clear(store as any);
  }
}

// ============================================================
// Auth Session Storage (IndexedDB-based, works offline)
// ============================================================

export async function saveAuthSession(userId: string, sessionData: any): Promise<void> {
  const db = await getDB();
  await db.put('auth_sessions', {
    id: 'current-session',
    userId,
    sessionData,
    createdAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  });
}

export async function getAuthSession(): Promise<any | null> {
  try {
    const db = await getDB();
    const session = await db.get('auth_sessions', 'current-session');
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      await db.delete('auth_sessions', 'current-session');
      return null;
    }
    return session.sessionData;
  } catch {
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('auth_sessions', 'current-session');
  } catch {
    // Ignore cleanup errors
  }
}

// ============================================================
// Sync Metadata (tracks per-collection sync timestamps)
// ============================================================

export async function getSyncMetadata(collection: string): Promise<{ lastPullTimestamp: number; lastPushTimestamp: number } | null> {
  try {
    const db = await getDB();
    const meta = await db.get('sync_metadata', collection);
    return meta || null;
  } catch {
    return null;
  }
}

export async function updateSyncMetadata(
  collection: string,
  updates: { lastPullTimestamp?: number; lastPushTimestamp?: number }
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('sync_metadata', collection);
  await db.put('sync_metadata', {
    id: collection,
    collection,
    lastPullTimestamp: updates.lastPullTimestamp || existing?.lastPullTimestamp || 0,
    lastPushTimestamp: updates.lastPushTimestamp || existing?.lastPushTimestamp || 0,
  });
}

/**
 * Check which database has newer data
 * Returns 'local' or 'remote' based on timestamps
 */
export function shouldUseLocalData(
  localTimestamp: number | undefined,
  remoteTimestamp: number | undefined
): boolean {
  if (!localTimestamp) return false;
  if (!remoteTimestamp) return true;
  return localTimestamp > remoteTimestamp;
}
