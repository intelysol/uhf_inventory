// In-memory localStorage polyfill for Node.js test environment
const memoryStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

import assert from 'node:assert';
import { InventoryManager } from '../src/core/inventory/InventoryManager';
import { Product } from '../src/types/rfid';
import { HidScanEvent } from '../src/core/hid/HidScanEvent';
import { StorageService } from '../src/services/storage';

console.log('--- Starting InventoryManager Acceptance & Business Rule Tests ---');

// Mock Products
const mockProducts: Product[] = [
  {
    id: 'prod-001',
    name: 'Industrial UHF RFID Tag Pack',
    sku: 'TAG-UHF-01',
    barcode: 'BC-001',
    category: 'Hardware',
    description: 'RFID testing tag',
    location: 'Aisle 3 / Bin 12',
    epcList: ['E280116060000123', 'E280116060000124'],
    expectedQuantity: 2,
    unit: 'pack',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-002',
    name: 'Chafon Bluetooth Scanner Cradle',
    sku: 'CHA-CRD-02',
    barcode: 'BC-002',
    category: 'Equipment',
    description: 'Scanner dock',
    location: 'Charging Station 1',
    epcList: ['E280116060000456'],
    expectedQuantity: 1,
    unit: 'pcs',
    updatedAt: new Date().toISOString(),
  },
];

const manager = new InventoryManager();

function createScanEvent(value: string, valid = true): HidScanEvent {
  const norm = value.trim().toUpperCase();
  return {
    value: norm,
    rawInput: value,
    timestamp: Date.now(),
    length: norm.length,
    valid,
  };
}

// TEST 1: Start new inventory
console.log('\n[Test 1] Start New Inventory Session');
{
  const session = manager.startSession('Quarterly Audit', 'Warehouse Main', 'Physical test', mockProducts);
  assert.strictEqual(session.uniqueTags, 0, 'Initial unique tags must be 0');
  assert.strictEqual(session.totalReads, 0, 'Initial total reads must be 0');
  assert.strictEqual(session.tags.length, 0, 'Initial tag array must be empty');
  assert.strictEqual(session.status, 'ACTIVE');
  console.log('✓ Test 1 Passed: Initial session state is empty and active');
}

// TEST 2: Scan one physical RFID
console.log('\n[Test 2] Scan One Physical RFID Tag');
{
  manager.processRfidScan(createScanEvent('E280116060000123'));
  const session = manager.getActiveSession()!;
  assert.strictEqual(session.uniqueTags, 1, 'Expected uniqueTags = 1');
  assert.strictEqual(session.totalReads, 1, 'Expected totalReads = 1');
  assert.strictEqual(session.tags.length, 1, 'Expected 1 tag row');
  assert.strictEqual(session.tags[0].epc, 'E280116060000123');
  assert.strictEqual(session.tags[0].readCount, 1);
  console.log('✓ Test 2 Passed: Single tag produces 1 unique tag, 1 total read, 1 row');
}

// TEST 3: Scan same RFID 10 more times
console.log('\n[Test 3] Scan Same Tag 10 More Times (Deduplication)');
{
  for (let i = 0; i < 10; i++) {
    manager.processRfidScan(createScanEvent('E280116060000123'));
  }
  const session = manager.getActiveSession()!;
  assert.strictEqual(session.uniqueTags, 1, 'Unique tags must remain 1');
  assert.strictEqual(session.totalReads, 11, 'Total reads must be 11');
  assert.strictEqual(session.tags.length, 1, 'Tag rows must remain 1');
  assert.strictEqual(session.tags[0].readCount, 11, 'Read count must be 11');
  console.log('✓ Test 3 Passed: 10 repeated reads increment readCount to 11 without adding rows');
}

// TEST 4: Scan four additional tags
console.log('\n[Test 4] Scan Four Additional Tags');
{
  const additionalTags = [
    'E280116060000456', // Registered product
    'E280116060000789', // Unregistered
    'E280116060000999', // Unregistered
    'E280116060000AAA', // Unregistered
  ];
  for (const tag of additionalTags) {
    manager.processRfidScan(createScanEvent(tag));
  }
  const session = manager.getActiveSession()!;
  assert.strictEqual(session.uniqueTags, 5, 'Unique tags must now be 5');
  assert.strictEqual(session.totalReads, 15, 'Total reads must now be 15');
  assert.strictEqual(session.tags.length, 5, 'Tag rows must be 5');
  console.log('✓ Test 4 Passed: 4 additional tags result in uniqueTags = 5, totalReads = 15');
}

