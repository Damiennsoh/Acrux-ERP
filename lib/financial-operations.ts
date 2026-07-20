/**
 * Financial Operations Service
 * Tracks financial operations with proper delta tracking for conflict resolution
 * Ensures mathematical accuracy in financial reconciliation
 */

export interface FinancialOperation {
  id: string;
  type: 'expense' | 'revenue' | 'budget_adjustment';
  projectId?: string;
  
  // Delta tracking for conflict resolution
  previousValue: number;
  newValue: number;
  delta: number;
  
  // Expected current value for conflict detection
  expectedCurrentValue: number;
  
  // Operation metadata
  operation: 'add' | 'subtract' | 'set' | 'increment' | 'decrement';
  currency: string;
  timestamp: string;
  userId: string;
  
  // Validation
  isValid: boolean;
  validationErrors?: string[];
}

export interface FinancialValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedCorrections?: Partial<FinancialOperation>;
}

/**
 * Financial Operations Service
 * Ensures proper delta tracking and validation for financial data
 */
export class FinancialOperationsService {
  
  /**
   * Create a financial operation with proper delta tracking
   */
  createFinancialOperation(params: {
    id: string;
    type: 'expense' | 'revenue' | 'budget_adjustment';
    projectId?: string;
    previousValue: number;
    newValue: number;
    operation: 'add' | 'subtract' | 'set' | 'increment' | 'decrement';
    currency: string;
    userId: string;
  }): FinancialOperation {
    
    const { id, type, previousValue, newValue, operation: operationType, currency, userId, projectId } = params;
    
    // Calculate delta based on operation type
    const delta = this.calculateDelta(operationType, previousValue, newValue);
    
    // For financial operations, we need to track what we expect the current value to be
    // This is crucial for conflict detection during sync
    const expectedCurrentValue = this.calculateExpectedCurrentValue(operationType, previousValue, newValue);
    
    const operation: FinancialOperation = {
      id,
      type,
      projectId,
      previousValue,
      newValue,
      delta,
      expectedCurrentValue,
      operation: operationType,
      currency,
      timestamp: new Date().toISOString(),
      userId,
      isValid: true,
    };
    
    // Validate the operation
    const validation = this.validateFinancialOperation(operation);
    operation.isValid = validation.isValid;
    operation.validationErrors = validation.errors.length > 0 ? validation.errors : undefined;
    
    console.log(`[FinancialOperations] Created ${type} operation: ${previousValue} → ${newValue} (Δ${delta})`);
    
    return operation;
  }
  
  /**
   * Calculate delta based on operation type
   */
  calculateDelta(operation: string, previousValue: number, newValue: number): number {
    switch (operation) {
      case 'add':
        return newValue; // Adding newValue to previous
      case 'subtract':
        return -newValue; // Subtracting newValue from previous
      case 'set':
        return newValue - previousValue; // Setting to new value
      case 'increment':
        return newValue; // Incrementing by newValue
      case 'decrement':
        return -newValue; // Decrementing by newValue
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }
  
  /**
   * Calculate expected current value for conflict detection
   */
  calculateExpectedCurrentValue(operation: string, previousValue: number, newValue: number): number {
    switch (operation) {
      case 'add':
      case 'increment':
        return previousValue + newValue;
      case 'subtract':
      case 'decrement':
        return previousValue - newValue;
      case 'set':
        return newValue;
      default:
        return previousValue;
    }
  }
  
  /**
   * Validate financial operation for integrity
   */
  validateFinancialOperation(operation: FinancialOperation): FinancialValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestedCorrections: Partial<FinancialOperation> = {};
    
    // Basic validation
    if (!operation.id) {
      errors.push('Operation ID is required');
    }
    
    if (!operation.type) {
      errors.push('Operation type is required');
    }
    
    if (!operation.currency) {
      errors.push('Currency is required');
    }
    
    if (!operation.userId) {
      errors.push('User ID is required');
    }
    
    // Financial validation
    if (isNaN(operation.previousValue) || isNaN(operation.newValue)) {
      errors.push('Previous and new values must be valid numbers');
    }
    
    if (operation.previousValue < 0 && operation.type !== 'budget_adjustment') {
      warnings.push('Previous value is negative - this may indicate data corruption');
    }
    
    if (operation.newValue < 0 && operation.type === 'revenue') {
      warnings.push('Revenue amount is negative - this is unusual');
    }
    
    // Delta validation
    const calculatedDelta = this.calculateDelta(operation.operation, operation.previousValue, operation.newValue);
    if (Math.abs(operation.delta - calculatedDelta) > 0.01) {
      errors.push(`Delta mismatch: expected ${calculatedDelta}, got ${operation.delta}`);
      suggestedCorrections.delta = calculatedDelta;
    }
    
    // Expected value validation
    const calculatedExpected = this.calculateExpectedCurrentValue(operation.operation, operation.previousValue, operation.newValue);
    if (Math.abs(operation.expectedCurrentValue - calculatedExpected) > 0.01) {
      errors.push(`Expected value mismatch: expected ${calculatedExpected}, got ${operation.expectedCurrentValue}`);
      suggestedCorrections.expectedCurrentValue = calculatedExpected;
    }
    
    // Financial limits validation
    if (operation.type === 'expense' && operation.newValue > 1000000) {
      warnings.push('Expense amount is very high - please verify');
    }
    
    if (operation.type === 'revenue' && operation.newValue > 1000000) {
      warnings.push('Revenue amount is very high - please verify');
    }
    
    // Rounding validation
    if (this.hasRoundingIssues(operation)) {
      warnings.push('Operation may have rounding issues - consider using integer cents');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestedCorrections: Object.keys(suggestedCorrections).length > 0 ? suggestedCorrections : undefined,
    };
  }
  
