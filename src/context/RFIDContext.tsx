import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  ScreenType,
  Product,
  InventorySession,
  H103ReaderState,
  AppSettings,
  RFIDTagRead,
  QuickScanItem
} from '../types/rfid';
import { StorageService } from '../services/storage';
import { soundManager } from '../utils/audio';

interface NavigationState {
  screen: ScreenType;
  params?: any;
}

interface RFIDContextValue {
  currentScreen: ScreenType;
  screenParams: any;
  navigationStack: NavigationState[];
  navigateTo: (screen: ScreenType, params?: any) => void;
  goBack: () => void;
  
  // Reader State
  readerState: H103ReaderState;
  updateReaderState: (partial: Partial<H103ReaderState>) => void;
  connectReader: () => Promise<void>;
  disconnectReader: () => void;
  
  // Scanning State
  isScanning: boolean;
  startScanning: () => void;
  stopScanning: () => void;
  toggleScanning: () => void;
  
  // Products Management
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Product;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  assignTagToProduct: (epc: string, productId: string) => void;
  unassignTagFromProduct: (epc: string, productId: string) => void;
  bulkImportProducts: (imported: Array<{ sku: string; name: string; epc: string; location?: string; category?: string }>) => void;
  
  // Inventory Sessions
  sessions: InventorySession[];
  activeSession: InventorySession | null;
  startInventorySession: (name: string, location: string, notes?: string, useExpectedList?: boolean) => void;
  finishInventorySession: () => InventorySession | null;
  cancelInventorySession: () => void;
  deleteSession: (id: string) => void;
  
  // Quick Scan
  quickScanTags: QuickScanItem[];
  clearQuickScan: () => void;
  
  // Tag Finder Radar
  finderTarget: { product?: Product; epc: string } | null;
  setFinderTarget: (target: { product?: Product; epc: string } | null) => void;
  finderProximity: number; // 0 to 100%
  finderRssi: number; // e.g. -48 dBm
  setFinderProximityManual: (pct: number) => void;
  isFinderSearching: boolean;
  toggleFinderSearch: () => void;
  
  // Unknown Tag Handling
  unknownTagPrompt: RFIDTagRead | null;
  setUnknownTagPrompt: (tag: RFIDTagRead | null) => void;
  assignUnknownTag: (epc: string, productId: string) => void;
  createProductFromUnknownTag: (epc: string, name: string, sku: string, location?: string) => void;
  ignoreUnknownTag: (epc: string) => void;
  
  // App Settings & Frame Mode
  appSettings: AppSettings;
  updateAppSettings: (partial: Partial<AppSettings>) => void;
  viewMode: 'mobile_frame' | 'fullscreen';
  setViewMode: (mode: 'mobile_frame' | 'fullscreen') => void;
  
  // Hardware Simulator Controls
  bluetoothEnabled: boolean;
  setBluetoothEnabled: (val: boolean) => void;
  bluetoothPermissionGranted: boolean;
  setBluetoothPermissionGranted: (val: boolean) => void;
  simulatePhysicalTrigger: () => void;
  resetAllData: () => void;
  resetDatabaseToMock: () => void;
}

const RFIDContext = createContext<RFIDContextValue | null>(null);

