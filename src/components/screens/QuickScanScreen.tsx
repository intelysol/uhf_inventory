import React from 'react';
import {
  Zap,
  Play,
  Square,
  Trash2,
  Download,
  Radio,
  Signal,
  RotateCcw,
  Copy,
  Check
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import * as XLSX from 'xlsx';

export const QuickScanScreen: React.FC = () => {
  const {
    quickScanTags,
    clearQuickScan,
    isScanning,
    toggleScanning,
    readerState,
    connectReader
  } = useRFID();

  const [copiedEpc, setCopiedEpc] = React.useState<string | null>(null);

  // Demo fallback tags if empty
  const displayTags = quickScanTags.length > 0 ? quickScanTags : [
    {
      epc: 'E280116060000123',
      rssi: -48,
      readCount: 12,
      firstSeen: '10:14:02',
      lastSeen: '10:20:15',
      matchedProduct: { name: 'Dell Wireless Keyboard KB500', sku: 'KB-001' }
    },
    {
      epc: 'E280116060000456',
      rssi: -61,
      readCount: 8,
      firstSeen: '10:15:10',
      lastSeen: '10:19:40',
      matchedProduct: { name: 'Logitech MX Master 3S Mouse', sku: 'MS-002' }
    },
    {
      epc: 'E280116060000789',
      rssi: -42,
      readCount: 24,
      firstSeen: '10:15:45',
      lastSeen: '10:21:00',
      matchedProduct: { name: 'Zebra TC21 Touch Mobile Computer', sku: 'ZEB-003' }
    }
  ];

  const handleExportQuickScan = () => {
    const rows = displayTags.map(t => ({
      EPC: t.epc,
      'Signal (dBm)': t.rssi,
      'Read Count': t.readCount,
      'First Seen': t.firstSeen,
      'Last Seen': t.lastSeen,
      Product: t.matchedProduct?.name || 'Unassigned',
      SKU: t.matchedProduct?.sku || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quick_Scan_EPCs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleCopy = (epc: string) => {
    navigator.clipboard?.writeText(epc);
    setCopiedEpc(epc);
    setTimeout(() => setCopiedEpc(null), 1500);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-hidden select-none pb-20">
      <AndroidTopBar
        title="Quick Scan"
        subtitle="Raw EPC Stream"
        actions={
          <button
            onClick={clearQuickScan}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-indigo-200 hover:bg-white/15 transition-colors"
            title="Clear list"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        }
      />

      {/* Large Counter Banner */}
      <div className="bg-[#1a237e] text-white p-5 text-center shrink-0 space-y-1 shadow-md">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-200">
          TOTAL UNIQUE TAGS SCANNED
        </div>
        <div className="text-5xl font-black font-mono tracking-tight text-white">
          {displayTags.length}
        </div>
        <div className="text-xs text-indigo-200 font-mono">
          {isScanning ? (
            <span className="text-green-300 font-bold flex items-center justify-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Continuous EPC capture active
            </span>
          ) : (
            <span>H103 Ready • Press Trigger to scan</span>
          )}
        </div>
      </div>

      {/* Action Toolbar: CLEAR, EXPORT */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        <button
          onClick={clearQuickScan}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          <span>CLEAR</span>
        </button>

        <button
          onClick={handleExportQuickScan}
          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#3f51b5] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200"
        >
          <Download className="w-3.5 h-3.5 text-[#3f51b5]" />
          <span>EXPORT CSV</span>
        </button>
      </div>

      {/* Stream List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
        {displayTags.map(tag => (
          <div
            key={tag.epc}
            className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-1.5"
          >
            <div className="flex items-start justify-between">
              <div className="font-mono text-sm font-bold text-slate-900 select-text break-all">
                {tag.epc}
              </div>

              <button
                onClick={() => handleCopy(tag.epc)}
                className="w-7 h-7 -mr-1 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-slate-100"
                title="Copy EPC"
              >
                {copiedEpc === tag.epc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {tag.matchedProduct && (
              <div className="text-xs text-[#3f51b5] font-semibold truncate">
                {tag.matchedProduct.name} ({tag.matchedProduct.sku})
              </div>
            )}

            <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1 text-slate-700">
                <Signal className="w-3.5 h-3.5 text-[#3f51b5]" />
                <b>{tag.rssi} dBm</b>
              </span>
              <span className="text-slate-800">
                <b>{tag.readCount}</b> reads
              </span>
              <span>Last: {tag.lastSeen}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Start/Stop Button */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <button
          id="btn-quick-scan-toggle"
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
              <span>START QUICK SCAN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
