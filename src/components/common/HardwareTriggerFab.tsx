import React from 'react';
import { Radio, Zap } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';

export const HardwareTriggerFab: React.FC = () => {
  const { isScanning, currentScreen, simulatePhysicalTrigger, readerState } = useRFID();

  // Hide trigger on screens where scanning is not appropriate
  const supportedScreens = [
    'dashboard',
    'live_inventory',
    'quick_scan',
    'find_radar',
    'reader_settings',
    'add_edit_product'
  ];

  if (!supportedScreens.includes(currentScreen)) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-1.5 pointer-events-auto select-none">
      {/* Sled physical trigger hardware simulation button */}
      <button
        id="btn-h103-physical-trigger"
        onClick={simulatePhysicalTrigger}
        disabled={!readerState.connected}
        className={`group relative flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full shadow-2xl transition-all transform active:scale-95 border-2 ${
          !readerState.connected
            ? 'bg-slate-700 text-slate-400 border-slate-600 opacity-60 cursor-not-allowed'
            : isScanning
            ? 'bg-red-600 text-white border-red-400 shadow-red-500/40 animate-pulse'
            : 'bg-[#1a237e] text-white border-indigo-500/60 hover:bg-[#121858] shadow-indigo-950/40'
        }`}
        title="H103 Physical Sled Trigger (or press Spacebar)"
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
            isScanning ? 'bg-red-800 text-white' : 'bg-[#3f51b5] text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
        </div>

        <div className="text-left leading-tight">
          <div className="text-[10px] uppercase font-black text-indigo-200 tracking-wider flex items-center gap-1">
            <span>H103 Trigger</span>
            <span className="bg-white/20 px-1 rounded text-[9px] font-mono text-white">Space</span>
          </div>
          <div className="text-xs font-black font-mono tracking-tight">
            {isScanning ? 'STOP TRIGGER' : 'PULL TRIGGER'}
          </div>
        </div>
      </button>
    </div>
  );
};
