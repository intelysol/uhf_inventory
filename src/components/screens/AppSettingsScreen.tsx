import React, { useState } from 'react';
import {
  Sliders,
  Database,
  FileText,
  Volume2,
  Zap,
  Trash2,
  RefreshCcw,
  CheckCircle2,
  HardDrive,
  Info,
  ShieldAlert,
  Moon,
  Sun
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { soundManager } from '../../utils/audio';

export const AppSettingsScreen: React.FC = () => {
  const {
    appSettings,
    updateAppSettings,
    products,
    sessions,
    resetDatabaseToMock
  } = useRFID();

  const [savedNotice, setSavedNotice] = useState(false);

  const handleUpdate = (partial: Parameters<typeof updateAppSettings>[0]) => {
    updateAppSettings(partial);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all catalog and audit data to default demonstration records?')) {
      resetDatabaseToMock();
      soundManager.playSuccessChime();
      alert('Database reset to offline demo seed data.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-28 select-none">
      <AndroidTopBar title="Settings" subtitle="Offline Configuration & Hardware" />

      <div className="p-4 space-y-4">
        {savedNotice && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>Settings saved to local storage</span>
          </div>
        )}

        {/* 1. INVENTORY SETTINGS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-[#3f51b5]">
            <Sliders className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Inventory Scan Engine</h3>
          </div>

          {/* Duplicate Filter Delay */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700 font-bold">Duplicate Filter Delay</span>
              <span className="font-mono text-[#3f51b5] font-black">{appSettings.duplicateFilterDelayMs} ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={appSettings.duplicateFilterDelayMs}
              onChange={e => handleUpdate({ duplicateFilterDelayMs: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3f51b5]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Fast (100ms)</span>
              <span>Default (500ms)</span>
              <span>Slow (2000ms)</span>
            </div>
          </div>

          {/* Minimum RSSI Threshold */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-700 font-bold">Minimum RSSI Filter Cutoff</span>
              <span className="font-mono text-[#3f51b5] font-black">{appSettings.minRssiThreshold} dBm</span>
            </div>
            <input
              type="range"
              min="-95"
              max="-50"
              step="5"
              value={appSettings.minRssiThreshold}
              onChange={e => handleUpdate({ minRssiThreshold: parseInt(e.target.value, 10) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3f51b5]"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>-95 dBm (All Tags)</span>
              <span>-80 dBm (Medium)</span>
              <span>-50 dBm (Close Range Only)</span>
            </div>
          </div>

          {/* Aggregate Repeated Reads Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Aggregate Repeated Reads</span>
              <span className="text-[11px] text-slate-500">Group multiple EPC reads into a single table row</span>
            </div>
            <input
              type="checkbox"
              checked={appSettings.aggregateRepeatedReads}
              onChange={e => handleUpdate({ aggregateRepeatedReads: e.target.checked })}
              className="w-5 h-5 rounded text-[#3f51b5] accent-[#3f51b5] cursor-pointer"
            />
          </div>

          {/* Auto Stop Scan */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Auto Stop Scanning
            </label>
            <select
              value={appSettings.autoStopScanMinutes}
              onChange={e => handleUpdate({ autoStopScanMinutes: parseInt(e.target.value, 10) })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#3f51b5]"
            >
              <option value="0">Never (Manual Stop)</option>
              <option value="1">After 1 minute</option>
              <option value="3">After 3 minutes</option>
              <option value="5">After 5 minutes</option>
              <option value="10">After 10 minutes</option>
            </select>
          </div>
        </div>

        {/* 2. AUDIO & HAPTICS FEEDBACK */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#3f51b5]">
            <Volume2 className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Audio & Haptic Feedback</h3>
          </div>

          {/* Audio Beep on Scan */}
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Industrial Beep on Tag Read</span>
              <span className="text-[11px] text-slate-500">High-pitch piezo beep upon EPC detection</span>
            </div>
            <input
              type="checkbox"
              checked={appSettings.audioFeedback}
              onChange={e => handleUpdate({ audioFeedback: e.target.checked })}
              className="w-5 h-5 rounded text-[#3f51b5] accent-[#3f51b5] cursor-pointer"
            />
          </div>

          {/* Vibration Feedback */}
          <div className="flex items-center justify-between py-1 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Haptic Vibration on Trigger</span>
              <span className="text-[11px] text-slate-500">Physical vibration pulses for warehouse noise</span>
            </div>
            <input
              type="checkbox"
              checked={appSettings.vibrationFeedback}
              onChange={e => handleUpdate({ vibrationFeedback: e.target.checked })}
              className="w-5 h-5 rounded text-[#3f51b5] accent-[#3f51b5] cursor-pointer"
            />
          </div>
        </div>

        {/* 3. FILE & REPORT DEFAULTS */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-[#3f51b5]">
            <FileText className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">File & Report Defaults</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Default Export Format</label>
              <select
                value={appSettings.defaultExportFormat}
                onChange={e => handleUpdate({ defaultExportFormat: e.target.value as 'CSV' | 'XLSX' })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#3f51b5]"
              >
                <option value="XLSX">Excel (.xlsx)</option>
                <option value="CSV">CSV (.csv)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 block">Default Location</label>
              <input
                type="text"
                value={appSettings.defaultLocation}
                onChange={e => handleUpdate({ defaultLocation: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#3f51b5]"
              />
            </div>
          </div>
        </div>

        {/* 4. LOCAL DATABASE & STORAGE MANAGEMENT */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#3f51b5]">
              <HardDrive className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Local Offline Database</h3>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              SQLite / LocalStorage
            </span>
          </div>

          {/* Database stats */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-700">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Products in Catalog</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">{products.length} Items</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans">Recorded Audit Sessions</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">{sessions.length} Sessions</span>
            </div>
          </div>

          {/* Reset button */}
          <button
            id="btn-reset-demo-db"
            onClick={handleResetData}
            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>RESET DATABASE TO DEMO SEED</span>
          </button>
        </div>

        {/* System & Architecture Info */}
        <div className="text-center space-y-0.5 text-slate-400 text-[11px] font-mono pb-2">
          <p>UHF RFID Inventory App • Version 2.4.0 (Offline Build)</p>
          <p>H103 Bluetooth Protocol • ISO 18000-6C / EPC Class 1 Gen 2</p>
        </div>
      </div>
    </div>
  );
};
