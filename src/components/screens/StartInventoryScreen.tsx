import React, { useState, useMemo } from 'react';
import { Play, ClipboardList, MapPin, FileText, CheckCircle2, AlertCircle, CheckSquare, Square as SquareIcon, Search } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';

export const StartInventoryScreen: React.FC = () => {
  const { products, startInventorySession, readerState } = useRFID();

  const totalExpectedTags = useMemo(
    () => products.reduce((acc, p) => acc + (p.epcList ? p.epcList.length : 0), 0),
    [products]
  );

  const [sessionName, setSessionName] = useState('Warehouse A - Inventory Count');
  const [location, setLocation] = useState('Warehouse A (All Zones)');
  const [notes, setNotes] = useState('');
  const [inventoryMode, setInventoryMode] = useState<'ALL' | 'SELECT' | 'BLIND'>('ALL');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const selectedTagsCount = useMemo(() => {
    const selectedSet = new Set(selectedProductIds);
    return products
      .filter(p => selectedSet.has(p.id))
      .reduce((acc, p) => acc + (p.epcList ? p.epcList.length : 0), 0);
  }, [products, selectedProductIds]);

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedProductIds(products.map(p => p.id));
  };

  const handleDeselectAll = () => {
    setSelectedProductIds([]);
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;

    if (inventoryMode === 'ALL') {
      startInventorySession(sessionName.trim(), location.trim(), notes.trim(), 'ALL');
    } else if (inventoryMode === 'SELECT') {
      if (selectedProductIds.length === 0) {
        alert('Please select at least one product for this audit, or choose All Products.');
        return;
      }
      startInventorySession(sessionName.trim(), location.trim(), notes.trim(), selectedProductIds);
    } else {
      startInventorySession(sessionName.trim(), location.trim(), notes.trim(), 'BLIND');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar title="New Inventory" subtitle="Session Setup" />

      <div className="p-4 space-y-4">
        {/* Helper Banner */}
        <div className="bg-[#1a237e] text-white rounded-2xl p-4.5 border border-indigo-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black leading-tight">Create Inventory Audit</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Scan RFID tags with Chafon H103 and compare against expected products
              </p>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleStart} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Session Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>Inventory Session Name</span>
              <span className="text-red-500">*</span>
            </label>
            <input
              id="input-session-name"
              type="text"
              required
              value={sessionName}
              onChange={e => setSessionName(e.target.value)}
              placeholder="e.g. Warehouse A - August Count"
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] focus:border-[#3f51b5] outline-none transition-all"
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#3f51b5]" />
              <span>Location / Zone</span>
            </label>
            <input
              id="input-session-location"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Warehouse A / Rack 01-10"
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] focus:border-[#3f51b5] outline-none transition-all"
            />
          </div>

          {/* Expected Inventory Choice */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
              Expected Inventory Verification Mode
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="btn-mode-all"
                onClick={() => setInventoryMode('ALL')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  inventoryMode === 'ALL'
                    ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black">All Catalog</span>
                  {inventoryMode === 'ALL' && <CheckCircle2 className="w-3.5 h-3.5 text-[#3f51b5]" />}
                </div>
                <div className="mt-1.5 text-[11px] font-mono font-bold text-[#3f51b5]">
                  {totalExpectedTags} Tags
                </div>
              </button>

              <button
                type="button"
                id="btn-mode-select"
                onClick={() => {
                  setInventoryMode('SELECT');
                  if (selectedProductIds.length === 0) {
                    setSelectedProductIds(products.map(p => p.id));
                  }
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  inventoryMode === 'SELECT'
                    ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black">Select Specific</span>
                  {inventoryMode === 'SELECT' && <CheckCircle2 className="w-3.5 h-3.5 text-[#3f51b5]" />}
                </div>
                <div className="mt-1.5 text-[11px] font-mono font-bold text-[#3f51b5]">
                  {selectedProductIds.length} Selected
                </div>
              </button>

              <button
                type="button"
                id="btn-mode-blind"
                onClick={() => setInventoryMode('BLIND')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  inventoryMode === 'BLIND'
                    ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black">Blind Count</span>
                  {inventoryMode === 'BLIND' && <CheckCircle2 className="w-3.5 h-3.5 text-[#3f51b5]" />}
                </div>
                <div className="mt-1.5 text-[11px] font-mono text-slate-500">
                  No Target List
                </div>
              </button>
            </div>
          </div>

          {/* Mode Summary & Product Selector */}
          {inventoryMode === 'ALL' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-mono">
              <span className="font-sans font-semibold">Comparing against all products:</span>
              <span className="font-bold text-sm bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                {totalExpectedTags.toLocaleString()} Tags ({products.length} Products)
              </span>
            </div>
          )}

          {inventoryMode === 'SELECT' && (
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">
                  Selected: {selectedProductIds.length} Products ({selectedTagsCount} RFID Tags)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-[#3f51b5] font-bold hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] text-slate-500 font-bold hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Product search filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Filter products..."
                  className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-[#3f51b5]"
                />
              </div>

              {/* Product selection checklist */}
              <div className="max-h-44 overflow-y-auto space-y-1 divide-y divide-slate-100 bg-white rounded-lg border border-slate-200 p-1">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">No products match</div>
                ) : (
                  filteredProducts.map(p => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#3f51b5] shrink-0" />
                          ) : (
                            <SquareIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0 truncate">
                            <div className="text-xs font-bold text-slate-900 truncate">{p.name}</div>
                            <div className="text-[10px] font-mono text-slate-500 truncate">SKU: {p.sku}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                          {p.epcList.length} tags
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {inventoryMode === 'BLIND' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <span className="font-bold">Blind Count Active:</span> All scanned tags will be recorded without comparing against an expected catalog. Catalog products will be labelled as FOUND and unregistered tags as UNKNOWN.
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Audit Notes (Optional)</span>
            </label>
            <textarea
              id="input-session-notes"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add operator notes, shift info, or bay boundaries..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] focus:border-[#3f51b5] outline-none transition-all resize-none"
            />
          </div>

          {!readerState.connected && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>H103 Reader is currently disconnected. You can still initiate the session and connect on the live scan screen.</span>
            </div>
          )}

          {/* Primary CTA: START INVENTORY */}
          <div className="pt-2">
            <button
              id="btn-start-inventory-submit"
              type="submit"
              className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>START INVENTORY</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
