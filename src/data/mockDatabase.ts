import { Product, InventorySession, AppSettings, H103ReaderState } from '../types/rfid';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Dell Wireless Keyboard KB500',
    sku: 'KB-001',
    barcode: '884116382910',
    category: 'Computer Accessories',
    description: 'Full-sized wireless keyboard with 36-month battery life and programmable hotkeys.',
    location: 'Warehouse A / Rack A03',
    epcList: [
      'E280116060000123',
      'E280116060000124',
      'E280116060000125',
      'E280116060000126'
    ],
    expectedQuantity: 12,
    unit: 'pcs',
    updatedAt: '2026-08-30T09:15:00Z'
  },
  {
    id: 'prod-002',
    name: 'Logitech MX Master 3S Mouse',
    sku: 'MS-002',
    barcode: '097855174542',
    category: 'Computer Accessories',
    description: 'Quiet ergonomic performance wireless mouse with 8K DPI sensor.',
    location: 'Warehouse A / Rack A04',
    epcList: [
      'E280116060000456',
      'E280116060000457',
      'E280116060000458'
    ],
    expectedQuantity: 8,
    unit: 'pcs',
    updatedAt: '2026-08-30T10:30:00Z'
  },
  {
    id: 'prod-003',
    name: 'Zebra TC21 Touch Mobile Computer',
    sku: 'ZEB-003',
    barcode: '793573024823',
    category: 'Industrial Hardware',
    description: 'Enterprise barcode mobile terminal with Android 11 OS and 2D imager.',
    location: 'Warehouse A / Shelf S-12',
    epcList: [
      'E280116060000789',
      'E280116060000790'
    ],
    expectedQuantity: 6,
    unit: 'units',
    updatedAt: '2026-08-29T14:20:00Z'
  },
  {
    id: 'prod-004',
    name: 'Cisco Catalyst 9200L 24P Switch',
    sku: 'CS-004',
    barcode: '889728192301',
    category: 'Network Infrastructure',
    description: '24-port PoE+ Layer 3 managed enterprise rack switch.',
    location: 'Warehouse B / Bay B01',
    epcList: [
      'E280116060000321',
      'E280116060000322'
    ],
    expectedQuantity: 4,
    unit: 'units',
    updatedAt: '2026-08-28T11:00:00Z'
  },
  {
    id: 'prod-005',
    name: 'Apple iPad Air 11-inch M2',
    sku: 'IPD-005',
    barcode: '195949432109',
    category: 'Mobile Devices',
    description: '128GB Space Gray Wi-Fi tablet for floor supervisor operations.',
    location: 'Warehouse A / Secure Safe 01',
    epcList: [
      'E280116060000654',
      'E280116060000655',
      'E280116060000656'
    ],
    expectedQuantity: 5,
    unit: 'pcs',
    updatedAt: '2026-08-30T16:00:00Z'
  },
  {
    id: 'prod-006',
    name: 'Samsung Galaxy Tab Active4 Pro',
    sku: 'SAM-006',
    barcode: '887276689045',
    category: 'Mobile Devices',
    description: 'Rugged water-resistant 10.1-inch industrial tablet.',
    location: 'Warehouse A / Shelf S-14',
    epcList: [
      'E280116060000987',
      'E280116060000988'
    ],
    expectedQuantity: 3,
    unit: 'pcs',
    updatedAt: '2026-08-27T08:45:00Z'
  },
  {
    id: 'prod-007',
    name: 'Honeywell Voyager 1400g 2D Scanner',
    sku: 'HW-007',
    barcode: '852674004921',
    category: 'Industrial Hardware',
    description: 'Omnidirectional corded area-imaging barcode scanner.',
    location: 'Warehouse B / Bay B04',
    epcList: [
      'E280116060000111',
      'E280116060000112'
    ],
    expectedQuantity: 10,
    unit: 'units',
    updatedAt: '2026-08-25T13:10:00Z'
  },
  {
    id: 'prod-008',
    name: 'Milwaukee M18 FUEL Hammer Drill Kit',
    sku: 'MLW-008',
    barcode: '045242598342',
    category: 'Tools & Equipment',
    description: '1/2 inch brushless hammer drill with two 5.0Ah batteries.',
    location: 'Warehouse B / Tool Cage 02',
    epcList: [
      'E280116060000222'
    ],
    expectedQuantity: 2,
    unit: 'kits',
    updatedAt: '2026-08-24T15:30:00Z'
  }
];

