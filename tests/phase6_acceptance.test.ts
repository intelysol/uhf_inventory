// In-memory localStorage polyfill for Node.js test environment
const memoryStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => memoryStore.get(key) || null,
  setItem: (key: string, value: string) => memoryStore.set(key, String(value)),
  removeItem: (key: string) => memoryStore.delete(key),
  clear: () => memoryStore.clear(),
};

import assert from 'node:assert';
import * as XLSX from 'xlsx';
import { Product, InventorySession, AppSettings } from '../src/types/rfid';
import {
  escapeCsv,
  formatReadableDateTime,
  isValidHex,
  generateProductExportData,
  generateInventoryExportData,
  parseAndValidateProductImport,
  generateBackupPayload,
  validateBackupPayload,
} from '../src/services/importExportService';

console.log('============================================================');
console.log('PHASE 6 ACCEPTANCE TESTS: IMPORT, EXPORT, BACKUP & RESTORE');
console.log('============================================================\n');

// ---------------------------------------------------------------------
// TEST SUITE 1: CSV ESCAPING & UTILITIES
// ---------------------------------------------------------------------
console.log('[Test Suite 1] CSV Escaping and Utilities');
{
  assert.strictEqual(escapeCsv('SimpleText'), 'SimpleText');
  assert.strictEqual(escapeCsv('Text, with comma'), '"Text, with comma"');
  assert.strictEqual(escapeCsv('Text with "quotes"'), '"Text with ""quotes"""');
  assert.strictEqual(escapeCsv('Line1\nLine2'), '"Line1\nLine2"');
  assert.strictEqual(escapeCsv(123), '123');
  assert.strictEqual(escapeCsv(null), '');
  assert.strictEqual(escapeCsv(undefined), '');

  assert.strictEqual(isValidHex('E280116060000123'), true);
  assert.strictEqual(isValidHex('e280116060000123'), true);
  assert.strictEqual(isValidHex('INVALID_HEX'), false);
  assert.strictEqual(isValidHex('12'), false); // Too short (< 4)

  console.log('✓ Test Suite 1 Passed: RFC 4180 CSV escaping and Hex validation work correctly\n');
}

// ---------------------------------------------------------------------
// TEST SUITE 2: PRODUCT EXPORT (CSV & XLSX)
// ---------------------------------------------------------------------
console.log('[Test Suite 2] Product Export (CSV & XLSX)');
{
  const products: Product[] = [
    {
      id: 'prod-1',
      name: 'Dell Keyboard KB500',
      sku: 'KB-001',
      barcode: '123456',
      category: 'Keyboard',
      location: 'Rack A01',
      description: 'Office keyboard, standard layout',
      epcList: ['E280001', 'E280002', 'E280003'], // Multiple EPCs
      expectedQuantity: 3,
      unit: 'pcs',
      updatedAt: '2026-09-24T10:00:00Z',
    },
    {
      id: 'prod-2',
      name: 'HP Mouse Optical',
      sku: 'MS-001',
      barcode: '123457',
      category: 'Mouse',
      location: 'Rack A02',
      description: 'Ergonomic mouse',
      epcList: [], // 0 EPCs
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: '2026-09-24T10:00:00Z',
    },
  ];

  const exportData = generateProductExportData(products);

  // 1. Check rows generated:
  // prod-1 has 3 EPCs -> 3 rows
  // prod-2 has 0 EPCs -> 1 row with empty EPC
  assert.strictEqual(exportData.rows.length, 4, 'Expected 4 exported rows (3 from prod-1 + 1 from prod-2)');
  assert.strictEqual(exportData.rows[0].EPC, 'E280001');
  assert.strictEqual(exportData.rows[1].EPC, 'E280002');
  assert.strictEqual(exportData.rows[2].EPC, 'E280003');
  assert.strictEqual(exportData.rows[3].EPC, '');

  // 2. Check CSV headers and content
  assert.ok(exportData.csvContent.includes('SKU,Product Name,EPC,Barcode,Category,Location,Description'));
  assert.ok(exportData.csvContent.includes('KB-001,Dell Keyboard KB500,E280001'));
  assert.ok(exportData.csvContent.includes('MS-001,HP Mouse Optical,,123457'));

  // 3. Check XLSX workbook
  const workbook = XLSX.read(exportData.xlsxBuffer, { type: 'array' });
  assert.strictEqual(workbook.SheetNames[0], 'Products');
  const xlsxRows = XLSX.utils.sheet_to_json<any>(workbook.Sheets['Products']);
  assert.strictEqual(xlsxRows.length, 4);

  // 4. Empty products test
  const emptyExport = generateProductExportData([]);
  assert.ok(emptyExport.csvContent.includes('SKU,Product Name,EPC,Barcode,Category,Location,Description'));

  console.log('✓ Test Suite 2 Passed: Product CSV and XLSX export generate 1 row per EPC with valid structure\n');
}

