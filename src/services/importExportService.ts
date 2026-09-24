import * as XLSX from 'xlsx';
import { Product, InventorySession, AppSettings } from '../types/rfid';
import { sanitizeFilename } from './fileService';

/**
 * UHF Inventory Import, Export & Backup Service
 * Zero RSSI. Offline local operations.
 */

// Helper: Escape CSV according to RFC 4180
export function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper: Format timestamp to readable local string YYYY-MM-DD HH:mm:ss
export function formatReadableDateTime(ts: number | string | undefined): string {
  if (!ts) return '--:--:--';
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  if (isNaN(date.getTime())) return String(ts);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Helper: Validate Hex string (UHF RFID EPC)
export function isValidHex(str: string): boolean {
  if (!str) return false;
  const clean = str.trim();
  if (clean.length < 4) return false;
  return /^[0-9A-Fa-f]+$/.test(clean);
}

// =====================================================================
// PART 3 — PRODUCT EXPORT
// =====================================================================

export interface ProductExportRow {
  SKU: string;
  'Product Name': string;
  EPC: string;
  Barcode: string;
  Category: string;
  Location: string;
  Description: string;
}

export function generateProductExportData(products: Product[]): {
  rows: ProductExportRow[];
  csvContent: string;
  xlsxBuffer: Uint8Array;
  filenameCsv: string;
  filenameXlsx: string;
} {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filenameCsv = `products_${dateStr}.csv`;
  const filenameXlsx = `products_${dateStr}.xlsx`;

  const rows: ProductExportRow[] = [];

  for (const prod of products) {
    if (prod.epcList && prod.epcList.length > 0) {
      // Export one row per EPC
      for (const epc of prod.epcList) {
        rows.push({
          SKU: prod.sku,
          'Product Name': prod.name,
          EPC: epc,
          Barcode: prod.barcode || '',
          Category: prod.category || '',
          Location: prod.location || '',
          Description: prod.description || '',
        });
      }
    } else {
      // 0 EPCs
      rows.push({
        SKU: prod.sku,
        'Product Name': prod.name,
        EPC: '',
        Barcode: prod.barcode || '',
        Category: prod.category || '',
        Location: prod.location || '',
        Description: prod.description || '',
      });
    }
  }

  // Generate CSV
  const headers: (keyof ProductExportRow)[] = [
    'SKU',
    'Product Name',
    'EPC',
    'Barcode',
    'Category',
    'Location',
    'Description',
  ];
  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map(r => headers.map(h => escapeCsv(r[h])).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n'); // Add UTF-8 BOM for Excel compatibility

  // Generate XLSX
  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [
    {
      SKU: '',
      'Product Name': '',
      EPC: '',
      Barcode: '',
      Category: '',
      Location: '',
      Description: '',
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  const xlsxArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const xlsxBuffer = new Uint8Array(xlsxArray);

  return {
    rows,
    csvContent,
    xlsxBuffer,
    filenameCsv,
    filenameXlsx,
  };
}

// =====================================================================
// PART 4 & 5 — INVENTORY EXPORT (CSV & XLSX with 2 Sheets)
// =====================================================================

export interface InventoryExportTagRow {
  EPC: string;
  Status: string;
  'Product Name': string;
  SKU: string;
  Location: string;
  'Read Count': number;
  'First Seen': string;
  'Last Seen': string;
}

export function generateInventoryExportData(session: InventorySession): {
  csvContent: string;
  xlsxBuffer: Uint8Array;
  filenameCsv: string;
  filenameXlsx: string;
} {
  const cleanName = sanitizeFilename(session.name || 'inventory');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filenameCsv = `inventory_${cleanName}_${dateStr}.csv`;
  const filenameXlsx = `inventory_${cleanName}_${dateStr}.xlsx`;

  const tagsList = session.tags || session.scannedTags || [];

  const tagRows: InventoryExportTagRow[] = tagsList.map(tag => ({
    EPC: tag.epc,
    Status: tag.status,
    'Product Name': tag.productName || 'Unassigned RFID Tag',
    SKU: tag.sku || 'N/A',
    Location: tag.location || session.location || 'N/A',
    'Read Count': tag.readCount || 0,
    'First Seen': tag.firstSeen ? formatReadableDateTime(tag.firstSeen) : '--:--:--',
    'Last Seen': tag.lastSeen ? formatReadableDateTime(tag.lastSeen) : '--:--:--',
  }));

  // CSV Generation
  const headers: (keyof InventoryExportTagRow)[] = [
    'EPC',
    'Status',
    'Product Name',
    'SKU',
    'Location',
    'Read Count',
    'First Seen',
    'Last Seen',
  ];
  const headerLine = headers.map(escapeCsv).join(',');
  let rowLines: string[];
  if (tagRows.length > 0) {
    rowLines = tagRows.map(r => headers.map(h => escapeCsv(r[h])).join(','));
  } else {
    rowLines = ['NO INVENTORY DATA,,,,,,,'];
  }
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  // XLSX Generation with 2 Sheets
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Inventory Summary
  const durationStr = `${Math.floor((session.durationSeconds || 0) / 60)}m ${(session.durationSeconds || 0) % 60}s`;
  const summaryData = [
    { Parameter: 'Inventory Name', Value: session.name || 'Inventory Session' },
    { Parameter: 'Location', Value: session.location || 'Warehouse Zone' },
    { Parameter: 'Started At', Value: formatReadableDateTime(session.startedAt || session.startTime) },
    { Parameter: 'Completed At', Value: formatReadableDateTime(session.completedAt || session.endTime) },
    { Parameter: 'Duration', Value: durationStr },
    { Parameter: 'Expected Tags', Value: session.expectedCount || 0 },
    { Parameter: 'Found', Value: session.foundCount || 0 },
    { Parameter: 'Missing', Value: session.missingCount || 0 },
    { Parameter: 'Extra', Value: session.extraCount || 0 },
    { Parameter: 'Unknown', Value: session.unknownCount || 0 },
    { Parameter: 'Unique Tags', Value: session.uniqueTags || tagRows.length },
    { Parameter: 'Total Reads', Value: session.totalReads || 0 },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Inventory Summary');

  // Sheet 2: Inventory Tags
  const tagsSheet = XLSX.utils.json_to_sheet(tagRows.length > 0 ? tagRows : [
    {
      EPC: 'NO INVENTORY DATA',
      Status: '',
      'Product Name': '',
      SKU: '',
      Location: '',
      'Read Count': 0,
      'First Seen': '',
      'Last Seen': '',
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, tagsSheet, 'Inventory Tags');

  const xlsxArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const xlsxBuffer = new Uint8Array(xlsxArray);

  return {
    csvContent,
    xlsxBuffer,
    filenameCsv,
    filenameXlsx,
  };
}

// =====================================================================
// PART 2 — PRODUCT IMPORT VALIDATION & PARSING
// =====================================================================

export interface ImportInvalidItem {
  rowNumber: number;
  sku: string;
  name: string;
  epc: string;
  status: 'INVALID' | 'DUPLICATE' | 'CONFLICT';
  reason: string;
}

export interface ImportParseResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  conflictCount: number;
  validProducts: Product[];
  invalidItems: ImportInvalidItem[];
}

export function parseAndValidateProductImport(
  rawRows: Record<string, any>[],
  existingProducts: Product[]
): ImportParseResult {
  // Catalog maps for duplicate & conflict detection
  const existingSkuMap = new Map<string, Product>();
  const existingEpcMap = new Map<string, Product>();

  for (const p of existingProducts) {
    existingSkuMap.set(p.sku.trim().toUpperCase(), p);
    if (p.epcList) {
      for (const epc of p.epcList) {
        existingEpcMap.set(epc.trim().toUpperCase(), p);
      }
    }
  }

  // File tracking sets
  const fileSeenEpcs = new Set<string>();
  const skuToProductMap = new Map<string, {
    name: string;
    sku: string;
    barcode: string;
    category: string;
    location: string;
    description: string;
    epcList: string[];
  }>();

  const invalidItems: ImportInvalidItem[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let conflictCount = 0;
  let invalidCount = 0;

  rawRows.forEach((row, index) => {
    const rowNum = index + 2; // +1 for 0-index, +1 for header

    // Flexible case-insensitive column extraction
    const getVal = (candidates: string[]) => {
      for (const cand of candidates) {
        for (const key of Object.keys(row)) {
          if (key.trim().toLowerCase() === cand.toLowerCase()) {
            return String(row[key] ?? '').trim();
          }
        }
      }
      return '';
    };

    const sku = getVal(['SKU', 'Item Code', 'Product Code', 'Code']);
    const name = getVal(['Product Name', 'product_name', 'ProductName', 'Name', 'Product']);
    const rawEpc = getVal(['EPC', 'RFID', 'RFID EPC', 'Tag ID', 'Tag']);
    const barcode = getVal(['Barcode', 'UPC', 'EAN']);
    const category = getVal(['Category', 'Department']) || 'General';
    const location = getVal(['Location', 'Bin', 'Rack', 'Zone']) || 'Warehouse Floor';
    const description = getVal(['Description', 'Notes', 'Desc']) || '';

    // Ignore completely empty rows
    if (!sku && !name && !rawEpc) {
      return;
    }

    // 1. Missing SKU
    if (!sku) {
      invalidCount++;
      invalidItems.push({
        rowNumber: rowNum,
        sku: 'N/A',
        name: name || 'N/A',
        epc: rawEpc || 'N/A',
        status: 'INVALID',
        reason: 'Missing SKU',
      });
      return;
    }

    // 2. Missing Product Name
    if (!name) {
      invalidCount++;
      invalidItems.push({
        rowNumber: rowNum,
        sku,
        name: 'N/A',
        epc: rawEpc || 'N/A',
        status: 'INVALID',
        reason: 'Missing Product Name',
      });
      return;
    }

    const normSku = sku.toUpperCase();
    const normEpc = rawEpc ? rawEpc.toUpperCase() : '';

    // 3. Invalid EPC Format (if EPC is provided, must be valid hex)
    if (normEpc && !isValidHex(normEpc)) {
      invalidCount++;
      invalidItems.push({
        rowNumber: rowNum,
        sku,
        name,
        epc: rawEpc,
        status: 'INVALID',
        reason: 'Invalid EPC: must be a hexadecimal string (minimum 4 hex characters)',
      });
      return;
    }

    // 4. Duplicate EPC within the import file
    if (normEpc && fileSeenEpcs.has(normEpc)) {
      duplicateCount++;
      invalidItems.push({
        rowNumber: rowNum,
        sku,
        name,
        epc: normEpc,
        status: 'DUPLICATE',
        reason: 'Duplicate EPC within import file',
      });
      return;
    }

    // 5. EPC already assigned to another product in local catalog (Conflict)
    if (normEpc && existingEpcMap.has(normEpc)) {
      const existingOwner = existingEpcMap.get(normEpc)!;
      if (existingOwner.sku.toUpperCase() !== normSku) {
        conflictCount++;
        invalidItems.push({
          rowNumber: rowNum,
          sku,
          name,
          epc: normEpc,
          status: 'CONFLICT',
          reason: `EPC already assigned to: ${existingOwner.name} (${existingOwner.sku})`,
        });
        return;
      }
    }

    // 6. Check duplicate SKU with differing name in local catalog
    if (existingSkuMap.has(normSku)) {
      const existingProduct = existingSkuMap.get(normSku)!;
      if (existingProduct.name.toLowerCase() !== name.toLowerCase()) {
        duplicateCount++;
        invalidItems.push({
          rowNumber: rowNum,
          sku,
          name,
          epc: normEpc || 'N/A',
          status: 'DUPLICATE',
          reason: `SKU exists with different product name: "${existingProduct.name}"`,
        });
        return;
      }
    }

    // Row is Valid!
    validCount++;
    if (normEpc) {
      fileSeenEpcs.add(normEpc);
    }

    // Merge multi-EPC rows for the same SKU
    if (skuToProductMap.has(normSku)) {
      const existingEntry = skuToProductMap.get(normSku)!;
      if (normEpc && !existingEntry.epcList.includes(normEpc)) {
        existingEntry.epcList.push(normEpc);
      }
    } else {
      skuToProductMap.set(normSku, {
        name,
        sku,
        barcode: barcode || `BC-${sku}`,
        category,
        location,
        description,
        epcList: normEpc ? [normEpc] : [],
      });
    }
  });

  // Convert valid map to Product list
  const validProducts: Product[] = Array.from(skuToProductMap.values()).map((p, idx) => ({
    id: `prod-import-${Date.now()}-${idx}`,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.category,
    location: p.location,
    description: p.description,
    epcList: p.epcList,
    expectedQuantity: p.epcList.length > 0 ? p.epcList.length : 1,
    unit: 'pcs',
    updatedAt: new Date().toISOString(),
  }));

  return {
    totalRows: rawRows.length,
    validCount,
    invalidCount,
    duplicateCount,
    conflictCount,
    validProducts,
    invalidItems,
  };
}

// =====================================================================
// PART 9, 10, 11, 12 — JSON BACKUP & RESTORE
// =====================================================================

export interface UhfBackupPayload {
  format: 'uhf-inventory-backup';
  version: 1;
  createdAt: string;
  products: Product[];
  inventorySessions: InventorySession[];
  settings: AppSettings;
}

export function generateBackupPayload(
  products: Product[],
  sessions: InventorySession[],
  settings: AppSettings
): { jsonString: string; filename: string } {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `uhf_inventory_backup_${dateStr}.json`;

  // Clean data: sanitize sessions to eliminate any temporary UI properties
  const cleanSessions = sessions.map(s => {
    const cleanTags = (s.tags || s.scannedTags || []).map(t => ({
      epc: t.epc,
      status: t.status,
      productName: t.productName || null,
      sku: t.sku || null,
      location: t.location || null,
      readCount: t.readCount || 0,
      firstSeen: t.firstSeen || 0,
      lastSeen: t.lastSeen || 0,
    }));

    return {
      id: s.id,
      name: s.name,
      location: s.location,
      notes: s.notes || '',
      startedAt: s.startedAt,
      completedAt: s.completedAt,
      startTime: s.startTime,
      endTime: s.endTime,
      durationSeconds: s.durationSeconds,
      expectedCount: s.expectedCount || 0,
      foundCount: s.foundCount || 0,
      missingCount: s.missingCount || 0,
      extraCount: s.extraCount || 0,
      unknownCount: s.unknownCount || 0,
      totalReads: s.totalReads || 0,
      uniqueTags: s.uniqueTags || cleanTags.length,
      status: s.status,
      tags: cleanTags,
      scannedTags: cleanTags,
    };
  });

  const payload: UhfBackupPayload = {
    format: 'uhf-inventory-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    products,
    inventorySessions: cleanSessions,
    settings,
  };

  return {
    jsonString: JSON.stringify(payload, null, 2),
    filename,
  };
}

export function validateBackupPayload(rawJson: string): {
  valid: boolean;
  error?: string;
  payload?: UhfBackupPayload;
} {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { valid: false, error: 'File is not valid JSON' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup content is not a valid JSON object' };
  }

  if (parsed.format !== 'uhf-inventory-backup') {
    return { valid: false, error: 'Invalid backup format: expected "uhf-inventory-backup"' };
  }

  if (parsed.version !== 1) {
    return { valid: false, error: `Unsupported backup version: ${parsed.version}` };
  }

  if (!Array.isArray(parsed.products)) {
    return { valid: false, error: 'Backup is missing required "products" array' };
  }

  if (!Array.isArray(parsed.inventorySessions)) {
    return { valid: false, error: 'Backup is missing required "inventorySessions" array' };
  }

  // Validate product schemas
  for (let i = 0; i < parsed.products.length; i++) {
    const p = parsed.products[i];
    if (!p || typeof p.name !== 'string' || typeof p.sku !== 'string' || !Array.isArray(p.epcList)) {
      return { valid: false, error: `Invalid product record at index ${i}` };
    }
  }

  // Validate session schemas
  for (let i = 0; i < parsed.inventorySessions.length; i++) {
    const s = parsed.inventorySessions[i];
    if (!s || typeof s.name !== 'string' || typeof s.id !== 'string') {
      return { valid: false, error: `Invalid inventory session at index ${i}` };
    }
  }

  return {
    valid: true,
    payload: parsed as UhfBackupPayload,
  };
}
