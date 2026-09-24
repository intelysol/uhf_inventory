# UHF Inventory — Android RFID HID MVP Development Plan

## 1. System Architecture Pipeline
```
React / TypeScript / Vite Application
                  ↓
          Capacitor 8 Mobile Container
                  ↓
           Android Native Platform
                  ↓
     Chafon H103 UHF Reader (Bluetooth HID)
                  ↓
       Android Keyboard Events (window.keydown)
                  ↓
          HidScannerService (Singleton)
                  ↓
     HidInputBuffer (Timing & Terminator Detection)
                  ↓
      RfidParser (Normalize, Trim, Uppercase, Hex Check)
                  ↓
               HidScanEvent
                  ↓
        Central Event Bus / RFIDContext
                  ↓
    ┌────────────────────────┬────────────────────────┐
Inventory Engine       Product Finder           Quick Scan
(O(1) EPC Map)      (Target EPC Match)     (Real HID Stream)
```

## 2. Phased Implementation Roadmap

### Phase 2: Capacitor Integration
- Add `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/filesystem`, `@capacitor/share`.
- Configure `capacitor.config.ts`:
  - `appId: 'com.intelysol.uhfinventory'`
  - `appName: 'UHF Inventory'`
  - `webDir: 'dist'`
- Add Android native platform (`android/`).
- Build baseline Android APK (`./gradlew assembleDebug`).

### Phase 3: Centralized HID Service (`src/core/hid/`)
- `HidScanEvent.ts`: Interface with value, timestamp, rawInput, length, valid, validationMessage.
- `HidScannerConfig.ts`: Suffix (ENTER, TAB, CR, LF, CRLF, NONE), min/max length, HEX validation, timeout.
- `RfidParser.ts`: Strict normalization (trim, remove CR/LF, uppercase, validate HEX).
- `HidInputBuffer.ts`: Character accumulation, inter-character timeout, terminator detection.
- `HidScannerService.ts`: Global keyboard listener with subscriber pattern.

### Phase 4: Scanner Test Screen
- Route: `More → Scanner Test`.
- Real-time display:
  - Status: `WAITING FOR RFID INPUT`.
  - Last RFID, Length, Validation, Last Scan Time.
  - Counters: Total Reads, Invalid Reads.
  - Raw Input display.
  - Last 20 RFID events table.
  - No text input field required for operation.

### Phase 5: Hardware Acceptance Testing
- Pair Chafon H103 via Android Bluetooth Settings in HID mode.
- Pull trigger on 1 tag, 10 reads, 50 reads.
- Verify zero corrupted characters, zero random EPCs, zero missing digits.

### Phase 6 & 7: Inventory Engine & Duplicate Detection
- Create `InventoryManager`:
  - Session state backed by `Map<string, InventoryTag>` (EPC is primary key).
  - O(1) duplicate handling:
    - Existing tag: increment `readCount`, update `lastSeen`.
    - New tag: insert record with `readCount = 1`, `firstSeen = now`, `lastSeen = now`.
    - Never produce duplicate rows.
  - Counters: Unique Tags vs Total Reads.
  - Status reconciliation: `FOUND`, `MISSING`, `EXTRA`, `UNKNOWN`.

### Phase 8: Quick Scan Adaptation
- Connect to real `HidScanEvent` stream.
- Remove hardcoded demo fallback items.
- Remove RSSI and dBm columns.

### Phase 9: Product Management & Registration
- Add `SCAN RFID` action in `AddEditProductScreen`:
  - Listen for single HID scan event.
  - Capture normalized EPC into form without manual typing.
- Unknown tag prompt:
  - Options: Assign to existing product, create new product, or ignore.

### Phase 10: Product Finder Overhaul
- Strip radar sweep, concentric rings, dBm, and distance calculations.
- Implement Target Tag Matcher:
  - Display Product Name, SKU, Target EPC.
  - State: `WAITING FOR TARGET RFID` vs `TARGET FOUND`.
  - Increment detection count upon matching EPC.
  - Trigger audio chime and haptic pulse.

### Phase 11: Export, Android Sharing & Backup
- Remove fake RSSI from XLSX / CSV export.
- Implement native share via `@capacitor/filesystem` and `@capacitor/share`.
- Add JSON Backup export and import for full offline data safety.

### Phase 12: Final Build Validation & Android Packaging
- Run `npm run lint`.
- Run `npm run build`.
- Run `npx cap sync android`.
- Build final production APK.
