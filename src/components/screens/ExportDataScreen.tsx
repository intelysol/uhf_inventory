import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Share2,
  FileText,
  Boxes,
  ClipboardList,
  Check,
  RefreshCw,
  FolderDown
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { InventorySession } from '../../types/rfid';
import { StorageService } from '../../services/storage';
import { soundManager } from '../../utils/audio';

export const ExportDataScreen: React.FC = () => {
  const { screenParams, sessions, products, navigateTo } = useRFID();

  const [exportTarget, setExportTarget] = useState<'INVENTORY' | 'PRODUCTS'>('INVENTORY');
  const initialSession: InventorySession | undefined = screenParams?.session || sessions[0];
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSession?.id || (sessions[0]?.id || ''));
  const [format, setFormat] = useState<'CSV' | 'XLSX'>('XLSX');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentSession = sessions.find(s => s.id === selectedSessionId) || initialSession;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    setStatusMessage(null);

    try {
      if (exportTarget === 'INVENTORY') {
        if (!currentSession) {
          alert('No inventory session available to export.');
          setIsExporting(false);
          return;
        }

        const res = await StorageService.exportInventorySession(currentSession, format);
        if (res.success) {
          setExportedFilename(res.filename);
          soundManager.playSuccessChime();
        } else {
          setStatusMessage(res.error || 'Failed to export inventory');
        }
      } else {
        // Export products
        const res = await StorageService.exportProducts(products, format);
        if (res.success) {
          setExportedFilename(res.filename);
          soundManager.playSuccessChime();
        } else {
          setStatusMessage(res.error || 'Failed to export products');
        }
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Export error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Export Data" subtitle="CSV & Excel Reports" />

      <div className="p-4 space-y-4">
        {exportedFilename ? (
          /* Export Complete Success View */
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">Export Complete</h2>
              <p className="text-xs text-slate-500 mt-1">
                File generated and stored to device storage.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-left">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {exportedFilename}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Format: {format} • {exportTarget === 'INVENTORY' ? `${currentSession?.tags?.length || currentSession?.scannedTags?.length || 0} Records` : `${products.length} Products`}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setExportedFilename(null)}
                className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 transition-all"
              >
                <span>EXPORT ANOTHER FILE</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleExport} className="space-y-4">
            {/* 1. Target Selector */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Select Export Target
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportTarget('INVENTORY')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    exportTarget === 'INVENTORY'
                      ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Inventory Session</span>
                    <ClipboardList className="w-4 h-4 text-[#3f51b5]" />
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                    {sessions.length} Saved Counts
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportTarget('PRODUCTS')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    exportTarget === 'PRODUCTS'
                      ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Products Catalog</span>
                    <Boxes className="w-4 h-4 text-[#3f51b5]" />
                  </div>
                  <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                    {products.length} Products
                  </div>
                </button>
              </div>
            </div>

            {/* 2. Inventory Session Selector (if INVENTORY) */}
            {exportTarget === 'INVENTORY' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                  Select Session to Export
                </label>

                {sessions.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    No inventory sessions recorded yet. Run an inventory audit first.
                  </div>
                ) : (
                  <select
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#3f51b5]"
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.location || 'Warehouse'}) — {s.tags?.length || s.scannedTags?.length || 0} Tags
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* 3. Format Selector */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Export File Format
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('XLSX')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    format === 'XLSX'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Excel Workbook (.xlsx)</span>
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-800">
                    {exportTarget === 'INVENTORY' ? '2 Sheets: Summary & Tags' : 'All Products & EPCs'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormat('CSV')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    format === 'CSV'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Raw CSV (.csv)</span>
                    <FileText className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-800">
                    Standard comma-separated UTF-8
                  </div>
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                {statusMessage}
              </div>
            )}

            {/* Export CTA Button */}
            <button
              id="btn-export-submit"
              type="submit"
              disabled={isExporting || (exportTarget === 'INVENTORY' && !currentSession)}
              className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all disabled:opacity-40"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>GENERATING FILE...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>EXPORT & SHARE ({format})</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