// ---------------------------------------------------------------------
// TEST SUITE 3: INVENTORY EXPORT (CSV & XLSX WITH 2 SHEETS)
// ---------------------------------------------------------------------
console.log('[Test Suite 3] Inventory Export (CSV & XLSX with 2 Sheets)');
{
  const testSession: InventorySession = {
    id: 'sess-audit-01',
    name: 'Morning Warehouse Count',
    location: 'Warehouse A (All Zones)',
    notes: 'Q3 audit',
    startedAt: 1790244600000,
    completedAt: 1790245722000,
    startTime: '2026-09-24T10:10:00.000Z',
    endTime: '2026-09-24T10:28:42.000Z',
    durationSeconds: 1122,
    expectedCount: 150,
    foundCount: 143,
    missingCount: 7,
    extraCount: 4,
    unknownCount: 2,
    totalReads: 1842,
    uniqueTags: 149,
    status: 'COMPLETED',
    scannedTags: [
      {
        epc: 'E280001',
        status: 'FOUND',
        productName: 'Dell Keyboard',
        sku: 'KB-001',
        location: 'Rack A01',
        readCount: 15,
        firstSeen: 1790244600000,
        lastSeen: 1790244922000,
      },
      {
        epc: 'E280999',
        status: 'UNKNOWN',
        productName: null,
        sku: null,
        location: null,
        readCount: 3,
        firstSeen: 1790244700000,
        lastSeen: 1790244800000,
      },
    ],
  };

  const invExport = generateInventoryExportData(testSession);

  // 1. Verify CSV content: columns EPC, Status, Product Name, SKU, Location, Read Count, First Seen, Last Seen
  assert.ok(invExport.csvContent.includes('EPC,Status,Product Name,SKU,Location,Read Count,First Seen,Last Seen'));
  assert.ok(invExport.csvContent.includes('E280001,FOUND,Dell Keyboard,KB-001,Rack A01,15'));
  assert.ok(invExport.csvContent.includes('E280999,UNKNOWN,Unassigned RFID Tag,N/A,Warehouse A (All Zones),3'));
  // Zero RSSI verification:
  assert.strictEqual(invExport.csvContent.includes('rssi'), false);
  assert.strictEqual(invExport.csvContent.includes('dBm'), false);
  assert.strictEqual(invExport.csvContent.includes('Signal'), false);

  // 2. Verify XLSX Workbook has Sheet 1 "Inventory Summary" and Sheet 2 "Inventory Tags"
  const wb = XLSX.read(invExport.xlsxBuffer, { type: 'array' });
  assert.strictEqual(wb.SheetNames.length, 2, 'XLSX must contain exactly 2 sheets');
  assert.strictEqual(wb.SheetNames[0], 'Inventory Summary', 'Sheet 1 must be "Inventory Summary"');
  assert.strictEqual(wb.SheetNames[1], 'Inventory Tags', 'Sheet 2 must be "Inventory Tags"');

  // Verify Summary Sheet parameters
  const summarySheetRows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Inventory Summary']);
  const paramMap = new Map(summarySheetRows.map(r => [r.Parameter, r.Value]));
  assert.strictEqual(paramMap.get('Inventory Name'), 'Morning Warehouse Count');
  assert.strictEqual(paramMap.get('Expected Tags'), 150);
  assert.strictEqual(paramMap.get('Found'), 143);
  assert.strictEqual(paramMap.get('Missing'), 7);
  assert.strictEqual(paramMap.get('Extra'), 4);
  assert.strictEqual(paramMap.get('Unknown'), 2);
  assert.strictEqual(paramMap.get('Unique Tags'), 149);
  assert.strictEqual(paramMap.get('Total Reads'), 1842);

  // Verify Tags Sheet
  const tagsSheetRows = XLSX.utils.sheet_to_json<any>(wb.Sheets['Inventory Tags']);
  assert.strictEqual(tagsSheetRows.length, 2);
  assert.strictEqual(tagsSheetRows[0].EPC, 'E280001');
  assert.strictEqual(tagsSheetRows[0].Status, 'FOUND');
  assert.strictEqual(tagsSheetRows[0]['Read Count'], 15);

  console.log('✓ Test Suite 3 Passed: Inventory CSV and XLSX (Summary & Tags sheets) generated without RSSI\n');
}

