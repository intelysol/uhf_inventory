import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Download,
  Boxes,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { StorageService } from '../../services/storage';
import { ImportPreviewItem } from '../../types/rfid';
import { soundManager } from '../../utils/audio';

export const ImportDataScreen: React.FC = () => {
  const { bulkImportProducts, goBack, navigateTo } = useRFID();

  const [importTarget, setImportTarget] = useState<'PRODUCTS' | 'EXPECTED_INVENTORY'>('PRODUCTS');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewItem[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, warnings: 0, errors: 0 });
  const [importSuccess, setImportSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setIsLoading(true);

    try {
      const { items, stats: fileStats } = await StorageService.parseImportFile(file);
      setPreviewData(items);
      setStats(fileStats);
    } catch (err) {
      console.error('File parsing error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleTemplate = () => {
    // Generate an instant rich sample preview so user can test import immediately
    const mockItems: ImportPreviewItem[] = [
      {
        rowNumber: 1,
        sku: 'KB-001',
        name: 'Dell Wireless Keyboard KB500',
        epc: 'E280116060000123',
        location: 'Warehouse A / Rack A03',
        category: 'Computer Accessories',
        status: 'VALID',
        message: 'Ready for catalog import'
      },
      {
        rowNumber: 2,
        sku: 'MS-002',
        name: 'Logitech MX Master 3S Mouse',
        epc: 'E280116060000456',
        location: 'Warehouse A / Rack A04',
        category: 'Computer Accessories',
        status: 'VALID',
        message: 'Ready for catalog import'
      },
      {
        rowNumber: 3,
        sku: 'ZEB-003',
        name: 'Zebra TC21 Touch Mobile Computer',
        epc: 'E280116060000789',
        location: 'Warehouse A / Shelf S-12',
        category: 'Mobile Devices',
        status: 'VALID',
        message: 'Ready for catalog import'
      },
      {
        rowNumber: 4,
        sku: 'HD-901',
        name: 'Milwaukee M18 Cordless Drill',
        epc: 'E280116060000888',
        location: 'Warehouse B / Bay 02',
        category: 'Tools & Equipment',
        status: 'WARNING',
        message: 'Duplicate SKU detected in database (will merge EPCs)'
      },
      {
        rowNumber: 5,
        sku: 'INV-999',
        name: 'Corrupted Tag Batch X',
        epc: 'INVALID_HEX',
        location: 'Zone 9',
        category: 'General',
        status: 'ERROR',
        message: 'Invalid EPC Hex format: must be valid hexadecimal string'
      }
    ];

    setFileName('sample_warehouse_inventory_template.xlsx');
    setPreviewData(mockItems);
    setStats({ total: 5, valid: 3, warnings: 1, errors: 1 });
  };

  const handleExecuteImport = () => {
    // Import all VALID and WARNING rows, skipping ERROR rows
    const validItems = previewData.filter(i => i.status !== 'ERROR');
    if (validItems.length === 0) return;

    bulkImportProducts(validItems);
    soundManager.playSuccessChime();
    setImportSuccess(true);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Import Data" subtitle="Offline Catalog Sync" />

      <div className="p-4 space-y-4">
        {/* Import Target Choice */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
            Select Import Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setImportTarget('PRODUCTS')}
              className={`p-3 rounded-xl border text-left font-bold text-xs transition-all ${
                importTarget === 'PRODUCTS'
                  ? 'bg-[#1a237e] text-white border-[#1a237e] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              IMPORT PRODUCTS
            </button>

            <button
              onClick={() => setImportTarget('EXPECTED_INVENTORY')}
              className={`p-3 rounded-xl border text-left font-bold text-xs transition-all ${
                importTarget === 'EXPECTED_INVENTORY'
                  ? 'bg-[#1a237e] text-white border-[#1a237e] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              EXPECTED AUDIT LIST
            </button>
          </div>
        </div>

        {/* File Upload Zone */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 text-center">
          <label
            htmlFor="file-import-input"
            className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all space-y-2 block"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-[#3f51b5] flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 block">
                {fileName || 'SELECT FILE (CSV or Excel)'}
              </span>
              <span className="text-xs text-slate-500 mt-0.5 block">
                Supports .xlsx, .xls, and standard .csv files
              </span>
            </div>
            <span className="px-4 py-2 bg-[#3f51b5] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs">
              BROWSE DEVICE STORAGE
            </span>
          </label>

          <input
            id="file-import-input"
            type="file"
            accept=".csv, .xlsx, .xls"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Sample template quick-load */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
            <span>Need sample data?</span>
            <button
              onClick={handleLoadSampleTemplate}
              className="text-[#3f51b5] hover:text-indigo-900 font-bold flex items-center gap-1"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Load Demo Template</span>
            </button>
          </div>
        </div>

        {/* Parsing & Validation Summary Banner */}
        {previewData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                  File Analysis
                </span>
                <h3 className="text-sm font-bold text-slate-900">{fileName}</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                {stats.total} rows detected
              </span>
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block font-sans">Valid</span>
                <span className="text-base font-black block mt-0.5">{stats.valid}</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900">
                <span className="text-[10px] uppercase font-bold text-amber-700 block font-sans">Warnings</span>
                <span className="text-base font-black block mt-0.5">{stats.warnings}</span>
              </div>
              <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-red-900">
                <span className="text-[10px] uppercase font-bold text-red-700 block font-sans">Errors</span>
                <span className="text-base font-black block mt-0.5">{stats.errors}</span>
              </div>
            </div>

            {/* Preview Table */}
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-700 block">
                Record Preview (First 5 Rows)
              </span>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {previewData.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/50 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          SKU: <span className="text-slate-800 font-semibold">{item.sku}</span> • {item.location}
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          item.status === 'VALID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200 select-text truncate">
                      EPC: {item.epc}
                    </div>

                    {item.message && (
                      <div className="text-[10px] text-slate-500 font-medium">
                        {item.message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error handling note */}
            {stats.errors > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <b>{stats.errors} invalid rows</b> will be skipped safely. Valid records ({stats.valid + stats.warnings}) will be imported into local storage.
                </span>
              </div>
            )}

            {/* Success state */}
            {importSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-2">
                <div className="flex items-center justify-center gap-1.5 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Import Completed Successfully!</span>
                </div>
                <p className="text-xs text-emerald-700 font-mono">
                  {stats.valid + stats.warnings} product records stored locally on device.
                </p>
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => navigateTo('products')}
                    className="flex-1 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    VIEW CATALOG
                  </button>
                  <button
                    onClick={() => navigateTo('start_inventory')}
                    className="flex-1 py-2.5 bg-[#1a237e] text-white rounded-xl text-xs font-bold"
                  >
                    START INVENTORY
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="btn-execute-import"
                onClick={handleExecuteImport}
                disabled={stats.valid + stats.warnings === 0}
                className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4 text-indigo-200" />
                <span>IMPORT DATA ({stats.valid + stats.warnings} RECORDS)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
