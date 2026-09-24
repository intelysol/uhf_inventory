import { hidScannerService, HidScannerService } from '../hid/HidScannerService';
import { HidScanEvent } from '../hid/HidScanEvent';
import { RfidParser } from '../hid/RfidParser';
import { Product } from '../../types/rfid';

export type FinderStatus = 'READY' | 'FINDING' | 'FOUND' | 'STOPPED';

export interface FinderState {
  targetProduct: Product | null;
  selectedSpecificEpc: string | 'ALL';
  targetEpcs: Set<string>;
  status: FinderStatus;
  matchedEpc: string | null;
  detectionCount: number;
  lastDetectedTime: number | null;
  otherDetectedTags: Array<{ epc: string; timestamp: number }>;
}

export type FinderStateListener = (state: FinderState) => void;

/**
 * ProductFinderManager handles pure EPC RFID target finding with the Chafon H103 reader.
 *
 * Rules:
 * - Operates entirely on Bluetooth HID keyboard events (no BLE GATT, no RSSI, no distance/radar).
 * - Subscribes to HidScannerService when finding is active; unsubscribes when stopped.
 * - Compares normalized scanned EPCs against the selected product's normalized EPCs.
 * - Repeated reads of the same EPC increment detection count without creating duplicate UI rows.
 * - Non-target EPCs do not fail or overwrite the target result.
 */
export class ProductFinderManager {
  private scannerService: HidScannerService;
  private unsubscribeHid: (() => void) | null = null;
  private listeners: Set<FinderStateListener> = new Set();

  private targetProduct: Product | null = null;
  private selectedSpecificEpc: string | 'ALL' = 'ALL';
  private targetEpcs: Set<string> = new Set();
  private status: FinderStatus = 'READY';
  private matchedEpc: string | null = null;
  private detectionCount: number = 0;
  private lastDetectedTime: number | null = null;
  private otherDetectedTags: Array<{ epc: string; timestamp: number }> = [];

  constructor(scannerService: HidScannerService = hidScannerService) {
    this.scannerService = scannerService;
  }

  /**
   * Set or update the target product for finding.
   *
   * @param product The product to search for.
   * @param specificEpc Optional specific EPC to target instead of 'ALL' assigned EPCs.
   */
  public setProduct(product: Product | null, specificEpc: string | 'ALL' = 'ALL'): void {
    this.targetProduct = product;
    this.selectedSpecificEpc = specificEpc;
    this.rebuildTargetEpcs();

    // Reset counters for the new target
    this.matchedEpc = null;
    this.detectionCount = 0;
    this.lastDetectedTime = null;
    this.otherDetectedTags = [];
    this.status = 'READY';

    this.notify();
  }

  /**
   * Select a specific EPC belonging to the product, or 'ALL'.
   */
  public setSpecificTargetEpc(epcOrAll: string | 'ALL'): void {
    this.selectedSpecificEpc = epcOrAll;
    this.rebuildTargetEpcs();
    this.notify();
  }

  private rebuildTargetEpcs(): void {
    this.targetEpcs.clear();

    if (!this.targetProduct) return;

    const list = Array.isArray(this.targetProduct.epcList) ? this.targetProduct.epcList : [];

    if (this.selectedSpecificEpc === 'ALL' || !this.selectedSpecificEpc) {
      for (const raw of list) {
        const norm = RfidParser.normalizeEpc(raw);
        if (norm && RfidParser.isValidHex(norm)) {
          this.targetEpcs.add(norm);
        }
      }
    } else {
      const norm = RfidParser.normalizeEpc(this.selectedSpecificEpc);
      if (norm && RfidParser.isValidHex(norm)) {
        this.targetEpcs.add(norm);
      }
    }
  }

  /**
   * Start or resume active finding.
   * Subscribes to HidScannerService.
   */
  public startFinding(): void {
    if (this.status === 'FINDING') return;

    this.status = this.detectionCount > 0 ? 'FOUND' : 'FINDING';

    if (!this.unsubscribeHid) {
      this.scannerService.start();
      this.unsubscribeHid = this.scannerService.subscribe((event: HidScanEvent) => {
        this.handleHidScan(event);
      });
    }

    this.notify();
  }

  /**
   * Stop active finding.
   * Unsubscribes from HidScannerService without disconnecting Bluetooth.
   */
  public stopFinding(): void {
    if (this.status === 'STOPPED') return;

    this.status = 'STOPPED';

    if (this.unsubscribeHid) {
      this.unsubscribeHid();
      this.unsubscribeHid = null;
    }

    this.notify();
  }

  /**
   * Reset detection counters back to READY state while keeping product selected.
   */
  public resetDetection(): void {
    this.matchedEpc = null;
    this.detectionCount = 0;
    this.lastDetectedTime = null;
    this.otherDetectedTags = [];
    if (this.status === 'FOUND') {
      this.status = this.unsubscribeHid ? 'FINDING' : 'READY';
    }
    this.notify();
  }

  /**
   * Process incoming HidScanEvent from Chafon H103 Bluetooth HID keyboard input.
   */
  public handleHidScan(event: HidScanEvent): void {
    // Only process scans when actively finding
    if (this.status !== 'FINDING' && this.status !== 'FOUND') {
      return;
    }

    if (!event.valid || !event.value) {
      return;
    }

    // 1. Normalize EPC (trim, uppercase, remove CR/LF)
    const normalizedEpc = RfidParser.normalizeEpc(event.value);
    if (!normalizedEpc || !RfidParser.isValidHex(normalizedEpc)) {
      return;
    }

    // 2. Check if normalized EPC is one of the target EPCs
    if (this.targetEpcs.has(normalizedEpc)) {
      this.detectionCount++;
      this.lastDetectedTime = event.timestamp || Date.now();
      this.matchedEpc = normalizedEpc;
      this.status = 'FOUND';
      this.notify();
    } else {
      // 3. Non-target EPC read: do NOT treat as failed product match.
      // Record in other tags debug list for visibility.
      const now = event.timestamp || Date.now();
      const existingIdx = this.otherDetectedTags.findIndex(t => t.epc === normalizedEpc);
      if (existingIdx >= 0) {
        this.otherDetectedTags[existingIdx].timestamp = now;
      } else {
        this.otherDetectedTags.unshift({ epc: normalizedEpc, timestamp: now });
        if (this.otherDetectedTags.length > 10) {
          this.otherDetectedTags.pop();
        }
      }
      this.notify();
    }
  }

  public getState(): FinderState {
    return {
      targetProduct: this.targetProduct,
      selectedSpecificEpc: this.selectedSpecificEpc,
      targetEpcs: new Set(this.targetEpcs),
      status: this.status,
      matchedEpc: this.matchedEpc,
      detectionCount: this.detectionCount,
      lastDetectedTime: this.lastDetectedTime,
      otherDetectedTags: [...this.otherDetectedTags],
    };
  }

  public subscribe(listener: FinderStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach(l => l(state));
  }
}

export const productFinderManager = new ProductFinderManager();
