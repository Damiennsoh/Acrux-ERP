/**
 * Financial Reconciliation Service (Local-First IndexedDB Implementation)
 */

import { getDB } from './indexeddb';

export interface FinancialReconciliationData {
  type: 'expense' | 'revenue' | 'project_budget';
  documentId: string;
  userId: string;
  deltaAmount?: number;
  deltaBudget?: number;
  currentAmount?: number;
  currentBudget?: number;
  operation: 'add' | 'subtract' | 'set' | 'increment';
  timestamp: string;
}

export interface ReconciliationResult {
  success: boolean;
  conflictResolved: boolean;
  finalValue: number;
  operation: string;
}

export class FinancialReconciliationService {
  async reconcileFinancialData(data: FinancialReconciliationData): Promise<ReconciliationResult> {
    try {
      const db = await getDB();
      const collectionMap: Record<string, string> = {
        'expense': 'expenses',
        'revenue': 'revenue',
        'project_budget': 'projects'
      };

      const collection = collectionMap[data.type] || data.type;
      const doc = await db.get(collection as any, data.documentId);

      if (!doc) {
        throw new Error(`Document ${data.documentId} not found in local DB.`);
      }

      let finalValue = 0;
      let fieldToUpdate = data.type === 'project_budget' ? 'budget' : 'amount';

      const currentVal = doc[fieldToUpdate] || 0;
      const delta = data.type === 'project_budget' ? (data.deltaBudget || 0) : (data.deltaAmount || 0);

      finalValue = currentVal + delta;
      
      // Update local doc
      doc[fieldToUpdate] = finalValue;
      doc.updatedAt = new Date().toISOString();
      await db.put(collection as any, doc);

      // Queue sync for HybridSyncEngine
      await db.add('syncQueue', {
        id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        action: 'update',
        collection: collection,
        documentId: data.documentId,
        data: doc,
        timestamp: Date.now(),
        synced: false
      });

      return {
        success: true,
        conflictResolved: false, // Conflicts are caught by server_updated_at in Supabase now
        finalValue,
        operation: `${data.type}_${data.operation}`
      };
    } catch (error) {
      console.error('[FinancialReconciliation] Local-First Error:', error);
      return { success: false, conflictResolved: false, finalValue: 0, operation: 'error' };
    }
  }
}

export const financialReconciliationService = new FinancialReconciliationService();