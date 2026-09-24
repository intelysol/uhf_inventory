# Current Architecture — UHF Inventory Prototype

## 1. Application Entry Point
- **`index.html`**: Host HTML template configuring viewport, title, and fonts.
- **`src/main.tsx`**: Bootstraps React 19 application and mounts `<App />` to `#root`.
- **`src/App.tsx`**: Wraps the application in `<RFIDProvider>` and renders `<MainScreenRouter />`.

## 2. Routing & Navigation
- **Routing Engine**: Custom in-memory navigation stack (`navStack: NavigationState[]`) in `src/context/RFIDContext.tsx`.
- **Navigation Controls**:
  - `navigateTo(screen: ScreenType, params?: any)`: Pushes a screen onto `navStack`.
  - `goBack()`: Pops the active screen.
- **Screen Router**:
  - `MainScreenRouter` in `src/App.tsx` uses a `switch (currentScreen)` statement.
- **Baseline Route Discrepancies**:
  - `AndroidBottomNav` routes the **More** tab to `reader_settings`, but `App.tsx` lacks `case 'reader_settings'`, defaulting to `DashboardScreen`.
  - `DashboardScreen` has buttons pointing to `reader_settings` and `app_settings` (which defaults back to dashboard because the route is named `settings`).

## 3. State Management (`RFIDContext`)
- **Central Context**: Single React context (`RFIDContext`) defined in `src/context/RFIDContext.tsx`.
- **Managed States**:
  - Screen navigation (`navStack`, `currentScreen`, `screenParams`).
  - Catalog products (`products: Product[]`).
  - Historical & active sessions (`sessions: InventorySession[]`, `activeSession: InventorySession | null`).
  - Quick scan cache (`quickScanTags: QuickScanItem[]`).
  - Reader telemetry (`readerState: H103ReaderState`).
  - Finder radar state (`finderTarget`, `finderProximity`, `finderRssi`, `isFinderSearching`).
  - Unknown tag prompt queue (`unknownTagPrompt: RFIDTagRead | null`).
  - Global app configuration (`appSettings: AppSettings`).

## 4. Storage Architecture (`StorageService`)
- **Location**: `src/services/storage.ts`
- **Engine**: Browser `localStorage` abstraction.
- **Storage Keys**:
  - `rfid_offline_products_v1`: Catalog products JSON.
  - `rfid_offline_sessions_v1`: Audit sessions JSON.
  - `rfid_offline_reader_state_v1`: Reader state JSON.
  - `rfid_offline_app_settings_v1`: User settings JSON.
- **Seed Data**: Populated from `src/data/mockDatabase.ts` if `localStorage` is empty.

## 5. Data Models
### Product Model (`src/types/rfid.ts`)
```typescript
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
```

### Inventory Session Model
```typescript
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
```

### Scanned Tag Model
```typescript
export interface RFIDTagRead {
  epc: string;
  rssi: number; // e.g. -48 dBm (to be removed in HID MVP)
  readCount: number;
  firstSeen: string;
  lastSeen: string;
  tid?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  location?: string;
  status: 'FOUND' | 'MISSING' | 'EXTRA' | 'UNKNOWN';
}
```

## 6. Export & Import Implementation
- **File Parsing / Generation**: Uses SheetJS (`xlsx`).
- **Export Formats**: CSV (`XLSX.utils.sheet_to_csv`) and XLSX workbook (`XLSX.write`).
- **Current Export Columns**:
  - EPC, Status, SKU, Product Name, Location, Signal (dBm), Read Count, First Seen, Last Seen.
  - *Note*: Signal (dBm) must be removed per hardware specification.
- **Browser Download**: Generates `Blob`, creates temporary `<a>` element, and triggers click.

## 7. Important Screens & Components
- **Screens**:
  - `DashboardScreen`: Executive status, reader overview, quick action tiles.
  - `StartInventoryScreen`: Form to initiate an audit session (name, location, expected catalog).
  - `LiveInventoryScreen`: Real-time session view with counters, status tabs, and tag feed.
  - `InventoryResultsScreen`: Post-session audit reconciliation and match percentage.
  - `ProductFinderSearchScreen`: Catalog search to pick a target EPC.
  - `RFIDRadarFinderScreen`: Proximity radar UI (currently simulated with concentric rings and dBm).
  - `QuickScanScreen`: Stream of scanned EPCs.
  - `ProductsScreen`: Product catalog list with category filtering and search.
  - `ProductDetailsScreen`: View product details and associated EPC list.
  - `AddEditProductScreen`: Form for creating or modifying product details with tag assignment.
  - `InventoryHistoryScreen`: Historical log of previous audits.
  - `InventorySessionDetailsScreen`: Details and review of an individual past session.
  - `ImportDataScreen`: CSV/XLSX file upload, column mapping preview, and import.
  - `ExportDataScreen`: Session selection, format options, and export trigger.
  - `AppSettingsScreen`: Global audio/vibration feedback, export format, database reset.
  - `ReaderConnectionScreen`: Reader connection interface with simulated BLE telemetry.
  - `SplashScreen`: Application launch splash screen.
- **Common Components**:
  - `AndroidStatusBar`: Emulated Android status bar with clock and connection status.
  - `AndroidBottomNav`: 5-tab persistent bottom navigation bar.
  - `HardwareTriggerFab`: Floating action button representing the reader trigger.
  - `ReaderStatusBadge`: Banner / chip showing reader connectivity.
  - `UnknownTagModal`: Modal appearing when a blind/unknown tag is detected during live inventory.
