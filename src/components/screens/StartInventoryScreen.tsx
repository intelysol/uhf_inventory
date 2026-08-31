import React, { useState } from 'react';
import { Play, ClipboardList, MapPin, FileText, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';

export const StartInventoryScreen: React.FC = () => {
  const { products, startInventorySession, readerState } = useRFID();

  const totalExpectedTags = products.reduce((acc, p) => acc + p.epcList.length, 0);

  const [sessionName, setSessionName] = useState('Warehouse A - August Count');
  const [location, setLocation] = useState('Warehouse A (All Zones)');
  const [notes, setNotes] = useState('Quarterly audit count using H103 RFID sled.');
  const [inventoryMode, setInventoryMode] = useState<'expected' | 'blind'>('expected');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName) return;
    startInventorySession(sessionName, location, notes, inventoryMode === 'expected');
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar title="New Inventory" subtitle="Session Setup" />

      <div className="p-4 space-y-4">
        {/* Helper Banner */}
        <div className="bg-[#1a237e] text-white rounded-2xl p-4.5 border border-indigo-800 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black leading-tight">Create Inventory Audit</h2>
              <p className="text-xs text-indigo-200 mt-0.5">
                Verify stock levels against offline local catalog
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
              Expected Inventory Verification
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-mode-expected"
                onClick={() => setInventoryMode('expected')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  inventoryMode === 'expected'
                    ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Imported Catalog</span>
                  {inventoryMode === 'expected' && <CheckCircle2 className="w-4 h-4 text-[#3f51b5]" />}
                </div>
                <div className="mt-2 text-xs font-mono font-bold text-[#3f51b5]">
                  {totalExpectedTags} Expected
                </div>
              </button>

              <button
                type="button"
                id="btn-mode-blind"
                onClick={() => setInventoryMode('blind')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  inventoryMode === 'blind'
                    ? 'bg-indigo-50 border-[#3f51b5] text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">No Expected List</span>
                  {inventoryMode === 'blind' && <CheckCircle2 className="w-4 h-4 text-[#3f51b5]" />}
                </div>
                <div className="mt-2 text-xs font-mono text-slate-500">
                  Blind Count Only
                </div>
              </button>
            </div>
          </div>

          {/* Expected Summary Badge */}
          {inventoryMode === 'expected' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-mono">
              <span className="font-sans font-semibold">Expected Products in Catalog:</span>
              <span className="font-bold text-sm bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                {totalExpectedTags.toLocaleString()} Tags
              </span>
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