// ---------------------------------------------------------------------
// TEST SUITE 4: PRODUCT IMPORT VALIDATION & PARSING
// ---------------------------------------------------------------------
console.log('[Test Suite 4] Product Import Validation & Parsing');
{
  const existingCatalog: Product[] = [
    {
      id: 'prod-ex-1',
      name: 'Existing Router Cisco',
      sku: 'NET-RTR-01',
      barcode: 'BC-RTR',
      category: 'Network',
      description: 'Core router',
      location: 'Server Room',
      epcList: ['E280000000000111'],
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: '2026-09-24T10:00:00Z',
    },
  ];

  const rawRows = [
    // 1. Valid row with uppercase headers
    {
      SKU: 'KB-001',
      'Product Name': 'Dell Keyboard',
      EPC: 'E280000000000001',
      Barcode: '123456',
      Category: 'Keyboard',
      Location: 'Rack A01',
    },
    // 2. Valid second EPC for KB-001 (multi-EPC product merge)
    {
      sku: 'KB-001',
      product_name: 'Dell Keyboard',
      epc: 'E280000000000002',
    },
    // 3. Valid distinct item with lower case variations
    {
      sku: 'MS-001',
      Name: 'HP Mouse',
      RFID: 'E280000000000003',
    },
    // 4. Invalid: Missing SKU
    {
      SKU: '',
      'Product Name': 'Missing SKU Product',
      EPC: 'E280000000000004',
    },
    // 5. Invalid: Missing Product Name
    {
      SKU: 'NO-NAME-01',
      'Product Name': '',
      EPC: 'E280000000000005',
    },
    // 6. Invalid: Invalid EPC hex
    {
      SKU: 'BAD-HEX-01',
      'Product Name': 'Corrupted EPC Tag',
      EPC: 'INVALID_HEX_XYZ',
    },
    // 7. Duplicate: Duplicate EPC within file (same as row 1)
    {
      SKU: 'DUP-EPC-01',
      'Product Name': 'Duplicate EPC Item',
      EPC: 'E280000000000001',
    },
    // 8. Conflict: EPC already assigned to another catalog product (NET-RTR-01)
    {
      SKU: 'CONF-01',
      'Product Name': 'Conflict EPC Item',
      EPC: 'E280000000000111',
    },
  ];

  const parseResult = parseAndValidateProductImport(rawRows, existingCatalog);

  assert.strictEqual(parseResult.totalRows, 8, 'Total rows should be 8');
  assert.strictEqual(parseResult.validCount, 3, 'Valid count should be 3 (rows 1, 2, 3)');
  assert.strictEqual(parseResult.invalidCount, 3, 'Invalid count should be 3 (missing SKU, missing Name, bad hex)');
  assert.strictEqual(parseResult.duplicateCount, 1, 'Duplicate count should be 1 (duplicate EPC)');
  assert.strictEqual(parseResult.conflictCount, 1, 'Conflict count should be 1 (assigned to Existing Router)');

  // Verify valid products merged KB-001 with 2 EPCs
  const kbProd = parseResult.validProducts.find(p => p.sku === 'KB-001')!;
  assert.ok(kbProd, 'KB-001 must be in valid products');
  assert.strictEqual(kbProd.epcList.length, 2, 'KB-001 should merge the 2 valid EPCs');
  assert.ok(kbProd.epcList.includes('E280000000000001'));
  assert.ok(kbProd.epcList.includes('E280000000000002'));

  console.log('✓ Test Suite 4 Passed: Product import correctly validates missing fields, bad hex, duplicate EPCs, and catalog conflicts\n');
}

