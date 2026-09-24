import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { soundManager } from '../../utils/audio';
import { hidScannerService } from '../../core/hid/HidScannerService';
import { HidScanEvent } from '../../core/hid/HidScanEvent';
import { Product } from '../../types/rfid';

export const RFIDRadarFinderScreen: React.FC = () => {
  const {
    finderTarget,
    screenParams,
    goBack,
    products,
  } = useRFID();

  // Target product and EPC from params or context
  const targetProduct: Product =
    screenParams?.product ||
    finderTarget?.product ||
    products[0] || {
      id: 'prod-target',
      name: 'Dell Wireless Keyboard KB500',
      sku: 'KB-001',
      barcode: '884116378',
      category: 'Peripherals',
      description: 'Standard office keyboard',
      location: 'Warehouse A / Rack A03',
      epcList: ['E280116060000123'],
      expectedQuantity: 1,
      unit: 'pcs',
      updatedAt: '',
    };

  const initialEpc = screenParams?.epc || finderTarget?.epc || (targetProduct.epcList[0] || 'ANY');
  const [selectedTargetEpc, setSelectedTargetEpc] = useState<string>(initialEpc);

  // Finder states: 'WAITING' | 'DETECTED' | 'REPEATED_DETECTION' | 'FOUND'
  const [finderStatus, setFinderStatus] = useState<'WAITING' | 'DETECTED' | 'REPEATED_DETECTION' | 'FOUND'>('WAITING');
  const [detectionCount, setDetectionCount] = useState<number>(0);
  const [lastDetectedTime, setLastDetectedTime] = useState<number | null>(null);
  const [matchedEpc, setMatchedEpc] = useState<string | null>(null);
  const [recentDetections, setRecentDetections] = useState<Array<{ epc: string; timestamp: number }>>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const targetEpcRef = useRef(selectedTargetEpc);
  targetEpcRef.current = selectedTargetEpc;

  const productEpcsRef = useRef<string[]>(targetProduct.epcList || []);
  productEpcsRef.current = targetProduct.epcList || [];

  // Central HID scanner subscription for target EPC detection
  useEffect(() => {
    hidScannerService.start();

    const unsubscribe = hidScannerService.subscribe((event: HidScanEvent) => {
      if (!event.valid || !event.value) return;

      const scannedEpc = event.value.trim().toUpperCase();
      const currentTarget = targetEpcRef.current.trim().toUpperCase();
      const allowedEpcs = productEpcsRef.current.map(e => e.trim().toUpperCase());

      let isMatch = false;

      if (currentTarget === 'ANY' || currentTarget === '') {
        // Match ANY associated product EPC
        isMatch = allowedEpcs.includes(scannedEpc);
      } else {
        // Match specific targeted EPC
        isMatch = scannedEpc === currentTarget;
      }

      if (isMatch) {
        const now = event.timestamp || Date.now();
        setMatchedEpc(scannedEpc);
        setLastDetectedTime(now);
        setRecentDetections(prev => [{ epc: scannedEpc, timestamp: now }, ...prev].slice(0, 10));

        setDetectionCount(prev => {
          const newCount = prev + 1;
          if (newCount === 1) {
            setFinderStatus('DETECTED');
          } else {
            setFinderStatus('REPEATED_DETECTION');
          }
          return newCount;
        });

        // Acoustic & haptic feedback
        if (soundRef.current) {
          soundManager.playSuccessChime();
          soundManager.triggerHaptic(60);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleStopFinding = () => {
    goBack();
  };

  const formatTime = (ts: number | null): string => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  const isDetected = detectionCount > 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] text-slate-900 select-none overflow-y-auto no-scrollbar pb-24">
      {/* Top Header */}
      <AndroidTopBar
        title="Product Finder"
        subtitle="Target EPC Matcher"
        showReaderChip={false}
      />

      <div className="p-4 space-y-4">
        {/* TARGET PRODUCT CARD */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#3f51b5]">
              Target Product
            </span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-slate-700 p-1"
              title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#3f51b5]" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <h2 className="text-base font-black text-slate-900 leading-tight">
              {targetProduct.name}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
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
            </div>
          </div>

          {/* Multiple EPC Target Selector */}
          {targetProduct.epcList.length > 1 && (
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-slate-500 block">
                Target EPC Selection:
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTargetEpc('ANY')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all ${
                    selectedTargetEpc === 'ANY'
                      ? 'bg-[#3f51b5] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Find Any ({targetProduct.epcList.length} tags)
                </button>

                {targetProduct.epcList.map(tagEpc => (
                  <button
                    key={tagEpc}
                    type="button"
                    onClick={() => setSelectedTargetEpc(tagEpc)}
                    className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      selectedTargetEpc === tagEpc
                        ? 'bg-[#3f51b5] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ...{tagEpc.slice(-6)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* STATUS BANNER */}
        <div
          className={`rounded-2xl p-6 border text-center transition-all ${
            isDetected
              ? 'bg-emerald-950 text-white border-emerald-500 shadow-lg shadow-emerald-900/20'
              : 'bg-slate-900 text-white border-slate-800 shadow-md'
          }`}
        >
          <div className="flex justify-center mb-3">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center border-2 ${
                isDetected
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-bounce'
                  : 'bg-indigo-950 border-indigo-500 text-indigo-400'
              }`}
            >
              {isDetected ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              ) : (
                <Radio className="w-8 h-8 text-indigo-400 animate-pulse" />
              )}
            </div>
          </div>

          <div
            className={`text-lg font-black uppercase tracking-wider ${
              isDetected ? 'text-emerald-300' : 'text-slate-300'
            }`}
          >
            {isDetected
              ? finderStatus === 'REPEATED_DETECTION'
                ? 'TARGET DETECTED (REPEATED)'
                : 'TARGET DETECTED'
              : 'WAITING FOR TARGET'}
          </div>

          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-sans">
            {isDetected
              ? 'Physical tag match confirmed with H103 reader.'
              : 'Pull the H103 trigger. The reader will alert when the target EPC is detected.'}
          </p>

          {matchedEpc && (
            <div className="mt-4 p-2.5 bg-black/40 rounded-xl border border-emerald-500/40 text-xs font-mono">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block font-sans">
                Matched Target EPC
              </span>
              <span className="font-black text-white break-all">{matchedEpc}</span>
            </div>
          )}
        </div>

        {/* COUNTER METRICS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">Detection Count</div>
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
            <div className="text-[10px] font-bold text-slate-500 uppercase">Last Detection</div>
            <div className="font-mono font-black text-base text-slate-800 mt-2.5 flex items-center justify-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{formatTime(lastDetectedTime)}</span>
            </div>
          </div>
        </div>

        {/* DETECTION ACTIVITY LOG */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black uppercase text-slate-700">Detection History</span>
            <span className="text-[10px] font-mono font-bold text-slate-500">
              {recentDetections.length} hits
            </span>
          </div>

          {recentDetections.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto font-mono text-xs">
              {recentDetections.map((hit, idx) => (
                <div key={idx} className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50">
                  <span className="font-bold text-slate-800 break-all">{hit.epc}</span>
                  <span className="text-slate-400 text-[11px] shrink-0 ml-2">
                    {formatTime(hit.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Target has not been detected yet.
            </div>
          )}
        </div>

        {/* STOP FINDING BUTTON */}
        <div className="pt-2">
          <button
            id="btn-stop-finding"
            onClick={handleStopFinding}
            className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:translate-y-0.5 transition-all"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>STOP FINDING</span>
          </button>
        </div>
      </div>
    </div>
  );
};