// TEST 5: Scan all tags repeatedly
console.log('\n[Test 5] High-frequency Interleaved Scans');
{
  const sequence = [
    'E280116060000123',
    'E280116060000456',
    'E280116060000789',
    'E280116060000123',
    'E280116060000999',
    'E280116060000AAA',
    'E280116060000123',
  ];
  for (const tag of sequence) {
    manager.processRfidScan(createScanEvent(tag));
  }
  const session = manager.getActiveSession()!;
  assert.strictEqual(session.uniqueTags, 5, 'Unique tags must remain 5');
  assert.strictEqual(session.totalReads, 22, 'Total reads must be 22 (15 + 7)');
  assert.strictEqual(session.tags.length, 5, 'Tag rows must remain 5');
  console.log('✓ Test 5 Passed: Interleaved repeated reads do not create duplicate rows');
}

// TEST 6: Product Association (FOUND)
console.log('\n[Test 6] Product Association (FOUND)');
{
  const session = manager.getActiveSession()!;
  const foundTag = session.tags.find(t => t.epc === 'E280116060000123')!;
  assert.strictEqual(foundTag.status, 'FOUND');
  assert.strictEqual(foundTag.productName, 'Industrial UHF RFID Tag Pack');
  assert.strictEqual(foundTag.sku, 'TAG-UHF-01');
  assert.strictEqual(foundTag.location, 'Aisle 3 / Bin 12');
  console.log('✓ Test 6 Passed: Registered EPC correctly matched product with FOUND status');
}

// TEST 7: Unknown Tag (UNKNOWN)
console.log('\n[Test 7] Unregistered Tag (UNKNOWN)');
{
  const session = manager.getActiveSession()!;
  const unknownTag = session.tags.find(t => t.epc === 'E280116060000999')!;
  assert.strictEqual(unknownTag.status, 'UNKNOWN');
  assert.strictEqual(unknownTag.productId, null);
  assert.strictEqual(unknownTag.productName, null);
  assert.strictEqual(unknownTag.sku, null);
  console.log('✓ Test 7 Passed: Unregistered EPC correctly assigned UNKNOWN status');
}

// TEST 8: Normalization Equivalence
console.log('\n[Test 8] Normalization Equivalence');
{
  const variations = [
    'e280116060000bbb',
    'E280116060000BBB',
    '  E280116060000BBB  ',
    'E280116060000BBB\r\n',
  ];
  for (const v of variations) {
    manager.processRfidScan(createScanEvent(v));
  }
  const session = manager.getActiveSession()!;
  const normTag = session.tags.find(t => t.epc === 'E280116060000BBB')!;
  assert.ok(normTag, 'Normalized tag must exist');
  assert.strictEqual(normTag.readCount, 4, 'All 4 variations must resolve to the same tag with readCount = 4');
  console.log('✓ Test 8 Passed: Different casing and whitespace resolve to the exact same normalized EPC');
}

// TEST 9: Stop Inventory and Persistence
console.log('\n[Test 9] Stop Inventory Session and Persistence');
{
  const stoppedSession = manager.stopSession()!;
  assert.ok(stoppedSession, 'Stopped session must return snapshot');
  assert.strictEqual(stoppedSession.status, 'COMPLETED');
  assert.ok(stoppedSession.completedAt && stoppedSession.completedAt > 0);
  assert.strictEqual(manager.isSessionActive(), false, 'Session must now be inactive');

  // Verify it was persisted to StorageService
  const savedSessions = StorageService.getSessions();
  const foundSaved = savedSessions.find(s => s.id === stoppedSession.id);
  assert.ok(foundSaved, 'Session must be persisted in StorageService');
  assert.strictEqual(foundSaved.tags.length, stoppedSession.tags.length);
  assert.strictEqual(foundSaved.totalReads, stoppedSession.totalReads);
  console.log('✓ Test 9 Passed: Session stopped and persisted with exact tag and read counts');
}

// TEST 10: Duplicate Storage Protection
console.log('\n[Test 10] Duplicate Storage Protection');
{
  const savedSessions = StorageService.getSessions();
  const lastSession = savedSessions[0];
  const epcSet = new Set<string>();
  for (const tag of lastSession.tags) {
    assert.strictEqual(epcSet.has(tag.epc), false, `Duplicate EPC detected in persisted session: ${tag.epc}`);
    epcSet.add(tag.epc);
  }
  console.log(`✓ Test 10 Passed: Persisted session contains ${epcSet.size} strictly unique EPC records`);
}

// TEST 11: Ignore Scans when Inactive
console.log('\n[Test 11] Ignore Scans When Inactive');
{
  manager.processRfidScan(createScanEvent('E280116060000123'));
  assert.strictEqual(manager.getActiveSession(), null);
  console.log('✓ Test 11 Passed: Scans ignored when no session is active');
}

console.log('\n>>> ALL INVENTORY ENGINE BUSINESS RULE TESTS PASSED SUCCESSFULLY! <<<\n');
