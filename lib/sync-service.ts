import { supabase } from './supabase';
import { slugifyOrg } from './utils/org';

// ============================================================================
// Direct Supabase Data Layer — No IndexedDB, No Sync Queue
// All data is read from and written to Supabase directly.
// This ensures data persists across devices, browsers, and sessions.
// ============================================================================

/**
 * Create or update a record directly in Supabase.
 * This replaces the old offline-first IndexedDB approach.
 */
export async function createOrUpdateDoc(
  collectionName: string,
  documentId: string,
  data: any,
  userId: string,
  isUpdate: boolean = false
): Promise<void> {
  const timestamp = new Date().toISOString();

  // Ensure orgId is always slugified for consistent multi-tenant isolation
  const orgId = data.orgId ? slugifyOrg(data.orgId) : undefined;

  const docData = {
    ...data,
    id: documentId,
    ...(orgId ? { orgId } : {}),
    // Normalize projectId to UPPERCASE
    ...(data.projectId ? { projectId: (data.projectId as string).toUpperCase() } : {}),
    ...(isUpdate
      ? { updatedAt: timestamp, updatedBy: userId }
      : { createdAt: timestamp, updatedAt: timestamp, createdBy: userId, updatedBy: userId }),
  };

  const { error } = await supabase
    .from(collectionName)
    .upsert(docData, { onConflict: 'id' });

  if (error) {
    console.error(`[DB] Failed to write to ${collectionName}:`, error.message);
    throw new Error(error.message);
  }

  // Log to audit_logs (best-effort, don't block on failure)
  try {
    await supabase.from('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      orgId,
      userId,
      action: isUpdate ? 'UPDATE' : 'CREATE',
      entityType: collectionName,
      entityId: documentId,
      changes: { new: docData },
      timestamp,
    });
  } catch {
    // Audit log failure is non-fatal
  }
}

/**
 * Delete a record directly in Supabase (soft delete via isDeleted flag).
 */
export async function deleteDocWithSync(
  collectionName: string,
  documentId: string,
  userId: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  const { error } = await supabase
    .from(collectionName)
    .update({ isDeleted: true, updatedAt: timestamp, updatedBy: userId })
    .eq('id', documentId);

  if (error) {
    console.error(`[DB] Failed to delete from ${collectionName}:`, error.message);
    throw new Error(error.message);
  }

  // Log to audit_logs (best-effort)
  try {
    await supabase.from('audit_logs').insert({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      userId,
      action: 'DELETE',
      entityType: collectionName,
      entityId: documentId,
      changes: { deleted: true },
      timestamp,
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Perform a cascading delete for projects to remove all orphaned child records.
 */
export async function deleteProjectWithCascade(projectId: string, userId: string) {
  const collectionsToClean = [
    'revenue',
    'development_tools',
    'miscellaneous',
    'broker_payments',
  ];

  // Delete the project itself
  await deleteDocWithSync('projects', projectId, userId);

  // Delete all child records linked to this project
  for (const collection of collectionsToClean) {
    const { data: records } = await supabase
      .from(collection)
      .select('id')
      .eq('projectId', projectId.toUpperCase())
      .eq('isDeleted', false);

    if (records && records.length > 0) {
      for (const record of records) {
        await deleteDocWithSync(collection, record.id, userId);
      }
    }
  }
}

// No-op: kept for backward compatibility in layout.tsx
export function setupSyncListener(_userId: string) {}
