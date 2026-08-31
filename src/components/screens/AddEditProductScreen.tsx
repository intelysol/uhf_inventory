import React, { useState, useEffect } from 'react';
import {
  Save,
  Radio,
  Scan,
  Barcode,
  MapPin,
  Tag,
  CheckCircle,
  X,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { Product } from '../../types/rfid';
import { soundManager } from '../../utils/audio';

export const AddEditProductScreen: React.FC = () => {
  const {
    screenParams,
    addProduct,
    updateProduct,
    goBack,
    readerState,
    connectReader
  } = useRFID();

  const editingProduct: Product | undefined = screenParams?.product;

  const [name, setName] = useState(editingProduct?.name || '');
  const [sku, setSku] = useState(editingProduct?.sku || '');
  const [barcode, setBarcode] = useState(editingProduct?.barcode || '');
  const [category, setCategory] = useState(editingProduct?.category || 'Computer Accessories');
  const [location, setLocation] = useState(editingProduct?.location || 'Warehouse A / Rack A01');
  const [description, setDescription] = useState(editingProduct?.description || '');
  const [epc, setEpc] = useState(editingProduct?.epcList[0] || '');

  // Dedicated single-tag scan capture modal
  const [isScanningModalOpen, setIsScanningModalOpen] = useState(false);
  const [capturedEpc, setCapturedEpc] = useState<string | null>(null);
  const [isListeningReader, setIsListeningReader] = useState(false);

  const handleOpenScanModal = () => {
    setIsScanningModalOpen(true);
    setIsListeningReader(true);
    setCapturedEpc(null);

    // Simulate single tag scan if reader is connected
    if (readerState.connected) {
      setTimeout(() => {
        const sampleCaptured = `E280116060000${Math.floor(100 + Math.random() * 900)}`;
        setCapturedEpc(sampleCaptured);
        soundManager.playSuccessChime();
        soundManager.triggerHaptic();
      }, 1200);
    }
  };

  const handleApplyCapturedEpc = () => {
    if (capturedEpc) {
      setEpc(capturedEpc);
    }
    setIsScanningModalOpen(false);
    setIsListeningReader(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sku.trim()) return;

    const epcList = epc.trim() ? [epc.trim()] : [];

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim(),
        category,
        location: location.trim(),
        description: description.trim(),
        epcList: epcList.length > 0 ? epcList : editingProduct.epcList
      });
    } else {
      addProduct({
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || `BC-${sku.trim()}`,
        category,
        location: location.trim(),
        description: description.trim(),
        epcList,
        expectedQuantity: 1,
        unit: 'pcs'
      });
    }

    soundManager.playSuccessChime();
    goBack();
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        subtitle={editingProduct ? editingProduct.sku : 'Offline Catalog Entry'}
      />

      <div className="p-4 space-y-4">
        <form onSubmit={handleSave} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Product Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
              <span>Product Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              id="input-add-prod-name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Dell Wireless Keyboard KB500"
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
            />
          </div>

          {/* SKU and Barcode in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1">
                <span>SKU Code</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                id="input-add-prod-sku"
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
                Barcode / UPC
              </label>
              <input
                id="input-add-prod-barcode"
                type="text"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                placeholder="e.g. 884116382910"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />
            </div>
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              >
                <option value="Computer Accessories">Computer Accessories</option>
                <option value="Industrial Hardware">Industrial Hardware</option>
                <option value="Network Infrastructure">Network Infrastructure</option>
                <option value="Mobile Devices">Mobile Devices</option>
                <option value="Tools & Equipment">Tools & Equipment</option>
                <option value="General Inventory">General Inventory</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Storage Location
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Warehouse A / Rack A03"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />
            </div>
          </div>

          {/* RFID Tag Section with Dedicated Sled Scanner button */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#3f51b5]" />
                <span>Primary RFID Tag EPC</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">Gen2 Hex</span>
            </div>

            <div className="flex gap-2">
              <input
                id="input-add-prod-epc"
                type="text"
                value={epc}
                onChange={e => setEpc(e.target.value)}
                placeholder="e.g. E280116060000123"
                className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none"
              />

              <button
                type="button"
                id="btn-scan-single-tag"
                onClick={handleOpenScanModal}
                className="px-3.5 py-2.5 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all shrink-0"
              >
                <Radio className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                <span>SCAN RFID TAG</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Item specifications, model variant, serial info..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] outline-none resize-none"
            />
          </div>

          {/* SAVE CTA */}
          <div className="pt-3">
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

      {/* Dedicated Single-Tag Capture Modal */}
      {isScanningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm bg-slate-900 text-white rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                Single-Tag Capture
              </span>
              <button
                onClick={() => setIsScanningModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual scan animation */}
            <div className="py-4 flex flex-col items-center">
              <div className="relative w-24 h-24 rounded-full bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Radio className="w-10 h-10 text-indigo-400 animate-pulse" />
                {capturedEpc && (
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 border-2 border-emerald-400 animate-ping" />
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-base font-bold">
                  {capturedEpc ? 'Tag Captured!' : 'Aim H103 at Tag'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">
                  {capturedEpc ? 'RSSI: -44 dBm • Verified' : 'Pull reader trigger or hold close (~10cm)'}
                </p>
              </div>
            </div>

            {capturedEpc ? (
              <div className="p-3 bg-slate-950 border border-emerald-500/50 rounded-xl text-left space-y-1">
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                  Detected EPC Hex
                </span>
                <div className="font-mono text-xs font-bold text-white break-all">
                  {capturedEpc}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-slate-400">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Listening for H103 UHF response...</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsScanningModalOpen(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!capturedEpc}
                onClick={handleApplyCapturedEpc}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold disabled:opacity-40 transition-colors"
              >
                Apply EPC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
