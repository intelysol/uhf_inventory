import React, { useState, useEffect, useMemo } from 'react';
import {
  Square,
  Search,
  Radio,
  Clock,
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { InventoryTag } from '../../core/inventory/InventoryTypes';
import { inventoryManager } from '../../core/inventory/InventoryManager';
import { hidScannerService } from '../../core/hid/HidScannerService';

export const LiveInventoryScreen: React.FC = () => {
  const {
    activeSession,
    finishInventorySession,
    cancelInventorySession,
    navigateTo,
  } = useRFID();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'FOUND' | 'EXTRA' | 'UNKNOWN'>('ALL');
  const [latestScan, setLatestScan] = useState<{ epc: string; readCount: number; lastSeen: number } | null>(
    inventoryManager.getLatestScan()
  );

  useEffect(() => {
    const unsub = inventoryManager.subscribeLatestScan(scan => {
      setLatestScan(scan);
    });
    return () => unsub();
  }, []);

  const formatElapsed = (seconds: number = 0) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (ts: number): string => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  const session = activeSession;

  // Filtered tags memo
  const tagsList: InventoryTag[] = session ? session.tags || session.scannedTags || [] : [];

  const filteredTags = useMemo(() => {
    return tagsList.filter(tag => {
      if (activeFilter !== 'ALL' && tag.status !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEpc = tag.epc.toLowerCase().includes(q);
        const matchName = tag.productName?.toLowerCase().includes(q);
        const matchSku = tag.sku?.toLowerCase().includes(q);
        return matchEpc || matchName || matchSku;
      }
      return true;
    });
  }, [tagsList, activeFilter, searchQuery]);

  if (!session) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f2f5] p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mb-4">
          <Radio className="w-8 h-8" />
        </div>
        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
          No Active Inventory Session
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Start a new inventory audit session to begin collecting RFID tags from the H103 reader.
        </p>
        <button
          onClick={() => navigateTo('start_inventory')}
          className="mt-5 px-6 py-3 bg-[#3f51b5] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
        >
          START NEW INVENTORY
        </button>
      </div>
    );
  }

  const isHidActive = hidScannerService.isRunning();
  const isExpectedMode = (session.expectedCount || 0) > 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] text-slate-900 select-none overflow-hidden pb-20">
      {/* 1. TOP HEADER SECTION */}
      <div className="bg-[#1a237e] text-white px-4 py-3 shadow-md flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">
              LIVE INVENTORY AUDIT
            </span>
            {isExpectedMode ? (
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-800 text-indigo-200">
                AUDIT MODE
              </span>
            ) : (
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-200">
                BLIND COUNT
              </span>
            )}
          </div>
          <h2 className="text-sm font-black text-white truncate">{session.name}</h2>
          <p className="text-[11px] text-indigo-200/90 truncate">{session.location || 'Warehouse Zone'}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex flex-col items-end">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-black text-emerald-200 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isHidActive ? 'HID READY' : 'HID IDLE'}</span>
            </div>
            <span className="text-[9px] text-indigo-200 font-mono mt-0.5">
              WAITING FOR RFID
            </span>
          </div>

          <button
            id="btn-live-finish-top"
            onClick={finishInventorySession}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            STOP
          </button>
        </div>
      </div>

      {/* 2. CENTRAL COUNTERS & METRICS */}
      <div className="bg-white m-3 rounded-2xl border border-slate-300 shadow-md overflow-hidden shrink-0 relative">
        <div className="pt-4 pb-3 px-3 border-b border-slate-100 bg-slate-50/70">
          {/* Main Counters Row */}
          {isExpectedMode ? (
            <div>
              {/* 5-Column Grid for Expected Inventory */}
              <div className="grid grid-cols-5 gap-1.5 text-center mb-3">
                <div className="bg-slate-100/80 p-2 rounded-xl border border-slate-200">
                  <div className="text-[9px] text-slate-500 font-bold uppercase truncate">EXPECTED</div>
                  <div className="text-base font-black font-mono text-slate-800 mt-0.5">
                    {(session.expectedCount || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-emerald-900">
                  <div className="text-[9px] text-emerald-700 font-bold uppercase truncate">FOUND</div>
                  <div className="text-base font-black font-mono text-emerald-700 mt-0.5">
                    {(session.foundCount || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-red-50 p-2 rounded-xl border border-red-200 text-red-900">
                  <div className="text-[9px] text-red-700 font-bold uppercase truncate">MISSING</div>
                  <div className="text-base font-black font-mono text-red-700 mt-0.5">
                    {(session.missingCount ?? Math.max(0, (session.expectedCount || 0) - (session.foundCount || 0))).toLocaleString()}
                  </div>
                </div>

                <div className="bg-blue-50 p-2 rounded-xl border border-blue-200 text-blue-900">
                  <div className="text-[9px] text-blue-700 font-bold uppercase truncate">EXTRA</div>
                  <div className="text-base font-black font-mono text-blue-700 mt-0.5">
                    {(session.extraCount || 0).toLocaleString()}
                  </div>
                </div>

                <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-900">
                  <div className="text-[9px] text-amber-700 font-bold uppercase truncate">UNKNOWN</div>
                  <div className="text-base font-black font-mono text-amber-700 mt-0.5">
                    {(session.unknownCount || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Secondary Stats Row */}
              <div className="flex justify-between items-center px-2 text-xs font-mono text-slate-600 border-t border-slate-200/60 pt-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">UNIQUE TAGS: </span>
                  <span className="font-black text-slate-900">{(session.uniqueTags || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">TOTAL READS: </span>
                  <span className="font-black text-[#3f51b5]">{(session.totalReads || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">TIME: </span>
                  <span className="font-black text-slate-800">{formatElapsed(session.durationSeconds)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-0.5">
                UNIQUE TAGS SCANNED
              </div>
              <div
                id="lbl-live-unique-counter"
                className="text-5xl font-black text-slate-900 tracking-tighter my-0.5"
              >
                {(session.uniqueTags || 0).toLocaleString()}
              </div>

              <div className="mt-2 flex justify-center items-center space-x-6">
                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">TOTAL READS</div>
                  <div className="text-sm font-mono font-black text-[#3f51b5]">
                    {(session.totalReads || 0).toLocaleString()}
                  </div>
                </div>

                <div className="w-[1px] h-6 bg-slate-200" />

                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">REGISTERED</div>
                  <div className="text-sm font-mono font-black text-emerald-600">
                    {(session.foundCount || 0).toLocaleString()}
                  </div>
                </div>

                <div className="w-[1px] h-6 bg-slate-200" />

                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">UNKNOWN</div>
                  <div className="text-sm font-mono font-black text-amber-600">
                    {(session.unknownCount || 0).toLocaleString()}
                  </div>
                </div>

                <div className="w-[1px] h-6 bg-slate-200" />

                <div className="text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">DURATION</div>
                  <div className="text-xs font-mono font-black text-slate-800">
                    {formatElapsed(session.durationSeconds)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. LATEST RFID TICKER */}
        <div className="p-3 bg-indigo-950 text-white flex items-center justify-between">
          <div className="min-w-0 pr-3 flex-1">
            <div className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LATEST RFID</span>
            </div>
            {latestScan ? (
              <div className="font-mono text-xs font-black text-white truncate select-all tracking-wide mt-0.5">
                {latestScan.epc}
              </div>
            ) : (
              <div className="text-xs text-indigo-200 font-medium italic mt-0.5">
                WAITING FOR RFID INPUT...
              </div>
            )}
          </div>

          {latestScan && (
            <div className="flex items-center gap-2 text-right shrink-0">
              <div className="bg-indigo-800/80 px-2 py-1 rounded-lg text-center border border-indigo-700/60">
                <div className="text-[8px] uppercase font-bold text-indigo-300">Reads</div>
                <div className="text-xs font-mono font-bold text-emerald-300">{latestScan.readCount}</div>
              </div>
              <div className="bg-indigo-800/80 px-2 py-1 rounded-lg text-center border border-indigo-700/60">
                <div className="text-[8px] uppercase font-bold text-indigo-300">Time</div>
                <div className="text-xs font-mono font-bold text-slate-200">{formatTime(latestScan.lastSeen)}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. SEARCH & STATUS FILTER CHIPS */}
      <div className="px-3 py-1.5 space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-live-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search EPC / SKU / Product..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3f51b5] font-medium shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {(isExpectedMode
            ? (['ALL', 'FOUND', 'EXTRA', 'UNKNOWN'] as const)
            : (['ALL', 'FOUND', 'UNKNOWN'] as const)
          ).map(chip => {
            const count =
              chip === 'ALL'
                ? session.uniqueTags || 0
                : chip === 'FOUND'
                ? session.foundCount || 0
                : chip === 'EXTRA'
                ? session.extraCount || 0
                : session.unknownCount || 0;

            return (
              <button
                key={chip}
                onClick={() => setActiveFilter(chip as any)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  activeFilter === chip
                    ? 'bg-[#3f51b5] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{chip}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    activeFilter === chip ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. UNIQUE TAGS LIST */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-2">
        {filteredTags.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-2">
            <Radio className="w-8 h-8 text-slate-300 mx-auto animate-pulse" />
            <div>
              {searchQuery ? 'No tags match the search query.' : 'No RFID tags detected yet.'}
            </div>
            <p className="text-[11px] text-slate-400">
              Press the physical trigger on the paired H103 reader to scan tags.
            </p>
          </div>
        ) : (
          filteredTags.map(tag => {
            return (
              <div
                key={tag.epc}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-black text-slate-900 truncate">
                      {tag.productName || 'Unassigned RFID Tag'}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      SKU: <span className="text-[#3f51b5] font-bold">{tag.sku || 'N/A'}</span>
                      {tag.location && <span> • {tag.location}</span>}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase font-sans shrink-0 ${
                      tag.status === 'FOUND'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : tag.status === 'EXTRA'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : tag.status === 'MISSING'
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {tag.status}
                  </span>
                </div>

                {/* EPC Row */}
                <div className="font-mono text-xs font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-200 select-text break-all">
                  {tag.epc}
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-0.5">
                  <div className="text-slate-800 font-bold">
                    <span className="text-[#3f51b5]">{tag.readCount}</span> reads
                  </div>

                  <div className="flex items-center gap-3 text-[10px]">
                    <span>First: {formatTime(tag.firstSeen)}</span>
                    <span>•</span>
                    <span>Last: {formatTime(tag.lastSeen)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. PRIMARY ACTION: STOP INVENTORY */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-1">
        <button
          id="btn-live-stop-inventory"
          onClick={finishInventorySession}
          className="w-full py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-md shadow-red-600/30 active:scale-95 transition-all"
        >
          <Square className="w-4 h-4 fill-white" />
          <span>STOP INVENTORY</span>
        </button>

        <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">
          PULL H103 TRIGGER TO SCAN TAGS
        </div>
      </div>
    </div>
  );
};
