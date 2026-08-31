import React, { useState, useMemo } from 'react';
import {
  Play,
  Square,
  Search,
  BatteryMedium,
  Radio,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  PackagePlus,
  Signal,
  Check,
  Flag,
  ArrowRight
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { TagStatus } from '../../types/rfid';

export const LiveInventoryScreen: React.FC = () => {
  const {
    activeSession,
    isScanning,
    toggleScanning,
    finishInventorySession,
    cancelInventorySession,
    readerState,
    connectReader
  } = useRFID();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | TagStatus>('ALL');

  // Fallback demo session if accessed directly without setup
  const session = activeSession || {
    id: 'demo-live-session',
    name: 'Warehouse A - August Count',
    location: 'Warehouse A (All Zones)',
    startTime: new Date().toISOString(),
    durationSeconds: 1122,
    expectedCount: 1297,
    foundCount: 1284,
    missingCount: 13,
    extraCount: 8,
    unknownCount: 5,
    totalReads: 18432,
    status: 'IN_PROGRESS' as const,
    scannedTags: [
      {
        epc: 'E280116060000123',
        rssi: -48,
        readCount: 27,
        firstSeen: '10:03:12',
        lastSeen: '10:19:44',
        productName: 'Dell Wireless Keyboard KB500',
        sku: 'KB-001',
        location: 'Warehouse A / Rack A03',
        status: 'FOUND' as const
      },
      {
        epc: 'E280116060000456',
        rssi: -54,
        readCount: 19,
        firstSeen: '10:04:05',
        lastSeen: '10:18:10',
        productName: 'Logitech MX Master 3S Mouse',
        sku: 'MS-002',
        location: 'Warehouse A / Rack A04',
        status: 'FOUND' as const
      },
      {
        epc: 'E280116060000789',
        rssi: -42,
        readCount: 38,
        firstSeen: '10:05:22',
        lastSeen: '10:20:01',
        productName: 'Zebra TC21 Touch Mobile Computer',
        sku: 'ZEB-003',
        location: 'Warehouse A / Shelf S-12',
        status: 'FOUND' as const
      },
      {
        epc: 'E280116060000888',
        rssi: -72,
        readCount: 8,
        firstSeen: '10:12:00',
        lastSeen: '10:16:30',
        status: 'EXTRA' as const
      },
      {
        epc: 'E280116060000999',
        rssi: -52,
        readCount: 15,
        firstSeen: '10:14:14',
        lastSeen: '10:17:05',
        status: 'UNKNOWN' as const
      },
      {
        epc: 'E280116060000126',
        rssi: -99,
        readCount: 0,
        firstSeen: '-',
        lastSeen: '-',
        productName: 'Dell Wireless Keyboard KB500',
        sku: 'KB-001',
        location: 'Warehouse A / Rack A03',
        status: 'MISSING' as const
      }
    ]
  };

  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Filtered tag list
  const filteredTags = useMemo(() => {
    return session.scannedTags.filter(tag => {
      // Filter status
      if (activeFilter !== 'ALL' && tag.status !== activeFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEpc = tag.epc.toLowerCase().includes(q);
        const matchName = tag.productName?.toLowerCase().includes(q);
        const matchSku = tag.sku?.toLowerCase().includes(q);
        return matchEpc || matchName || matchSku;
      }
      return true;
    });
  }, [session.scannedTags, activeFilter, searchQuery]);

  const uniqueTagsCount = session.scannedTags.filter(t => t.status !== 'MISSING').length;

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] text-slate-900 select-none overflow-hidden pb-20">
      {/* 1. TOP SECTION: Session & H103 Status Bar */}
      <div className="bg-[#1a237e] text-white px-4 py-3 shadow-md flex items-center justify-between shrink-0">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-200">
            Active Inventory Audit
          </span>
          <h2 className="text-sm font-black text-white truncate max-w-[200px]">
            {session.name}
          </h2>
          <p className="text-[11px] text-indigo-200/80 truncate">{session.location}</p>
        </div>

        <div className="flex items-center gap-2">
          {readerState.connected ? (
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/20 border border-green-400/30 text-[11px] font-bold text-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                H103 Connected
              </span>
              <span className="text-[10px] text-indigo-200 font-mono flex items-center gap-1 mt-0.5">
                <BatteryMedium className="w-3 h-3 text-green-300" />
                {readerState.battery}% • {readerState.rfPower} dBm
              </span>
            </div>
          ) : (
            <button
              onClick={connectReader}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-xs"
            >
              CONNECT
            </button>
          )}

          <button
            onClick={finishInventorySession}
            className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 transition-colors"
          >
            FINISH
          </button>
        </div>
      </div>

      {/* 2. HUGE CENTRAL COUNTER & SCAN METRICS (Card aesthetic from Professional Polish theme) */}
      <div className="bg-white m-3 rounded-2xl border border-slate-300 shadow-md overflow-hidden shrink-0 relative">
        {isScanning && (
          <div className="absolute top-3 left-3 flex items-center space-x-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Live Scanning</span>
          </div>
        )}

        <div className="pt-8 pb-4 px-4 text-center border-b border-slate-100 bg-slate-50/60">
          <div className="text-slate-400 text-xs font-black uppercase tracking-widest mb-0.5">
            Unique Tags Found
          </div>
          <div
            id="lbl-live-unique-counter"
            className="text-6xl font-black text-slate-900 tracking-tighter my-0.5"
          >
            {uniqueTagsCount.toLocaleString()}
          </div>
          
          <div className="mt-2 flex justify-center items-center space-x-4">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Total Reads</div>
              <div className="text-xs font-mono font-black text-slate-800">{session.totalReads.toLocaleString()}</div>
            </div>
            <div className="w-[1px] h-6 bg-slate-200" />
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Elapsed</div>
              <div className="text-xs font-mono font-black text-slate-800">{formatElapsed(session.durationSeconds)}</div>
            </div>
          </div>
        </div>

        {/* 3. SUMMARY CARDS: 4 METRIC STATUSES */}
        <div className="grid grid-cols-4 gap-[1px] bg-slate-200">
          {/* FOUND */}
          <button
            onClick={() => setActiveFilter('FOUND')}
            className={`p-2.5 flex flex-col items-center transition-all ${
              activeFilter === 'FOUND' ? 'bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500 inset-0' : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">FOUND</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">{session.foundCount}</div>
          </button>

          {/* MISSING */}
          <button
            onClick={() => setActiveFilter('MISSING')}
            className={`p-2.5 flex flex-col items-center transition-all ${
              activeFilter === 'MISSING' ? 'bg-red-50 text-red-950 font-bold ring-2 ring-red-500 inset-0' : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">MISSING</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">{session.missingCount}</div>
          </button>

          {/* EXTRA */}
          <button
            onClick={() => setActiveFilter('EXTRA')}
            className={`p-2.5 flex flex-col items-center transition-all ${
              activeFilter === 'EXTRA' ? 'bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500 inset-0' : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">EXTRA</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">{session.extraCount}</div>
          </button>

          {/* UNKNOWN */}
          <button
            onClick={() => setActiveFilter('UNKNOWN')}
            className={`p-2.5 flex flex-col items-center transition-all ${
              activeFilter === 'UNKNOWN' ? 'bg-slate-100 text-slate-950 font-bold ring-2 ring-slate-400 inset-0' : 'bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">UNKNOWN</span>
            </div>
            <div className="text-base font-black text-slate-900 mt-0.5">{session.unknownCount}</div>
          </button>
        </div>
      </div>

      {/* 4. SEARCH & FILTER CHIPS */}
      <div className="px-3 py-2 space-y-2 shrink-0">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search EPC / SKU / Product..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#3f51b5] font-medium shadow-2xs"
          />
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {(['ALL', 'FOUND', 'MISSING', 'EXTRA', 'UNKNOWN'] as const).map(chip => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                activeFilter === chip
                  ? 'bg-[#3f51b5] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* 5. SCROLLING LIST OF DETECTED TAGS */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-2">
        {filteredTags.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium">
            No tags match the current filter or search criteria.
          </div>
        ) : (
          filteredTags.map(tag => {
            const isFound = tag.status === 'FOUND';
            const isMissing = tag.status === 'MISSING';
            const isExtra = tag.status === 'EXTRA';

            return (
              <div
                key={tag.epc}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all space-y-1.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 truncate max-w-[220px]">
                      {tag.productName || 'Unassigned / Extra Item'}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-500">
                      SKU: <span className="text-[#3f51b5] font-bold">{tag.sku || 'N/A'}</span>
                      {tag.location && <span> • {tag.location}</span>}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase font-sans ${
                      isFound
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : isMissing
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : isExtra
                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {tag.status}
                  </span>
                </div>

                {/* EPC Row */}
                <div className="font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 select-text break-all">
                  {tag.epc}
                </div>

                {/* Signal & Read stats */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <Signal
                      className={`w-3.5 h-3.5 ${
                        tag.rssi > -60 ? 'text-emerald-600' : tag.rssi > -80 ? 'text-amber-600' : 'text-slate-400'
                      }`}
                    />
                    <span>Signal: <b className="text-[#3f51b5]">{tag.rssi} dBm</b></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-700 font-bold">{tag.readCount} reads</span>
                    <span>•</span>
                    <span>Last: {tag.lastSeen}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. PRIMARY SCANNING CONTROL & TRIGGER BANNER */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-1.5">
        <button
          id="btn-live-scan-toggle"
          onClick={toggleScanning}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${
            isScanning
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30 animate-pulse'
              : 'bg-[#3f51b5] hover:bg-indigo-600 text-white shadow-indigo-900/30'
          }`}
        >
          {isScanning ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>STOP SCANNING</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>START SCANNING</span>
            </>
          )}
        </button>

        <div className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">
          OR PRESS H103 TRIGGER BUTTON
        </div>
      </div>
    </div>
  );
};
