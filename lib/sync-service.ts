import { supabase } from './supabase';
import { getDB } from './indexeddb';

// We use exact camelCase matching for robust seamless NoSQL object storage into PostgreSQL JSON format natively.

export class HybridSyncEngine {
  private static instance: HybridSyncEngine;
  private isSyncing = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second
  private syncErrors: string[] = [];
  
  public static getInstance(): HybridSyncEngine {
    if (!HybridSyncEngine.instance) {
      HybridSyncEngine.instance = new HybridSyncEngine();
    }
    return HybridSyncEngine.instance;
  }

  /**
   * Get recent sync errors for monitoring
   */
  getSyncErrors(): string[] {
    return [...this.syncErrors];
  }

  /**
   * Clear sync errors
   */
  clearSyncErrors(): void {
    this.syncErrors = [];
  }

  /**
   * PUSH: Send local changes to Supabase
   */
  async pushLocalChanges() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const db = await getDB();
      const queue = await db.getAll('syncQueue');
      
      // Sort by timestamp to preserve operation order
      const pending = queue.filter(item => !item.synced).sort((a, b) => a.timestamp - b.timestamp);

      let successCount = 0;
      let failureCount = 0;

      for (const item of pending) {
        try {
          if (item.action === 'delete') {
            // Soft delete
            const { error } = await supabase
              .from(item.collection)
              .update({ isDeleted: true })
              .eq('id', item.documentId);
              
            if (!error) {
              await db.delete('syncQueue', item.id);
              successCount++;
            } else {
              throw error;
            }
          } else {
            // audit_logs are append-only — skip conflict resolution to avoid 403 RLS issues
            if (item.collection === 'audit_logs') {
              const { error: auditError } = await supabase
                .from('audit_logs')
                .upsert({ ...item.data, id: item.documentId });
              if (!auditError) {
                await db.delete('syncQueue', item.id);
                successCount++;
              } else {
                // Non-fatal: audit log sync failure is tolerated, remove from queue to avoid retry spam
                console.warn('[SyncEngine] audit_log sync skipped (RLS or schema issue):', (auditError as any).message);
                await db.delete('syncQueue', item.id);
              }
              continue;
            }

            // Intelligent Conflict Resolution: Fetch remote state before pushing
            const { data: remoteData, error: fetchError } = await supabase
              .from(item.collection)
              .select('updatedAt, isDeleted')
              .eq('id', item.documentId)
              .maybeSingle();

            if (!fetchError && remoteData) {
              // Case 1: Record was deleted on the server
              if (remoteData.isDeleted) {
                console.log(`[SyncEngine] Discarding local change for ${item.documentId} (Already deleted on server)`);
                await db.delete(item.collection as any, item.documentId);
                await db.delete('syncQueue', item.id);
                continue;
              }

              // Case 2: Record was updated on another device more recently
              const remoteTs = new Date(remoteData.updatedAt || 0).getTime();
              const localTs = new Date(item.data.updatedAt || 0).getTime();
              
              if (remoteTs > localTs) {
                console.log(`[SyncEngine] Discarding stale local change for ${item.documentId} (Server version is newer)`);
                await db.delete('syncQueue', item.id);
                continue;
              }
            }

            const sanitizedData = { 
              ...item.data,
              id: item.documentId 
            };
            
            // Standardize all date fields to ISO strings for Supabase TIMESTAMPTZ
            const dateFields = ['startDate', 'endDate', 'date', 'paymentDate', 'createdAt', 'updatedAt'];
            for (const field of dateFields) {
              if (sanitizedData[field]) {
                try {
                  const dateObj = new Date(sanitizedData[field]);
                  if (!isNaN(dateObj.getTime())) {
                    sanitizedData[field] = dateObj.toISOString();
                  }
                } catch (e) {
                  console.warn(`[SyncEngine] Failed to sanitize date for ${field}`, e);
                }
              }
            }

            // Ensure orgId is slugged for consistent multi-tenant isolation
            const { slugifyOrg } = await import('./utils/org');
            if (sanitizedData.orgId) {
                sanitizedData.orgId = slugifyOrg(sanitizedData.orgId);
            } else if (item.data.orgId) {
                sanitizedData.orgId = slugifyOrg(item.data.orgId);
            }
            
            // Specifically handle user_profiles which uses 'organizationName'
            if (item.collection === 'user_profiles' && sanitizedData.organizationName) {
                sanitizedData.organizationName = slugifyOrg(sanitizedData.organizationName);
            }

            // Normalize projectId to UPPERCASE for consistent cross-collection matching
            if (sanitizedData.projectId && typeof sanitizedData.projectId === 'string') {
                sanitizedData.projectId = sanitizedData.projectId.toUpperCase();
            }

            const { error: upsertError } = await supabase
              .from(item.collection)
              .upsert(sanitizedData);

            if (!upsertError) {
              await db.delete('syncQueue', item.id); // Remove from queue on success
              successCount++;
            } else {
              throw upsertError;
            }
          }
        } catch (err) {
          failureCount++;
          console.error(`[SyncEngine] Sync failed for ${item.collection}:`, (err as any).message || err);
          this.syncErrors.push(`${item.collection}: ${(err as any).message || 'Unknown error'}`);
        }
      }

