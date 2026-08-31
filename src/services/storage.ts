import * as XLSX from 'xlsx';
import { Product, InventorySession, AppSettings, H103ReaderState, ExportOptions, ImportPreviewItem } from '../types/rfid';
import { INITIAL_PRODUCTS, INITIAL_SESSIONS, DEFAULT_READER_STATE, DEFAULT_APP_SETTINGS } from '../data/mockDatabase';

const STORAGE_KEYS = {
  PRODUCTS: 'rfid_offline_products_v1',
  SESSIONS: 'rfid_offline_sessions_v1',
  READER_STATE: 'rfid_offline_reader_state_v1',
  APP_SETTINGS: 'rfid_offline_app_settings_v1',
};

export const StorageService = {
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_PRODUCTS;
  },

  saveProducts(products: Product[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save products:', e);
    }
  },

  getSessions(): InventorySession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    return INITIAL_SESSIONS;
  },

  saveSessions(sessions: InventorySession[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Failed to save sessions:', e);
    }
  },

  getReaderState(): H103ReaderState {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.READER_STATE);
      if (data) return { ...DEFAULT_READER_STATE, ...JSON.parse(data) };
    } catch {
      // fallback
    }
    return DEFAULT_READER_STATE;
  },

  saveReaderState(state: H103ReaderState): void {
    try {
      localStorage.setItem(STORAGE_KEYS.READER_STATE, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save reader state:', e);
    }
  },

  getAppSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (data) return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(data) };
    } catch {
      // fallback
    }
    return DEFAULT_APP_SETTINGS;
  },

  saveAppSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save app settings:', e);
    }
  },

  resetToDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.READER_STATE);
      localStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
    } catch {
      // fallback
    }
  },

  /**
   * Export inventory session or custom data to CSV or Excel XLSX
   */
  exportInventory(
    session: InventorySession,
    format: 'CSV' | 'XLSX',
    options: ExportOptions,
    customFilename?: string
  ): { filename: string; blob: Blob } {
    let filteredTags = session.scannedTags;

    if (!options.includeMissing) {
      filteredTags = filteredTags.filter(t => t.status !== 'MISSING');
    }
    if (!options.includeExtra) {
      filteredTags = filteredTags.filter(t => t.status !== 'EXTRA');
    }
    if (!options.includeUnknown) {
      filteredTags = filteredTags.filter(t => t.status !== 'UNKNOWN');
    }

    const rows = filteredTags.map(tag => {
      const row: Record<string, string | number> = {
        EPC: tag.epc,
        Status: tag.status,
      };

      if (options.includeProductInfo) {
        row['SKU'] = tag.sku || 'N/A';
        row['Product Name'] = tag.productName || 'Unknown / Unassigned';
        row['Location'] = tag.location || 'N/A';
      }

      if (options.includeRssi) {
        row['Signal (dBm)'] = tag.rssi;
      }

      if (options.includeReadCount) {
        row['Read Count'] = tag.readCount;
      }

      if (options.includeFirstSeen) {
        row['First Seen'] = tag.firstSeen;
      }

      if (options.includeLastSeen) {
        row['Last Seen'] = tag.lastSeen;
      }

      return row;
    });

    const cleanName = (session.name || 'Inventory').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const baseFilename = customFilename || `${cleanName}_${timestamp}`;

    if (format === 'CSV') {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      return { filename: `${baseFilename}.csv`, blob };
    } else {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Results');
      
      // Metadata summary sheet
      const summaryData = [
        { Parameter: 'Session Name', Value: session.name },
        { Parameter: 'Location', Value: session.location },
        { Parameter: 'Date', Value: session.startTime },
        { Parameter: 'Duration', Value: `${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s` },
        { Parameter: 'Expected Tags', Value: session.expectedCount },
        { Parameter: 'Found Tags', Value: session.foundCount },
        { Parameter: 'Missing Tags', Value: session.missingCount },
        { Parameter: 'Extra Tags', Value: session.extraCount },
        { Parameter: 'Unknown Tags', Value: session.unknownCount },
        { Parameter: 'Total Reads', Value: session.totalReads },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Audit_Summary');

      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      return { filename: `${baseFilename}.xlsx`, blob };
    }
  },

  /**
   * Parse uploaded CSV or XLSX file
   */
  async parseImportFile(file: File): Promise<{
    filename: string;
    totalRows: number;
    items: ImportPreviewItem[];
    validRows: Product[];
    stats: { total: number; valid: number; warnings: number; errors: number };
  }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });

    const items: ImportPreviewItem[] = [];
    const validRows: Product[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // +1 for 0-index, +1 for header
      const sku = (row['SKU'] || row['sku'] || row['Item Code'] || '').toString().trim();
      const name = (row['Product'] || row['Product Name'] || row['name'] || row['Description'] || '').toString().trim();
      const epc = (row['EPC'] || row['epc'] || row['RFID'] || row['Tag ID'] || '').toString().trim();
      const barcode = (row['Barcode'] || row['barcode'] || row['UPC'] || '').toString().trim();
      const category = (row['Category'] || row['category'] || 'General').toString().trim();
      const location = (row['Location'] || row['location'] || 'Warehouse A').toString().trim();

      if (!sku && !epc && !name) {
        return;
      }

      let status: 'VALID' | 'WARNING' | 'ERROR' = 'VALID';
      let message = 'Ready for catalog import';

      if (!name) {
        status = 'ERROR';
        message = 'Missing Product Name';
        errorCount++;
      } else if (!sku) {
        status = 'WARNING';
        message = 'Missing SKU; will auto-generate code';
        warningCount++;
      } else if (epc && epc.length < 8) {
        status = 'WARNING';
        message = 'EPC format unusually short (< 8 chars)';
        warningCount++;
      } else {
        validCount++;
      }

      items.push({
        rowNumber: rowNum,
        sku: sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name || 'Unnamed Item',
        epc: epc || 'No EPC',
        location: location || 'Warehouse Floor',
        category,
        status,
        message
      });

      if (status !== 'ERROR') {
        const cleanSku = sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
        const epcList = epc ? [epc] : [];
        validRows.push({
          id: `prod-import-${Date.now()}-${index}`,
          name: name || 'Unnamed Item',
          sku: cleanSku,
          barcode: barcode || `BC-${cleanSku}`,
          category,
          description: `Imported item from ${file.name}`,
          location,
          epcList,
          expectedQuantity: 1,
          unit: 'pcs',
          updatedAt: new Date().toISOString()
        });
      }
    });

    return {
      filename: file.name,
      totalRows: rawData.length,
      items,
      validRows,
      stats: {
        total: rawData.length,
        valid: validCount,
        warnings: warningCount,
        errors: errorCount
      }
    };
  }
};
