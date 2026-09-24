import assert from 'assert';
import { ProductFinderManager } from '../src/core/finder/ProductFinderManager';
import { HidScannerService } from '../src/core/hid/HidScannerService';
import { RfidParser } from '../src/core/hid/RfidParser';
import { Product } from '../src/types/rfid';

console.log('============================================================');
console.log('PHASE 7 ACCEPTANCE TESTS: REAL H103 RFID PRODUCT FINDER');
console.log('============================================================\n');

// Mock HidScannerService that allows manual event dispatch
class MockHidScannerService extends HidScannerService {
  private mockListeners: Set<(event: any) => void> = new Set();
  public isStarted = false;

  public override start(): void {
    this.isStarted = true;
  }

  public override stop(): void {
    this.isStarted = false;
  }

  public override subscribe(listener: (event: any) => void): () => void {
    this.mockListeners.add(listener);
    return () => {
      this.mockListeners.delete(listener);
    };
  }

  public emitScan(value: string, valid: boolean = true, rawInput?: string): void {
    const event = {
      value,
      rawInput: rawInput ?? value,
      length: value.length,
      timestamp: Date.now(),
      valid,
    };
    this.mockListeners.forEach(l => l(event));
  }

  public getListenerCount(): number {
    return this.mockListeners.size;
  }
}

const mockScanner = new MockHidScannerService();
const finderManager = new ProductFinderManager(mockScanner);

const testProductSingleEpc: Product = {
  id: 'prod-laptop-01',
  name: 'Dell Precision 5570',
  sku: 'DELL-5570',
  barcode: '884116378',
  category: 'Laptops',
  description: 'Enterprise laptop',
  location: 'Rack L-04',
  epcList: ['E280116060000123456789'],
  expectedQuantity: 1,
  unit: 'pcs',
  updatedAt: new Date().toISOString(),
};

const testProductMultiEpc: Product = {
  id: 'prod-mon-02',
  name: 'Dell UltraSharp 27 Monitor',
  sku: 'MON-DELL-27',
  barcode: '884116999',
  category: 'Monitors',
  description: '4K IPS Monitor',
  location: 'Bay M-02',
  epcList: [
    'E28000000000000000000001',
    'E28000000000000000000002',
    'E28000000000000000000003',
  ],
  expectedQuantity: 3,
  unit: 'pcs',
  updatedAt: new Date().toISOString(),
};

// -------------------------------------------------------------
// CASE 1: Target EPC read once -> FOUND, Detection Count = 1
// -------------------------------------------------------------
console.log('[CASE 1] Target EPC read once');
finderManager.setProduct(testProductSingleEpc);
assert.strictEqual(finderManager.getState().status, 'READY', 'Initial status must be READY');
assert.strictEqual(finderManager.getState().detectionCount, 0, 'Initial detection count must be 0');

finderManager.startFinding();
assert.strictEqual(finderManager.getState().status, 'FINDING', 'Status must be FINDING after startFinding');
assert.strictEqual(mockScanner.getListenerCount(), 1, 'HidScannerService must have 1 active subscriber');

// Reader sends target EPC
mockScanner.emitScan('E280116060000123456789');

const stateCase1 = finderManager.getState();
assert.strictEqual(stateCase1.status, 'FOUND', 'Status must be FOUND after target EPC read');
assert.strictEqual(stateCase1.detectionCount, 1, 'Detection Count must be 1');
assert.strictEqual(stateCase1.matchedEpc, 'E280116060000123456789', 'Matched EPC must match target');
assert(stateCase1.lastDetectedTime !== null, 'lastDetectedTime must be populated');
console.log('✓ CASE 1 Passed: Single read produces FOUND and Detection Count = 1\n');

// -------------------------------------------------------------
// CASE 2: Target EPC read 10 times -> FOUND, Detection Count = 10 (No duplicate records)
// -------------------------------------------------------------
console.log('[CASE 2] Target EPC read 10 times (Deduplication)');
for (let i = 0; i < 9; i++) {
  mockScanner.emitScan('E280116060000123456789');
}

const stateCase2 = finderManager.getState();
assert.strictEqual(stateCase2.status, 'FOUND', 'Status must remain FOUND');
assert.strictEqual(stateCase2.detectionCount, 10, 'Detection Count must equal 10');
assert.strictEqual(stateCase2.matchedEpc, 'E280116060000123456789');
assert.strictEqual(stateCase2.targetEpcs.size, 1, 'Target EPC set must still have exactly 1 record');
console.log('✓ CASE 2 Passed: 10 repeated reads increment count to 10 without duplicate target records\n');

// -------------------------------------------------------------
// CASE 3: Non-target EPC read -> Target remains NOT FOUND
// -------------------------------------------------------------
console.log('[CASE 3] Non-target EPC read');
finderManager.resetDetection();
assert.strictEqual(finderManager.getState().detectionCount, 0, 'Detection count reset to 0');
assert.strictEqual(finderManager.getState().status, 'FINDING', 'Status returned to FINDING');

// Reader detects unrelated RFID tag
mockScanner.emitScan('E28099999999999999999999');

