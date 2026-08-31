import React, { useState } from 'react';
import { AlertTriangle, Plus, CheckCircle, X, Link, Radio } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';

export const UnknownTagModal: React.FC = () => {
  const {
    unknownTagPrompt,
    setUnknownTagPrompt,
    products,
    assignUnknownTag,
    createProductFromUnknownTag,
    ignoreUnknownTag
  } = useRFID();

  const [mode, setMode] = useState<'main' | 'assign' | 'create'>('main');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [newProdName, setNewProdName] = useState<string>('');
  const [newProdSku, setNewProdSku] = useState<string>('');
  const [newProdLoc, setNewProdLoc] = useState<string>('Warehouse A / Bin 01');

  if (!unknownTagPrompt) return null;

  const handleAssign = () => {
    if (!selectedProductId) return;
    assignUnknownTag(unknownTagPrompt.epc, selectedProductId);
    setMode('main');
  };

  const handleCreate = () => {
    if (!newProdName) return;
    const sku = newProdSku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
    createProductFromUnknownTag(unknownTagPrompt.epc, newProdName, sku, newProdLoc);
    setMode('main');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#1a237e] text-white p-4 flex items-center justify-between border-b-2 border-indigo-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 text-amber-300 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Unknown RFID Tag</h3>
              <p className="text-xs text-indigo-200 font-medium">Unregistered EPC Detected</p>
            </div>
          </div>

          <button
            onClick={() => setUnknownTagPrompt(null)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* EPC Info Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">Target EPC</span>
              <div className="font-mono text-sm font-bold text-slate-900 break-all select-text">
                {unknownTagPrompt.epc}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-xs text-slate-600 font-mono">
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5 text-[#3f51b5]" />
                Signal: <b className="text-slate-900">{unknownTagPrompt.rssi} dBm</b>
              </span>
              <span>
                First Seen: <b className="text-slate-900">{unknownTagPrompt.firstSeen}</b>
              </span>
            </div>
          </div>

          {mode === 'main' && (
            <div className="space-y-2.5 pt-1">
              <button
                id="btn-assign-unknown-tag"
                onClick={() => setMode('assign')}
                className="w-full py-3.5 px-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all"
              >
                <Link className="w-4 h-4 text-indigo-200" />
                ASSIGN TO PRODUCT
              </button>

              <button
                id="btn-create-product-unknown-tag"
                onClick={() => {
                  setNewProdName(`New Item ${unknownTagPrompt.epc.slice(-4)}`);
                  setNewProdSku(`SKU-${unknownTagPrompt.epc.slice(-4)}`);
                  setMode('create');
                }}
                className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-300 transition-all"
              >
                <Plus className="w-4 h-4 text-slate-700" />
                CREATE NEW PRODUCT
              </button>

              <button
                id="btn-ignore-unknown-tag"
                onClick={() => ignoreUnknownTag(unknownTagPrompt.epc)}
                className="w-full py-2.5 px-4 text-slate-500 hover:text-slate-700 font-medium text-xs text-center"
              >
                Ignore this tag for this session
              </button>
            </div>
          )}

          {mode === 'assign' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Select Existing Product
              </label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 focus:ring-2 focus:ring-[#3f51b5] font-medium"
              >
                <option value="">-- Choose Product --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMode('main')}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedProductId}
                  onClick={handleAssign}
                  className="flex-1 py-2.5 bg-[#3f51b5] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Confirm Assign
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block">Product Name *</label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-medium focus:ring-2 focus:ring-[#3f51b5]"
                  placeholder="e.g. Wireless Barcode Scanner"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block">SKU Code</label>
                <input
                  type="text"
                  value={newProdSku}
                  onChange={e => setNewProdSku(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-900 font-mono focus:ring-2 focus:ring-[#3f51b5]"
                  placeholder="e.g. WBS-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setMode('main')}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={!newProdName}
                  onClick={handleCreate}
                  className="flex-1 py-2.5 bg-[#3f51b5] text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Create & Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
