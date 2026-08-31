import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Download,
  Trash2,
  FileSpreadsheet,
  Search,
  CheckCircle,
  AlertTriangle,
  Radio,
  ArrowRight
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { InventorySession, TagStatus } from '../../types/rfid';
import { StorageService } from '../../services/storage';

export const InventorySessionDetailsScreen: React.FC = () => {
  const { screenParams, sessions, deleteSession, goBack, navigateTo } = useRFID();
  const [activeTab, setActiveTab] = useState<'ALL' | TagStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const session: InventorySession = screenParams?.session || sessions[0];

  if (!session) {
    return (
      <div className="w-full h-full flex flex-col bg-slate-100 p-8 text-center">
        <AndroidTopBar title="Session Details" />
        <div className="p-8 text-slate-500">Session not found.</div>
      </div>
    );
  }

  const durationFormatted = `${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s`;
  const dateFormatted = new Date(session.startTime).toLocaleString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const filteredTags = session.scannedTags.filter(t => {
    if (activeTab !== 'ALL' && t.status !== activeTab) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.epc.toLowerCase().includes(q) ||
        t.productName?.toLowerCase().includes(q) ||
        t.sku?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportFormat = (fmt: 'CSV' | 'XLSX') => {
    const { filename, blob } = StorageService.exportInventory(session, fmt, {
      includeProductInfo: true,
      includeRssi: true,
      includeReadCount: true,
      includeFirstSeen: true,
      includeLastSeen: true,
      includeMissing: true,
      includeExtra: true,
      includeUnknown: true
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete session "${session.name}"?`)) {
      deleteSession(session.id);
      goBack();
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Session Details" subtitle={session.name} />

      <div className="p-4 space-y-4">
        {/* Header Summary Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-[#3f51b5] block">
              Audit Record
            </span>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {session.name}
            </h2>
            <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{session.location}</span>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono text-slate-600">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">Date & Time</span>
              <span className="font-bold text-slate-900 block mt-0.5">{dateFormatted}</span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-sans font-bold">Scan Duration</span>
              <span className="font-bold text-slate-900 block mt-0.5">{durationFormatted}</span>
            </div>
          </div>

          {/* 5 Stats Cards Grid */}
          <div className="grid grid-cols-5 gap-1.5 pt-1 text-center font-mono">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
              <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Expected</span>
              <span className="text-xs font-black text-slate-900 block mt-0.5">{session.expectedCount}</span>
            </div>
            <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-200 text-emerald-900">
              <span className="text-[9px] uppercase font-bold text-emerald-700 block font-sans">Found</span>
              <span className="text-xs font-black block mt-0.5">{session.foundCount}</span>
            </div>
            <div className="bg-red-50 p-2 rounded-xl border border-red-200 text-red-900">
              <span className="text-[9px] uppercase font-bold text-red-700 block font-sans">Missing</span>
              <span className="text-xs font-black block mt-0.5">{session.missingCount}</span>
            </div>
            <div className="bg-blue-50 p-2 rounded-xl border border-blue-200 text-blue-900">
              <span className="text-[9px] uppercase font-bold text-blue-700 block font-sans">Extra</span>
              <span className="text-xs font-black block mt-0.5">{session.extraCount}</span>
            </div>
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-900">
              <span className="text-[9px] uppercase font-bold text-amber-700 block font-sans">Unknown</span>
              <span className="text-xs font-black block mt-0.5">{session.unknownCount}</span>
            </div>
          </div>
        </div>

        {/* Tag List Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1 overflow-x-auto no-scrollbar">
            {(['ALL', 'FOUND', 'MISSING', 'EXTRA', 'UNKNOWN'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  activeTab === tab
                    ? 'bg-[#1a237e] text-white shadow-xs font-black'
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
              <Search className="w-4 h-4 text-[#3f51b5] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search EPC / SKU / Product..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3f51b5] font-medium"
              />
            </div>
          </div>

          {/* List items */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto no-scrollbar">
            {filteredTags.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No tags recorded in this category.
              </div>
            ) : (
              filteredTags.map(tag => (
                <div key={tag.epc} className="p-3 space-y-1 hover:bg-slate-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{tag.productName || 'Unassigned EPC'}</div>
                      <div className="text-[11px] font-mono text-slate-500">SKU: {tag.sku || 'N/A'}</div>
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
                  <div className="font-mono text-[11px] text-slate-400 select-text truncate">
                    {tag.epc}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Primary Export & Delete CTAs */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-export-csv"
              onClick={() => handleExportFormat('CSV')}
              className="py-3.5 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all"
            >
              <Download className="w-4 h-4 text-indigo-200" />
              <span>EXPORT CSV</span>
            </button>

            <button
              id="btn-export-excel"
              onClick={() => handleExportFormat('XLSX')}
              className="py-3.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md border-b-2 border-emerald-950 active:translate-y-0.5 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>EXPORT EXCEL</span>
            </button>
          </div>

          <button
            id="btn-delete-session"
            onClick={handleDelete}
            className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>DELETE THIS SESSION</span>
          </button>
        </div>
      </div>
    </div>
  );
};
