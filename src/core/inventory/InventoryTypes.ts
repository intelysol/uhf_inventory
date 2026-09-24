export type InventoryTagStatus = 'FOUND' | 'MISSING' | 'EXTRA' | 'UNKNOWN';

export interface InventoryTag {
  epc: string;
  productId?: string | null;
  productName?: string | null;
  sku?: string | null;
  location?: string | null;
  status: InventoryTagStatus;
  readCount: number;
  firstSeen: number;
  lastSeen: number;
}

export interface InventorySession {
  id: string;
  name: string;
  location?: string;
  notes?: string;
  startedAt: number;
  completedAt?: number;
  tags: InventoryTag[];
  totalReads: number;
  uniqueTags: number;
  status: 'ACTIVE' | 'COMPLETED';

  // Compatibility fields for Session Details, History, and Export views
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  expectedCount: number;
  foundCount: number;
  missingCount: number;
  extraCount: number;
  unknownCount: number;
  scannedTags: InventoryTag[];
}
