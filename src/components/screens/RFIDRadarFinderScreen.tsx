import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  CheckCircle2,
  Clock,
  Square,
  Search,
  Tag,
  MapPin,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Boxes,
  X,
  ChevronDown,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { soundManager } from '../../utils/audio';
import { productFinderManager, FinderState } from '../../core/finder/ProductFinderManager';
import { Product } from '../../types/rfid';

export const RFIDRadarFinderScreen: React.FC = () => {
  const {
    finderTarget,
    screenParams,
    goBack,
    products,
    appSettings,
  } = useRFID();

  // Local state synced from productFinderManager
  const [finderState, setFinderState] = useState<FinderState>(productFinderManager.getState());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(appSettings.audioFeedback ?? true);

  // Product search/picker modal state
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // Initial target product from route params or context
  useEffect(() => {
    const initialProduct: Product | undefined =
      screenParams?.product ||
      finderTarget?.product ||
      products.find(p => p.epcList.length > 0) ||
      products[0];

    const initialEpc: string = screenParams?.epc || 'ALL';

    if (initialProduct) {
      productFinderManager.setProduct(initialProduct, initialEpc);
      // Auto-start finding when navigating into screen
      productFinderManager.startFinding();
    }

    return () => {
      // Unsubscribe HID listener when navigating away, without disconnecting reader
      productFinderManager.stopFinding();
    };
  }, []);

  // Subscribe to productFinderManager state updates
  useEffect(() => {
    let prevDetectionCount = finderState.detectionCount;

    const unsubscribe = productFinderManager.subscribe((newState: FinderState) => {
      setFinderState(newState);

      // Play audio and vibration feedback on newly detected match
      if (newState.detectionCount > prevDetectionCount) {
        prevDetectionCount = newState.detectionCount;
        if (soundEnabled) {
          soundManager.playSuccessChime();
          soundManager.triggerHaptic(60);
        }
      }
    });

    return () => unsubscribe();
  }, [soundEnabled]);

  const {
    targetProduct,
    selectedSpecificEpc,
    targetEpcs,
    status,
    matchedEpc,
    detectionCount,
    lastDetectedTime,
    otherDetectedTags,
  } = finderState;

  const formatTime = (ts: number | null): string => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  // Filtered products for quick in-screen picker
  const filteredProducts = useMemo(() => {
    if (!pickerSearchQuery.trim()) return products;
    const q = pickerSearchQuery.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.epcList.some(e => e.toLowerCase().includes(q))
    );
  }, [products, pickerSearchQuery]);

  const handleSelectProduct = (prod: Product) => {
    productFinderManager.setProduct(prod, 'ALL');
    productFinderManager.startFinding();
    setIsProductPickerOpen(false);
    setPickerSearchQuery('');
  };

  const handleStartFinding = () => {
    productFinderManager.startFinding();
  };

  const handleStopFinding = () => {
    productFinderManager.stopFinding();
  };

  const handleReset = () => {
    productFinderManager.resetDetection();
  };

  const isFound = status === 'FOUND';
  const isFinding = status === 'FINDING';
  const isStopped = status === 'STOPPED';

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] text-slate-900 select-none overflow-y-auto no-scrollbar pb-24">
      {/* Top Header */}
      <AndroidTopBar
        title="Product Finder"
        subtitle="H103 Bluetooth HID RFID Locator"
        showReaderChip={false}
      />

      <div className="p-4 space-y-4">
        {/* TARGET PRODUCT CARD */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#3f51b5] flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Target Product
            </span>

            <div className="flex items-center gap-2">
              <button
                id="btn-finder-sound-toggle"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-slate-400 hover:text-slate-700 p-1"
                title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#3f51b5]" /> : <VolumeX className="w-4 h-4" />}
              </button>

              <button
                id="btn-finder-change-product"
                onClick={() => setIsProductPickerOpen(true)}
                className="text-xs font-bold text-[#3f51b5] hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Change Target</span>
              </button>
            </div>
          </div>

          {targetProduct ? (
            <div>
              <h2 className="text-base font-black text-slate-900 leading-tight">
                {targetProduct.name}
              </h2>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                <span>SKU: <b className="text-slate-800">{targetProduct.sku}</b></span>
                {targetProduct.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-sans text-slate-600">
                      <MapPin className="w-3 h-3 text-[#3f51b5]" />
                      {targetProduct.location}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="font-sans font-bold text-slate-700">
                  {targetProduct.epcList.length} Registered RFID Tag{targetProduct.epcList.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 font-medium">
              No product selected. Click "Change Target" to choose an item.
            </div>
          )}

          {/* Multiple EPC Target Filter Buttons (if product has multiple EPCs) */}
          {targetProduct && targetProduct.epcList.length > 1 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Target EPC Filter:</span>
                <span className="text-indigo-600 font-sans font-semibold">Match ANY or select specific</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  id="btn-target-epc-all"
                  onClick={() => productFinderManager.setSpecificTargetEpc('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                    selectedSpecificEpc === 'ALL'
                      ? 'bg-[#3f51b5] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ANY ({targetProduct.epcList.length})
                </button>

                {targetProduct.epcList.map(epc => (
                  <button
                    key={epc}
                    type="button"
                    id={`btn-target-epc-${epc.slice(-6)}`}
                    onClick={() => productFinderManager.setSpecificTargetEpc(epc)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedSpecificEpc === epc
                        ? 'bg-[#3f51b5] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ...{epc.slice(-6)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* STATUS BANNER */}
        <div
          id="finder-status-banner"
          className={`rounded-2xl p-6 border text-center transition-all ${
            isFound
              ? 'bg-emerald-950 text-white border-emerald-500 shadow-lg shadow-emerald-900/30 ring-2 ring-emerald-500/50'
              : isFinding
              ? 'bg-indigo-950 text-white border-indigo-700 shadow-md'
              : 'bg-slate-900 text-white border-slate-800 shadow-sm'
          }`}
        >
          <div className="flex justify-center mb-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                isFound
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-bounce'
                  : isFinding
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {isFound ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              ) : (
                <Radio className="w-8 h-8 text-indigo-400" />
              )}
            </div>
          </div>

          <div
            id="lbl-finder-status-badge"
            className={`text-xl font-black uppercase tracking-wider ${
              isFound
                ? 'text-emerald-300'
                : isFinding
                ? 'text-indigo-300'
                : 'text-slate-400'
            }`}
          >
            {isFound
              ? 'PRODUCT FOUND'
              : isFinding
              ? 'FINDING...'
              : isStopped
              ? 'FINDING STOPPED'
              : 'READY TO FIND'}
          </div>

          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto font-sans leading-relaxed">
            {isFound
              ? 'Physical tag match confirmed with H103 reader.'
              : isFinding
              ? 'Press physical H103 trigger to scan. Audio chime will sound when target EPC matches.'
              : isStopped
              ? 'Scanner listener paused. Click "Start Finding" to resume.'
              : 'Click "Start Finding" and pull H103 trigger to locate.'}
          </p>

          {/* Matched EPC info block when FOUND */}
          {matchedEpc && (
            <div className="mt-4 p-3 bg-black/50 rounded-xl border border-emerald-500/50 text-left font-mono">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-emerald-400 font-sans">
                <span>Matched RFID EPC</span>
                <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">CONFIRMED</span>
              </div>
              <div id="lbl-finder-matched-epc" className="font-black text-white text-sm break-all mt-1">
                {matchedEpc}
              </div>
            </div>
          )}
        </div>

        {/* COUNTER METRICS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Detection Count</div>
            <div
              id="lbl-finder-detection-count"
              className={`font-mono font-black text-3xl mt-1 ${
                detectionCount > 0 ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {detectionCount}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Last Detected</div>
            <div
              id="lbl-finder-last-detected"
              className="font-mono font-black text-base text-slate-800 mt-2.5 flex items-center justify-center gap-1.5"
            >
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{formatTime(lastDetectedTime)}</span>
            </div>
          </div>
        </div>

        {/* CONTROL BUTTONS (TASK 8) */}
        <div className="space-y-2 pt-1">
          {isFinding || isFound ? (
            <button
              id="btn-stop-finding"
              onClick={handleStopFinding}
              className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:translate-y-0.5 transition-all"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>STOP FINDING</span>
            </button>
          ) : (
            <button
              id="btn-start-finding"
              onClick={handleStartFinding}
              disabled={!targetProduct || targetEpcs.size === 0}
              className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-950 active:translate-y-0.5 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>START FINDING</span>
            </button>
          )}

          {detectionCount > 0 && (
            <button
              id="btn-reset-finding"
              onClick={handleReset}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Detection Count</span>
            </button>
          )}
        </div>

        {/* OTHER TAGS DETECTED (TASK 7 NON-TARGET DEBUG SECTION) */}
        {otherDetectedTags.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-600">Other Tags Detected</span>
              <span className="text-[10px] font-mono text-slate-400">Non-target ({otherDetectedTags.length})</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-32 overflow-y-auto font-mono text-xs">
              {otherDetectedTags.map((t, idx) => (
                <div key={idx} className="p-2 px-3 flex items-center justify-between text-slate-600">
                  <span className="truncate max-w-[240px]">{t.epc}</span>
                  <span className="text-slate-400 text-[10px] shrink-0">{formatTime(t.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PRODUCT PICKER MODAL */}
      {isProductPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Select Target Product</h3>
                <p className="text-xs text-slate-500">Choose a product from catalog to locate</p>
              </div>
              <button
                onClick={() => setIsProductPickerOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pickerSearchQuery}
                  onChange={e => setPickerSearchQuery(e.target.value)}
                  placeholder="Search products, SKU, or EPC..."
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-[#3f51b5]"
                />
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-2 max-h-[50vh]">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No matching products found.
                </div>
              ) : (
                filteredProducts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectProduct(p)}
                    className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all ${
                      targetProduct?.id === p.id
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-slate-900">{p.name}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        SKU: {p.sku} • {p.epcList.length} Tag{p.epcList.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <span className="px-2 py-1 bg-[#3f51b5] text-white text-[10px] font-bold rounded-lg shrink-0">
                      SELECT
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
