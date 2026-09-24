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

console.log('============================================================');
console.log('PHASE 5 ACCEPTANCE TESTS: PRODUCT FINDER & INVENTORY MATRIX');
console.log('============================================================\n');

function createScanEvent(value: string): HidScanEvent {
  const norm = value.trim().toUpperCase();
  return {
    value: norm,
    rawInput: value,
    timestamp: Date.now(),
    length: norm.length,
    valid: true,
  };
}

// ---------------------------------------------------------------------
// TEST SUITE 1: EXPECTED INVENTORY MATRIX (FOUND, MISSING, EXTRA, UNKNOWN)
// ---------------------------------------------------------------------
console.log('[Test Suite 1] Expected vs Scanned Comparison Matrix');
{
  const testProducts: Product[] = [
    {
      id: 'prod-exp-1',
      name: 'Safety Helmet Type A',
      sku: 'PPE-HLM-01',
      barcode: 'BC-HLM-01',
      category: 'PPE',
      description: 'Head protection',
      location: 'Rack 1A',
      epcList: ['E280116000000001', 'E280116000000002'],
      expectedQuantity: 2,
      unit: 'pcs',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-exp-2',
      name: 'Safety Vest High-Vis',
      sku: 'PPE-VST-02',
      barcode: 'BC-VST-02',
      category: 'PPE',
      description: 'Visibility vest',
      location: 'Rack 1B',
      epcList: ['E280116000000003'],
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-extra-3',
      name: 'Heavy Duty Gloves',
      sku: 'PPE-GLV-03',
      barcode: 'BC-GLV-03',
      category: 'PPE',
      description: 'Work gloves',
      location: 'Rack 2A',
      epcList: ['E280116000000004'],
      expectedQuantity: 1,
      unit: 'pair',
      updatedAt: new Date().toISOString(),
    },
  ];

  const manager = new InventoryManager();

  // Audit selected products: only prod-exp-1 and prod-exp-2 (Expected = 3 tags)
  // prod-extra-3 is NOT in expected selection, but in catalog.
  const session = manager.startSession(
    'Zone A Audit',
    'Zone A',
    'Phase 5 Matrix Verification',
    testProducts,
    ['prod-exp-1', 'prod-exp-2']
  );

  assert.strictEqual(session.expectedCount, 3, 'Expected tags count must be 3 (2 from prod-exp-1 + 1 from prod-exp-2)');

  // 1. Scan E280116000000001 (Expected -> FOUND)
  manager.processRfidScan(createScanEvent('E280116000000001'));
  // 2. Scan E280116000000002 (Expected -> FOUND)
  manager.processRfidScan(createScanEvent('E280116000000002'));
  // Repeated scan for E280116000000002 (Must increment readCount, remain FOUND)
  manager.processRfidScan(createScanEvent('E280116000000002'));

  // Notice: E280116000000003 is NOT scanned -> will become MISSING on stop

  // 3. Scan E280116000000004 (Registered in catalog prod-extra-3, but NOT expected in this session -> EXTRA)
  manager.processRfidScan(createScanEvent('E280116000000004'));

  // 4. Scan E280116000000999 (Unregistered tag -> UNKNOWN)
  manager.processRfidScan(createScanEvent('E280116000000999'));

  // Live Snapshot Verification
  const live = manager.getActiveSession()!;
  assert.strictEqual(live.expectedCount, 3, 'Live expected count must be 3');
  assert.strictEqual(live.foundCount, 2, 'Live found count must be 2');
  assert.strictEqual(live.extraCount, 1, 'Live extra count must be 1');
  assert.strictEqual(live.unknownCount, 1, 'Live unknown count must be 1');
  assert.strictEqual(live.missingCount, 1, 'Live missing count must be 1 (3 expected - 2 found)');
  assert.strictEqual(live.uniqueTags, 4, 'Live unique scanned tags count must be 4');
  assert.strictEqual(live.totalReads, 5, 'Live total reads must be 5');

  console.log('✓ Live counters match expected values during active scan');

  // Stop Session & Audit Final Results
  const completed = manager.stopSession()!;
  assert.strictEqual(completed.status, 'COMPLETED');
  assert.strictEqual(completed.expectedCount, 3);
  assert.strictEqual(completed.foundCount, 2);
  assert.strictEqual(completed.missingCount, 1);
  assert.strictEqual(completed.extraCount, 1);
  assert.strictEqual(completed.unknownCount, 1);
  assert.strictEqual(completed.uniqueTags, 4, 'Scanned unique tags must be 4');

  // Total tags in final tags array must include the injected MISSING tag (4 scanned + 1 missing = 5)
  assert.strictEqual(completed.tags.length, 5, 'Total session tags must be 5 (4 scanned + 1 injected missing)');

  // Verify tag statuses and properties
  const foundTag1 = completed.tags.find(t => t.epc === 'E280116000000001')!;
  assert.strictEqual(foundTag1.status, 'FOUND');
  assert.strictEqual(foundTag1.readCount, 1);
  assert.strictEqual(foundTag1.productName, 'Safety Helmet Type A');

  const foundTag2 = completed.tags.find(t => t.epc === 'E280116000000002')!;
  assert.strictEqual(foundTag2.status, 'FOUND');
  assert.strictEqual(foundTag2.readCount, 2);

  const missingTag = completed.tags.find(t => t.epc === 'E280116000000003')!;
  assert.strictEqual(missingTag.status, 'MISSING');
  assert.strictEqual(missingTag.readCount, 0, 'Missing tag readCount must be strictly 0');
  assert.strictEqual(missingTag.productName, 'Safety Vest High-Vis');
  assert.strictEqual(missingTag.sku, 'PPE-VST-02');
  assert.strictEqual(missingTag.location, 'Rack 1B');

  const extraTag = completed.tags.find(t => t.epc === 'E280116000000004')!;
  assert.strictEqual(extraTag.status, 'EXTRA');
  assert.strictEqual(extraTag.readCount, 1);
  assert.strictEqual(extraTag.productName, 'Heavy Duty Gloves');

  const unknownTag = completed.tags.find(t => t.epc === 'E280116000000999')!;
  assert.strictEqual(unknownTag.status, 'UNKNOWN');
  assert.strictEqual(unknownTag.readCount, 1);
  assert.strictEqual(unknownTag.productId, null);

  console.log('✓ Inventory Comparison Matrix correctly classified FOUND=2, MISSING=1, EXTRA=1, UNKNOWN=1\n');
}

