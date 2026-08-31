import React from 'react';
import { Radio, BatteryMedium, AlertCircle, RefreshCw } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';

interface ReaderStatusBadgeProps {
  compact?: boolean;
  onConnectClick?: () => void;
}

export const ReaderStatusBadge: React.FC<ReaderStatusBadgeProps> = ({ compact = false, onConnectClick }) => {
  const { readerState, connectReader, navigateTo } = useRFID();

  const handleConnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onConnectClick) {
      onConnectClick();
    } else {
      connectReader();
    }
  };

  if (compact) {
    if (readerState.connected) {
      return (
        <button
          onClick={() => navigateTo('reader_connection')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-100 border border-green-400/40 text-xs font-bold shadow-xs hover:bg-green-500/30 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="tracking-wide">H103</span>
          <span className="text-indigo-300 font-mono text-[11px]">|</span>
          <span className="text-green-200 font-mono text-[11px] flex items-center gap-0.5">
            <BatteryMedium className="w-3 h-3 text-green-300" />
            {readerState.battery}%
          </span>
        </button>
      );
    } else {
      return (
        <button
          onClick={handleConnect}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-100 border border-red-400/40 text-xs font-bold shadow-xs hover:bg-red-500/30 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          <span>Offline</span>
          <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">LINK</span>
        </button>
      );
    }
  }

  // Full banner mode (used on Dashboard & Header sections)
  return (
    <div
      onClick={() => navigateTo('reader_connection')}
      className={`w-full rounded-2xl p-4 border transition-all cursor-pointer select-none flex items-center justify-between shadow-md ${
        readerState.connected
          ? 'bg-[#1a237e] text-white border-indigo-700/80 shadow-indigo-950/20'
          : 'bg-[#1e293b] text-white border-slate-700 shadow-slate-900/30'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            readerState.connected
              ? 'bg-white/15 text-indigo-100 border border-white/20'
              : 'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}
        >
          <Radio className={`w-5 h-5 ${readerState.connected ? 'animate-pulse' : ''}`} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-tight">H103 UHF Reader</span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                readerState.connected
                  ? 'bg-green-500/20 text-green-200 border border-green-400/30'
                  : 'bg-red-500/20 text-red-200 border border-red-500/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  readerState.connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}
              />
              {readerState.connected ? 'H103 Connected' : 'Disconnected'}
            </span>
          </div>

          <p className="text-xs text-indigo-200 font-mono mt-1 flex items-center gap-2">
            {readerState.connected ? (
              <>
                <span>Dev: {readerState.deviceName}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-green-300 font-bold">
                  <BatteryMedium className="w-3.5 h-3.5" />
                  {readerState.battery}%
                </span>
                <span>•</span>
                <span>{readerState.rfPower} dBm</span>
              </>
            ) : (
              <span className="text-slate-300 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Sled offline — Tap to scan & pair
              </span>
            )}
          </p>
        </div>
      </div>

      <div>
        {readerState.connected ? (
          <div className="flex flex-col items-end bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
            <span className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">CONFIG</span>
            <span className="text-xs font-mono font-bold text-white">{readerState.rfRegion.split(' ')[0]}</span>
          </div>
        ) : (
          <button
            id="btn-quick-connect-reader"
            onClick={handleConnect}
            disabled={readerState.connecting}
            className="px-3.5 py-2 bg-[#3f51b5] hover:bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 flex items-center gap-1.5 transition-all"
          >
            {readerState.connecting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>LINKING...</span>
              </>
            ) : (
              <span>CONNECT</span>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
