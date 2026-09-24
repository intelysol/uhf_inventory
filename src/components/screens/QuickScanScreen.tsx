import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Play,
  Square,
  Trash2,
  Download,
  Radio,
  RotateCcw,
  Copy,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { hidScannerService } from '../../core/hid/HidScannerService';
import { HidScanEvent } from '../../core/hid/HidScanEvent';
import { RfidParser } from '../../core/hid/RfidParser';
import { saveAndShareFile } from '../../services/fileService';
import { soundManager } from '../../utils/audio';
import * as XLSX from 'xlsx';

interface StreamTagItem {
  epc: string;
  readCount: number;
  firstSeen: string;
  lastSeen: string;
  matchedProduct?: { name: string; sku: string };
}

export const QuickScanScreen: React.FC = () => {
  const { products, appSettings } = useRFID();

  const [isListening, setIsListening] = useState<boolean>(true);
  const [tagsMap, setTagsMap] = useState<Map<string, StreamTagItem>>(new Map());
  const [totalReads, setTotalReads] = useState<number>(0);
  const [copiedEpc, setCopiedEpc] = useState<string | null>(null);

  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  const productsRef = useRef(products);
  productsRef.current = products;

  // Subscribe to real HidScannerService
  useEffect(() => {
    hidScannerService.start();

    const unsubscribe = hidScannerService.subscribe((event: HidScanEvent) => {
      if (!isListeningRef.current) return;
      if (!event.valid || !event.value) return;

      const norm = RfidParser.normalizeEpc(event.value);
      if (!norm || !RfidParser.isValidHex(norm)) return;

      const nowTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

      // Match against catalog products
      const matched = productsRef.current.find(p =>
        p.epcList.some(e => RfidParser.normalizeEpc(e) === norm)
      );

      setTotalReads(prev => prev + 1);

      setTagsMap((prev: Map<string, StreamTagItem>) => {
        const next = new Map<string, StreamTagItem>(prev);
        const existing = next.get(norm);
        if (existing) {
          next.set(norm, {
            epc: existing.epc,
            firstSeen: existing.firstSeen,
            matchedProduct: existing.matchedProduct,
            readCount: existing.readCount + 1,
            lastSeen: nowTime,
          });
        } else {
          next.set(norm, {
            epc: norm,
            readCount: 1,
            firstSeen: nowTime,
            lastSeen: nowTime,
            matchedProduct: matched ? { name: matched.name, sku: matched.sku } : undefined,
          });
        }
        return next;
      });

      if (appSettings.audioFeedback) {
        soundManager.playTagBeep(2600, 0.04, 0.12);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [appSettings.audioFeedback]);

  const tagsList: StreamTagItem[] = (Array.from(tagsMap.values()) as StreamTagItem[]).reverse();

  const handleClear = () => {
    setTagsMap(new Map());
    setTotalReads(0);
  };

  const handleToggleListening = () => {
    setIsListening(prev => !prev);
  };

  const handleCopy = (epc: string) => {
    navigator.clipboard?.writeText(epc);
    setCopiedEpc(epc);
    setTimeout(() => setCopiedEpc(null), 1500);
  };

  const handleExportCsv = async () => {
    if (tagsList.length === 0) return;

    let csv = '\uFEFFEPC,Product Name,SKU,Read Count,First Seen,Last Seen\r\n';
    tagsList.forEach(t => {
      const epc = `"${t.epc}"`;
      const name = `"${(t.matchedProduct?.name || 'Unassigned').replace(/"/g, '""')}"`;
      const sku = `"${(t.matchedProduct?.sku || 'N/A').replace(/"/g, '""')}"`;
      csv += `${epc},${name},${sku},${t.readCount},${t.firstSeen},${t.lastSeen}\r\n`;
    });

    await saveAndShareFile(
      `Quick_Scan_${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv',
      'Quick Scan CSV Export'
    );
  };

  const handleExportXlsx = async () => {
    if (tagsList.length === 0) return;

    const rows = tagsList.map(t => ({
      EPC: t.epc,
      'Product Name': t.matchedProduct?.name || 'Unassigned',
      SKU: t.matchedProduct?.sku || 'N/A',
      'Read Count': t.readCount,
      'First Seen': t.firstSeen,
      'Last Seen': t.lastSeen,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quick Scan Tags');

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

    await saveAndShareFile(
      `Quick_Scan_${new Date().toISOString().slice(0, 10)}.xlsx`,
      wbout,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Quick Scan XLSX Export'
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-hidden select-none pb-20">
      <AndroidTopBar
        title="Quick Scan"
        subtitle="Real-time H103 RFID Stream"
        actions={
          <button
            onClick={handleClear}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-indigo-200 hover:bg-white/15 transition-colors"
            title="Clear list"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        }
      />

      {/* Counter Banner */}
      <div className="bg-[#1a237e] text-white p-5 text-center shrink-0 space-y-1 shadow-md">
        <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-indigo-200">
          TOTAL UNIQUE TAGS SCANNED
        </div>
        <div className="text-5xl font-black font-mono tracking-tight text-white">
          {tagsList.length}
        </div>
        <div className="text-xs text-indigo-200 font-mono flex items-center justify-center gap-3">
          <span>Total Reads: <b>{totalReads}</b></span>
          <span>•</span>
          {isListening ? (
            <span className="text-green-300 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Listening to H103
            </span>
          ) : (
            <span className="text-amber-300 font-bold">Paused</span>
          )}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-xs">
        <button
          onClick={handleClear}
          disabled={tagsList.length === 0}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          <span>CLEAR</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={tagsList.length === 0}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#3f51b5] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-[#3f51b5]" />
            <span>CSV</span>
          </button>

          <button
            onClick={handleExportXlsx}
            disabled={tagsList.length === 0}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#3f51b5] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200 disabled:opacity-40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#3f51b5]" />
            <span>XLSX</span>
          </button>
        </div>
      </div>

      {/* Stream List or Empty State */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
        {tagsList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-xs">
              <Zap className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-700">No RFID tags scanned yet.</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Pull the physical H103 reader trigger to stream real EPC tags directly into this view.
              </p>
            </div>
          </div>
        ) : (
          tagsList.map(tag => (
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
                  {copiedEpc === tag.epc ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {tag.matchedProduct && (
                <div className="text-xs text-[#3f51b5] font-semibold truncate">
                  {tag.matchedProduct.name} ({tag.matchedProduct.sku})
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-1 border-t border-slate-100">
                <span className="text-slate-800">
                  Reads: <b className="text-indigo-900">{tag.readCount}</b>
                </span>
                <span>First: {tag.firstSeen}</span>
                <span>Last: {tag.lastSeen}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Start/Stop Button */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <button
          id="btn-quick-scan-toggle"
          onClick={handleToggleListening}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/30'
              : 'bg-[#3f51b5] hover:bg-indigo-600 text-white shadow-indigo-900/30'
          }`}
        >
          {isListening ? (
            <>
              <Square className="w-4 h-4 fill-white" />
              <span>PAUSE QUICK SCAN</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>RESUME QUICK SCAN</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
