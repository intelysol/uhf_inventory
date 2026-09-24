import * as XLSX from 'xlsx';
import { Product, InventorySession, AppSettings, H103ReaderState, ExportOptions } from '../types/rfid';
import { INITIAL_PRODUCTS, INITIAL_SESSIONS, DEFAULT_READER_STATE, DEFAULT_APP_SETTINGS } from '../data/mockDatabase';
import {
  parseAndValidateProductImport,
  ImportParseResult,
  generateProductExportData,
  generateInventoryExportData,
  generateBackupPayload,
  validateBackupPayload,
  UhfBackupPayload,
} from './importExportService';
import { saveAndShareFile, SaveAndShareResult } from './fileService';

const STORAGE_KEYS = {
  PRODUCTS: 'rfid_offline_products_v1',
  SESSIONS: 'rfid_offline_sessions_v1',
  READER_STATE: 'rfid_offline_reader_state_v1',
  APP_SETTINGS: 'rfid_offline_app_settings_v1',
  LAST_BACKUP: 'rfid_offline_last_backup_v1',
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

  getLastBackupTime(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
    } catch {
      return null;
    }
  },

  setLastBackupTime(timeStr: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timeStr);
    } catch (e) {
      console.error('Failed to save last backup time:', e);
    }
  },

  resetToDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.SESSIONS);
      localStorage.removeItem(STORAGE_KEYS.READER_STATE);
      localStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.LAST_BACKUP);
    } catch {
      // fallback
    }
  },

  // ===================================================================
  // IMPORT & EXPORT METHODS
  // ===================================================================

  /**
   * Parse uploaded CSV or XLSX file and run validation against existing catalog
   */
  async parseImportFile(file: File, existingProducts: Product[]): Promise<ImportParseResult & { filename: string }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const result = parseAndValidateProductImport(rawRows, existingProducts);
    return {
      ...result,
      filename: file.name,
    };
  },

  /**
   * Export Products as CSV or XLSX with Android Save & Share
   */
  async exportProducts(
    products: Product[],
    format: 'CSV' | 'XLSX'
  ): Promise<SaveAndShareResult> {
    const data = generateProductExportData(products);
    if (format === 'CSV') {
      return await saveAndShareFile(
        data.filenameCsv,
        data.csvContent,
        'text/csv;charset=utf-8;',
        'Export Products (CSV)'
      );
    } else {
      return await saveAndShareFile(
        data.filenameXlsx,
        data.xlsxBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Export Products (Excel)'
      );
    }
  },

  /**
   * Export Inventory session as CSV or XLSX with Android Save & Share
   */
  async exportInventorySession(
    session: InventorySession,
    format: 'CSV' | 'XLSX'
  ): Promise<SaveAndShareResult> {
    const data = generateInventoryExportData(session);
    if (format === 'CSV') {
      return await saveAndShareFile(
        data.filenameCsv,
        data.csvContent,
        'text/csv;charset=utf-8;',
        `Export Inventory - ${session.name} (CSV)`
      );
    } else {
      return await saveAndShareFile(
        data.filenameXlsx,
        data.xlsxBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        `Export Inventory - ${session.name} (Excel)`
      );
    }
  },

  /**
   * Export full JSON Backup with Android Save & Share
   */
  async exportBackup(
    products: Product[],
    sessions: InventorySession[],
    settings: AppSettings
  ): Promise<SaveAndShareResult> {
    const backup = generateBackupPayload(products, sessions, settings);
    const result = await saveAndShareFile(
      backup.filename,
      backup.jsonString,
      'application/json;charset=utf-8;',
      'Export Database Backup'
    );
    if (result.success) {
      this.setLastBackupTime(new Date().toISOString());
    }
    return result;
  },

  /**
   * Validate and Restore JSON Backup
   */
  restoreBackup(rawJson: string): {
    success: boolean;
    error?: string;
    payload?: UhfBackupPayload;
  } {
    const validation = validateBackupPayload(rawJson);
    if (!validation.valid || !validation.payload) {
      return { success: false, error: validation.error || 'INVALID BACKUP FILE' };
    }

    const { products, inventorySessions, settings } = validation.payload;
    this.saveProducts(products);
    this.saveSessions(inventorySessions);
    this.saveAppSettings(settings);

    return { success: true, payload: validation.payload };
  },

  /**
   * Compatibility export method for legacy calls
   */
  exportInventory(
    session: InventorySession,
    format: 'CSV' | 'XLSX',
    _options?: ExportOptions,
    _customFilename?: string
  ): { filename: string; blob: Blob } {
    const data = generateInventoryExportData(session);
    if (format === 'CSV') {
      const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8;' });
      return { filename: data.filenameCsv, blob };
    } else {
      const buffer = data.xlsxBuffer.buffer.slice(
        data.xlsxBuffer.byteOffset,
        data.xlsxBuffer.byteOffset + data.xlsxBuffer.byteLength
      );
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      return { filename: data.filenameXlsx, blob };
    }
  },
};