      // Reset retry count on success
      if (failureCount === 0) {
        this.retryCount = 0;
        this.syncErrors = [];
      } else if (this.retryCount < this.maxRetries) {
        // Exponential backoff retry
        this.retryCount++;
        const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
        console.log(`[SyncEngine] Retrying sync in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => this.pushLocalChanges(), delay);
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * PULL: Get remote changes since last sync
   */
  async pullRemoteChanges(orgId: string) {
    if (!navigator.onLine) return;
    
    const db = await getDB();
    const collections = ['projects', 'expenses', 'revenue', 'development_tools', 'development_costs', 'broker_payments', 'miscellaneous', 'user_profiles', 'organizations', 'audit_logs'];

    for (const table of collections) {
      try {
        const meta = await db.get('sync_metadata', table);
        const lastSync = meta?.lastPullTimestamp 
          ? new Date(meta.lastPullTimestamp).toISOString() 
          : '1970-01-01T00:00:00Z';

        let query = supabase.from(table).select('*').gt('serverUpdatedAt', lastSync);
        
        // Handle table-specific organization filters
        if (table === 'organizations') {
          query = query.eq('id', orgId);
        } else if (table === 'user_profiles') {
          query = query.eq('organizationName', orgId);
        } else {
          query = query.eq('orgId', orgId);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          for (const record of data) {
            // Because the schema is exactly camelCase, we insert the fetched record straight to IDB natively without mapping!
            if (record.isDeleted) {
              await db.delete(table as any, record.id);
            } else {
              await db.put(table as any, record);
            }
          }
          
          // Update the last pull timestamp to the newest record's time
          const newestStr = data.reduce((prev, curr) => 
            new Date(curr.serverUpdatedAt) > new Date(prev) ? curr.serverUpdatedAt : prev, lastSync);
          
          const newestTs = new Date(newestStr).getTime();
          
          await db.put('sync_metadata', { 
            id: table, 
            collection: table, 
            lastPullTimestamp: newestTs,
            lastPushTimestamp: Date.now()
          } as any);
        }
      } catch (err) {
        console.error(`[SyncEngine] Pull failed for ${table}:`, err);
      }
    }
  }
}

// Hook into window online events
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    try {
      const db = await getDB();
      const session = await db.get('auth_sessions', 'current-session');
      if (session && session.sessionData?.user?.user_metadata?.organizationName) {
        const engine = HybridSyncEngine.getInstance();
        await engine.pushLocalChanges();
        await engine.pullRemoteChanges(session.sessionData.user.user_metadata.organizationName);
      }
    } catch (err) {
      console.error('[SyncEngine] Auto-sync on reconnect failed', err);
    }
  });

  // Also pull on tab visibility change (restoring from background/another tab)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      try {
        const db = await getDB();
        const session = await db.get('auth_sessions', 'current-session');
        if (session?.sessionData?.user?.user_metadata?.organizationName) {
          const engine = HybridSyncEngine.getInstance();
          // Push first, then pull to get latest deletions from other devices
          await engine.pushLocalChanges();
          await engine.pullRemoteChanges(session.sessionData.user.user_metadata.organizationName);
        }
      } catch (err) {
        console.error('[SyncEngine] Visibility sync failed', err);
      }
    }
  });
}

// ============================================================================
// Backward Compatibility layer for UI components
// ============================================================================

export async function createOrUpdateDoc(
  collectionName: string,
  documentId: string,
  data: any,
  userId: string,
  isUpdate: boolean = false
): Promise<void> {
  const db = await getDB();
  const timestamp = new Date().toISOString();
  
  // Statically resolve missing orgId to prevent orphaned multi-tenant records
  let injectedOrgId = data.orgId;
  if (!injectedOrgId) {
     const session = await db.get('auth_sessions', 'current-session');
     if (session && session.sessionData?.user?.user_metadata?.organizationName) {
         injectedOrgId = session.sessionData.user.user_metadata.organizationName;
     }
  }

  // Get old data for auditing if update
  let oldData = null;
  if (isUpdate) {
    oldData = await db.get(collectionName as any, documentId);
  }

  const docData = {
    ...data,
    // Normalize projectId to UPPERCASE so all collections use consistent IDs
    ...(data.projectId ? { projectId: (data.projectId as string).toUpperCase() } : {}),
    ...(injectedOrgId ? { orgId: injectedOrgId } : {}),
    ...(isUpdate ? { updatedAt: timestamp, updatedBy: userId } : { createdAt: timestamp, createdBy: userId, updatedBy: userId }),
    id: documentId,
  };
  
  await db.put(collectionName as any, docData);

  // 1. Log to Sync Queue
  await db.add('syncQueue', {
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    action: isUpdate ? 'update' : 'create',
    collection: collectionName,
    documentId,
    data: docData,
    timestamp: Date.now(),
    synced: false
  });

  // 2. Log Audit Trail
  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    orgId: injectedOrgId,
    userId,
    action: isUpdate ? 'UPDATE' : 'CREATE',
    entityType: collectionName,
    entityId: documentId,
    changes: {
      old: oldData,
      new: docData
    },
    timestamp: new Date().toISOString(),
  };
  await db.put('audit_logs', auditEntry);
  await db.add('syncQueue', {
    id: `sync-audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    action: 'create',
    collection: 'audit_logs',
    documentId: auditEntry.id,
    data: auditEntry,
    timestamp: Date.now(),
    synced: false
  });
}

