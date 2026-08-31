import React, { useState, useEffect } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  Zap,
  BatteryMedium,
  Square,
  Sliders,
  Sparkles,
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { soundManager } from '../../utils/audio';

export const RFIDRadarFinderScreen: React.FC = () => {
  const {
    finderTarget,
    finderProximity,
    finderRssi,
    setFinderProximityManual,
    isFinderSearching,
    toggleFinderSearch,
    goBack,
    readerState,
    appSettings,
    updateAppSettings
  } = useRFID();

  // Active product/EPC details
  const targetProduct = finderTarget?.product || {
    name: 'Dell Wireless Keyboard KB500',
    sku: 'KB-001',
    location: 'Warehouse A / Rack A03',
  };
  const targetEpc = finderTarget?.epc || 'E280116060000123';

  // Proximity status wording based on %
  const proximityStatus =
    finderProximity >= 75
      ? { text: 'VERY CLOSE', color: 'text-emerald-400', bg: 'bg-emerald-950/80 border-emerald-500' }
      : finderProximity >= 40
      ? { text: 'GETTING CLOSER', color: 'text-amber-300', bg: 'bg-amber-950/80 border-amber-500' }
      : { text: 'FAR', color: 'text-blue-300', bg: 'bg-slate-900 border-slate-700' };

  // Calculate meter blocks (20 characters representation)
  const totalBlocks = 20;
  const filledBlocks = Math.round((finderProximity / 100) * totalBlocks);
  const meterBarString = '█'.repeat(filledBlocks) + '░'.repeat(totalBlocks - filledBlocks);

  // When mounted, turn on finder search
  useEffect(() => {
    if (!isFinderSearching) {
      toggleFinderSearch();
    }
    return () => {
      // clean up on unmount
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setFinderProximityManual(val);
  };

  const handleStopFinding = () => {
    if (isFinderSearching) {
      toggleFinderSearch();
    }
    goBack();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] text-slate-900 select-none overflow-y-auto no-scrollbar pb-20">
      {/* Top Bar with Target Summary */}
      <div className="bg-[#1a237e] text-white p-4 shadow-md shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">
            Finding Product • UHF Radar
          </span>
          <div className="flex items-center gap-1.5 text-xs font-mono text-green-200">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>H103 Linked ({readerState.battery}%)</span>
          </div>
        </div>

        <div>
          <h2 className="text-base font-black text-white truncate">
            {targetProduct.name}
          </h2>
          <div className="flex items-center justify-between text-xs font-mono text-indigo-200 mt-0.5">
            <span>SKU: <b className="text-white">{targetProduct.sku}</b></span>
            <span>Target EPC: <b className="text-green-300">{targetEpc.slice(-8)}</b></span>
          </div>
        </div>
      </div>

      {/* Main Radar Proximity Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-3.5 space-y-3.5">
        {/* Radar Circular Visualization Card (Cockpit theme) */}
        <div className="w-full bg-[#1a1a1a] rounded-3xl p-6 relative flex flex-col items-center justify-center min-h-[290px] border border-slate-800 shadow-inner overflow-hidden">
          {/* Concentric distance rings */}
          <div className="absolute w-60 h-60 rounded-full border border-indigo-500/15 pointer-events-none" />
          <div className="absolute w-44 h-44 rounded-full border border-indigo-500/25 pointer-events-none" />
          <div className="absolute w-28 h-28 rounded-full border border-indigo-500/35 pointer-events-none" />

          {/* Dynamic Radar Sweep Beam */}
          {isFinderSearching && (
            <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none">
              <div className="w-1/2 h-1/2 bg-gradient-to-br from-indigo-500/30 to-transparent rounded-tl-full origin-bottom-right" />
            </div>
          )}

          {/* Proximity Pulse Ripples based on strength */}
          {isFinderSearching && finderProximity > 40 && (
            <div
              className={`absolute inset-4 rounded-full border-2 ${
                finderProximity > 75
                  ? 'border-emerald-500/60 animate-pulse-ripple-fast'
                  : 'border-amber-500/40 animate-pulse-ripple'
              }`}
            />
          )}

          {/* Center Display Node */}
          <div
            className={`relative w-40 h-40 rounded-full flex flex-col items-center justify-center text-center p-3 shadow-2xl border-2 transition-all duration-300 ${
              proximityStatus.bg
            } ${
              finderProximity > 75
                ? 'shadow-emerald-500/30 scale-105'
                : finderProximity > 40
                ? 'shadow-amber-500/20'
                : 'shadow-indigo-900/30'
            }`}
          >
            {/* Status Wording */}
            <div className={`text-base font-black tracking-tight ${proximityStatus.color}`}>
              {proximityStatus.text}
            </div>

            {/* RSSI Signal Display */}
            <div className="text-2xl font-mono font-extrabold text-white mt-0.5">
              {finderRssi} <span className="text-xs font-normal text-slate-400">dBm</span>
            </div>

            {/* Proximity Percentage */}
            <div className="text-xs font-mono font-bold text-slate-300 mt-0.5">
              {finderProximity}% Intensity
            </div>

            {/* Radio icon */}
            <Radio className={`w-4 h-4 mt-1 ${proximityStatus.color} animate-pulse`} />
          </div>
        </div>

        {/* Large Proximity Meter Bar */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-sm">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-500 font-bold uppercase">PROXIMITY METER</span>
            <span className="text-[#3f51b5] font-extrabold text-sm">{finderProximity}%</span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                finderProximity >= 75
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500'
                  : finderProximity >= 40
                  ? 'bg-gradient-to-r from-[#3f51b5] to-amber-500'
                  : 'bg-[#3f51b5]'
              }`}
              style={{ width: `${finderProximity}%` }}
            />
          </div>

          {/* Feedback buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={() => updateAppSettings({ audioFeedback: !appSettings.audioFeedback })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-colors ${
                appSettings.audioFeedback
                  ? 'bg-indigo-50 text-[#3f51b5] border-indigo-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              {appSettings.audioFeedback ? <Volume2 className="w-3.5 h-3.5 text-[#3f51b5]" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Audio: {appSettings.audioFeedback ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => updateAppSettings({ vibrationFeedback: !appSettings.vibrationFeedback })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold transition-colors ${
                appSettings.vibrationFeedback
                  ? 'bg-indigo-50 text-[#3f51b5] border-indigo-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${appSettings.vibrationFeedback ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>Vibration: {appSettings.vibrationFeedback ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Proximity Simulator Slider (For Testing & Verification) */}
        <div className="w-full bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5 shadow-xs">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#3f51b5]" />
              <span>Simulate Sled Signal Movement</span>
            </span>
            <span className="font-mono text-[#3f51b5] font-black">{finderProximity}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={finderProximity}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3f51b5]"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Far (-95 dBm)</span>
            <span>Mid (-65 dBm)</span>
            <span>Close (-35 dBm)</span>
          </div>
        </div>

        {/* Physical Guidance Note */}
        <div className="text-center space-y-0.5">
          <p className="text-xs text-slate-500 font-medium">
            "Move the reader slowly around the area."
          </p>
          <p className="text-[11px] text-slate-400">
            "Signal strength increases as you approach the tag."
          </p>
        </div>
      </div>

      {/* Primary Bottom Action: STOP FINDING */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <button
          id="btn-stop-finding"
          onClick={handleStopFinding}
          className="w-full py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>STOP FINDING</span>
        </button>
      </div>
    </div>
  );
};
