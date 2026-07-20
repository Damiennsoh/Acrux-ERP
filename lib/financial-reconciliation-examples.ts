/**
 * Financial Reconciliation Usage Examples and Integration Guide
 * 
 * CRITICAL: This demonstrates how to properly handle financial data conflicts
 * using mathematical reconciliation instead of dangerous "last write wins"
 */

import { FinancialOperationsService } from './financial-operations';
import { FinancialReconciliationService } from './financial-reconciliation';
import { EnhancedCloudSyncService } from './enhanced-cloud-sync';
import { EnhancedSyncOrchestrator } from './enhanced-sync-orchestrator';

/**
 * EXAMPLE 1: Creating an expense with proper delta tracking
 * This ensures conflicts are resolved mathematically, not by timestamp
 */
export async function createExpenseWithReconciliation() {
  const financialOps = new FinancialOperationsService();
  
  // Scenario: Adding a $500 expense to a project
  const currentProjectBudget = 10000; // Current budget from local storage
  const newExpenseAmount = 500;
  
  // CRITICAL: Create operation with proper delta tracking
  const expenseOperation = financialOps.createFinancialOperation({
    id: 'expense-123',
    type: 'expense',
    projectId: 'project-456',
    previousValue: 0, // This is a new expense
    newValue: newExpenseAmount,
    operation: 'add',
    currency: 'USD',
    userId: 'user-789',
  });
  
  // Validate the operation
  const validation = financialOps.validateFinancialOperation(expenseOperation);
  if (!validation.isValid) {
    console.error('Invalid financial operation:', validation.errors);
    return;
  }
  
  // Store the operation with delta tracking
  const operationData = {
    ...expenseOperation,
    _previousAmount: 0, // Expected current value for conflict detection
    _expectedCurrentValue: newExpenseAmount, // What we expect the final value to be
  };
  
  // Save to local IndexedDB
  await saveToLocal('expenses', 'expense-123', operationData);
  
  console.log('✅ Expense created with proper delta tracking:', {
    amount: newExpenseAmount,
    delta: expenseOperation.delta,
    expectedCurrentValue: expenseOperation.expectedCurrentValue,
  });
}

/**
 * EXAMPLE 2: Updating an expense (CRITICAL for conflict resolution)
 * Demonstrates how to handle the dangerous "edit existing expense" scenario
 */
export async function updateExpenseWithConflictResolution() {
  const financialOps = new FinancialOperationsService();
  
  // Scenario: User changes expense from $500 to $750
  // CRITICAL: We need to track this as a delta, not just replace the value
  
  const originalExpense = await getFromLocal('expenses', 'expense-123');
  const originalAmount = originalExpense.amount; // $500
  const newAmount = 750; // User wants to change to $750
  
  // CRITICAL: Calculate the delta, don't just replace the value
  const delta = financialOps.calculateDelta('set', originalAmount, newAmount); // $250
  
  const updateOperation = financialOps.createFinancialOperation({
    id: 'expense-123',
    type: 'expense',
    projectId: 'project-456',
    previousValue: originalAmount,
    newValue: newAmount,
    operation: 'set', // We're setting a new value
    currency: 'USD',
    userId: 'user-789',
  });
  
  // CRITICAL: Store with conflict detection metadata
  const updatedData = {
    ...originalExpense,
    amount: newAmount,
    _previousAmount: originalAmount, // For conflict detection
    _delta: delta, // The actual change amount
    _expectedCurrentValue: newAmount, // What we expect in the cloud
    updatedAt: new Date().toISOString(),
  };
  
  await saveToLocal('expenses', 'expense-123', updatedData);
  
  console.log('✅ Expense updated with delta tracking:', {
    originalAmount,
    newAmount,
    delta,
    operation: updateOperation.operation,
  });
}

/**
 * EXAMPLE 3: Conflict resolution scenario
 * What happens when two devices edit the same expense simultaneously?
 */
export async function demonstrateConflictResolution() {
  const reconciliationService = new FinancialReconciliationService();
  
  // Scenario: 
  // Device A: Changes expense from $500 to $750 (delta: +$250)
  // Device B: Changes expense from $500 to $600 (delta: +$100)
  // Cloud currently has: $500
  // Both devices sync at the same time
  
  // Device A's operation
  const deviceAOperation = {
    type: 'expense' as const,
    documentId: 'expense-123',
    userId: 'user-a',
    deltaAmount: 250, // +$250
    currentAmount: 500, // Expected current value
    operation: 'add' as const,
    timestamp: new Date().toISOString(),
  };
  
  // Device B's operation  
  const deviceBOperation = {
    type: 'expense' as const,
    documentId: 'expense-123',
    userId: 'user-b',
    deltaAmount: 100, // +$100
    currentAmount: 500, // Expected current value
    operation: 'add' as const,
    timestamp: new Date().toISOString(),
  };
  
  // Process Device A's operation first
  const resultA = await reconciliationService.reconcileFinancialData(deviceAOperation);
  console.log('Device A reconciliation result:', resultA);
  
  // Cloud now has: $500 + $250 = $750
  
  // Device B syncs and detects conflict
  // Cloud has $750, but Device B expected $500
  const resultB = await reconciliationService.reconcileFinancialData({
    ...deviceBOperation,
    currentAmount: 750, // Updated expected value
  });
  
  console.log('Device B conflict resolution:', resultB);
  // Final result: $750 + $100 = $850 (both deltas applied)
  
  console.log('✅ Conflict resolved mathematically:', {
    originalAmount: 500,
    afterDeviceA: 750,
    afterDeviceB: 850,
    resolution: 'Both deltas applied in sequence',
  });
}

