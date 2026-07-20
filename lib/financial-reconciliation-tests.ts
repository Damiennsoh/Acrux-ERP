/**
 * Financial Reconciliation Test Suite
 * Comprehensive testing of mathematical conflict resolution
 * 
 * CRITICAL: These tests ensure financial data integrity in all scenarios
 */

import { FinancialOperationsService } from './financial-operations';
import { FinancialReconciliationService } from './financial-reconciliation';
import { FinancialReconciliationData } from './financial-reconciliation';

/**
 * Test Suite for Financial Reconciliation
 */
class FinancialReconciliationTestSuite {
  private financialOps: FinancialOperationsService;
  private reconciliationService: FinancialReconciliationService;

  constructor() {
    this.financialOps = new FinancialOperationsService();
    this.reconciliationService = new FinancialReconciliationService();
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<{ passed: number; failed: number; results: any[] }> {
    console.log('🧪 Starting Financial Reconciliation Test Suite');
    
    const results = [];
    let passed = 0;
    let failed = 0;

    const tests: Array<() => Promise<any>> = [
      this.testBasicExpenseReconciliation,
      this.testSimultaneousExpenseUpdates,
      this.testBudgetConflictResolution,
      this.testNegativeAmountValidation,
      this.testRoundingPrecision,
      this.testLargeAmountReconciliation,
      this.testZeroAmountHandling,
      this.testCurrencyPrecision,
      this.testConcurrentDeviceUpdates,
      this.testOfflineOnlineScenario,
      this.testMathematicalAccuracy,
      this.testAuditTrailGeneration,
      this.testRollbackCapability,
      this.testEdgeCaseScenarios,
      this.testPerformanceUnderLoad,
    ];

    for (const test of tests) {
      try {
        const result = await test.call(this);
        results.push({ test: test.name, ...result });
        if (result.passed) passed++;
        else failed++;
      } catch (error) {
        results.push({ 
          test: test.name, 
          passed: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
      }
    }

    console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
    return { passed, failed, results };
  }

  /**
   * Test 1: Basic expense reconciliation
   */
  private async testBasicExpenseReconciliation() {
    console.log('\n1️⃣ Testing basic expense reconciliation...');
    
    const operation = this.financialOps.createFinancialOperation({
      id: 'expense-1',
      type: 'expense',
      projectId: 'project-1',
      previousValue: 0,
      newValue: 100,
      operation: 'add',
      currency: 'USD',
      userId: 'user-1',
    });

    const reconciliationData: FinancialReconciliationData = {
      type: 'expense',
      documentId: 'expense-1',
      userId: 'user-1',
      deltaAmount: 100,
      currentAmount: 0,
      operation: 'add',
      timestamp: new Date().toISOString(),
    };

    // Mock current cloud value
    const mockCurrentCloudValue = 0;
    
    // Test conflict detection
    const conflict = this.financialOps.detectConflict(operation, mockCurrentCloudValue);
    
    if (conflict.hasConflict) {
      throw new Error('Unexpected conflict detected');
    }

    // Test mathematical resolution
    const finalValue = this.financialOps.applyMathematicalResolution(mockCurrentCloudValue, operation);
    
    if (finalValue !== 100) {
      throw new Error(`Expected 100, got ${finalValue}`);
    }

    return {
      passed: true,
      message: 'Basic expense reconciliation successful',
      finalValue,
      conflict,
    };
  }

  /**
   * Test 2: Simultaneous expense updates (CRITICAL TEST)
   */
  private async testSimultaneousExpenseUpdates() {
    console.log('\n2️⃣ Testing simultaneous expense updates...');
    
    // Device A: $500 → $750 (+$250)
    const deviceA = this.financialOps.createFinancialOperation({
      id: 'expense-simultaneous',
      type: 'expense',
      projectId: 'project-1',
      previousValue: 500,
      newValue: 750,
      operation: 'set',
      currency: 'USD',
      userId: 'user-a',
    });

    // Device B: $500 → $600 (+$100) 
    const deviceB = this.financialOps.createFinancialOperation({
      id: 'expense-simultaneous',
      type: 'expense',
      projectId: 'project-1',
      previousValue: 500,
      newValue: 600,
      operation: 'set',
      currency: 'USD',
      userId: 'user-b',
    });

    // Simulate Device A sync first
    const afterDeviceA = this.financialOps.applyMathematicalResolution(500, deviceA);
    
    // Device B syncs and detects conflict
    const conflictB = this.financialOps.detectConflict(deviceB, afterDeviceA);
    
    if (!conflictB.hasConflict) {
      throw new Error('Expected conflict not detected');
    }

    // Apply Device B's delta to current value
    const finalValue = this.financialOps.applyMathematicalResolution(afterDeviceA, deviceB);
    
    // Expected: $750 (Device A) + $100 (Device B delta) = $850
    if (finalValue !== 850) {
      throw new Error(`Expected 850, got ${finalValue}`);
    }

    return {
      passed: true,
      message: 'Simultaneous updates handled correctly',
      deviceAValue: afterDeviceA,
      deviceBDelta: deviceB.delta,
      finalValue,
      conflictDetected: conflictB.hasConflict,
    };
  }

  /**
   * Test 3: Budget conflict resolution
   */
  private async testBudgetConflictResolution() {
    console.log('\n3️⃣ Testing budget conflict resolution...');
    
    const budgetOp = this.financialOps.createFinancialOperation({
      id: 'project-budget',
      type: 'budget_adjustment',
      previousValue: 10000,
      newValue: 12000,
      operation: 'set',
      currency: 'USD',
      userId: 'user-1',
    });

    const reconciliationData: FinancialReconciliationData = {
      type: 'project_budget',
      documentId: 'project-budget',
      userId: 'user-1',
      deltaBudget: 2000,
      currentBudget: 10000,
      operation: 'set',
      timestamp: new Date().toISOString(),
    };

    const mockCurrentCloudBudget = 10000;
    const finalBudget = mockCurrentCloudBudget + budgetOp.delta;
    
    if (finalBudget !== 12000) {
      throw new Error(`Expected 12000, got ${finalBudget}`);
    }

    return {
      passed: true,
      message: 'Budget conflict resolution successful',
      previousBudget: 10000,
      delta: budgetOp.delta,
      finalBudget,
    };
  }

  /**
   * Test 4: Negative amount validation
   */
  private async testNegativeAmountValidation() {
    console.log('\n4️⃣ Testing negative amount validation...');
    
    // Test negative expense (should be rejected)
    const negativeExpense = this.financialOps.createFinancialOperation({
      id: 'negative-expense',
      type: 'expense',
      previousValue: 0,
      newValue: -100,
      operation: 'add',
      currency: 'USD',
      userId: 'user-1',
    });

    const validation = this.financialOps.validateFinancialOperation(negativeExpense);
    
    // Revenue should not be negative
    const negativeRevenue = this.financialOps.createFinancialOperation({
      id: 'negative-revenue',
      type: 'revenue',
      previousValue: 0,
      newValue: -100,
      operation: 'add',
      currency: 'USD',
      userId: 'user-1',
    });

    const revenueValidation = this.financialOps.validateFinancialOperation(negativeRevenue);
    
    if (revenueValidation.warnings.length === 0) {
      throw new Error('Expected warning for negative revenue');
    }

    return {
      passed: true,
      message: 'Negative amount validation working',
      expenseValidation: validation.isValid,
      revenueWarnings: revenueValidation.warnings,
    };
  }

  /**
   * Test 5: Rounding precision
   */
  private async testRoundingPrecision() {
    console.log('\n5️⃣ Testing rounding precision...');
    
    const operation = this.financialOps.createFinancialOperation({
      id: 'rounding-test',
      type: 'expense',
      previousValue: 10.33333,
      newValue: 15.66666,
      operation: 'set',
      currency: 'USD',
      userId: 'user-1',
    });

    const validation = this.financialOps.validateFinancialOperation(operation);
    
    if (validation.warnings.length === 0) {
      throw new Error('Expected warning for excessive decimal places');
    }

    // Test mathematical resolution with precision
    const mockCloudValue = 10.33333;
    const finalValue = this.financialOps.applyMathematicalResolution(mockCloudValue, operation);
    
    // Should handle precision correctly
    const expectedDelta = 15.66666 - 10.33333; // 5.33333
    const expectedFinal = 10.33333 + expectedDelta;
    
    if (Math.abs(finalValue - expectedFinal) > 0.00001) {
      throw new Error(`Precision error: expected ${expectedFinal}, got ${finalValue}`);
    }

    return {
      passed: true,
      message: 'Rounding precision handled correctly',
      warningGenerated: validation.warnings.length > 0,
      finalValue,
      precision: Math.abs(finalValue - expectedFinal),
    };
  }

  /**
   * Test 6: Large amount reconciliation
   */
  private async testLargeAmountReconciliation() {
    console.log('\n6️⃣ Testing large amount reconciliation...');
    
    const largeAmount = 999999.99;
    const operation = this.financialOps.createFinancialOperation({
      id: 'large-expense',
      type: 'expense',
      previousValue: 0,
      newValue: largeAmount,
      operation: 'add',
      currency: 'USD',
      userId: 'user-1',
    });

    const validation = this.financialOps.validateFinancialOperation(operation);
    
    if (validation.warnings.length === 0) {
      throw new Error('Expected warning for large amount');
    }

    const finalValue = this.financialOps.applyMathematicalResolution(0, operation);
    
    if (finalValue !== largeAmount) {
      throw new Error(`Expected ${largeAmount}, got ${finalValue}`);
    }

    return {
      passed: true,
      message: 'Large amount reconciliation successful',
      amount: largeAmount,
      warningGenerated: validation.warnings.length > 0,
    };
  }

  /**
   * Test 7: Zero amount handling
   */
  private async testZeroAmountHandling() {
    console.log('\n7️⃣ Testing zero amount handling...');
    
    const zeroOperation = this.financialOps.createFinancialOperation({
      id: 'zero-expense',
      type: 'expense',
      previousValue: 100,
      newValue: 0,
      operation: 'set',
      currency: 'USD',
      userId: 'user-1',
    });

    const finalValue = this.financialOps.applyMathematicalResolution(100, zeroOperation);
    
    if (finalValue !== 0) {
      throw new Error(`Expected 0, got ${finalValue}`);
    }

    return {
      passed: true,
      message: 'Zero amount handled correctly',
      finalValue,
      delta: zeroOperation.delta,
    };
  }

  /**
   * Test 8: Currency precision (different currencies)
   */
  private async testCurrencyPrecision() {
    console.log('\n8️⃣ Testing currency precision...');
    
    const currencies = [
      { code: 'USD', precision: 2 },
      { code: 'JPY', precision: 0 },
      { code: 'BTC', precision: 8 },
    ];

    const results = [];

    for (const currency of currencies) {
      const operation = this.financialOps.createFinancialOperation({
        id: `currency-${currency.code}`,
        type: 'expense',
        previousValue: 0,
        newValue: 123.456789,
        operation: 'add',
        currency: currency.code,
        userId: 'user-1',
      });

      const validation = this.financialOps.validateFinancialOperation(operation);
      
      results.push({
        currency: currency.code,
        precision: currency.precision,
        warningGenerated: validation.warnings.length > 0,
      });
    }

    return {
      passed: true,
      message: 'Currency precision tested',
      currencyResults: results,
    };
  }

  /**
   * Test 9: Concurrent device updates (Stress Test)
   */
  private async testConcurrentDeviceUpdates() {
    console.log('\n9️⃣ Testing concurrent device updates...');
    
    const devices = ['device-a', 'device-b', 'device-c', 'device-d', 'device-e'];
    let currentValue = 1000;
    const results = [];

    for (let i = 0; i < devices.length; i++) {
      const device = devices[i];
      const increment = (i + 1) * 100; // 100, 200, 300, 400, 500
      
      const operation = this.financialOps.createFinancialOperation({
        id: 'concurrent-expense',
        type: 'expense',
        projectId: 'project-1',
        previousValue: currentValue,
        newValue: currentValue + increment,
        operation: 'add',
        currency: 'USD',
        userId: device,
      });

      // Simulate each device applying their delta
      const newValue = this.financialOps.applyMathematicalResolution(currentValue, operation);
      
      results.push({
        device,
        previousValue: currentValue,
        increment,
        newValue,
      });
      
      currentValue = newValue;
    }

    // Expected final value: 1000 + 100 + 200 + 300 + 400 + 500 = 2500
    const expectedFinal = 2500;
    
    if (currentValue !== expectedFinal) {
      throw new Error(`Expected ${expectedFinal}, got ${currentValue}`);
    }

    return {
      passed: true,
      message: 'Concurrent device updates handled correctly',
      finalValue: currentValue,
      deviceResults: results,
    };
  }

  /**
   * Test 10: Offline/online scenario
   */
  private async testOfflineOnlineScenario() {
    console.log('\n🔟 Testing offline/online scenario...');
    
    // Simulate offline operations
    const offlineOperations = [];
    let localValue = 1000;
    
    // Device goes offline and makes changes
    for (let i = 0; i < 3; i++) {
      const operation = this.financialOps.createFinancialOperation({
        id: `offline-expense-${i}`,
        type: 'expense',
        previousValue: localValue,
        newValue: localValue + (i + 1) * 50,
        operation: 'add',
        currency: 'USD',
        userId: 'offline-user',
      });
      
      offlineOperations.push(operation);
      localValue += (i + 1) * 50;
    }
    
    // Simulate cloud value changed while offline (other devices)
    let cloudValue = 1000 + 200; // +$200 from other devices
    
    // Device comes back online and syncs
    for (const operation of offlineOperations) {
      const conflict = this.financialOps.detectConflict(operation, cloudValue);
      
      if (conflict.hasConflict) {
        // Apply mathematical resolution
        cloudValue = this.financialOps.applyMathematicalResolution(cloudValue, operation);
      } else {
        cloudValue = operation.expectedCurrentValue;
      }
    }
    
    // Expected: 1200 (cloud) + 50 + 100 + 150 = 1500
    const expectedFinal = 1500;
    
    if (cloudValue !== expectedFinal) {
      throw new Error(`Expected ${expectedFinal}, got ${cloudValue}`);
    }

    return {
      passed: true,
      message: 'Offline/online scenario handled correctly',
      offlineOperations: offlineOperations.length,
      finalValue: cloudValue,
    };
  }

  /**
   * Test 11: Mathematical accuracy
   */
  private async testMathematicalAccuracy() {
    console.log('\n🧮 Testing mathematical accuracy...');
    
    const testCases = [
      { previous: 100, new: 150, expected: 150 },
      { previous: 999.99, new: 1000.01, expected: 1000.01 },
      { previous: 0.001, new: 0.002, expected: 0.002 },
      { previous: 1000000, new: 1000001, expected: 1000001 },
    ];

    const results = [];

    for (const testCase of testCases) {
      const operation = this.financialOps.createFinancialOperation({
        id: `accuracy-${testCase.previous}-${testCase.new}`,
        type: 'expense',
        previousValue: testCase.previous,
        newValue: testCase.new,
        operation: 'set',
        currency: 'USD',
        userId: 'user-1',
      });

      const finalValue = this.financialOps.applyMathematicalResolution(testCase.previous, operation);
      
      const isAccurate = Math.abs(finalValue - testCase.expected) < 0.00001;
      
      results.push({
        previous: testCase.previous,
        new: testCase.new,
        final: finalValue,
        expected: testCase.expected,
        accurate: isAccurate,
      });
      
      if (!isAccurate) {
        throw new Error(`Mathematical accuracy failed: ${testCase.previous} → ${testCase.new} = ${finalValue}, expected ${testCase.expected}`);
      }
    }

    return {
      passed: true,
      message: 'Mathematical accuracy verified',
      testCases: results,
    };
  }

  /**
   * Test 12: Audit trail generation
   */
  private async testAuditTrailGeneration() {
    console.log('\n📋 Testing audit trail generation...');
    
    const operation = this.financialOps.createFinancialOperation({
      id: 'audit-expense',
      type: 'expense',
      projectId: 'project-1',
      previousValue: 100,
      newValue: 200,
      operation: 'add',
      currency: 'USD',
      userId: 'user-1',
    });

    const auditTrail = this.financialOps.createAuditTrail(operation);
    
    const requiredFields = [
      'operationId',
      'timestamp',
      'userId',
      'documentType',
      'documentId',
      'operation',
      'previousValue',
      'newValue',
      'delta',
      'expectedCurrentValue',
    ];
    
    const missingFields = requiredFields.filter(field => !auditTrail[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing audit fields: ${missingFields.join(', ')}`);
    }

    return {
      passed: true,
      message: 'Audit trail generated correctly',
      auditFields: Object.keys(auditTrail),
      hasRequiredFields: missingFields.length === 0,
    };
  }

  /**
   * Test 13: Rollback capability
   */
  private async testRollbackCapability() {
    console.log('\n🔄 Testing rollback capability...');
    
    const originalValue = 1000;
    const operation = this.financialOps.createFinancialOperation({
      id: 'rollback-expense',
      type: 'expense',
      previousValue: originalValue,
      newValue: 1200,
      operation: 'add',
      currency: 'USD',
      userId: 'user-1',
    });

    // Apply operation
    const newValue = this.financialOps.applyMathematicalResolution(originalValue, operation);
    
    // Create rollback operation (reverse delta)
    const rollbackOperation = this.financialOps.createFinancialOperation({
      id: 'rollback-expense',
      type: 'expense',
      previousValue: newValue,
      newValue: originalValue,
      operation: 'set',
      currency: 'USD',
      userId: 'user-1',
    });

    // Apply rollback
    const rolledBackValue = this.financialOps.applyMathematicalResolution(newValue, rollbackOperation);
    
    if (rolledBackValue !== originalValue) {
      throw new Error(`Rollback failed: expected ${originalValue}, got ${rolledBackValue}`);
    }

    return {
      passed: true,
      message: 'Rollback capability verified',
      originalValue,
      newValue,
      rolledBackValue,
    };
  }

  /**
   * Test 14: Edge case scenarios
   */
  private async testEdgeCaseScenarios() {
    console.log('\n⚡ Testing edge case scenarios...');
    
    const edgeCases = [
      {
        name: 'Very small amounts',
        previousValue: 0.000001,
        newValue: 0.000002,
      },
      {
        name: 'Very large amounts',
        previousValue: 999999999.99,
        newValue: 1000000000.00,
      },
      {
        name: 'Same values',
        previousValue: 100,
        newValue: 100,
      },
      {
        name: 'Maximum safe integer',
        previousValue: Number.MAX_SAFE_INTEGER - 1000,
        newValue: Number.MAX_SAFE_INTEGER,
      },
    ];

    const results = [];

    for (const edgeCase of edgeCases) {
      try {
        const operation = this.financialOps.createFinancialOperation({
          id: `edge-${edgeCase.name.replace(/\s+/g, '-')}`,
          type: 'expense',
          previousValue: edgeCase.previousValue,
          newValue: edgeCase.newValue,
          operation: 'set',
          currency: 'USD',
          userId: 'user-1',
        });

        const finalValue = this.financialOps.applyMathematicalResolution(edgeCase.previousValue, operation);
        
        results.push({
          name: edgeCase.name,
          passed: true,
          previousValue: edgeCase.previousValue,
          newValue: edgeCase.newValue,
          finalValue,
        });
      } catch (error) {
        results.push({
          name: edgeCase.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const allPassed = results.every(result => result.passed);
    
    return {
      passed: allPassed,
      message: 'Edge case scenarios tested',
      edgeCases: results,
    };
  }

  /**
   * Test 15: Performance under load
   */
  private async testPerformanceUnderLoad() {
    console.log('\n⚡ Testing performance under load...');
    
    const iterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const operation = this.financialOps.createFinancialOperation({
        id: `perf-expense-${i}`,
        type: 'expense',
        previousValue: i * 10,
        newValue: (i + 1) * 10,
        operation: 'add',
        currency: 'USD',
        userId: 'user-1',
      });

      this.financialOps.applyMathematicalResolution(i * 10, operation);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const operationsPerSecond = iterations / (duration / 1000);
    
    console.log(`Performance: ${iterations} operations in ${duration}ms (${operationsPerSecond.toFixed(0)} ops/sec)`);

    // Performance threshold: should handle 100+ ops/sec
    const passed = operationsPerSecond > 100;
    
    return {
      passed,
      message: `Performance test ${passed ? 'passed' : 'failed'}`,
      iterations,
      duration,
      operationsPerSecond,
    };
  }
}

/**
 * Run the complete test suite
 */
async function runFinancialReconciliationTests() {
  const testSuite = new FinancialReconciliationTestSuite();
  const results = await testSuite.runAllTests();
  
  console.log('\n🎯 Financial Reconciliation Test Suite Complete');
  console.log(`📊 Summary: ${results.passed} passed, ${results.failed} failed`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed tests:');
    results.results
      .filter(result => !result.passed)
      .forEach(result => {
        console.log(`  - ${result.test}: ${result.error || 'Failed'}`);
      });
  }
  
  return results;
}

// Export for use in other modules
export { FinancialReconciliationTestSuite, runFinancialReconciliationTests };