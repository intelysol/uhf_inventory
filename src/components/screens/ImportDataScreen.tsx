import React, { useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Boxes,
  ArrowRight,
  RefreshCw,
  Info,
  X,
  Check
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { StorageService } from '../../services/storage';
import { Product } from '../../types/rfid';
import { ImportInvalidItem, parseAndValidateProductImport } from '../../services/importExportService';
import { soundManager } from '../../utils/audio';

export const ImportDataScreen: React.FC = () => {
  const { products, addProduct, updateProduct, goBack, navigateTo } = useRFID();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Import preview results
  const [previewResult, setPreviewResult] = useState<{
    totalRows: number;
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
    conflictCount: number;
    validProducts: Product[];
    invalidItems: ImportInvalidItem[];
  } | null>(null);

  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setIsLoading(true);
    setErrorMsg(null);
    setImportSuccess(false);

    try {
      const result = await StorageService.parseImportFile(file, products);
      setPreviewResult(result);
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(err?.message || 'Failed to read file. Please ensure it is a valid CSV or Excel file.');
      setPreviewResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleTemplate = async () => {
    // Generate sample raw rows and run real validation against current products
    const sampleRows = [
      {
        SKU: 'KB-001',
        'Product Name': 'Dell Keyboard KB500',
        EPC: 'E280001000000001',
        Barcode: '123456',
        Category: 'Keyboard',
        Location: 'Rack A01',
        Description: 'Wireless keyboard',
      },
      {
        SKU: 'MS-001',
        'Product Name': 'HP Mouse Optical',
        EPC: 'E280001000000002',
        Barcode: '123457',
        Category: 'Mouse',
        Location: 'Rack A02',
        Description: 'Ergonomic optical mouse',
      },
      {
        SKU: 'KB-001',
        'Product Name': 'Dell Keyboard KB500',
        EPC: 'E280001000000003',
        Barcode: '123456',
        Category: 'Keyboard',
        Location: 'Rack A01',
        Description: 'Second unit tag',
      },
      // Invalid sample row: Missing SKU
      {
        SKU: '',
        'Product Name': 'Mystery Product',
        EPC: 'E280001000000004',
        Barcode: '',
        Category: '',
        Location: '',
      },
      // Invalid sample row: Invalid EPC hex
      {
        SKU: 'BAD-HEX-01',
        'Product Name': 'Corrupted RFID Tag',
        EPC: 'INVALID_HEX_XYZ',
        Barcode: '',
        Category: '',
        Location: '',
      },
      // Duplicate EPC row
      {
        SKU: 'DUP-EPC-02',
        'Product Name': 'Duplicate Tag Item',
        EPC: 'E280001000000002', // Same EPC as MS-001
        Barcode: '',
        Category: '',
        Location: '',
      }
    ];

    setFileName('sample_warehouse_import.csv');
    setIsLoading(true);
    setErrorMsg(null);
    setImportSuccess(false);

    try {
      const res = parseAndValidateProductImport(sampleRows, products);
      setPreviewResult(res);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Sample validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setFileName('');
    setPreviewResult(null);
    setErrorMsg(null);
    setImportSuccess(false);
  };

  const handleExecuteImport = () => {
    if (!previewResult || previewResult.validProducts.length === 0) return;

    // Merge valid products into catalog
    const currentProducts = StorageService.getProducts();
    const productSkuMap = new Map<string, Product>(currentProducts.map(p => [p.sku.toUpperCase(), { ...p }]));

    for (const validProd of previewResult.validProducts) {
      const normSku = validProd.sku.toUpperCase();
      if (productSkuMap.has(normSku)) {
        // Merge EPCs for existing product
        const existing = productSkuMap.get(normSku)!;
        const newEpcs = validProd.epcList || [];
        const combinedEpcs = Array.from(new Set([...existing.epcList, ...newEpcs]));
        existing.epcList = combinedEpcs;
        if (validProd.location) existing.location = validProd.location;
        if (validProd.category) existing.category = validProd.category;
        existing.updatedAt = new Date().toISOString();
      } else {
        productSkuMap.set(normSku, validProd);
      }
    }

    const updatedCatalog = Array.from(productSkuMap.values());
    StorageService.saveProducts(updatedCatalog);

    // Sync to context by updating products
    for (const p of updatedCatalog) {
      const exists = products.some(ep => ep.id === p.id);
      if (exists) {
        updateProduct(p);
      } else {
        addProduct(p);
      }
    }

    soundManager.playSuccessChime();
    setImportedCount(previewResult.validProducts.length);
    setImportSuccess(true);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Import Products" subtitle="CSV & Excel (.xlsx) Catalog Sync" />

      <div className="p-4 space-y-4">
        {/* Helper Banner */}
        <div className="bg-[#1a237e] text-white rounded-2xl p-4.5 border border-indigo-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black leading-tight">Product Catalog Import</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Load products and RFID EPC associations from CSV or Excel spreadsheet
              </p>
            </div>
          </div>
        </div>

        {/* File Upload Zone */}
        {!previewResult && !importSuccess && (
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
                  {fileName || 'SELECT CSV OR EXCEL FILE'}
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  Supports .csv and .xlsx spreadsheets
                </span>
              </div>
              <span className="px-4 py-2 bg-[#3f51b5] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs">
                BROWSE FILES
              </span>
            </label>

            <input
              id="file-import-input"
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {isLoading && (
              <div className="text-xs text-[#3f51b5] font-bold flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating file structure and EPCs...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sample template quick-load */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
              <span>Test with demo data:</span>
              <button
                type="button"
                onClick={handleLoadSampleTemplate}
                className="text-[#3f51b5] hover:text-indigo-900 font-bold flex items-center gap-1"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Load Sample Template</span>
              </button>
            </div>
          </div>
        )}

        {/* IMPORT PREVIEW */}
        {previewResult && !importSuccess && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                  IMPORT PREVIEW
                </span>
                <h3 className="text-sm font-black text-slate-900 truncate max-w-[220px]">
                  {fileName}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-xs font-bold border border-slate-200">
                {previewResult.totalRows} Total Rows
              </span>
            </div>

            {/* 5-Metric Counters Grid */}
            <div className="grid grid-cols-5 gap-1 text-center font-mono">
              <div className="bg-slate-100/80 p-2 rounded-xl border border-slate-200">
                <span className="text-[8px] uppercase font-bold text-slate-500 block truncate">Total</span>
                <span className="text-sm font-black block mt-0.5 text-slate-800">{previewResult.totalRows}</span>
              </div>

              <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="text-[8px] uppercase font-bold text-emerald-700 block truncate">Valid</span>
                <span className="text-sm font-black block mt-0.5 text-emerald-700">{previewResult.validCount}</span>
              </div>

              <div className="bg-red-50 p-2 rounded-xl border border-red-200 text-red-900">
                <span className="text-[8px] uppercase font-bold text-red-700 block truncate">Invalid</span>
                <span className="text-sm font-black block mt-0.5 text-red-700">{previewResult.invalidCount}</span>
              </div>

              <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-900">
                <span className="text-[8px] uppercase font-bold text-amber-700 block truncate">Duplicates</span>
                <span className="text-sm font-black block mt-0.5 text-amber-700">{previewResult.duplicateCount}</span>
              </div>

              <div className="bg-purple-50 p-2 rounded-xl border border-purple-200 text-purple-900">
                <span className="text-[8px] uppercase font-bold text-purple-700 block truncate">Conflicts</span>
                <span className="text-sm font-black block mt-0.5 text-purple-700">{previewResult.conflictCount}</span>
              </div>
            </div>

            {/* Invalid Rows Table */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wide">
                  Invalid / Flagged Rows ({previewResult.invalidItems.length})
                </span>
                <span className="text-[10px] text-slate-400">
                  {previewResult.invalidItems.length === 0 ? 'All rows valid' : 'Will be excluded'}
                </span>
              </div>

              {previewResult.invalidItems.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All rows passed validation with zero errors or conflicts!</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto text-xs">
                  {previewResult.invalidItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50/70 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            Row {item.rowNumber} • SKU: <b className="text-slate-800">{item.sku}</b>
                          </span>
                          <div className="font-bold text-slate-900 truncate">
                            {item.name}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                            item.status === 'CONFLICT'
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : item.status === 'DUPLICATE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      {item.epc && item.epc !== 'N/A' && (
                        <div className="font-mono text-[10px] text-slate-600 truncate bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          EPC: {item.epc}
                        </div>
                      )}

                      <div className="text-[10px] text-red-600 font-medium">
                        Reason: {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Validation Notice */}
            {previewResult.invalidItems.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <b>{previewResult.invalidItems.length} flagged rows</b> will be safely skipped. Only valid records ({previewResult.validCount}) will be merged into the catalog.
                </span>
              </div>
            )}

            {/* Action Buttons: CANCEL & IMPORT VALID RECORDS */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                id="btn-cancel-import"
                type="button"
                onClick={handleCancel}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>CANCEL</span>
              </button>

              <button
                id="btn-import-valid-records"
                type="button"
                onClick={handleExecuteImport}
                disabled={previewResult.validCount === 0}
                className="py-3 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md border-b-4 border-indigo-900 disabled:opacity-40 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>IMPORT VALID ({previewResult.validCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Screen */}
        {importSuccess && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">Import Completed Successfully</h2>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {importedCount} valid products saved to offline catalog.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => navigateTo('products')}
                className="w-full py-3.5 bg-[#3f51b5] hover:bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md"
              >
                VIEW CATALOG
              </button>

              <button
                onClick={handleCancel}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase"
              >
                IMPORT ANOTHER FILE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
