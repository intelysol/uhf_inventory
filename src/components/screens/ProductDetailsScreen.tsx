import React, { useState } from 'react';
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
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { Product } from '../../types/rfid';

export const ProductDetailsScreen: React.FC = () => {
  const {
    screenParams,
    products,
    navigateTo,
    setFinderTarget,
    setFinderProximityManual,
    unassignTagFromProduct,
    assignTagToProduct
  } = useRFID();

  const [copiedEpc, setCopiedEpc] = useState<string | null>(null);
  const [newEpcInput, setNewEpcInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Retrieve current product state from ID
  const initialProduct: Product = screenParams?.product || products[0];
  const product = products.find(p => p.id === initialProduct?.id) || initialProduct;

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
    setFinderProximityManual(85);
    navigateTo('find_radar', { product, epc });
  };

  const handleCopy = (epc: string) => {
    navigator.clipboard?.writeText(epc);
    setCopiedEpc(epc);
    setTimeout(() => setCopiedEpc(null), 1500);
  };

  const handleAddManualTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEpcInput.trim()) return;
    assignTagToProduct(newEpcInput.trim(), product.id);
    setNewEpcInput('');
    setIsAddingTag(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
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
              <span className="text-slate-400 font-sans">Target Count:</span>
              <span className="font-bold text-[#3f51b5]">{product.expectedQuantity} {product.unit}</span>
            </div>
          </div>

          {/* Quick Edit CTA */}
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
                Associated RFID Tags ({product.epcList.length})
              </h3>
            </div>

            <button
              id="btn-add-rfid-tag-toggle"
              onClick={() => setIsAddingTag(!isAddingTag)}
              className="text-xs font-bold text-[#3f51b5] hover:text-indigo-900 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD TAG</span>
            </button>
          </div>

          {/* Add Tag Form */}
          {isAddingTag && (
            <form onSubmit={handleAddManualTag} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="text-[11px] font-bold text-slate-700 block">
                Enter EPC Hex or Scan Sled
              </label>
              <input
                type="text"
                required
                value={newEpcInput}
                onChange={e => setNewEpcInput(e.target.value)}
                placeholder="e.g. E280116060000..."
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
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
                  className="flex-1 py-2 bg-[#3f51b5] text-white rounded-xl text-xs font-bold shadow-xs"
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
                No RFID tags associated yet. Tap "+ ADD TAG" to link one.
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
                          <CheckCircle className="w-3 h-3" /> Status: Active
                        </span>
                        <span>•</span>
                        <span>TID: E2003412 (Optional)</span>
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
                      className="py-2 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <Radio className="w-3.5 h-3.5 text-indigo-200" />
                      <span>FIND TAG</span>
                    </button>

                    <button
                      id={`btn-unassign-tag-${idx}`}
                      onClick={() => unassignTagFromProduct(epc, product.id)}
                      className="py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors border border-red-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>UNASSIGN</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
