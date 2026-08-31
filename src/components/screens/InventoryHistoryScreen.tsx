import React, { useState } from 'react';
import {
  History,
  Search,
  Eye,
  Download,
  Calendar,
  MapPin,
  Clock,
  CheckCircle,
  FileSpreadsheet,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { InventorySession } from '../../types/rfid';

export const InventoryHistoryScreen: React.FC = () => {
  const { sessions, navigateTo, deleteSession } = useRFID();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q)
    );
  });

  const handleViewSession = (session: InventorySession) => {
    navigateTo('session_details', { session });
  };

  const handleExport = (session: InventorySession) => {
    navigateTo('export_data', { session });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24 select-none">
      <AndroidTopBar title="Inventory History" subtitle="Previous Audit Logs" />

      <div className="p-4 space-y-4">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-[#3f51b5] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-history-search"
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search session name or location..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3f51b5]"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
              No inventory sessions found.
            </div>
          ) : (
            filteredSessions.map(session => {
              const dateStr = new Date(session.startTime).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#3f51b5]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateStr}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-0.5">
                        {session.name}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{session.location}</span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> Completed
                    </span>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center font-mono">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-sans">Total Tags</span>
                      <span className="text-xs font-black text-slate-900 block mt-0.5">
                        {session.expectedCount || (session.foundCount + session.extraCount)}
                      </span>
                    </div>

                    <div className="bg-emerald-50/80 p-2 rounded-xl border border-emerald-200 text-emerald-900">
                      <span className="text-[9px] uppercase font-bold text-emerald-700 block font-sans">Found</span>
                      <span className="text-xs font-black block mt-0.5">{session.foundCount}</span>
                    </div>

                    <div className="bg-red-50/80 p-2 rounded-xl border border-red-200 text-red-900">
                      <span className="text-[9px] uppercase font-bold text-red-700 block font-sans">Missing</span>
                      <span className="text-xs font-black block mt-0.5">{session.missingCount}</span>
                    </div>

                    <div className="bg-blue-50/80 p-2 rounded-xl border border-blue-200 text-blue-900">
                      <span className="text-[9px] uppercase font-bold text-blue-700 block font-sans">Extra</span>
                      <span className="text-xs font-black block mt-0.5">{session.extraCount}</span>
                    </div>
                  </div>

                  {/* Action Buttons: VIEW & EXPORT */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <button
                      id={`btn-view-session-${session.id}`}
                      onClick={() => handleViewSession(session)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>VIEW DETAILS</span>
                    </button>

                    <button
                      id={`btn-export-session-${session.id}`}
                      onClick={() => handleExport(session)}
                      className="py-2.5 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md border-b-2 border-indigo-950 active:translate-y-0.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-200" />
                      <span>EXPORT</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
