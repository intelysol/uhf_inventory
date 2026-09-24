import { HidScanEvent } from '../hid/HidScanEvent';
import { hidScannerService } from '../hid/HidScannerService';
import { InventorySession, InventoryTag } from './InventoryTypes';
import { Product } from '../../types/rfid';
import { StorageService } from '../../services/storage';

export type InventorySessionListener = (session: InventorySession) => void;
export type LatestScanListener = (scan: { epc: string; readCount: number; lastSeen: number }) => void;

export class InventoryManager {
  private activeSession: InventorySession | null = null;
  private isScanning: boolean = false;
  private inventoryMap: Map<string, InventoryTag> = new Map();
  private totalReads: number = 0;
  private productIndex: Map<string, Product> = new Map();

  // Expected inventory tracking
  private expectedEpcs: Set<string> = new Set();
  private expectedProductSnapshot: Map<
    string,
    { id: string; name: string; sku: string; location?: string }
  > = new Map();

  private unsubscribeHid: (() => void) | null = null;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;

  private latestScan: { epc: string; readCount: number; lastSeen: number } | null = null;
  private sessionListeners: Set<InventorySessionListener> = new Set();
  private latestScanListeners: Set<LatestScanListener> = new Set();

  /**
   * Start a new active inventory session with optional expected product selection.
   *
   * @param expectedProductSelection
   *   - 'ALL': include all catalog products in expectedSet
   *   - 'BLIND': no expected items (blind count)
   *   - string[]: array of specific product IDs to expect
   */
  public startSession(
    name: string,
    location?: string,
    notes?: string,
    products: Product[] = [],
    expectedProductSelection: 'ALL' | 'BLIND' | string[] = 'ALL'
  ): InventorySession {
    // 1. Clean up any existing active session
    if (this.activeSession) {
      this.stopSession();
    }

    // 2. Build quick O(1) product lookup index by normalized EPC
    this.productIndex.clear();
    products.forEach(p => {
      p.epcList.forEach(rawEpc => {
        const norm = rawEpc.trim().toUpperCase();
        this.productIndex.set(norm, p);
      });
    });

    // 3. Build expected EPC Set
    this.expectedEpcs.clear();
    this.expectedProductSnapshot.clear();

    if (expectedProductSelection === 'ALL') {
      products.forEach(p => {
        p.epcList.forEach(rawEpc => {
          const norm = rawEpc.trim().toUpperCase();
          this.expectedEpcs.add(norm);
          this.expectedProductSnapshot.set(norm, {
            id: p.id,
            name: p.name,
            sku: p.sku,
            location: p.location,
          });
        });
      });
    } else if (Array.isArray(expectedProductSelection)) {
      const allowedIds = new Set(expectedProductSelection);
      products
        .filter(p => allowedIds.has(p.id))
        .forEach(p => {
          p.epcList.forEach(rawEpc => {
            const norm = rawEpc.trim().toUpperCase();
            this.expectedEpcs.add(norm);
            this.expectedProductSnapshot.set(norm, {
              id: p.id,
              name: p.name,
              sku: p.sku,
              location: p.location,
            });
          });
        });
    }
    // 'BLIND' leaves expectedEpcs empty

    // 4. Reset session map and counters
    this.inventoryMap.clear();
    this.totalReads = 0;
    this.latestScan = null;
    const now = Date.now();

    const expectedCount = this.expectedEpcs.size;

    const newSession: InventorySession = {
      id: `session-${now}`,
      name: name || `Inventory ${new Date(now).toLocaleDateString()}`,
      location: location || 'Warehouse A',
      notes: notes || '',
      startedAt: now,
      tags: [],
      totalReads: 0,
      uniqueTags: 0,
      status: 'ACTIVE',

      // Compatibility fields
      startTime: new Date(now).toISOString(),
      durationSeconds: 0,
      expectedCount,
      foundCount: 0,
      missingCount: expectedCount,
      extraCount: 0,
      unknownCount: 0,
      scannedTags: [],
    };

    this.activeSession = newSession;
    this.isScanning = true;

    // 5. Ensure HID scanner service is active and subscribe to real RFID events
    hidScannerService.start();
    this.unsubscribeHid = hidScannerService.subscribe(this.processRfidScan.bind(this));

    // 6. Start elapsed timer
    this.startElapsedTimer();

    this.notifySessionListeners();
    return this.buildSessionSnapshot();
  }

