import React, { useEffect } from 'react';
import { Radio, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';

export const SplashScreen: React.FC = () => {
  const { navigateTo } = useRFID();

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-8 bg-[#1a237e] text-white select-none">
      <div className="w-full flex justify-end">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[11px] font-mono text-indigo-100">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Offline Standalone
        </span>
      </div>

      <div className="flex flex-col items-center text-center space-y-6 max-w-xs">
        {/* UHF / RFID Signal Icon with pulse circles */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-32 h-32 rounded-full bg-white/5 animate-ping duration-1000" />
          <div className="absolute w-24 h-24 rounded-full bg-white/10 animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#3f51b5] flex items-center justify-center shadow-xl border border-indigo-300/30">
            <Radio className="w-10 h-10 text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-white font-sans uppercase">
            RFID Inventory
          </h1>
          <div className="flex items-center justify-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <span>Inventory</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
            <span>Locate</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
            <span>Export</span>
          </div>
        </div>

        <p className="text-xs text-indigo-100/80 leading-relaxed font-medium">
          High-performance standalone UHF RFID mobile client for <b className="text-white">H103 Bluetooth Sled Readers</b>.
        </p>
      </div>

      <div className="w-full space-y-3 max-w-xs">
        <button
          id="btn-splash-launch"
          onClick={() => navigateTo('dashboard')}
          className="w-full py-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-[#1a237e] rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg border-b-4 border-slate-300 active:translate-y-0.5 transition-all"
        >
          <span>ENTER DASHBOARD</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="text-center">
          <span className="text-[10px] text-indigo-200/60 font-mono">
            H103 BLE Protocol v3.1 • Zero Cloud Dependency
          </span>
        </div>
      </div>
    </div>
  );
};