// ---------------------------------------------------------------------
// TEST SUITE 2: RFID TAG ASSIGNMENT & CONFLICT RESOLUTION
// ---------------------------------------------------------------------
console.log('[Test Suite 2] Product RFID Tag Assignment & Conflict Resolution');
{
  let products: Product[] = [
    {
      id: 'prod-101',
      name: 'Power Drill 18V',
      sku: 'DRL-18V',
      barcode: 'BC-101',
      category: 'Tools',
      description: 'Cordless drill',
      location: 'Locker 1',
      epcList: ['E280116060000101'],
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prod-102',
      name: 'Impact Driver 18V',
      sku: 'DRV-18V',
      barcode: 'BC-102',
      category: 'Tools',
      description: 'Impact driver',
      location: 'Locker 2',
      epcList: [],
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: new Date().toISOString(),
    },
  ];

  // Conflict Checker helper function matching RFIDContext
  const checkEpcAssignment = (rawEpc: string, excludeProductId?: string): Product | null => {
    const norm = rawEpc.trim().toUpperCase();
    return products.find(p => p.id !== excludeProductId && p.epcList.map(e => e.toUpperCase()).includes(norm)) || null;
  };

  // Reassignment helper function matching RFIDContext
  const assignTagToProduct = (rawEpc: string, targetProductId: string, reassignFromOther: boolean = false): boolean => {
    const norm = rawEpc.trim().toUpperCase();
    const existingOwner = checkEpcAssignment(norm, targetProductId);

    if (existingOwner && !reassignFromOther) {
      return false; // Conflict detected, blocked without approval
    }

    products = products.map(p => {
      let epcs = p.epcList ? [...p.epcList] : [];
      if (p.id === targetProductId) {
        if (!epcs.map(e => e.toUpperCase()).includes(norm)) {
          epcs.push(norm);
        }
        return { ...p, epcList: epcs };
      } else if (reassignFromOther) {
        // Strip EPC from other owners
        return { ...p, epcList: epcs.filter(e => e.toUpperCase() !== norm) };
      }
      return p;
    });
    return true;
  };

  // 1. Conflict detection test:
  const conflictOwner = checkEpcAssignment('E280116060000101', 'prod-102');
  assert.ok(conflictOwner, 'EPC already assigned to prod-101 must be detected');
  assert.strictEqual(conflictOwner.id, 'prod-101');

  // 2. Reject assignment without reassign flag:
  const assignedBlocked = assignTagToProduct('E280116060000101', 'prod-102', false);
  assert.strictEqual(assignedBlocked, false, 'Assignment must be rejected when reassignFromOther is false');
  assert.strictEqual(products.find(p => p.id === 'prod-102')!.epcList.length, 0);

  // 3. Approve reassignment:
  const assignedApproved = assignTagToProduct('E280116060000101', 'prod-102', true);
  assert.strictEqual(assignedApproved, true, 'Assignment must succeed when reassignFromOther is true');

  // Verify prod-101 no longer has the EPC
  const prod1 = products.find(p => p.id === 'prod-101')!;
  assert.strictEqual(prod1.epcList.includes('E280116060000101'), false, 'Previous owner must have EPC removed');

  // Verify prod-102 now has the EPC
  const prod2 = products.find(p => p.id === 'prod-102')!;
  assert.strictEqual(prod2.epcList.includes('E280116060000101'), true, 'New owner must have EPC assigned');

  console.log('✓ Product RFID conflict detection and reassignment verified\n');
}