/**
 * EXAMPLE 4: Budget reconciliation for projects
 * Demonstrates mathematical budget adjustments
 */
export async function demonstrateBudgetReconciliation() {
  const financialOps = new FinancialOperationsService();
  
  // Scenario: Project budget needs to be increased from $10,000 to $12,000
  const currentBudget = 10000;
  const newBudget = 12000;
  const budgetDelta = financialOps.calculateDelta('set', currentBudget, newBudget); // +$2,000
  
  const budgetOperation = financialOps.createFinancialOperation({
    id: 'project-456',
    type: 'budget_adjustment',
    previousValue: currentBudget,
    newValue: newBudget,
    operation: 'set',
    currency: 'USD',
    userId: 'user-789',
  });
  
  // Create reconciliation data for sync
  const reconciliationData = {
    type: 'project_budget' as const,
    documentId: 'project-456',
    userId: 'user-789',
    deltaBudget: budgetDelta,
    currentBudget: currentBudget,
    operation: 'set' as const,
    timestamp: new Date().toISOString(),
  };
  
  console.log('✅ Budget reconciliation data created:', {
    currentBudget,
    newBudget,
    delta: budgetDelta,
    expectedValue: budgetOperation.expectedCurrentValue,
  });
  
  return reconciliationData;
}

/**
 * EXAMPLE 5: Complete integration with enhanced sync
 */
export async function demonstrateEnhancedSync() {
  const enhancedSync = new EnhancedSyncOrchestrator('user-789');
  
  // Monitor sync state
  enhancedSync.onStateChange((state) => {
    console.log('Sync state:', {
      isOnline: state.isOnline,
      isSyncing: state.isSyncing,
      reconciliationStats: state.reconciliationStats,
    });
  });
  
  // Simulate financial operations
  await createExpenseWithReconciliation();
  await updateExpenseWithConflictResolution();
  await demonstrateBudgetReconciliation();
  
  // Trigger sync with financial reconciliation
  console.log('🔄 Triggering enhanced sync with financial reconciliation...');
  await enhancedSync.performSync();
  
  console.log('✅ Enhanced sync completed with mathematical conflict resolution');
}

/**
 * EXAMPLE 6: Error handling and validation
 */
export function demonstrateValidation() {
  const financialOps = new FinancialOperationsService();
  
  // Invalid operation: negative expense
  const invalidOperation = financialOps.createFinancialOperation({
    id: 'invalid-expense',
    type: 'expense',
    previousValue: 0,
    newValue: -100, // Invalid: negative expense
    operation: 'add',
    currency: 'USD',
    userId: 'user-789',
  });
  
  const validation = financialOps.validateFinancialOperation(invalidOperation);
  
  console.log('❌ Validation failed:', {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
  });
  
  // Valid operation
  const validOperation = financialOps.createFinancialOperation({
    id: 'valid-expense',
    type: 'expense',
    previousValue: 0,
    newValue: 100,
    operation: 'add',
    currency: 'USD',
    userId: 'user-789',
  });
  
  const validValidation = financialOps.validateFinancialOperation(validOperation);
  
  console.log('✅ Validation passed:', {
    isValid: validValidation.isValid,
    warnings: validValidation.warnings,
  });
}

/**
 * BEST PRACTICES for Financial Reconciliation:
 * 
 * 1. ALWAYS use delta-based operations for financial data
 * 2. NEVER use simple "last write wins" for amounts or budgets
 * 3. ALWAYS track expected current values for conflict detection
 * 4. ALWAYS use Firebase Transactions for atomic financial operations
 * 5. ALWAYS validate financial operations before applying
 * 6. ALWAYS log reconciliation decisions for audit trails
 * 7. NEVER allow negative amounts for revenue (unless business rules allow)
 * 8. ALWAYS handle rounding issues (consider using integer cents)
 * 9. ALWAYS test conflict scenarios with multiple devices
 * 10. ALWAYS provide clear error messages for reconciliation failures
 */

// Import helper functions (these would be imported from your existing indexeddb module)
async function saveToLocal(store: string, id: string, data: any) {
  // Implementation would use your existing IndexedDB service
  console.log(`Saving to ${store}/${id}:`, data);
}

async function getFromLocal(store: string, id: string) {
  // Implementation would use your existing IndexedDB service
  return { amount: 500, projectId: 'project-456' }; // Mock data
}
