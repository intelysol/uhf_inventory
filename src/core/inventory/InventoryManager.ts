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
  private unsubscribeHid: (() => void) | null = null;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;

  private latestScan: { epc: string; readCount: number; lastSeen: number } | null = null;
  private sessionListeners: Set<InventorySessionListener> = new Set();
  private latestScanListeners: Set<LatestScanListener> = new Set();

  /**
   * Start a new active inventory session.
   */
  public startSession(
    name: string,
    location?: string,
    notes?: string,
    products: Product[] = []
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

    // 3. Reset session map and counters
    this.inventoryMap.clear();
    this.totalReads = 0;
    this.latestScan = null;
    const now = Date.now();

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
      expectedCount: products.reduce((acc, p) => acc + p.epcList.length, 0),
      foundCount: 0,
      missingCount: 0,
      extraCount: 0,
      unknownCount: 0,
      scannedTags: [],
    };

    this.activeSession = newSession;
    this.isScanning = true;

    // 4. Ensure HID scanner service is active and subscribe to real RFID events
    hidScannerService.start();
    this.unsubscribeHid = hidScannerService.subscribe(this.processRfidScan.bind(this));

    // 5. Start elapsed timer
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

    const epc = event.value; // Already normalized to uppercase without CRLF/spaces
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
      // NEW EPC RULE: Create new InventoryTag and perform O(1) product lookup
      const prod = this.productIndex.get(epc);
      const isFound = Boolean(prod);

      const newTag: InventoryTag = {
        epc,
        productId: prod ? prod.id : null,
        productName: prod ? prod.name : null,
        sku: prod ? prod.sku : null,
        location: prod ? prod.location : null,
        status: isFound ? 'FOUND' : 'UNKNOWN',
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
   * Stop the active inventory session and persist it.
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
    const finalSession = this.buildSessionSnapshot();
    finalSession.status = 'COMPLETED';
    finalSession.completedAt = now;
    finalSession.endTime = new Date(now).toISOString();

    // 3. Persist session to StorageService with duplicate protection
    this.persistCompletedSession(finalSession);

    this.activeSession = null;
    this.inventoryMap.clear();
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
   * Builds an immutable snapshot of the active inventory session.
   */
  private buildSessionSnapshot(): InventorySession {
    if (!this.activeSession) {
      throw new Error('No active session');
    }

    // Convert Map values to array
    const tagList: InventoryTag[] = Array.from(this.inventoryMap.values());
    const uniqueTags = tagList.length;
    const foundCount = tagList.filter(t => t.status === 'FOUND').length;
    const unknownCount = tagList.filter(t => t.status === 'UNKNOWN').length;

    const snapshot: InventorySession = {
      ...this.activeSession,
      tags: tagList,
      scannedTags: tagList,
      totalReads: this.totalReads,
      uniqueTags,
      foundCount,
      unknownCount,
      missingCount: Math.max(0, this.activeSession.expectedCount - foundCount),
      extraCount: 0,
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
        uniqueTags: uniqueTagMap.size,
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