export const RFIDProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navStack, setNavStack] = useState<NavigationState[]>([
    { screen: 'dashboard', params: null }
  ]);
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [sessions, setSessions] = useState<InventorySession[]>(() => StorageService.getSessions());
  const [readerState, setReaderState] = useState<H103ReaderState>(() => StorageService.getReaderState());
  const [appSettings, setAppSettings] = useState<AppSettings>(() => StorageService.getAppSettings());
  const [viewMode, setViewMode] = useState<'mobile_frame' | 'fullscreen'>('mobile_frame');

  // Scanner States
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<InventorySession | null>(null);
  const [quickScanTags, setQuickScanTags] = useState<QuickScanItem[]>([]);
  const [unknownTagPrompt, setUnknownTagPrompt] = useState<RFIDTagRead | null>(null);
  const [ignoredEpcs, setIgnoredEpcs] = useState<Set<string>>(new Set());

  // Finder Radar States
  const [finderTarget, setFinderTarget] = useState<{ product?: Product; epc: string } | null>(null);
  const [finderProximity, setFinderProximity] = useState<number>(82);
  const [finderRssi, setFinderRssi] = useState<number>(-48);
  const [isFinderSearching, setIsFinderSearching] = useState<boolean>(false);

  // Bluetooth Simulator controls
  const [bluetoothEnabled, setBluetoothEnabled] = useState<boolean>(true);
  const [bluetoothPermissionGranted, setBluetoothPermissionGranted] = useState<boolean>(true);

  const scanIntervalRef = useRef<number | null>(null);
  const elapsedTimerRef = useRef<number | null>(null);
  const radarAudioIntervalRef = useRef<number | null>(null);

  const currentNav = navStack[navStack.length - 1] || { screen: 'dashboard', params: null };
  const currentScreen = currentNav.screen;
  const screenParams = currentNav.params;

  // Navigation functions
  const navigateTo = useCallback((screen: ScreenType, params?: any) => {
    setNavStack(prev => [...prev, { screen, params }]);
  }, []);

  const goBack = useCallback(() => {
    setNavStack(prev => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, prev.length - 1);
    });
  }, []);

  // Save changes to storage
  useEffect(() => {
    StorageService.saveProducts(products);
  }, [products]);

  useEffect(() => {
    StorageService.saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    StorageService.saveReaderState(readerState);
  }, [readerState]);

  useEffect(() => {
    StorageService.saveAppSettings(appSettings);
  }, [appSettings]);

  const updateReaderState = useCallback((partial: Partial<H103ReaderState>) => {
    setReaderState(prev => ({ ...prev, ...partial }));
  }, []);

  const updateAppSettings = useCallback((partial: Partial<AppSettings>) => {
    setAppSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const connectReader = useCallback(async () => {
    if (!bluetoothEnabled || !bluetoothPermissionGranted) return;
    setReaderState(prev => ({ ...prev, connecting: true }));
    
    // Simulate Bluetooth LE connection handshake
    await new Promise(r => setTimeout(r, 900));
    setReaderState(prev => ({
      ...prev,
      connected: true,
      connecting: false,
      battery: Math.min(100, Math.max(75, prev.battery)),
      signalStrength: 'Strong'
    }));
    soundManager.playSuccessChime();
  }, [bluetoothEnabled, bluetoothPermissionGranted]);

  const disconnectReader = useCallback(() => {
    setIsScanning(false);
    setReaderState(prev => ({
      ...prev,
      connected: false,
      connecting: false
    }));
  }, []);

  // Tag Simulation Engine for Live Inventory and Quick Scan
  const simulateTagBatch = useCallback(() => {
    if (!readerState.connected) return;

    // Collect all available EPCs from products plus some extra & unknown EPCs
    const knownProductsMap = new Map<string, Product>();
    products.forEach(p => {
      p.epcList.forEach(epc => knownProductsMap.set(epc, p));
    });

    const candidateEpcs = [
      'E280116060000123',
      'E280116060000124',
      'E280116060000125',
      'E280116060000456',
      'E280116060000457',
      'E280116060000789',
      'E280116060000321',
      'E280116060000654',
      'E280116060000655',
      'E280116060000987',
      'E280116060000111',
      'E280116060000222',
      'E280116060000888', // Extra tag
      'E280116060000999', // Unknown tag
    ];

    // Pick 1-4 random EPCs to simulate high-speed reading
    const readCountThisTick = Math.floor(Math.random() * 4) + 1;
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

    for (let i = 0; i < readCountThisTick; i++) {
      const randomEpc = candidateEpcs[Math.floor(Math.random() * candidateEpcs.length)];
      if (ignoredEpcs.has(randomEpc)) continue;

      const baseRssi = -38 - Math.floor(Math.random() * 35); // -38 to -73 dBm
      const matchedProd = knownProductsMap.get(randomEpc);

      // Play audio beep
      if (appSettings.audioFeedback && Math.random() < 0.4) {
        soundManager.playTagBeep(2400 + Math.floor(Math.random() * 300), 0.03, 0.1);
      }

      // If active session is in progress, update session tags
      if (activeSession) {
        setActiveSession(prevSession => {
          if (!prevSession) return null;
          const existingTagIndex = prevSession.scannedTags.findIndex(t => t.epc === randomEpc);
          let updatedTags = [...prevSession.scannedTags];

          let tagStatus: 'FOUND' | 'MISSING' | 'EXTRA' | 'UNKNOWN' = 'FOUND';
          if (!matchedProd) {
            tagStatus = randomEpc.endsWith('999') ? 'UNKNOWN' : 'EXTRA';
          }

          if (existingTagIndex >= 0) {
            const existing = updatedTags[existingTagIndex];
            updatedTags[existingTagIndex] = {
              ...existing,
              rssi: baseRssi,
              readCount: existing.readCount + 1,
              lastSeen: nowTime,
            };
          } else {
            const newTag: RFIDTagRead = {
              epc: randomEpc,
              rssi: baseRssi,
              readCount: 1,
              firstSeen: nowTime,
              lastSeen: nowTime,
              productId: matchedProd?.id,
              productName: matchedProd?.name,
              sku: matchedProd?.sku,
              location: matchedProd?.location,
              status: tagStatus
            };
            updatedTags = [newTag, ...updatedTags];

            // Trigger prompt for unknown tag if configured
            if (tagStatus === 'UNKNOWN' && !unknownTagPrompt) {
              setUnknownTagPrompt(newTag);
              soundManager.playAlertBeep();
            }
          }

          const foundCount = updatedTags.filter(t => t.status === 'FOUND').length;
          const extraCount = updatedTags.filter(t => t.status === 'EXTRA').length;
          const unknownCount = updatedTags.filter(t => t.status === 'UNKNOWN').length;
          const missingCount = Math.max(0, prevSession.expectedCount - foundCount);

          return {
            ...prevSession,
            scannedTags: updatedTags,
            foundCount,
            extraCount,
            unknownCount,
            missingCount,
            totalReads: prevSession.totalReads + 1
          };
        });
      }

      // If quick scan is active, update quick scan list
      setQuickScanTags(prevTags => {
        const idx = prevTags.findIndex(t => t.epc === randomEpc);
        if (idx >= 0) {
          const updated = [...prevTags];
          updated[idx] = {
            ...updated[idx],
            rssi: baseRssi,
            readCount: updated[idx].readCount + 1,
            lastSeen: nowTime
          };
          return updated;
        } else {
          return [
            {
              epc: randomEpc,
              rssi: baseRssi,
              readCount: 1,
              firstSeen: nowTime,
              lastSeen: nowTime,
              matchedProduct: matchedProd ? { name: matchedProd.name, sku: matchedProd.sku } : undefined
            },
            ...prevTags
          ];
        }
      });
    }
  }, [readerState.connected, products, ignoredEpcs, appSettings.audioFeedback, activeSession, unknownTagPrompt]);

  // Start scanning
  const startScanning = useCallback(() => {
    if (!readerState.connected) {
      soundManager.playAlertBeep();
      return;
    }
    setIsScanning(true);
    soundManager.playTagBeep(2600, 0.1, 0.2);
  }, [readerState.connected]);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  const toggleScanning = useCallback(() => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  }, [isScanning, startScanning, stopScanning]);

  // Hardware trigger simulation (e.g. Sled trigger button or Spacebar hotkey)
  const simulatePhysicalTrigger = useCallback(() => {
    if (currentScreen === 'find_radar') {
      toggleFinderSearch();
    } else {
      toggleScanning();
    }
  }, [currentScreen, toggleScanning]);

  // Keyboard shortcut listener for spacebar as H103 physical trigger
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        simulatePhysicalTrigger();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulatePhysicalTrigger]);

  // Scanning loop timer
  useEffect(() => {
    if (isScanning && readerState.connected) {
      const intervalMs = readerState.inventoryMode === 'Fast' ? 120 : 250;
      scanIntervalRef.current = window.setInterval(simulateTagBatch, intervalMs);
    } else {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
    }
    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isScanning, readerState.connected, readerState.inventoryMode, simulateTagBatch]);

  // Active Session elapsed timer
  useEffect(() => {
    if (activeSession && isScanning) {
      elapsedTimerRef.current = window.setInterval(() => {
        setActiveSession(prev => prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    }
    return () => {
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
      }
    };
  }, [activeSession, isScanning]);

  // Inventory Session methods
  const startInventorySession = useCallback((
    name: string,
    location: string,
    notes?: string,
    useExpectedList = true
  ) => {
    const totalExpected = useExpectedList
      ? products.reduce((acc, p) => acc + p.epcList.length, 0) || 1284
      : 0;

    const initialTags: RFIDTagRead[] = [];
    if (useExpectedList) {
      // Pre-fill missing tags so user can see progress
      products.forEach(prod => {
        prod.epcList.forEach(epc => {
          initialTags.push({
            epc,
            rssi: -99,
            readCount: 0,
            firstSeen: '-',
            lastSeen: '-',
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            location: prod.location,
            status: 'MISSING'
          });
        });
      });
    }

    const newSession: InventorySession = {
      id: `session-${Date.now()}`,
      name: name || `Inventory ${new Date().toLocaleDateString()}`,
      location: location || 'Warehouse A',
      notes: notes || '',
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      expectedCount: totalExpected,
      foundCount: 0,
      missingCount: totalExpected,
      extraCount: 0,
      unknownCount: 0,
      totalReads: 0,
      status: 'IN_PROGRESS',
      scannedTags: initialTags
    };

    setActiveSession(newSession);
    navigateTo('live_inventory');
    startScanning();
  }, [products, navigateTo, startScanning]);

  const finishInventorySession = useCallback(() => {
    if (!activeSession) return null;
    stopScanning();

    const finishedSession: InventorySession = {
      ...activeSession,
      status: 'COMPLETED',
      endTime: new Date().toISOString()
    };

    setSessions(prev => [finishedSession, ...prev]);
    setActiveSession(null);
    navigateTo('inventory_results', { session: finishedSession });
    soundManager.playSuccessChime();
    return finishedSession;
  }, [activeSession, stopScanning, navigateTo]);

  const cancelInventorySession = useCallback(() => {
    stopScanning();
    setActiveSession(null);
    navigateTo('dashboard');
  }, [stopScanning, navigateTo]);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  // Product Management
  const addProduct = useCallback((productData: Omit<Product, 'id' | 'updatedAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  }, []);

  const updateProduct = useCallback((updated: Product) => {
    setProducts(prev => prev.map(p => (p.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : p)));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const assignTagToProduct = useCallback((epc: string, productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        if (!p.epcList.includes(epc)) {
          return { ...p, epcList: [...p.epcList, epc] };
        }
      }
      return p;
    }));
  }, []);

  const unassignTagFromProduct = useCallback((epc: string, productId: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, epcList: p.epcList.filter(e => e !== epc) };
      }
      return p;
    }));
  }, []);

  const bulkImportProducts = useCallback((imported: Array<{ sku: string; name: string; epc: string; location?: string; category?: string }>) => {
    setProducts(prev => {
      const existingMap = new Map<string, Product>(prev.map(p => [p.sku, { ...p }]));
      imported.forEach((item, idx) => {
        if (existingMap.has(item.sku)) {
          const existing = existingMap.get(item.sku)!;
          if (item.epc && !existing.epcList.includes(item.epc)) {
            existing.epcList = [...existing.epcList, item.epc];
          }
          if (item.location) existing.location = item.location;
          existing.updatedAt = new Date().toISOString();
        } else {
          const newProd: Product = {
            id: `prod-bulk-${Date.now()}-${idx}`,
            name: item.name || 'Imported Product',
            sku: item.sku,
            barcode: `BC-${item.sku}`,
            category: item.category || 'General Inventory',
            description: 'Imported catalog record',
            location: item.location || 'Warehouse A',
            epcList: item.epc ? [item.epc] : [],
            expectedQuantity: 1,
            unit: 'pcs',
            updatedAt: new Date().toISOString()
          };
          existingMap.set(item.sku, newProd);
        }
      });
      return Array.from(existingMap.values());
    });
  }, []);

  // Quick Scan
  const clearQuickScan = useCallback(() => {
    setQuickScanTags([]);
  }, []);

  // Finder Proximity Radar
  const setFinderProximityManual = useCallback((pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    setFinderProximity(clamped);
    // Approximate RSSI calculation: 0% -> -95 dBm, 100% -> -35 dBm
    const calculatedRssi = Math.round(-95 + (clamped / 100) * 60);
    setFinderRssi(calculatedRssi);

    if (appSettings.audioFeedback) {
      soundManager.playProximityPulse(clamped);
    }
    if (appSettings.vibrationFeedback && clamped > 60) {
      soundManager.triggerHaptic(clamped > 80 ? 60 : 30);
    }
  }, [appSettings.audioFeedback, appSettings.vibrationFeedback]);

  const toggleFinderSearch = useCallback(() => {
    setIsFinderSearching(prev => !prev);
  }, []);

  // Dynamic radar beep interval loop when searching
  useEffect(() => {
    if (isFinderSearching && appSettings.audioFeedback) {
      const intervalMs = Math.max(80, 1000 - (finderProximity / 100) * 850);
      radarAudioIntervalRef.current = window.setInterval(() => {
        soundManager.playProximityPulse(finderProximity);
      }, intervalMs);
    } else {
      if (radarAudioIntervalRef.current) {
        clearInterval(radarAudioIntervalRef.current);
        radarAudioIntervalRef.current = null;
      }
    }
    return () => {
      if (radarAudioIntervalRef.current) {
        clearInterval(radarAudioIntervalRef.current);
      }
    };
  }, [isFinderSearching, finderProximity, appSettings.audioFeedback]);

  // Unknown Tag actions
  const assignUnknownTag = useCallback((epc: string, productId: string) => {
    assignTagToProduct(epc, productId);
    setUnknownTagPrompt(null);
    soundManager.playSuccessChime();
  }, [assignTagToProduct]);

  const createProductFromUnknownTag = useCallback((epc: string, name: string, sku: string, location = 'Warehouse A') => {
    addProduct({
      name,
      sku,
      barcode: `BC-${sku}`,
      category: 'General Inventory',
      description: 'Quick created from unknown tag discovery',
      location,
      epcList: [epc],
      expectedQuantity: 1,
      unit: 'pcs'
    });
    setUnknownTagPrompt(null);
    soundManager.playSuccessChime();
  }, [addProduct]);

  const ignoreUnknownTag = useCallback((epc: string) => {
    setIgnoredEpcs(prev => new Set(prev).add(epc));
    setUnknownTagPrompt(null);
  }, []);

  const resetAllData = useCallback(() => {
    StorageService.resetToDefaults();
    setProducts(StorageService.getProducts());
    setSessions(StorageService.getSessions());
    setReaderState(StorageService.getReaderState());
    setAppSettings(StorageService.getAppSettings());
  }, []);

  const value: RFIDContextValue = {
    currentScreen,
    screenParams,
    navigationStack: navStack,
    navigateTo,
    goBack,
    readerState,
    updateReaderState,
    connectReader,
    disconnectReader,
    isScanning,
    startScanning,
    stopScanning,
    toggleScanning,
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    assignTagToProduct,
    unassignTagFromProduct,
    bulkImportProducts,
    sessions,
    activeSession,
    startInventorySession,
    finishInventorySession,
    cancelInventorySession,
    deleteSession,
    quickScanTags,
    clearQuickScan,
    finderTarget,
    setFinderTarget,
    finderProximity,
    finderRssi,
    setFinderProximityManual,
    isFinderSearching,
    toggleFinderSearch,
    unknownTagPrompt,
    setUnknownTagPrompt,
    assignUnknownTag,
    createProductFromUnknownTag,
    ignoreUnknownTag,
    appSettings,
    updateAppSettings,
    viewMode,
    setViewMode,
    bluetoothEnabled,
    setBluetoothEnabled,
    bluetoothPermissionGranted,
    setBluetoothPermissionGranted,
    simulatePhysicalTrigger,
    resetAllData,
    resetDatabaseToMock: resetAllData
  };

  return <RFIDContext.Provider value={value}>{children}</RFIDContext.Provider>;
};

export const useRFID = (): RFIDContextValue => {
  const ctx = useContext(RFIDContext);
  if (!ctx) {
    throw new Error('useRFID must be used within an RFIDProvider');
  }
  return ctx;
};
