import React, { useState } from 'react';
import { Search, Radio, History, ArrowRight, Scan, Boxes, Sparkles } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { Product } from '../../types/rfid';

export const ProductFinderSearchScreen: React.FC = () => {
  const { products, navigateTo, setFinderTarget, setFinderProximityManual } = useRFID();
  const [searchQuery, setSearchQuery] = useState('');

  const recentSearches = [
    { title: 'Dell Keyboard KB500', epc: 'E280116060000123', sku: 'KB-001' },
    { title: 'Logitech MX Master 3S', epc: 'E280116060000456', sku: 'MS-002' },
    { title: 'Zebra TC21 Terminal', epc: 'E280116060000789', sku: 'ZEB-003' }
  ];

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = p.name.toLowerCase().includes(q);
    const matchSku = p.sku.toLowerCase().includes(q);
    const matchBarcode = p.barcode.toLowerCase().includes(q);
    const matchEpc = p.epcList.some(e => e.toLowerCase().includes(q));
    return matchName || matchSku || matchBarcode || matchEpc;
  });

  const handleStartFind = (product: Product, selectedEpc?: string) => {
    const epc = selectedEpc || product.epcList[0] || 'E280116060000123';
    setFinderTarget({ product, epc });
    setFinderProximityManual(82); // Initial target proximity
    navigateTo('find_radar', { product, epc });
  };

  const handleQuickFindEpc = (epc: string, title: string, sku: string) => {
    const matched = products.find(p => p.epcList.includes(epc));
    setFinderTarget({ product: matched, epc });
    setFinderProximityManual(75);
    navigateTo('find_radar', {
      product: matched || {
        id: 'quick-target',
        name: title,
        sku,
        barcode: '',
        category: 'Search Target',
        description: '',
        location: 'Warehouse Floor',
        epcList: [epc],
        expectedQuantity: 1,
        unit: 'pcs',
        updatedAt: ''
      },
      epc
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar title="Find Product" subtitle="RFID Proximity Locator" />

      <div className="p-4 space-y-4">
        {/* Search Input Box */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-[#3f51b5] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-find-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product, SKU, EPC or barcode..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-[#3f51b5] focus:border-[#3f51b5] outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
            <span>Scan H103 reader to locate in warehouse</span>
            <span className="font-mono text-[#3f51b5] font-bold">{filteredProducts.length} Items</span>
          </div>
        </div>

        {/* Recent Searches */}
        {!searchQuery && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              <History className="w-3.5 h-3.5" />
              <span>Recent Targets</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {recentSearches.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-indigo-300 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-black text-slate-900 truncate">{rec.title}</h4>
                    <p className="text-[11px] font-mono text-slate-500">
                      SKU: <span className="text-slate-800 font-bold">{rec.sku}</span> • EPC: {rec.epc.slice(-6)}
                    </p>
                  </div>

                  <button
                    id={`btn-recent-find-${idx}`}
                    onClick={() => handleQuickFindEpc(rec.epc, rec.title, rec.sku)}
                    className="px-3.5 py-2 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all shrink-0"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-200" />
                    <span>FIND</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product Catalog List */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {searchQuery ? 'Search Results' : 'Catalog Products'}
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
                No matching products found. Try searching by EPC or SKU.
              </div>
            ) : (
              filteredProducts.map(product => (
                <div
                  key={product.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">{product.name}</h3>
                      <div className="text-xs font-mono text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>SKU: <b className="text-indigo-950">{product.sku}</b></span>
                        <span>•</span>
                        <span>{product.location}</span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                      {product.epcList.length} Tag{product.epcList.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Primary EPC & FIND CTA */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">Primary EPC</span>
                      <span className="font-mono text-xs font-bold text-slate-800 truncate block">
                        {product.epcList[0] || 'No EPC assigned'}
                      </span>
                    </div>

                    <button
                      id={`btn-find-prod-${product.sku}`}
                      onClick={() => handleStartFind(product)}
                      disabled={product.epcList.length === 0}
                      className="px-4 py-2 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all shrink-0 disabled:opacity-50"
                    >
                      <Radio className="w-3.5 h-3.5 text-indigo-200 animate-pulse" />
                      <span>FIND</span>
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