// ---------------------------------------------------------------------
// TEST SUITE 5: JSON BACKUP & RESTORE
// ---------------------------------------------------------------------
console.log('[Test Suite 5] JSON Backup & Restore');
{
  const products: Product[] = [
    {
      id: 'prod-bak-1',
      name: 'Heavy Duty Jack',
      sku: 'JCK-001',
      barcode: 'BC-JCK',
      category: 'Tools',
      description: 'Hydraulic jack',
      location: 'Bay 1',
      epcList: ['E280000000000999'],
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: '2026-09-24T12:00:00Z',
    },
  ];

  const sessions: InventorySession[] = [
    {
      id: 'sess-bak-1',
      name: 'Shift Count',
      location: 'Bay 1',
      startTime: '2026-09-24T12:00:00Z',
      durationSeconds: 300,
      expectedCount: 1,
      foundCount: 1,
      missingCount: 0,
      extraCount: 0,
      unknownCount: 0,
      totalReads: 50,
      status: 'COMPLETED',
      scannedTags: [
        {
          epc: 'E280000000000999',
          status: 'FOUND',
          readCount: 50,
          firstSeen: 1000,
          lastSeen: 2000,
        },
      ],
    },
  ];

  const settings: AppSettings = {
    autoSaveSessions: true,
    keepScanHistory: true,
    rssiSmoothing: false,
    audioFeedback: true,
    vibrationFeedback: true,
    signalSensitivity: 'Normal',
    defaultExportFormat: 'XLSX',
    defaultLocation: 'Main',
    csvDelimiter: ',',
    excelFormatting: true,
    appearance: 'light',
    duplicateFilterDelayMs: 500,
    minRssiThreshold: -80,
    aggregateRepeatedReads: true,
    autoStopScanMinutes: 30,
    appVersion: '2.4.0',
    sdkVersion: '1.0.0',
  };

  // 1. Generate Backup
  const backup = generateBackupPayload(products, sessions, settings);
  assert.ok(backup.filename.startsWith('uhf_inventory_backup_'));
  assert.ok(backup.filename.endsWith('.json'));

  // 2. Validate Valid Backup
  const validCheck = validateBackupPayload(backup.jsonString);
  assert.strictEqual(validCheck.valid, true);
  assert.strictEqual(validCheck.payload?.format, 'uhf-inventory-backup');
  assert.strictEqual(validCheck.payload?.version, 1);
  assert.strictEqual(validCheck.payload?.products.length, 1);
  assert.strictEqual(validCheck.payload?.inventorySessions.length, 1);

  // 3. Reject Invalid Backups
  assert.strictEqual(validateBackupPayload('{ invalid json').valid, false);
  assert.strictEqual(validateBackupPayload(JSON.stringify({ format: 'wrong-format' })).valid, false);
  assert.strictEqual(validateBackupPayload(JSON.stringify({ format: 'uhf-inventory-backup', version: 99 })).valid, false);
  assert.strictEqual(validateBackupPayload(JSON.stringify({ format: 'uhf-inventory-backup', version: 1, products: 'not-array' })).valid, false);

  console.log('✓ Test Suite 5 Passed: JSON backup generation and rigorous validation verified\n');
}

console.log('>>> ALL PHASE 6 ACCEPTANCE TESTS COMPLETED SUCCESSFULLY! <<<\n');
