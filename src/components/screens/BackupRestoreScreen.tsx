import React, { useState } from 'react';
import {
  HardDrive,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCode,
  ShieldCheck,
  Calendar,
  Layers,
  Boxes,
  ClipboardList
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { soundManager } from '../../utils/audio';
import { formatReadableDateTime, validateBackupPayload, UhfBackupPayload } from '../../services/importExportService';

export const BackupRestoreScreen: React.FC = () => {
  const {
    products,
    sessions,
    appSettings,
    exportBackup,
    restoreBackup,
    lastBackupTime,
    navigateTo
  } = useRFID();

  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Restore state
  const [selectedBackupJson, setSelectedBackupJson] = useState<string | null>(null);
  const [parsedBackup, setParsedBackup] = useState<UhfBackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  const handleExportBackup = async () => {
    setIsExporting(true);
    setExportNotice(null);

    try {
      const res = await exportBackup();
      if (res.success) {
        soundManager.playSuccessChime();
        setExportNotice(`Backup exported: ${res.filename}`);
      } else {
        setExportNotice(`Export failed: ${res.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      setExportNotice(`Export failed: ${err?.message || 'Error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setSelectedBackupJson(content);

      // Validate immediately
      const validation = validateBackupPayload(content);
      if (!validation.valid || !validation.payload) {
        setRestoreError(validation.error || 'INVALID BACKUP FILE');
        setParsedBackup(null);
        soundManager.playTagBeep(1200, 0.15, 0.2);
      } else {
        setParsedBackup(validation.payload);
        setRestoreError(null);
        setShowConfirmModal(true);
      }
    };
    reader.onerror = () => {
      setRestoreError('Failed to read file from storage');
      setParsedBackup(null);
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!selectedBackupJson || !parsedBackup) return;

    const res = restoreBackup(selectedBackupJson);
    setShowConfirmModal(false);

    if (res.success) {
      soundManager.playSuccessChime();
      setRestoreSuccess(true);
      setSelectedBackupJson(null);
      setParsedBackup(null);
    } else {
      setRestoreError(res.error || 'INVALID BACKUP FILE');
      soundManager.playTagBeep(1200, 0.15, 0.2);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Backup & Restore" subtitle="Database Archive & Recovery" />

      <div className="p-4 space-y-4">
        {/* Banner */}
        <div className="bg-[#1a237e] text-white rounded-2xl p-4.5 border border-indigo-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black leading-tight">Database Backup & Recovery</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Full offline snapshot of catalog, RFID tags, and audit history
              </p>
            </div>
          </div>
        </div>

        {/* Status Card: Last Backup & Database Stats */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Archive Status
            </span>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200">
              JSON v1
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-slate-500 font-sans font-bold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#3f51b5]" />
              <span>Last Backup:</span>
            </span>
            <span className="font-black text-slate-800">
              {lastBackupTime ? formatReadableDateTime(lastBackupTime) : 'Never'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Products</span>
              <span className="text-lg font-black text-slate-900 block mt-0.5">{products.length} Items</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-400 font-sans uppercase font-bold block">Audit Sessions</span>
              <span className="text-lg font-black text-slate-900 block mt-0.5">{sessions.length} Saved</span>
            </div>
          </div>
        </div>

        {/* Notices */}
        {exportNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{exportNotice}</span>
          </div>
        )}

        {restoreError && (
          <div className="p-3.5 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <XCircle className="w-4 h-4 text-red-700 shrink-0" />
            <div>
              <div className="font-black uppercase">INVALID BACKUP FILE</div>
              <div className="text-[11px] font-normal text-red-800 mt-0.5">{restoreError}</div>
            </div>
          </div>
        )}

        {restoreSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-center space-y-2 animate-in fade-in">
            <div className="flex items-center justify-center gap-2 font-black text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Database Restored Successfully!</span>
            </div>
            <p className="text-xs text-emerald-800 font-mono">
              All catalog products, RFID associations, and audit sessions have been restored.
            </p>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="space-y-3 pt-1">
          {/* EXPORT BACKUP */}
          <button
            id="btn-export-backup"
            type="button"
            onClick={handleExportBackup}
            disabled={isExporting}
            className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>GENERATING BACKUP...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>EXPORT BACKUP (JSON)</span>
              </>
            )}
          </button>

          {/* RESTORE BACKUP */}
          <label
            htmlFor="file-restore-input"
            className="w-full py-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-[#3f51b5] rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all block text-center"
          >
            <Upload className="w-5 h-5 text-[#3f51b5] inline-block mr-1" />
            <span>RESTORE BACKUP</span>
          </label>
          <input
            id="file-restore-input"
            type="file"
            accept=".json, application/json"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>

        {/* Security / Safety Info */}
        <div className="p-3 bg-slate-100 rounded-xl text-slate-500 text-[11px] font-medium space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Offline Data Privacy</span>
          </div>
          <p>
            Backup files are stored locally on your device or shared directly through Android share. No data is ever transmitted to external cloud servers.
          </p>
        </div>
      </div>

      {/* RESTORE CONFIRMATION MODAL */}
      {showConfirmModal && parsedBackup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900 uppercase">
                RESTORE BACKUP?
              </h3>
              <p className="text-xs text-slate-500">
                This will replace existing local application data with the records from the backup file.
              </p>
            </div>

            {/* Backup Details */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Backup Date:</span>
                <span className="font-bold text-slate-800">{formatReadableDateTime(parsedBackup.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Products to Restore:</span>
                <span className="font-bold text-[#3f51b5]">{parsedBackup.products.length} Products</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Sessions to Restore:</span>
                <span className="font-bold text-[#3f51b5]">{parsedBackup.inventorySessions.length} Sessions</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              <button
                id="btn-confirm-replace-all"
                type="button"
                onClick={handleExecuteRestore}
                className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md"
              >
                REPLACE ALL DATA
              </button>

              <button
                id="btn-cancel-restore"
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedBackupJson(null);
                  setParsedBackup(null);
                }}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