  /**
   * Check for rounding issues
   */
  private hasRoundingIssues(operation: FinancialOperation): boolean {
    // Check if values have more than 2 decimal places
    const hasExcessiveDecimals = (value: number) => {
      const decimalPart = value.toString().split('.')[1];
      return decimalPart ? decimalPart.length > 2 : false;
    };
    
    return hasExcessiveDecimals(operation.previousValue) || 
           hasExcessiveDecimals(operation.newValue) || 
           hasExcessiveDecimals(operation.delta);
  }
  
  /**
   * Create reconciliation data for sync operations
   */
  createReconciliationData(operation: FinancialOperation): any {
    if (!operation.isValid) {
      throw new Error('Cannot create reconciliation data for invalid operation');
    }
    
    const baseData = {
      id: operation.id,
      type: operation.type,
      userId: operation.userId,
      timestamp: operation.timestamp,
      currency: operation.currency,
      operation: operation.operation,
      previousValue: operation.previousValue,
      newValue: operation.newValue,
      delta: operation.delta,
      expectedCurrentValue: operation.expectedCurrentValue,
    };
    
    if (operation.projectId) {
      return {
        ...baseData,
        projectId: operation.projectId,
      };
    }
    
    return baseData;
  }
  
  /**
   * Detect conflicts between local and cloud values
   */
  detectConflict(localOperation: FinancialOperation, cloudValue: number): {
    hasConflict: boolean;
    conflictType: 'value_mismatch' | 'delta_mismatch' | 'operation_mismatch';
    localValue: number;
    cloudValue: number;
    resolution: string;
  } {
    const localExpectedValue = localOperation.expectedCurrentValue;
    const localDelta = localOperation.delta;
    
    // Check for value mismatch (most critical for financial data)
    if (Math.abs(localExpectedValue - cloudValue) > 0.01) {
      return {
        hasConflict: true,
        conflictType: 'value_mismatch',
        localValue: localExpectedValue,
        cloudValue: cloudValue,
        resolution: `Apply delta ${localDelta} to cloud value: ${cloudValue} + ${localDelta} = ${cloudValue + localDelta}`
      };
    }
    
    // Check for operation mismatch (less critical but still important)
    if (localOperation.operation !== 'add' && localOperation.operation !== 'set') {
      return {
        hasConflict: false, // Not a critical conflict for financial data
        conflictType: 'operation_mismatch',
        localValue: localExpectedValue,
        cloudValue: cloudValue,
        resolution: 'Operation type is safe for financial reconciliation'
      };
    }
    
    return {
      hasConflict: false,
      conflictType: 'delta_mismatch',
      localValue: localExpectedValue,
      cloudValue: cloudValue,
      resolution: 'No conflict detected'
    };
  }
  
  /**
   * Apply mathematical conflict resolution
   * CRITICAL: balance = balance + delta (NOT balance = newValue)
   */
  applyMathematicalResolution(currentValue: number, operation: FinancialOperation): number {
    if (!operation.isValid) {
      throw new Error('Cannot apply resolution for invalid operation');
    }
    
    // CRITICAL: Use delta-based resolution, not value replacement
    const newValue = currentValue + operation.delta;
    
    console.log(`[FinancialOperations] Mathematical resolution: ${currentValue} + ${operation.delta} = ${newValue}`);
    
    return newValue;
  }
  
  /**
   * Create audit trail for financial operations
   */
  createAuditTrail(operation: FinancialOperation): any {
    return {
      operationId: operation.id,
      type: operation.type,
      projectId: operation.projectId,
      previousValue: operation.previousValue,
      newValue: operation.newValue,
      delta: operation.delta,
      expectedCurrentValue: operation.expectedCurrentValue,
      operation: operation.operation,
      currency: operation.currency,
      timestamp: operation.timestamp,
      userId: operation.userId,
      isValid: operation.isValid,
      validationErrors: operation.validationErrors,
      auditTimestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const financialOperationsService = new FinancialOperationsService();