  /**
   * Process a complete RFID scan event emitted by HidScannerService.
   */
  public processRfidScan(event: HidScanEvent): void {
    if (!this.activeSession || !this.isScanning) {
      return;
    }

    // Reject invalid RFID input
    if (!event.valid || !event.value) {
      return;
    }

    const epc = event.value.trim().toUpperCase();
    const existing = this.inventoryMap.get(epc);

    if (existing) {
      // DUPLICATE RULE: increment readCount and update lastSeen
      existing.readCount += 1;
      existing.lastSeen = event.timestamp;
      this.totalReads += 1;

      this.latestScan = {
        epc,
        readCount: existing.readCount,
        lastSeen: existing.lastSeen,
      };
    } else {
      // NEW EPC RULE: Perform O(1) product lookup & determine status
      const prod = this.productIndex.get(epc);
      const isExpected = this.expectedEpcs.has(epc);

      let status: 'FOUND' | 'MISSING' | 'EXTRA' | 'UNKNOWN';

      if (this.expectedEpcs.size > 0) {
        if (isExpected) {
          status = 'FOUND';
        } else if (prod) {
          status = 'EXTRA';
        } else {
          status = 'UNKNOWN';
        }
      } else {
        // Blind count: no expected set
        status = prod ? 'FOUND' : 'UNKNOWN';
      }

      const newTag: InventoryTag = {
        epc,
        productId: prod ? prod.id : null,
        productName: prod ? prod.name : null,
        sku: prod ? prod.sku : null,
        location: prod ? prod.location : null,
        status,
        readCount: 1,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
      };

      this.inventoryMap.set(epc, newTag);
      this.totalReads += 1;

      this.latestScan = {
        epc,
        readCount: 1,
        lastSeen: event.timestamp,
      };
    }

    this.notifyLatestScanListeners();
    this.notifySessionListeners();
  }

  /**
   * Stop the active inventory session, compute final Missing/Found/Extra tags, and persist.
   */
  public stopSession(): InventorySession | null {
    if (!this.activeSession) return null;

    // 1. Unsubscribe from HID service
    if (this.unsubscribeHid) {
      this.unsubscribeHid();
      this.unsubscribeHid = null;
    }

    // 2. Stop elapsed timer
    this.stopElapsedTimer();

    this.isScanning = false;
    const now = Date.now();

    // 3. Compile full tag list including missing expected tags
    const scannedTagsList = Array.from(this.inventoryMap.values());
    const finalTagsList: InventoryTag[] = [...scannedTagsList];

    // Compute MISSING tags: expectedSet - scannedSet
    if (this.expectedEpcs.size > 0) {
      this.expectedEpcs.forEach(expectedEpc => {
        if (!this.inventoryMap.has(expectedEpc)) {
          const prodInfo = this.expectedProductSnapshot.get(expectedEpc);
          const missingTag: InventoryTag = {
            epc: expectedEpc,
            productId: prodInfo?.id ?? null,
            productName: prodInfo?.name ?? 'Expected Item',
            sku: prodInfo?.sku ?? 'N/A',
            location: prodInfo?.location ?? this.activeSession?.location ?? null,
            status: 'MISSING',
            readCount: 0,
            firstSeen: 0,
            lastSeen: 0,
          };
          finalTagsList.push(missingTag);
        }
      });
    }

    const uniqueTags = scannedTagsList.length;
    const foundCount = scannedTagsList.filter(t => t.status === 'FOUND').length;
    const extraCount = scannedTagsList.filter(t => t.status === 'EXTRA').length;
    const unknownCount = scannedTagsList.filter(t => t.status === 'UNKNOWN').length;
    const missingCount = Math.max(0, this.expectedEpcs.size - foundCount);

    const finalSession: InventorySession = {
      ...this.activeSession,
      tags: finalTagsList,
      scannedTags: finalTagsList,
      totalReads: this.totalReads,
      uniqueTags,
      expectedCount: this.expectedEpcs.size,
      foundCount,
      missingCount,
      extraCount,
      unknownCount,
      status: 'COMPLETED',
      completedAt: now,
      endTime: new Date(now).toISOString(),
    };

    // 4. Persist session to StorageService with duplicate protection
    this.persistCompletedSession(finalSession);

    this.activeSession = null;
    this.inventoryMap.clear();
    this.expectedEpcs.clear();
    this.expectedProductSnapshot.clear();
    this.totalReads = 0;
    this.latestScan = null;

    this.notifySessionListeners();
    return finalSession;
  }

