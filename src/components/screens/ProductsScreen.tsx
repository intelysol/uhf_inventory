import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Eye,
  Radio,
  MapPin,
  Tag,
  ArrowRight,
  ChevronRight,
  Layers
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { Product } from '../../types/rfid';

export const ProductsScreen: React.FC = () => {
  const { products, navigateTo, setFinderTarget, setFinderProximityManual } = useRFID();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedTagFilter, setSelectedTagFilter] = useState<'ALL' | 'TAGGED' | 'UNTAGGED'>('ALL');

  const categories = ['ALL', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchLoc = p.location.toLowerCase().includes(q);
      const matchEpc = p.epcList.some(e => e.toLowerCase().includes(q));
      if (!matchName && !matchSku && !matchLoc && !matchEpc) return false;
    }

    // Category
    if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
      return false;
    }

    // Tagged filter
    if (selectedTagFilter === 'TAGGED' && p.epcList.length === 0) return false;
    if (selectedTagFilter === 'UNTAGGED' && p.epcList.length > 0) return false;

    return true;
  });

  const handleFind = (product: Product) => {
    const epc = product.epcList[0] || 'E280116060000123';
    setFinderTarget({ product, epc });
    setFinderProximityManual(80);
    navigateTo('find_radar', { product, epc });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar
        title="Products"
        subtitle="Catalog & Tag Registry"
        actions={
          <button
            id="btn-add-product-top"
            onClick={() => navigateTo('add_edit_product')}
            className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center shadow-xs hover:bg-white/30 transition-colors"
            title="Add Product"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#3f51b5] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-product-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search SKU, product, EPC..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3f51b5]"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0">
              Filter:
            </span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#1a237e] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Action button to add product */}
        <button
          id="btn-add-product-card"
          onClick={() => navigateTo('add_edit_product')}
          className="w-full py-3.5 bg-white hover:bg-indigo-50 text-[#3f51b5] border-2 border-dashed border-indigo-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4 text-[#3f51b5]" />
          <span>+ ADD NEW PRODUCT</span>
        </button>

        {/* Product Cards List */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
              No products found matching your search.
            </div>
          ) : (
            filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-mono font-bold text-[#3f51b5] block">
                      {product.category}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {product.name}
                    </h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-[#3f51b5] font-mono text-[10px] font-bold border border-indigo-200 shrink-0">
                    RFID Tags: {product.epcList.length}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">SKU:</span>
                    <span className="font-bold text-slate-900">{product.sku}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="text-slate-700 font-sans font-medium">{product.location}</span>
                  </div>
                </div>

                {/* Card Actions: VIEW & FIND */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <button
                    id={`btn-view-product-${product.sku}`}
                    onClick={() => navigateTo('product_details', { product })}
                    className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>VIEW</span>
                  </button>

                  <button
                    id={`btn-find-product-card-${product.sku}`}
                    onClick={() => handleFind(product)}
                    disabled={product.epcList.length === 0}
                    className="py-2 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all disabled:opacity-40"
                  >
                    <Radio className="w-3.5 h-3.5 text-indigo-200" />
                    <span>FIND</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
