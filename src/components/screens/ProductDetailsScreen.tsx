import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Radio,
  Edit3,
  Plus,
  Trash2,
  Barcode,
  MapPin,
  Tag,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  X,
  Search,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { Product } from '../../types/rfid';
import { soundManager } from '../../utils/audio';
import { hidScannerService } from '../../core/hid/HidScannerService';
import { HidScanEvent } from '../../core/hid/HidScanEvent';

export const ProductDetailsScreen: React.FC = () => {
  const {
    screenParams,
    products,
    navigateTo,
    setFinderTarget,
    unassignTagFromProduct,
    assignTagToProduct,
    checkEpcAssignment,
    updateProduct,
  } = useRFID();

  const [copiedEpc, setCopiedEpc] = useState<string | null>(null);
  const [newEpcInput, setNewEpcInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [lastScannedEpc, setLastScannedEpc] = useState<string | null>(null);

  // Conflict state
  const [conflictData, setConflictData] = useState<{
    epc: string;
    product: Product;
  } | null>(null);

  // Retrieve current product state from ID
  const initialProduct: Product = screenParams?.product || products[0];
  const product = products.find(p => p.id === initialProduct?.id) || initialProduct;

  // Real HID event listener for Scan modal
  useEffect(() => {
    if (!isScanModalOpen || !product) return;

    hidScannerService.start();
    const unsubscribe = hidScannerService.subscribe((event: HidScanEvent) => {
      if (!event.valid || !event.value) return;

      const norm = event.value.trim().toUpperCase();
      setLastScannedEpc(norm);

      if (product.epcList.includes(norm)) {
        soundManager.playTagBeep();
        return;
      }

      const conflict = checkEpcAssignment(norm, product.id);
      if (conflict) {
        soundManager.playAlertBeep();
        setConflictData({ epc: norm, product: conflict });
      } else {
        assignTagToProduct(norm, product.id);
        soundManager.playSuccessChime();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isScanModalOpen, product, checkEpcAssignment, assignTagToProduct]);

  if (!product) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-100 p-8 text-center">
        <AndroidTopBar title="Product Details" />
        <div className="p-8 text-slate-500">Product not found.</div>
      </div>
    );
  }

  const handleFindTag = (epc: string) => {
    setFinderTarget({ product, epc });
    navigateTo('find_radar', { product, epc });
  };

  const handleCopy = (epc: string) => {
    navigator.clipboard?.writeText(epc);
    setCopiedEpc(epc);
    setTimeout(() => setCopiedEpc(null), 1500);
  };

  const handleAddManualTag = (e: React.FormEvent) => {
    e.preventDefault();
    const norm = newEpcInput.trim().toUpperCase();
    if (!norm) return;

    if (product.epcList.includes(norm)) {
      setNewEpcInput('');
      setIsAddingTag(false);
      return;
    }

    const conflict = checkEpcAssignment(norm, product.id);
    if (conflict) {
      soundManager.playAlertBeep();
      setConflictData({ epc: norm, product: conflict });
    } else {
      assignTagToProduct(norm, product.id);
      setNewEpcInput('');
      setIsAddingTag(false);
      soundManager.playSuccessChime();
    }
  };

  const handleReassignConflict = () => {
    if (!conflictData) return;
    const { epc } = conflictData;
    assignTagToProduct(epc, product.id, true);
    soundManager.playSuccessChime();
    setConflictData(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar
        title="Product Details"
        subtitle={product.sku}
        actions={
          <button
            id="btn-edit-product-header"
            onClick={() => navigateTo('add_edit_product', { product })}
            className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
            title="Edit Product"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Main Details Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-[#3f51b5] block">
                {product.category}
              </span>
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {product.name}
              </h2>
              {product.description && (
                <p className="text-xs text-slate-500 mt-1">{product.description}</p>
              )}
            </div>

            <button
              onClick={() => handleFindTag(product.epcList[0] || '')}
              disabled={product.epcList.length === 0}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-xs transition-colors shrink-0 ${
                product.epcList.length > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>FIND</span>
            </button>
          </div>

          {/* Specifications list */}
          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-sans">SKU Code:</span>
              <span className="font-bold text-slate-900">{product.sku}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5" /> Barcode:
              </span>
              <span className="font-bold text-slate-900">{product.barcode || 'N/A'}</span>
            </div>

            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400 font-sans flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Location:
              </span>
              <span className="font-sans font-semibold text-slate-800">{product.location}</span>
            </div>

            <div className="flex justify-between py-1">
              <span className="text-slate-400 font-sans">Target Quantity:</span>
              <span className="font-bold text-[#3f51b5]">{product.expectedQuantity} {product.unit}</span>
            </div>
          </div>

          <button
            id="btn-edit-product-action"
            onClick={() => navigateTo('add_edit_product', { product })}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>EDIT PRODUCT INFORMATION</span>
          </button>
        </div>

        {/* Associated RFID Tags Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#3f51b5]" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                RFID Tags ({product.epcList.length})
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-scan-rfid-details"
                onClick={() => setIsScanModalOpen(true)}
                className="px-3 py-1.5 bg-[#3f51b5] hover:bg-indigo-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-xs"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Scan Tag</span>
              </button>

              <button
                id="btn-add-rfid-tag-toggle"
                onClick={() => setIsAddingTag(!isAddingTag)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Manual</span>
              </button>
            </div>
          </div>

          {/* Add Tag Form */}
          {isAddingTag && (
            <form onSubmit={handleAddManualTag} className="p-3 bg-slate-50 rounded-xl border border-indigo-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                Enter EPC Hex:
              </label>
              <input
                type="text"
                required
                value={newEpcInput}
                onChange={e => setNewEpcInput(e.target.value)}
                placeholder="e.g. E280116060000123"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTag(false)}
                  className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#3f51b5] text-white rounded-xl text-xs font-black shadow-xs"
                >
                  Assign Tag
                </button>
              </div>
            </form>
          )}

          {/* Tags List */}
          <div className="space-y-2.5">
            {product.epcList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No RFID tags associated yet. Tap "Scan Tag" to assign one with the H103 reader.
              </div>
            ) : (
              product.epcList.map((epc, idx) => (
                <div
                  key={epc}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-xs font-bold text-slate-900 break-all select-text">
                        {epc}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Assigned
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopy(epc)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center shrink-0"
                    >
                      {copiedEpc === epc ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <button
                      id={`btn-find-single-tag-${idx}`}
                      onClick={() => handleFindTag(epc)}
                      className="py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>FIND TARGET</span>
                    </button>

                    <button
                      id={`btn-unassign-tag-${idx}`}
                      onClick={() => unassignTagFromProduct(epc, product.id)}
                      className="py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>REMOVE RFID</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Real Scan Modal */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                H103 Tag Assignment
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
                Pull the physical trigger on the paired H103 reader to capture an RFID tag for {product.name}.
              </p>
            </div>

            {lastScannedEpc && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Last Captured:</div>
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

      {/* Duplicate EPC Conflict Modal */}
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
              Reassigning will remove this tag from <b>{conflictData.product.name}</b> and assign it to <b>{product.name}</b>.
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
                id="btn-confirm-reassign-details"
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
