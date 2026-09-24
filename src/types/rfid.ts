export type ScreenType =
  | 'splash'
  | 'dashboard'
  | 'reader_connection'
  | 'start_inventory'
  | 'live_inventory'
  | 'inventory_results'
  | 'find_search'
  | 'find_radar'
  | 'quick_scan'
  | 'products'
  | 'product_details'
  | 'add_edit_product'
  | 'inventory_history'
  | 'session_details'
  | 'import_data'
  | 'export_data'
  | 'reader_settings'
  | 'app_settings'
  | 'settings'
  | 'scanner_test'
  | 'empty_states_demo';

export type TagStatus = 'FOUND' | 'MISSING' | 'EXTRA' | 'UNKNOWN';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  description: string;
  location: string;
  epcList: string[];
  expectedQuantity: number;
  unit: string;
  updatedAt: string;
}

export interface RFIDTagRead {
  epc: string;
  rssi: number; // e.g. -48 dBm
  readCount: number;
  firstSeen: string;
  lastSeen: string;
  tid?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  location?: string;
  status: TagStatus;
}

export interface InventorySessionItem {
  productId: string;
  productName: string;
  sku: string;
  location: string;
  expectedQuantity: number;
  foundQuantity: number;
  status: 'FOUND' | 'MISSING' | 'EXTRA' | 'PARTIAL';
  epcs: string[];
}

export interface InventorySession {
  id: string;
  name: string;
  location: string;
  notes?: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  expectedCount: number;
  foundCount: number;
  missingCount: number;
  extraCount: number;
  unknownCount: number;
  totalReads: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  scannedTags: RFIDTagRead[];
  items?: InventorySessionItem[];
}

export interface H103ReaderState {
  connected: boolean;
  connecting: boolean;
  deviceName: string;
  battery: number;
  signalStrength: 'Strong' | 'Medium' | 'Weak' | 'None';
  rfPower: number; // 4 to 33 dBm
  rfRegion: 'US (902-928 MHz)' | 'EU (865-868 MHz)' | 'China (920-925 MHz)' | 'Japan (916-921 MHz)';
  session: 'S0' | 'S1' | 'S2' | 'S3';
  inventoryMode: 'Fast' | 'Deep/High Density' | 'Balanced';
  buzzer: boolean;
  triggerMode: 'Toggle' | 'Hold to Scan';
  vibration: boolean;
  autoConnect: boolean;
  reconnectAutomatically: boolean;
  qValue: number; // 0 to 15
  targetAlgorithm: 'A' | 'B' | 'A-B';
}

export interface AppSettings {
  autoSaveSessions: boolean;
  keepScanHistory: boolean;
  rssiSmoothing: boolean;
  audioFeedback: boolean;
  vibrationFeedback: boolean;
  signalSensitivity: 'High' | 'Normal' | 'Low';
  defaultExportFormat: 'CSV' | 'XLSX';
  defaultLocation: string;
  csvDelimiter: ',' | ';' | '\t';
  excelFormatting: boolean;
  appearance: 'light' | 'dark' | 'system';
  duplicateFilterDelayMs: number;
  minRssiThreshold: number;
  aggregateRepeatedReads: boolean;
  autoStopScanMinutes: number;
  appVersion: string;
  sdkVersion: string;
}

export interface QuickScanItem {
  epc: string;
  rssi: number;
  readCount: number;
  firstSeen: string;
  lastSeen: string;
  matchedProduct?: {
    name: string;
    sku: string;
  };
}

export interface ExportOptions {
  includeProductInfo: boolean;
  includeRssi: boolean;
  includeReadCount: boolean;
  includeFirstSeen: boolean;
  includeLastSeen: boolean;
  includeMissing: boolean;
  includeExtra: boolean;
  includeUnknown: boolean;
}

export interface ImportPreviewItem {
  rowNumber: number;
  sku: string;
  name: string;
  epc: string;
  location: string;
  category: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
  message: string;
}