export const INITIAL_SESSIONS: InventorySession[] = [
  {
    id: 'session-2026-08-31-01',
    name: 'Warehouse A - August Count',
    location: 'Warehouse A (All Zones)',
    notes: 'Quarterly full audit count. High accuracy pass with H103 sled reader.',
    startTime: '2026-08-31T10:02:40Z',
    endTime: '2026-08-31T10:21:22Z',
    durationSeconds: 1122, // 18m 42s
    expectedCount: 1297,
    foundCount: 1284,
    missingCount: 13,
    extraCount: 8,
    unknownCount: 5,
    totalReads: 18432,
    status: 'COMPLETED',
    scannedTags: [
      {
        epc: 'E280116060000123',
        rssi: -48,
        readCount: 27,
        firstSeen: '10:03:12',
        lastSeen: '10:19:44',
        productId: 'prod-001',
        productName: 'Dell Wireless Keyboard KB500',
        sku: 'KB-001',
        location: 'Warehouse A / Rack A03',
        status: 'FOUND'
      },
      {
        epc: 'E280116060000456',
        rssi: -54,
        readCount: 19,
        firstSeen: '10:04:05',
        lastSeen: '10:18:10',
        productId: 'prod-002',
        productName: 'Logitech MX Master 3S Mouse',
        sku: 'MS-002',
        location: 'Warehouse A / Rack A04',
        status: 'FOUND'
      },
      {
        epc: 'E280116060000789',
        rssi: -42,
        readCount: 38,
        firstSeen: '10:05:22',
        lastSeen: '10:20:01',
        productId: 'prod-003',
        productName: 'Zebra TC21 Touch Mobile Computer',
        sku: 'ZEB-003',
        location: 'Warehouse A / Shelf S-12',
        status: 'FOUND'
      },
      {
        epc: 'E280116060000654',
        rssi: -61,
        readCount: 14,
        firstSeen: '10:08:45',
        lastSeen: '10:15:30',
        productId: 'prod-005',
        productName: 'Apple iPad Air 11-inch M2',
        sku: 'IPD-005',
        location: 'Warehouse A / Secure Safe 01',
        status: 'FOUND'
      },
      {
        epc: 'E280116060000987',
        rssi: -68,
        readCount: 11,
        firstSeen: '10:09:12',
        lastSeen: '10:14:22',
        productId: 'prod-006',
        productName: 'Samsung Galaxy Tab Active4 Pro',
        sku: 'SAM-006',
        location: 'Warehouse A / Shelf S-14',
        status: 'FOUND'
      },
      {
        epc: 'E280116060000124',
        rssi: -50,
        readCount: 22,
        firstSeen: '10:03:15',
        lastSeen: '10:19:50',
        productId: 'prod-001',
        productName: 'Dell Wireless Keyboard KB500',
        sku: 'KB-001',
        location: 'Warehouse A / Rack A03',
        status: 'FOUND'
      },
      {
        epc: 'E280116060000888',
        rssi: -72,
        readCount: 8,
        firstSeen: '10:12:00',
        lastSeen: '10:16:30',
        status: 'EXTRA'
      },
      {
        epc: 'E280116060000999',
        rssi: -52,
        readCount: 15,
        firstSeen: '10:14:14',
        lastSeen: '10:17:05',
        status: 'UNKNOWN'
      },
      {
        epc: 'E280116060000126',
        rssi: -99,
        readCount: 0,
        firstSeen: '-',
        lastSeen: '-',
        productId: 'prod-001',
        productName: 'Dell Wireless Keyboard KB500',
        sku: 'KB-001',
        location: 'Warehouse A / Rack A03',
        status: 'MISSING'
      }
    ]
  },
  {
    id: 'session-2026-08-15-02',
    name: 'Warehouse B - Mid-Month Check',
    location: 'Warehouse B (Network & Tools)',
    notes: 'Verification of rack hardware and high-value tools.',
    startTime: '2026-08-15T14:10:00Z',
    endTime: '2026-08-15T14:24:15Z',
    durationSeconds: 855,
    expectedCount: 842,
    foundCount: 839,
    missingCount: 3,
    extraCount: 4,
    unknownCount: 1,
    totalReads: 12490,
    status: 'COMPLETED',
    scannedTags: []
  }
];

export const DEFAULT_READER_STATE: H103ReaderState = {
  connected: true,
  connecting: false,
  deviceName: 'H103-123456',
  battery: 82,
  signalStrength: 'Strong',
  rfPower: 27, // 27 dBm
  rfRegion: 'US (902-928 MHz)',
  session: 'S1',
  inventoryMode: 'Fast',
  buzzer: true,
  triggerMode: 'Toggle',
  vibration: true,
  autoConnect: true,
  reconnectAutomatically: true,
  qValue: 4,
  targetAlgorithm: 'A-B'
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoSaveSessions: true,
  keepScanHistory: true,
  rssiSmoothing: true,
  audioFeedback: true,
  vibrationFeedback: true,
  signalSensitivity: 'Normal',
  defaultExportFormat: 'XLSX',
  defaultLocation: 'Warehouse A',
  csvDelimiter: ',',
  excelFormatting: true,
  appearance: 'light',
  duplicateFilterDelayMs: 500,
  minRssiThreshold: -85,
  aggregateRepeatedReads: true,
  autoStopScanMinutes: 0,
  appVersion: 'v2.4.0-PRO',
  sdkVersion: 'v3.1.2-H103-BLE'
};