export async function deleteDocWithSync(
  collectionName: string,
  documentId: string,
  userId: string
): Promise<void> {
  const db = await getDB();
  const oldData = await db.get(collectionName as any, documentId);
  
  await db.delete(collectionName as any, documentId);
  
  // 1. Log to Sync Queue (Soft Delete)
  await db.add('syncQueue', {
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    action: 'delete',
    collection: collectionName,
    documentId,
    data: null,
    timestamp: Date.now(),
    synced: false
  });

  // 2. Log Audit Trail
  const auditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    orgId: oldData?.orgId,
    userId,
    action: 'DELETE',
    entityType: collectionName,
    entityId: documentId,
    changes: {
      old: oldData,
      new: null
    },
    timestamp: new Date().toISOString(),
  };
  await db.put('audit_logs', auditEntry);
  await db.add('syncQueue', {
    id: `sync-audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    action: 'create',
    collection: 'audit_logs',
    documentId: auditEntry.id,
    data: auditEntry,
    timestamp: Date.now(),
    synced: false
  });
}

/**
 * Perform a cascading delete for projects to remove all orphaned child records.
 */
export async function deleteProjectWithCascade(projectId: string, userId: string) {
  const db = await getDB();
  const collectionsToClean = ['expenses', 'revenue', 'development_tools', 'development_costs', 'miscellaneous', 'broker_payments'];

  // 1. Delete the Project itself
  await deleteDocWithSync('projects', projectId, userId);

  // 2. Find and delete all associated records
  for (const collection of collectionsToClean) {
    const allRecords = await db.getAll(collection as any);
    // Match on both UUID (proj.id) and uppercase slug (proj.projectId) for robustness
    const orphanedRecords = allRecords.filter(rec => {
      const recPid = (rec.projectId || '').toUpperCase();
      const projUUID = projectId.toUpperCase();
      return recPid === projUUID;
    });
    
    for (const record of orphanedRecords) {
      await deleteDocWithSync(collection, record.id, userId);
    }
  }
}

export function setupSyncListener(userId: string) {
  // Handled automatically by the global exact listener above
}