const stateCase3 = finderManager.getState();
assert.strictEqual(stateCase3.status, 'FINDING', 'Target must remain NOT FOUND (FINDING status)');
assert.strictEqual(stateCase3.detectionCount, 0, 'Detection count must remain 0');
assert.strictEqual(stateCase3.matchedEpc, null, 'Matched EPC must remain null');
assert.strictEqual(stateCase3.otherDetectedTags.length, 1, 'Non-target tag recorded in otherDetectedTags');
assert.strictEqual(stateCase3.otherDetectedTags[0].epc, 'E28099999999999999999999');
console.log('✓ CASE 3 Passed: Non-target EPC does not alter target status\n');

// -------------------------------------------------------------
// CASE 4: Product has 3 EPCs and EPC #2 is read -> FOUND, Matched EPC = EPC #2
// -------------------------------------------------------------
console.log('[CASE 4] Product with multiple EPCs (EPC #2 read)');
finderManager.setProduct(testProductMultiEpc);
assert.strictEqual(finderManager.getState().targetEpcs.size, 3, 'Target EPC set must have 3 EPCs');

finderManager.startFinding();
// Emit EPC #2
mockScanner.emitScan('E28000000000000000000002');

const stateCase4 = finderManager.getState();
assert.strictEqual(stateCase4.status, 'FOUND', 'Status must be FOUND when ANY registered EPC is read');
assert.strictEqual(stateCase4.matchedEpc, 'E28000000000000000000002', 'Matched EPC must identify EPC #2');
assert.strictEqual(stateCase4.detectionCount, 1, 'Detection count must be 1');
console.log('✓ CASE 4 Passed: Reading EPC #2 correctly matches multi-EPC product\n');

// -------------------------------------------------------------
// CASE 5: EPC arrives with lowercase characters -> Normalized match
// -------------------------------------------------------------
console.log('[CASE 5] EPC arrives with lowercase characters');
// Emit EPC #3 in lowercase
mockScanner.emitScan('e28000000000000000000003');

const stateCase5 = finderManager.getState();
assert.strictEqual(stateCase5.status, 'FOUND');
assert.strictEqual(stateCase5.matchedEpc, 'E28000000000000000000003', 'Matched EPC must be normalized to uppercase');
assert.strictEqual(stateCase5.detectionCount, 2, 'Detection count must increment to 2');
console.log('✓ CASE 5 Passed: Lowercase input successfully normalized and matched\n');

// -------------------------------------------------------------
// CASE 6: EPC arrives with CR/LF -> Normalized match
// -------------------------------------------------------------
console.log('[CASE 6] EPC arrives with CR/LF');
// Emit EPC #1 with newline terminators
mockScanner.emitScan('E28000000000000000000001\r\n', true, 'E28000000000000000000001\r\n');

const stateCase6 = finderManager.getState();
assert.strictEqual(stateCase6.status, 'FOUND');
assert.strictEqual(stateCase6.matchedEpc, 'E28000000000000000000001', 'CR/LF stripped during normalization');
assert.strictEqual(stateCase6.detectionCount, 3, 'Detection count must increment to 3');
console.log('✓ CASE 6 Passed: CR/LF whitespace successfully stripped and matched\n');

// -------------------------------------------------------------
// CASE 7: Stop Finding and scan target -> No detection
// -------------------------------------------------------------
console.log('[CASE 7] Stop Finding and scan target');
finderManager.stopFinding();
assert.strictEqual(finderManager.getState().status, 'STOPPED', 'Status must be STOPPED');
assert.strictEqual(mockScanner.getListenerCount(), 0, 'HidScannerService must have 0 subscribers after stop');

const countBefore = finderManager.getState().detectionCount;
// Trigger pull while finder is stopped
mockScanner.emitScan('E28000000000000000000001');

assert.strictEqual(finderManager.getState().detectionCount, countBefore, 'Scans while stopped must be ignored');
console.log('✓ CASE 7 Passed: Stop Finding successfully detached listener and ignored scans\n');

// -------------------------------------------------------------
// CASE 8: Start Finding again -> Detection resumes
// -------------------------------------------------------------
console.log('[CASE 8] Start Finding again');
finderManager.startFinding();
assert.strictEqual(finderManager.getState().status, 'FOUND', 'Status restores to FOUND (since it was previously detected)');
assert.strictEqual(mockScanner.getListenerCount(), 1, 'HidScannerService listener re-attached');

mockScanner.emitScan('E28000000000000000000001');
assert.strictEqual(finderManager.getState().detectionCount, countBefore + 1, 'Detection count resumed and incremented');
console.log('✓ CASE 8 Passed: Start Finding resumed detection successfully\n');

// -------------------------------------------------------------
// CASE 9: RfidParser helper verification
// -------------------------------------------------------------
console.log('[CASE 9] RfidParser helper verification');
assert.strictEqual(RfidParser.normalizeEpc('  e2801160 \r\n '), 'E2801160');
assert.strictEqual(RfidParser.isValidHex('E2801160'), true);
assert.strictEqual(RfidParser.isValidHex('E2801160G'), false);
assert.strictEqual(RfidParser.isValidHex(''), false);
console.log('✓ CASE 9 Passed: RfidParser normalization and hex validation confirmed\n');

console.log('>>> ALL 8 PHASE 7 ACCEPTANCE TEST CASES PASSED SUCCESSFULLY! <<<\n');