  public pauseScanning(): void {
    this.isScanning = false;
    this.notifySessionListeners();
  }

  public resumeScanning(): void {
    if (this.activeSession) {
      this.isScanning = true;
      this.notifySessionListeners();
    }
  }

  public isSessionActive(): boolean {
    return Boolean(this.activeSession);
  }

  public isScanActive(): boolean {
    return this.isScanning;
  }

  public getActiveSession(): InventorySession | null {
    if (!this.activeSession) return null;
    return this.buildSessionSnapshot();
  }

  public getLatestScan(): { epc: string; readCount: number; lastSeen: number } | null {
    return this.latestScan;
  }

  public subscribeSession(listener: InventorySessionListener): () => void {
    this.sessionListeners.add(listener);
    if (this.activeSession) {
      listener(this.buildSessionSnapshot());
    }
    return () => {
      this.sessionListeners.delete(listener);
    };
  }

  public subscribeLatestScan(listener: LatestScanListener): () => void {
    this.latestScanListeners.add(listener);
    if (this.latestScan) {
      listener(this.latestScan);
    }
    return () => {
      this.latestScanListeners.delete(listener);
    };
  }

  /**
   * Builds an immutable snapshot of the active inventory session for live UI rendering.
   */
  private buildSessionSnapshot(): InventorySession {
    if (!this.activeSession) {
      throw new Error('No active session');
    }

    const scannedTags: InventoryTag[] = Array.from(this.inventoryMap.values());
    const uniqueTags = scannedTags.length;
    const foundCount = scannedTags.filter(t => t.status === 'FOUND').length;
    const extraCount = scannedTags.filter(t => t.status === 'EXTRA').length;
    const unknownCount = scannedTags.filter(t => t.status === 'UNKNOWN').length;
    const expectedCount = this.expectedEpcs.size;
    const missingCount = Math.max(0, expectedCount - foundCount);

    const snapshot: InventorySession = {
      ...this.activeSession,
      tags: scannedTags,
      scannedTags,
      totalReads: this.totalReads,
      uniqueTags,
      expectedCount,
      foundCount,
      missingCount,
      extraCount,
      unknownCount,
    };

    return snapshot;
  }

  /**
   * Persists the completed session with duplicate tag and session protection.
   */
  private persistCompletedSession(session: InventorySession): void {
    try {
      const existingSessions = StorageService.getSessions() || [];

      // Ensure tag uniqueness per session by normalized EPC
      const uniqueTagMap = new Map<string, InventoryTag>();
      session.tags.forEach(t => {
        const norm = t.epc.trim().toUpperCase();
        if (uniqueTagMap.has(norm)) {
          const ex = uniqueTagMap.get(norm)!;
          ex.readCount += t.readCount;
          ex.lastSeen = Math.max(ex.lastSeen, t.lastSeen);
        } else {
          uniqueTagMap.set(norm, { ...t, epc: norm });
        }
      });

      const sanitizedSession: InventorySession = {
        ...session,
        tags: Array.from(uniqueTagMap.values()),
        scannedTags: Array.from(uniqueTagMap.values()),
      };

      // Upsert session
      const updatedSessions = [
        sanitizedSession,
        ...existingSessions.filter(s => s.id !== sanitizedSession.id),
      ];

      StorageService.saveSessions(updatedSessions as any);
    } catch (err) {
      console.error('[InventoryManager] Failed to persist session:', err);
    }
  }

  private startElapsedTimer(): void {
    this.stopElapsedTimer();
    this.elapsedInterval = setInterval(() => {
      if (this.activeSession && this.isScanning) {
        this.activeSession.durationSeconds += 1;
        this.notifySessionListeners();
      }
    }, 1000);
  }

  private stopElapsedTimer(): void {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  private notifySessionListeners(): void {
    if (!this.activeSession) return;
    const snapshot = this.buildSessionSnapshot();
    this.sessionListeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('[InventoryManager] Error in session listener:', err);
      }
    });
  }

  private notifyLatestScanListeners(): void {
    if (!this.latestScan) return;
    const scan = { ...this.latestScan };
    this.latestScanListeners.forEach(listener => {
      try {
        listener(scan);
      } catch (err) {
        console.error('[InventoryManager] Error in latest scan listener:', err);
      }
    });
  }
}

// Global Singleton Instance
export const inventoryManager = new InventoryManager();
