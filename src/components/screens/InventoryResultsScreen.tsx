import React, { useState } from 'react';
import {
  CheckCircle,
  FileSpreadsheet,
  RotateCcw,
  Clock,
  MapPin,
  Search,
  ArrowRight,
  Download,
  Share2,
  Boxes,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { InventorySession, TagStatus } from '../../types/rfid';
import { AndroidTopBar } from '../common/AndroidTopBar';

export const InventoryResultsScreen: React.FC = () => {
  const { screenParams, navigateTo, sessions } = useRFID();
  const [activeTab, setActiveTab] = useState<'FOUND' | 'MISSING' | 'EXTRA' | 'UNKNOWN' | 'ALL'>('FOUND');
  const [searchQuery, setSearchQuery] = useState('');

  // Get session from params or latest completed session
  const session: InventorySession = screenParams?.session || sessions[0] || {
    id: 'res-default',
    name: 'Warehouse A - August Count',
    location: 'Warehouse A (All Zones)',
    startTime: '2026-08-31T10:02:40Z',
    endTime: '2026-08-31T10:21:22Z',
    durationSeconds: 1122,
    expectedCount: 1297,
    foundCount: 1284,
    missingCount: 13,
    extraCount: 8,
    unknownCount: 5,
    totalReads: 18432,
    status: 'COMPLETED',
    scannedTags: []
  };

  const durationFormatted = `${Math.floor(session.durationSeconds / 60)} minutes ${session.durationSeconds % 60} seconds`;

  const filteredTags = session.scannedTags.filter(tag => {
    if (activeTab !== 'ALL' && tag.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tag.epc.toLowerCase().includes(q) ||
        tag.productName?.toLowerCase().includes(q) ||
        tag.sku?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar title="Audit Results" subtitle="Count Complete" />

      <div className="p-4 space-y-4">
        {/* Success Header Card */}
        <div className="bg-[#1a237e] text-white rounded-2xl p-5 border border-indigo-800 shadow-md">
          <div className="flex items-center gap-2 text-green-300 text-xs font-bold uppercase tracking-wider mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span>Inventory Complete</span>
          </div>

          <h2 className="text-lg font-black leading-tight">{session.name}</h2>
          <div className="flex items-center gap-2 text-xs text-indigo-200 font-mono mt-1">
            <MapPin className="w-3.5 h-3.5 text-indigo-300" />
            <span>{session.location}</span>
            <span>•</span>
            <Clock className="w-3.5 h-3.5 text-indigo-300" />
            <span>{durationFormatted}</span>
          </div>

          {/* Large Summary Counter */}
          <div className="mt-4 pt-3 border-t border-indigo-700/80 flex items-baseline justify-between">
            <div>
              <span className="text-[11px] font-mono text-indigo-200 uppercase font-bold">Total Tags Scanned</span>
              <div className="text-4xl font-black font-mono text-white mt-0.5">
                {(session.foundCount + session.extraCount + session.unknownCount).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-indigo-200 uppercase">Match Accuracy</span>
              <div className="text-xl font-black font-mono text-green-300">
                {session.expectedCount > 0 ? ((session.foundCount / session.expectedCount) * 100).toFixed(1) : '100'}%
              </div>
            </div>
          </div>
        </div>

        {/* 5 Stats Cards Grid */}
        <div className="grid grid-cols-5 gap-1.5 text-center">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Expected</span>
            <span className="text-sm font-black font-mono text-slate-800 mt-0.5 block">{session.expectedCount}</span>
          </div>
          <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-emerald-900 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-emerald-700 block truncate">Found</span>
            <span className="text-sm font-black font-mono text-emerald-800 mt-0.5 block">{session.foundCount}</span>
          </div>
          <div className="bg-red-50 p-2.5 rounded-xl border border-red-200 text-red-900 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-red-700 block truncate">Missing</span>
            <span className="text-sm font-black font-mono text-red-800 mt-0.5 block">{session.missingCount}</span>
          </div>
          <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-blue-900 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-blue-700 block truncate">Extra</span>
            <span className="text-sm font-black font-mono text-blue-800 mt-0.5 block">{session.extraCount}</span>
          </div>
          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 shadow-xs">
            <span className="text-[9px] uppercase font-bold text-amber-700 block truncate">Unknown</span>
            <span className="text-sm font-black font-mono text-amber-800 mt-0.5 block">{session.unknownCount}</span>
          </div>
        </div>

        {/* Tabs & Product List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 overflow-x-auto no-scrollbar">
            {(['FOUND', 'MISSING', 'EXTRA', 'UNKNOWN', 'ALL'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  activeTab === tab
                    ? 'bg-white text-[#3f51b5] shadow-xs border border-slate-200 font-black'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search within tab */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab} items...`}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3f51b5] font-medium"
              />
            </div>
          </div>

          {/* List */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto no-scrollbar">
            {filteredTags.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No tags found in this category.
              </div>
            ) : (
              filteredTags.map(tag => (
                <div key={tag.epc} className="p-3 hover:bg-slate-50 transition-colors space-y-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {tag.productName || 'Uncataloged Item'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        SKU: <span className="text-indigo-900 font-semibold">{tag.sku || 'N/A'}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        tag.status === 'FOUND'
                          ? 'bg-emerald-100 text-emerald-800'
                          : tag.status === 'MISSING'
                          ? 'bg-red-100 text-red-800'
                          : tag.status === 'EXTRA'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {tag.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="truncate max-w-[200px]">{tag.epc}</span>
                    <span>{tag.readCount > 0 ? `${tag.readCount} reads` : 'Unread'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            id="btn-results-export"
            onClick={() => navigateTo('export_data', { session })}
            className="w-full py-4 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all"
          >
            <Download className="w-4 h-4 text-indigo-200" />
            <span>EXPORT INVENTORY (CSV / EXCEL)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-results-history"
              onClick={() => navigateTo('inventory_history')}
              className="py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Boxes className="w-4 h-4 text-slate-600" />
              <span>SAVED INVENTORY</span>
            </button>

            <button
              id="btn-results-start-another"
              onClick={() => navigateTo('start_inventory')}
              className="py-3 bg-[#1a237e] hover:bg-[#121858] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-indigo-200" />
              <span>START ANOTHER SCAN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
