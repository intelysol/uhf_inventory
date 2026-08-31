import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, Bluetooth, Radio } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';

export const AndroidStatusBar: React.FC = () => {
  const [timeStr, setTimeStr] = useState<string>('');
  const { readerState } = useRFID();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-[#121858] text-indigo-200 px-4 py-1.5 flex items-center justify-between text-xs font-mono select-none shrink-0 z-30 border-b border-indigo-950/40">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-white">{timeStr || '10:24'}</span>
        {readerState.connected && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-bold border border-emerald-400/30">
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            H103
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 text-indigo-200">
        <Bluetooth className={`w-3.5 h-3.5 ${readerState.connected ? 'text-indigo-300' : 'text-indigo-400/50'}`} />
        <Wifi className="w-3.5 h-3.5 text-indigo-200" />
        <div className="flex items-center gap-1 text-white bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
          <span>{readerState.battery}%</span>
          <BatteryMedium className="w-3 h-3 text-emerald-400" />
        </div>
      </div>
    </div>
  );
};
