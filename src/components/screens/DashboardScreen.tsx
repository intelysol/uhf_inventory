import React from 'react';
import {
  ClipboardList,
  Search,
  Zap,
  Boxes,
  History,
  FileSpreadsheet,
  Sliders,
  Settings,
  ChevronRight,
  Radio,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { ReaderStatusBadge } from '../common/ReaderStatusBadge';

export const DashboardScreen: React.FC = () => {
  const { navigateTo, products, sessions, readerState } = useRFID();

  const totalRegisteredTags = products.reduce((acc, p) => acc + p.epcList.length, 0);

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      {/* Top Section */}
      <header className="bg-[#1a237e] text-white px-5 pt-4 pb-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl text-white">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight tracking-tight">RFID Inventory Pro</h1>
            <p className="text-xs text-indigo-200">H103 Bluetooth Sled Interface • Offline Mode</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-dash-scanner-test"
            onClick={() => navigateTo('scanner_test')}
            className="px-2.5 py-1.5 bg-emerald-500/80 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl border border-emerald-400/30 transition-colors flex items-center gap-1 shadow-xs"
            title="Open H103 Hardware Scanner Test"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>HID Test</span>
          </button>

          <button
            onClick={() => navigateTo('empty_states_demo')}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-100 text-xs font-bold rounded-xl border border-white/20 transition-colors flex items-center gap-1"
            title="Inspect empty and error states gallery"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-200" />
            <span>States UI</span>
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Prominent Reader Status Card */}
        <ReaderStatusBadge />

        {/* Hardware HID Scanner Direct Test Card */}
        <button
          id="btn-dash-scanner-test-card"
          onClick={() => navigateTo('scanner_test')}
          className="w-full text-left bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-3.5 rounded-2xl shadow-md border border-indigo-500/30 active:scale-[0.99] transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-400/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wide flex items-center gap-1.5 text-white">
                <span>H103 HID SCANNER TEST</span>
                <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[9px] font-mono border border-emerald-400/30">
                  REAL HARDWARE
                </span>
              </div>
              <div className="text-[11px] text-indigo-200">
                Direct Bluetooth keyboard input verification & diagnostics
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-300 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Primary Operations Section */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Quick Actions
            </h2>
            <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-bold text-slate-600 uppercase">
              {readerState.connected ? 'Reader Active' : 'Sled Offline'}
            </span>
          </div>

          {/* 1. INVENTORY CARD (Dominant Indigo with 3D tactile border) */}
          <button
            id="btn-dash-inventory"
            onClick={() => navigateTo('start_inventory')}
            className="w-full text-left bg-[#3f51b5] text-white p-4.5 rounded-2xl shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all relative overflow-hidden group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/15 rounded-xl">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="font-black text-xl tracking-tight uppercase flex items-center gap-2">
                    <span>INVENTORY</span>
                    <ChevronRight className="w-5 h-5 text-indigo-200 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="text-xs text-indigo-100 font-medium">Start stock count session</div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full bg-white/15 text-white font-mono text-xs font-bold border border-white/20">
                AUDIT
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-indigo-400/30 flex items-center justify-between text-xs text-indigo-100 font-mono">
              <span>Expected Catalog: <b>{totalRegisteredTags} Tags</b></span>
              <span className="text-green-300 font-sans font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Live Verification
              </span>
            </div>
          </button>

          {/* 2 Grid cards: FIND PRODUCT & QUICK SCAN */}
          <div className="grid grid-cols-2 gap-3">
            {/* FIND PRODUCT */}
            <button
              id="btn-dash-find-product"
              onClick={() => navigateTo('find_search')}
              className="text-left bg-white p-4 rounded-2xl shadow-sm border border-slate-200 active:bg-slate-50 transition-all flex flex-col justify-between min-h-[140px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#3f51b5] flex items-center justify-center border border-indigo-100">
                <Search className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-black text-[#3f51b5] flex items-center justify-between">
                  <span>FIND PRODUCT</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                  Locate specific RFID tag
                </p>
              </div>

              <div className="text-[10px] font-mono font-bold text-indigo-700 pt-2 border-t border-slate-100">
                Radar Active
              </div>
            </button>

            {/* QUICK SCAN */}
            <button
              id="btn-dash-quick-scan"
              onClick={() => navigateTo('quick_scan')}
              className="text-left bg-white p-4 rounded-2xl shadow-sm border border-slate-200 active:bg-slate-50 transition-all flex flex-col justify-between min-h-[140px] group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Zap className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-black text-emerald-600 uppercase flex items-center justify-between">
                  <span>QUICK SCAN</span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">
                  Collect tags rapidly
                </p>
              </div>

              <div className="text-[10px] font-mono font-bold text-emerald-700 pt-2 border-t border-slate-100">
                Raw EPC Stream
              </div>
            </button>
          </div>
        </div>

        {/* Secondary Management Cards */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Catalog & Logs
            </h2>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              {products.length} Products
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
            {/* PRODUCTS */}
            <button
              id="btn-dash-products"
              onClick={() => navigateTo('products')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">PRODUCTS</h4>
                  <p className="text-xs text-slate-500">Database & Tag Association ({products.length} records)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* INVENTORY HISTORY */}
            <button
              id="btn-dash-history"
              onClick={() => navigateTo('inventory_history')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">INVENTORY HISTORY</h4>
                  <p className="text-xs text-slate-500">Audit session logs ({sessions.length} saved)</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>

            {/* IMPORT / EXPORT */}
            <button
              id="btn-dash-import-export"
              onClick={() => navigateTo('import_data')}
              className="w-full p-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">IMPORT / EXPORT</h4>
                  <p className="text-xs text-slate-500">CSV & Excel (.xlsx) data exchange</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Bottom Configuration Links */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            id="btn-dash-reader-settings"
            onClick={() => navigateTo('reader_settings')}
            className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 hover:bg-slate-50 transition-colors text-left shadow-xs"
          >
            <Sliders className="w-4 h-4 text-[#3f51b5]" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">Reader Settings</div>
              <div className="text-[10px] text-slate-500 font-mono">{readerState.rfPower} dBm • {readerState.session}</div>
            </div>
          </button>

          <button
            id="btn-dash-app-settings"
            onClick={() => navigateTo('app_settings')}
            className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 hover:bg-slate-50 transition-colors text-left shadow-xs"
          >
            <Settings className="w-4 h-4 text-[#3f51b5]" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">App Settings</div>
              <div className="text-[10px] text-slate-500 font-mono">Offline Local DB</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
