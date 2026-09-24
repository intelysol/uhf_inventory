import React, { useState, useEffect } from 'react';
import {
  Save,
  Radio,
  MapPin,
  Tag,
  CheckCircle,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { Product } from '../../types/rfid';
import { soundManager } from '../../utils/audio';
import { hidScannerService } from '../../core/hid/HidScannerService';
import { HidScanEvent } from '../../core/hid/HidScanEvent';

export const AddEditProductScreen: React.FC = () => {
  const {
    screenParams,
    products,
    addProduct,
    updateProduct,
    checkEpcAssignment,
    assignTagToProduct,
    goBack,
  } = useRFID();

  const editingProduct: Product | undefined = screenParams?.product;

  const [name, setName] = useState(editingProduct?.name || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [barcode, setBarcode] = useState(editingProduct?.barcode || '');
  const [category, setCategory] = useState(editingProduct?.category || 'General Inventory');
  const [location, setLocation] = useState(editingProduct?.location || 'Warehouse A / Rack 01');
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [epcList, setEpcList] = useState<string[]>(editingProduct?.epcList ? [...editingProduct.epcList] : []);

  // Manual EPC input state
  const [manualEpc, setManualEpc] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);

  // Scan RFID modal state
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [lastScannedEpc, setLastScannedEpc] = useState<string | null>(null);

  // Conflict modal state
  const [conflictData, setConflictData] = useState<{
    epc: string;
    product: Product;
  } | null>(null);

  // Real HID event listener when Scan Modal is active
  useEffect(() => {
    if (!isScanModalOpen) return;

    hidScannerService.start();
    const unsubscribe = hidScannerService.subscribe((event: HidScanEvent) => {
      if (!event.valid || !event.value) return;

      const norm = event.value.trim().toUpperCase();
      setLastScannedEpc(norm);

      // Check if already in current list
      if (epcList.includes(norm)) {
        soundManager.playTagBeep();
        return;
      }

      // Check if already assigned to another product
      const conflict = checkEpcAssignment(norm, editingProduct?.id);
      if (conflict) {
        soundManager.playAlertBeep();
        setConflictData({ epc: norm, product: conflict });
      } else {
        soundManager.playSuccessChime();
        setEpcList(prev => [...prev, norm]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isScanModalOpen, epcList, editingProduct, checkEpcAssignment]);

  const handleAddManualEpc = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = manualEpc.trim().toUpperCase();
    if (!norm) return;

    if (epcList.includes(norm)) {
      setManualEpc('');
      setIsAddingManual(false);
      return;
    }

    const conflict = checkEpcAssignment(norm, editingProduct?.id);
    if (conflict) {
      soundManager.playAlertBeep();
      setConflictData({ epc: norm, product: conflict });
    } else {
      setEpcList(prev => [...prev, norm]);
      setManualEpc('');
      setIsAddingManual(false);
      soundManager.playSuccessChime();
    }
  };

  const handleRemoveEpc = (epcToRemove: string) => {
    setEpcList(prev => prev.filter(e => e !== epcToRemove));
  };

  const handleReassignConflict = () => {
    if (!conflictData) return;
    const { epc, product: otherProduct } = conflictData;

    // Add to current product's EPC list
    setEpcList(prev => [...prev.filter(e => e !== epc), epc]);

    // If editing existing product, apply reassign immediately in context
    if (editingProduct) {
      assignTagToProduct(epc, editingProduct.id, true);
    } else {
      // For new product, remove from other product now so ownership is transferred
      assignTagToProduct(epc, '', true);
      // Clean from other product in state
      updateProduct({
        ...otherProduct,
        epcList: otherProduct.epcList.filter(e => e.toUpperCase() !== epc.toUpperCase()),
      });
    }

    soundManager.playSuccessChime();
    setConflictData(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    const cleanEpcs: string[] = Array.from<string>(new Set(epcList.map(e => e.trim().toUpperCase())));

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || editingProduct.barcode,
        category,
        location: location.trim(),
        description: description.trim(),
        epcList: cleanEpcs,
      });
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || `BC-${sku.trim()}`,
        category,
        location: location.trim(),
        description: description.trim(),
        epcList: cleanEpcs,
        expectedQuantity: 1,
        unit: 'pcs',
      });
    }

    soundManager.playSuccessChime();
    goBack();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={editingProduct ? editingProduct.sku : 'Catalog Product Setup'}
      />

      <div className="p-4 space-y-4">
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span>Product Name</span>
              <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="input-prod-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dell Wireless Keyboard KB500"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
            />
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center justify-between">
                <span>SKU Code</span>
                <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                id="input-prod-sku"
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="e.g. KB-001"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Barcode (UPC)
              </label>
              <input
                id="input-prod-barcode"
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="e.g. 884116378"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />
            </div>
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Peripherals"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Rack A01"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />
            </div>
          </div>

          {/* RFID TAGS SECTION */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#3f51b5]" />
                  <span>Assigned RFID Tags ({epcList.length})</span>
                </label>
                <p className="text-[11px] text-slate-500">Associate one or multiple UHF RFID EPCs</p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="btn-scan-rfid"
                  onClick={() => setIsScanModalOpen(true)}
                  className="px-3 py-1.5 bg-[#3f51b5] hover:bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>Scan RFID</span>
                </button>

                <button
                  type="button"
                  id="btn-add-epc-manual"
                  onClick={() => setIsAddingManual(!isAddingManual)}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual</span>
                </button>
              </div>
            </div>

            {/* Manual EPC input form */}
            {isAddingManual && (
              <div className="p-3 bg-slate-50 rounded-xl border border-indigo-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-700">Enter EPC Hex Value:</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualEpc}
                    onChange={e => setManualEpc(e.target.value)}
                    placeholder="e.g. E280116060000123"
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddManualEpc}
                    className="px-4 py-2 bg-[#3f51b5] text-white rounded-lg text-xs font-black shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Assigned EPC List */}
            {epcList.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {epcList.map(tagEpc => (
                  <div
                    key={tagEpc}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs"
                  >
                    <span className="font-bold text-slate-800 break-all select-all">{tagEpc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEpc(tagEpc)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-lg transition-colors ml-2 shrink-0"
                      title="Remove RFID Tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                No RFID tags assigned yet. Tap "Scan RFID" or "Manual" to add.
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Item notes, specifications..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none resize-none"
            />
          </div>

          {/* SAVE BUTTON */}
          <div className="pt-2">
            <button
              id="btn-save-product-submit"
              type="submit"
              className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all"
            >
              <Save className="w-5 h-5 text-indigo-200" />
              <span>SAVE PRODUCT</span>
            </button>
          </div>
        </form>
      </div>

      {/* SCAN RFID MODAL (Real HID Capture) */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                H103 RFID Reader Capture
              </span>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 flex flex-col items-center">
              <div className="relative w-20 h-20 rounded-full bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Radio className="w-9 h-9 text-indigo-400 animate-pulse" />
              </div>
              <div className="mt-4 text-sm font-black uppercase tracking-wider text-white">
                WAITING FOR RFID
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                Pull the physical trigger on the paired H103 reader to capture an RFID tag.
              </p>
            </div>

            {lastScannedEpc && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Last Scanned:</div>
                <div className="font-mono text-xs font-black text-emerald-400 break-all mt-0.5">
                  {lastScannedEpc}
                </div>
              </div>
            )}

            <button
              onClick={() => setIsScanModalOpen(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}

      {/* DUPLICATE EPC CONFLICT MODAL */}
      {conflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-2xl p-6 border border-amber-300 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  RFID ALREADY ASSIGNED
                </h3>
                <p className="text-xs text-slate-500">This tag is owned by another product.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-sans font-bold">EPC</span>
                <span className="font-bold text-slate-800 break-all">{conflictData.epc}</span>
              </div>
              <div className="pt-1 border-t border-slate-200 font-sans">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Assigned Product</span>
                <span className="font-bold text-slate-900">{conflictData.product.name}</span>
                <span className="text-xs text-slate-500 block font-mono">SKU: {conflictData.product.sku}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Reassigning will remove this tag from <b>{conflictData.product.name}</b> and assign it to this product.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConflictData(null)}
                className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                CANCEL
              </button>

              <button
                type="button"
                id="btn-confirm-reassign-epc"
                onClick={handleReassignConflict}
                className="py-3 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs shadow-sm uppercase tracking-wider"
              >
                REASSIGN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
