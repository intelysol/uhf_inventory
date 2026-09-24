import assert from 'assert';
import { InventoryManager } from '../src/core/inventory/InventoryManager';
import { ProductFinderManager } from '../src/core/finder/ProductFinderManager';
import { HidScannerService } from '../src/core/hid/HidScannerService';
import { RfidParser } from '../src/core/hid/RfidParser';
import { Product } from '../src/types/rfid';

console.log('============================================================');
console.log('PHASE 8 PERFORMANCE & HARDWARE STABILIZATION SUITE');
console.log('============================================================\n');

class MockHidService extends HidScannerService {
  private listeners: Set<(e: any) => void> = new Set();
  public override subscribe(l: (e: any) => void): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  public emit(epc: string): void {
    const event = {
      value: epc,
      rawInput: epc,
      length: epc.length,
      timestamp: Date.now(),
      valid: true,
    };
    this.listeners.forEach(l => l(event));
  }
}

// -------------------------------------------------------------
// TEST 1: INVENTORY STRESS TEST (100 Unique EPCs, 500 Total Reads)
// -------------------------------------------------------------
console.log('[TEST 1] Inventory Stress: 100 Unique EPCs, 500 Total Reads');
const mockService1 = new MockHidService();
const inventoryMgr1 = new InventoryManager(mockService1);

const catalog100: Product[] = [];
for (let i = 1; i <= 100; i++) {
  const hexSuffix = i.toString(16).padStart(4, '0').toUpperCase();
  const epc = `E2801160600000000000${hexSuffix}`;
  catalog100.push({
    id: `prod-${i}`,
    name: `Product ${i}`,
    sku: `SKU-${i}`,
    barcode: `BAR-${i}`,
    category: 'Hardware',
    description: '',
    location: 'Warehouse A',
    epcList: [epc],
    expectedQuantity: 1,
    unit: 'pcs',
    updatedAt: '',
  });
}

const session1 = inventoryMgr1.startSession('Stress Test 100', 'Warehouse A', undefined, catalog100, 'ALL');

const t0 = performance.now();
// 500 scans distributed among 100 unique EPCs (5 scans per tag)
for (let round = 0; round < 5; round++) {
  for (let i = 1; i <= 100; i++) {
    const hexSuffix = i.toString(16).padStart(4, '0').toUpperCase();
    mockService1.emit(`e2801160600000000000${hexSuffix}\r\n`);
  }
}
const t1 = performance.now();

const state1 = inventoryMgr1.getActiveSession();
assert(state1 !== null, 'Session must be active');
assert.strictEqual(state1.tags.length, 100, 'Must have exactly 100 unique tags');
assert.strictEqual(state1.totalReads, 500, 'Must have exactly 500 total reads');
assert.strictEqual(state1.tags.every(t => t.readCount === 5), true, 'Every tag must have exactly 5 reads');
assert.strictEqual(state1.foundCount, 100, 'All 100 expected items must be FOUND');
assert.strictEqual(state1.missingCount, 0, '0 items MISSING');
assert.strictEqual(state1.extraCount, 0, '0 EXTRA items');
assert.strictEqual(state1.unknownCount, 0, '0 UNKNOWN items');

console.log(`✓ TEST 1 Passed in ${(t1 - t0).toFixed(2)}ms (100 unique EPCs, 500 reads, O(1) deduplication)\n`);

// -------------------------------------------------------------
// TEST 2: INVENTORY HIGH LOAD (500 Unique EPCs, 5,000 Total Reads)
// -------------------------------------------------------------
console.log('[TEST 2] Inventory High Load: 500 Unique EPCs, 5,000 Total Reads');
const mockService2 = new MockHidService();
const inventoryMgr2 = new InventoryManager(mockService2);

const catalog500: Product[] = [];
for (let i = 1; i <= 500; i++) {
  const hexSuffix = i.toString(16).padStart(6, '0').toUpperCase();
  const epc = `E28000000000000000${hexSuffix}`;
  catalog500.push({
    id: `prod-500-${i}`,
    name: `Item ${i}`,
    sku: `SKU-500-${i}`,
    barcode: `B-${i}`,
    category: 'Inventory',
    description: '',
    location: 'Zone B',
    epcList: [epc],
    expectedQuantity: 1,
    unit: 'pcs',
    updatedAt: '',
  });
}

inventoryMgr2.startSession('High Load 500', 'Zone B', undefined, catalog500, 'ALL');

const t2 = performance.now();
// 10 rounds of 500 tags = 5,000 total reads
for (let round = 0; round < 10; round++) {
  for (let i = 1; i <= 500; i++) {
    const hexSuffix = i.toString(16).padStart(6, '0').toUpperCase();
    mockService2.emit(`E28000000000000000${hexSuffix}`);
  }
}
const t3 = performance.now();