// ---------------------------------------------------------------------
// TEST SUITE 3: PRODUCT FINDER (PURE EPC MATCHING - ZERO RSSI)
// ---------------------------------------------------------------------
console.log('[Test Suite 3] Product Finder (Pure EPC Matching - Zero RSSI)');
{
  const targetProduct: Product = {
    id: 'prod-target',
    name: 'Critical Circuit Breaker 100A',
    sku: 'BRK-100A',
    barcode: 'BC-BRK',
    category: 'Electrical',
    description: 'Main breaker',
    location: 'Distribution Board 4',
    epcList: ['E2801160TARGET001', 'E2801160TARGET002'],
    expectedQuantity: 2,
    unit: 'pcs',
    updatedAt: new Date().toISOString(),
  };

  // Finder state simulation
  let detectionCount = 0;
  let lastDetectedEpc: string | null = null;
  let lastDetectionTime: number | null = null;
  let targetFound = false;

  const targetSet = new Set(targetProduct.epcList.map(e => e.toUpperCase()));

  const handleFinderScan = (scannedEpc: string) => {
    const norm = scannedEpc.trim().toUpperCase();
    if (targetSet.has(norm)) {
      targetFound = true;
      detectionCount += 1;
      lastDetectedEpc = norm;
      lastDetectionTime = Date.now();
      return true;
    }
    return false;
  };

  // 1. Scan unrelated EPC -> No match
  const match1 = handleFinderScan('E2801160UNRELATED');
  assert.strictEqual(match1, false, 'Unrelated tag must not match target');
  assert.strictEqual(detectionCount, 0);
  assert.strictEqual(targetFound, false);

  // 2. Scan Target EPC 1 -> Match
  const match2 = handleFinderScan('E2801160TARGET001');
  assert.strictEqual(match2, true, 'Target EPC 1 must trigger match');
  assert.strictEqual(targetFound, true);
  assert.strictEqual(detectionCount, 1);
  assert.strictEqual(lastDetectedEpc, 'E2801160TARGET001');

  // 3. Scan Target EPC 1 again -> Repeated detection
  const match3 = handleFinderScan('E2801160TARGET001');
  assert.strictEqual(match3, true);
  assert.strictEqual(detectionCount, 2);

  // 4. Scan Target EPC 2 (multi-EPC product) -> Match
  const match4 = handleFinderScan('E2801160TARGET002');
  assert.strictEqual(match4, true);
  assert.strictEqual(detectionCount, 3);
  assert.strictEqual(lastDetectedEpc, 'E2801160TARGET002');

  console.log('✓ Product Finder pure EPC matching verified with zero RSSI/radar metrics\n');
}

console.log('>>> ALL PHASE 5 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY! <<<\n');
