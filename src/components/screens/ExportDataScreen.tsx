import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  CheckCircle,
  Share2,
  FileText,
  Settings2,
  ArrowRight,
  Check,
  FolderDown
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { InventorySession, ExportOptions } from '../../types/rfid';
import { StorageService } from '../../services/storage';
import { soundManager } from '../../utils/audio';

export const ExportDataScreen: React.FC = () => {
  const { screenParams, sessions, navigateTo } = useRFID();

  const initialSession: InventorySession = screenParams?.session || sessions[0];
  const [selectedSessionId, setSelectedSessionId] = useState<string>(initialSession?.id || (sessions[0]?.id || ''));
  const [format, setFormat] = useState<'CSV' | 'XLSX'>('XLSX');
  const [filename, setFilename] = useState<string>(
    initialSession ? `${initialSession.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}` : `Warehouse_A_${new Date().toISOString().slice(0, 10)}`
  );

  const [options, setOptions] = useState<ExportOptions>({
    includeProductInfo: true,
    includeRssi: true,
    includeReadCount: true,
    includeFirstSeen: true,
    includeLastSeen: true,
    includeMissing: true,
    includeExtra: true,
    includeUnknown: true
  });

  const [exportedResult, setExportedResult] = useState<{ filename: string; blob: Blob } | null>(null);

  const currentSession = sessions.find(s => s.id === selectedSessionId) || initialSession;

  const toggleOption = (key: keyof ExportOptions) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const result = StorageService.exportInventory(currentSession, format, options);
    setExportedResult(result);
    soundManager.playSuccessChime();

    // Trigger instant browser download
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.click();
  };

  const handleShare = async () => {
    if (!exportedResult) return;
    try {
      if (navigator.share) {
        const file = new File([exportedResult.blob], exportedResult.filename, {
          type: format === 'CSV' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        await navigator.share({
          title: 'Inventory Audit Export',
          text: `Exported RFID Session: ${currentSession?.name}`,
          files: [file]
        });
      } else {
        alert('File is ready in your downloads folder!');
      }
    } catch (err) {
      console.log('Share canceled or not supported');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Export Inventory" subtitle="Reports & Raw Spreadsheets" />

      <div className="p-4 space-y-4">
        {exportedResult ? (
          /* Export Complete Success View */
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">Export Complete</h2>
              <p className="text-xs text-slate-500 mt-1">
                File generated and stored to local device storage.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 text-left">
              <FileSpreadsheet className="w-8 h-8 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {exportedResult.filename}
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                  Format: {format} • {currentSession?.scannedTags.length || 0} Records
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                id="btn-share-file"
                onClick={handleShare}
                className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all"
              >
                <Share2 className="w-4 h-4 text-indigo-200" />
                <span>SHARE FILE (BLUETOOTH / DRIVE)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const url = URL.createObjectURL(exportedResult.blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = exportedResult.filename;
                    a.click();
                  }}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  <span>RE-DOWNLOAD</span>
                </button>

                <button
                  id="btn-export-done"
                  onClick={() => navigateTo('dashboard')}
                  className="py-3 bg-[#1a237e] hover:bg-[#121858] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-indigo-200" />
                  <span>DONE</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Form Configuration View */
          <form onSubmit={handleExport} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            {/* Session Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Select Inventory Session
              </label>
              <select
                id="select-export-session"
                value={selectedSessionId}
                onChange={e => {
                  setSelectedSessionId(e.target.value);
                  const sess = sessions.find(s => s.id === e.target.value);
                  if (sess) {
                    setFilename(`${sess.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`);
                  }
                }}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({new Date(s.startTime).toLocaleDateString()}) - {s.foundCount} Found
                  </option>
                ))}
              </select>
            </div>

            {/* Export Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Export File Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="btn-format-xlsx"
                  onClick={() => setFormat('XLSX')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    format === 'XLSX'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  id="btn-format-csv"
                  onClick={() => setFormat('CSV')}
                  className={`p-3 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    format === 'CSV'
                      ? 'bg-indigo-50 border-[#3f51b5] text-[#1a237e] ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  <FileText className="w-4 h-4 text-[#3f51b5]" />
                  <span>CSV (.csv)</span>
                </button>
              </div>
            </div>

            {/* File Name input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Output File Name
              </label>
              <div className="relative">
                <input
                  id="input-export-filename"
                  type="text"
                  required
                  value={filename}
                  onChange={e => setFilename(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 font-bold">
                  .{format.toLowerCase()}
                </span>
              </div>
            </div>

            {/* Field Inclusions Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Data Fields to Include
              </label>

              <div className="grid grid-cols-1 gap-2 text-xs text-slate-800">
                {[
                  { key: 'includeProductInfo', label: 'Product Name, SKU & Location' },
                  { key: 'includeRssi', label: 'Signal Strength (RSSI in dBm)' },
                  { key: 'includeReadCount', label: 'Total Read Count per EPC' },
                  { key: 'includeFirstSeen', label: 'First Seen & Last Seen Timestamps' },
                  { key: 'includeMissing', label: 'Expected Missing Items' },
                  { key: 'includeExtra', label: 'Extra Uncataloged EPCs' },
                  { key: 'includeUnknown', label: 'Unknown / Blind Tag Reads' }
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    onClick={() => toggleOption(key as keyof ExportOptions)}
                    className="flex items-center gap-2.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!options[key as keyof ExportOptions]}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-[#3f51b5] accent-[#3f51b5] cursor-pointer"
                    />
                    <span className="font-medium text-slate-800">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Export CTA */}
            <div className="pt-2">
              <button
                id="btn-submit-export-file"
                type="submit"
                className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all"
              >
                <Download className="w-5 h-5 text-indigo-200" />
                <span>EXPORT FILE</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