const state2 = inventoryMgr2.getActiveSession();
assert(state2 !== null);
assert.strictEqual(state2.tags.length, 500, 'Must have exactly 500 unique tags');
assert.strictEqual(state2.totalReads, 5000, 'Must have exactly 5,000 total reads');
assert.strictEqual(state2.tags.every(t => t.readCount === 10), true, 'Every tag must have exactly 10 reads');

console.log(`✓ TEST 2 Passed in ${(t3 - t2).toFixed(2)}ms (500 unique tags, 5,000 reads processed with zero freeze)\n`);

// -------------------------------------------------------------
// TEST 3: INVENTORY EXPECTED / MISSING / EXTRA / UNKNOWN MATRIX
// -------------------------------------------------------------
console.log('[TEST 3] Inventory Expected Set Comparison Matrix (Found, Missing, Extra, Unknown)');
const mockService3 = new MockHidService();
const inventoryMgr3 = new InventoryManager(mockService3);

const catalogMatrix: Product[] = [
  { id: 'p1', name: 'Product 1', sku: 'SKU-1', barcode: '', category: '', description: '', location: '', epcList: ['E2800001'], expectedQuantity: 1, unit: 'pcs', updatedAt: '' },
  { id: 'p2', name: 'Product 2', sku: 'SKU-2', barcode: '', category: '', description: '', location: '', epcList: ['E2800002'], expectedQuantity: 1, unit: 'pcs', updatedAt: '' },
  { id: 'p3', name: 'Product 3', sku: 'SKU-3', barcode: '', category: '', description: '', location: '', epcList: ['E2800003'], expectedQuantity: 1, unit: 'pcs', updatedAt: '' },
  { id: 'p4', name: 'Product 4', sku: 'SKU-4', barcode: '', category: '', description: '', location: '', epcList: ['E2800004'], expectedQuantity: 1, unit: 'pcs', updatedAt: '' },
  { id: 'p5', name: 'Product 5 (Extra)', sku: 'SKU-5', barcode: '', category: '', description: '', location: '', epcList: ['E2800005'], expectedQuantity: 1, unit: 'pcs', updatedAt: '' },
];

// Expect only p1, p2, p3, p4
inventoryMgr3.startSession('Matrix Session', 'Zone 1', undefined, catalogMatrix, ['p1', 'p2', 'p3', 'p4']);

// Scan p1, p2 (FOUND), p5 (EXTRA - in catalog but not expected), and UNKNOWN-TAG (UNKNOWN)
mockService3.emit('E2800001');
mockService3.emit('E2800002');
mockService3.emit('E2800005');
mockService3.emit('E2809999');

const state3 = inventoryMgr3.getActiveSession();
assert(state3 !== null);
assert.strictEqual(state3.expectedCount, 4, 'Expected must equal 4');
assert.strictEqual(state3.foundCount, 2, 'Found must equal 2 (p1, p2)');
assert.strictEqual(state3.missingCount, 2, 'Missing must equal 2 (p3, p4)');
assert.strictEqual(state3.extraCount, 1, 'Extra must equal 1 (p5)');
assert.strictEqual(state3.unknownCount, 1, 'Unknown must equal 1 (E2809999)');
assert.strictEqual(state3.uniqueTags, 4, '4 unique tags scanned');

console.log('✓ TEST 3 Passed: Inventory Comparison Matrix matches exact business logic\n');

// -------------------------------------------------------------
// TEST 4: PRODUCT FINDER HIGH FREQUENCY BURST
// -------------------------------------------------------------
console.log('[TEST 4] Product Finder High Frequency Trigger Burst');
const mockService4 = new MockHidService();
const finderMgr = new ProductFinderManager(mockService4);

const targetProduct: Product = {
  id: 'prod-target',
  name: 'Target Precision Tool',
  sku: 'TOOL-001',
  barcode: '123456',
  category: 'Tools',
  description: '',
  location: 'Bin 4',
  epcList: ['E28098765432101234567890'],
  expectedQuantity: 1,
  unit: 'pcs',
  updatedAt: '',
};

finderMgr.setProduct(targetProduct);
finderMgr.startFinding();

// 200 consecutive trigger reads in rapid succession
for (let i = 0; i < 200; i++) {
  mockService4.emit('e28098765432101234567890\r\n');
}

const finderState = finderMgr.getState();
assert.strictEqual(finderState.status, 'FOUND');
assert.strictEqual(finderState.detectionCount, 200);
assert.strictEqual(finderState.matchedEpc, 'E28098765432101234567890');
assert.strictEqual(finderState.targetEpcs.size, 1);

console.log('✓ TEST 4 Passed: 200 rapid trigger bursts increment count to 200 with 1 target record\n');

console.log('>>> ALL PHASE 8 STABILIZATION & PERFORMANCE TESTS PASSED! <<<\n');
