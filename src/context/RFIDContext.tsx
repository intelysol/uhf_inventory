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
import { inventoryManager } from '../core/inventory/InventoryManager';
import { productFinderManager } from '../core/finder/ProductFinderManager';

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
  checkEpcAssignment: (epc: string, excludeProductId?: string) => Product | null;
  assignTagToProduct: (epc: string, productId: string, reassignFromOther?: boolean) => { success: boolean; conflictProduct?: Product };
  unassignTagFromProduct: (epc: string, productId: string) => void;
  bulkImportProducts: (imported: Array<{ sku: string; name: string; epc: string; location?: string; category?: string }>) => void;
  
  // Inventory Sessions
  sessions: InventorySession[];
  activeSession: InventorySession | null;
  startInventorySession: (name: string, location: string, notes?: string, expectedProductSelection?: 'ALL' | 'BLIND' | string[] | boolean) => void;
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

  // Phase 6: File Export, Backup & Restore
  exportProducts: (format: 'CSV' | 'XLSX') => Promise<any>;
  exportInventorySession: (session: InventorySession, format: 'CSV' | 'XLSX') => Promise<any>;
  exportBackup: () => Promise<any>;
  restoreBackup: (jsonString: string) => { success: boolean; error?: string };
  lastBackupTime: string | null;
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

  // Synchronize real inventory session updates with activeSession state
  useEffect(() => {
    const unsub = inventoryManager.subscribeSession(session => {
      setActiveSession(session as any);
    });
    return () => unsub();
  }, []);

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

  // Start scanning
  const startScanning = useCallback(() => {
    setIsScanning(true);
    inventoryManager.resumeScanning();
    soundManager.playTagBeep(2600, 0.1, 0.2);
  }, []);

  const stopScanning = useCallback(() => {
    setIsScanning(false);
    inventoryManager.pauseScanning();
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
      const state = productFinderManager.getState();
      if (state.status === 'FINDING' || state.status === 'FOUND') {
        productFinderManager.stopFinding();
      } else {
        productFinderManager.startFinding();
      }
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
    expectedProductSelection: 'ALL' | 'BLIND' | string[] | boolean = 'ALL'
  ) => {
    let selection: 'ALL' | 'BLIND' | string[] = 'ALL';
    if (typeof expectedProductSelection === 'boolean') {
      selection = expectedProductSelection ? 'ALL' : 'BLIND';
    } else {
      selection = expectedProductSelection;
    }
    const session = inventoryManager.startSession(name, location, notes, products, selection);
    setActiveSession(session as any);
    setIsScanning(true);
    navigateTo('live_inventory');
    soundManager.playTagBeep(2600, 0.1, 0.2);
  }, [products, navigateTo]);

  const finishInventorySession = useCallback(() => {
    const finished = inventoryManager.stopSession();
    if (finished) {
      setSessions(prev => [finished as any, ...prev.filter(s => s.id !== finished.id)]);
      setActiveSession(null);
      setIsScanning(false);
      navigateTo('inventory_results', { session: finished });
      soundManager.playSuccessChime();
      return finished as any;
    }
    return null;
  }, [navigateTo]);

  const cancelInventorySession = useCallback(() => {
    inventoryManager.stopSession();
    setActiveSession(null);
    setIsScanning(false);
    navigateTo('dashboard');
  }, [navigateTo]);

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

  const checkEpcAssignment = useCallback((rawEpc: string, excludeProductId?: string): Product | null => {
    const norm = rawEpc.trim().toUpperCase();
    return products.find(p => p.id !== excludeProductId && p.epcList.some(e => e.trim().toUpperCase() === norm)) || null;
  }, [products]);

  const assignTagToProduct = useCallback((rawEpc: string, productId: string, reassignFromOther = false): { success: boolean; conflictProduct?: Product } => {
    const norm = rawEpc.trim().toUpperCase();
    const conflict = products.find(p => p.id !== productId && p.epcList.some(e => e.trim().toUpperCase() === norm));
    if (conflict && !reassignFromOther) {
      return { success: false, conflictProduct: conflict };
    }

    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const without = p.epcList.filter(e => e.trim().toUpperCase() !== norm);
        return { ...p, epcList: [...without, norm], updatedAt: new Date().toISOString() };
      }
      if (conflict && p.id === conflict.id && reassignFromOther) {
        return { ...p, epcList: p.epcList.filter(e => e.trim().toUpperCase() !== norm), updatedAt: new Date().toISOString() };
      }
      return p;
    }));
    return { success: true };
  }, [products]);

  const unassignTagFromProduct = useCallback((epc: string, productId: string) => {
    const norm = epc.trim().toUpperCase();
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return { ...p, epcList: p.epcList.filter(e => e.trim().toUpperCase() !== norm), updatedAt: new Date().toISOString() };
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

  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => StorageService.getLastBackupTime());

  const exportProducts = useCallback(async (format: 'CSV' | 'XLSX') => {
    return await StorageService.exportProducts(products, format);
  }, [products]);

  const exportInventorySession = useCallback(async (session: InventorySession, format: 'CSV' | 'XLSX') => {
    return await StorageService.exportInventorySession(session, format);
  }, []);

  const exportBackup = useCallback(async () => {
    const res = await StorageService.exportBackup(products, sessions, appSettings);
    if (res.success) {
      setLastBackupTime(StorageService.getLastBackupTime());
    }
    return res;
  }, [products, sessions, appSettings]);

  const restoreBackup = useCallback((jsonString: string) => {
    const res = StorageService.restoreBackup(jsonString);
    if (res.success && res.payload) {
      setProducts(res.payload.products);
      setSessions(res.payload.inventorySessions);
      setAppSettings(res.payload.settings);
      const now = new Date().toISOString();
      setLastBackupTime(now);
      StorageService.setLastBackupTime(now);
    }
    return res;
  }, []);

  const resetAllData = useCallback(() => {
    StorageService.resetToDefaults();
    setProducts(StorageService.getProducts());
    setSessions(StorageService.getSessions());
    setReaderState(StorageService.getReaderState());
    setAppSettings(StorageService.getAppSettings());
    setLastBackupTime(null);
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
    checkEpcAssignment,
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
    resetDatabaseToMock: resetAllData,

    // Phase 6
    exportProducts,
    exportInventorySession,
    exportBackup,
    restoreBackup,
    lastBackupTime,
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
