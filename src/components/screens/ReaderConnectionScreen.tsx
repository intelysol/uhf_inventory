import React, { useState } from 'react';
import {
  Radio,
  Bluetooth,
  BatteryMedium,
  CheckCircle,
  XCircle,
  Sliders,
  Volume2,
  Zap,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Signal,
  RotateCcw
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { soundManager } from '../../utils/audio';

export const ReaderConnectionScreen: React.FC = () => {
  const { readerState, updateReaderState, connectReader, disconnectReader } = useRFID();
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handlePowerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    updateReaderState({ rfPower: val });
  };

  const handleTestBeep = () => {
    soundManager.playTagBeep(2800, 0.08, 0.2);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar title="RFID Reader" subtitle="Bluetooth Sled Hardware" showReaderChip={false} />

      <div className="p-4 space-y-4">
        {/* Device Status Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  readerState.connected
                    ? 'bg-indigo-50 text-[#3f51b5] border border-indigo-200'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Radio className={`w-6 h-6 ${readerState.connected ? 'animate-pulse' : ''}`} />
              </div>

              <div>
                <h2 className="text-base font-black text-slate-900 leading-tight">
                  H103 UHF RFID Reader
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      readerState.connected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        readerState.connected ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'
                      }`}
                    />
                    {readerState.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>

            <Bluetooth
              className={`w-5 h-5 ${readerState.connected ? 'text-[#3f51b5]' : 'text-slate-400'}`}
            />
          </div>

          {/* Specs grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center font-mono">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Battery</span>
              <span className="text-sm font-black text-slate-800 flex items-center justify-center gap-1 mt-0.5">
                <BatteryMedium className="w-4 h-4 text-emerald-600" />
                {readerState.battery}%
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Device ID</span>
              <span className="text-xs font-bold text-slate-800 truncate mt-1 block">
                {readerState.deviceName}
              </span>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Signal</span>
              <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1 mt-1 font-sans">
                <Signal className="w-3.5 h-3.5" />
                {readerState.signalStrength}
              </span>
            </div>
          </div>

          {/* Connect / Disconnect CTAs */}
          <div className="pt-1">
            {readerState.connected ? (
              <button
                id="btn-disconnect-reader"
                onClick={disconnectReader}
                className="w-full py-3.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
              >
                <XCircle className="w-4 h-4" />
                DISCONNECT READER
              </button>
            ) : (
              <button
                id="btn-connect-reader"
                onClick={connectReader}
                disabled={readerState.connecting}
                className="w-full py-3.5 bg-[#3f51b5] hover:bg-indigo-600 active:bg-indigo-800 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md border-b-4 border-indigo-900 active:translate-y-0.5 transition-all"
              >
                {readerState.connecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    SEARCHING & CONNECTING...
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-4 h-4 text-indigo-200" />
                    CONNECT TO H103
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Reader Configuration Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#3f51b5]" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Reader Configuration
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-[#3f51b5] bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
              {readerState.rfPower} dBm
            </span>
          </div>

          {/* RF Power Slider */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-700">
              <span>RF Output Power</span>
              <span className="font-mono text-[#3f51b5] font-black text-sm">{readerState.rfPower} dBm</span>
            </div>

            <input
              type="range"
              min="4"
              max="33"
              step="1"
              value={readerState.rfPower}
              onChange={handlePowerChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#3f51b5]"
            />

            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>4 dBm (Near)</span>
              <span>20 dBm</span>
              <span>33 dBm (Max Range ~8m)</span>
            </div>
          </div>

          {/* RF Region & Session */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                RF Region
              </label>
              <select
                value={readerState.rfRegion}
                onChange={e => updateReaderState({ rfRegion: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              >
                <option value="US (902-928 MHz)">US (902-928 MHz)</option>
                <option value="EU (865-868 MHz)">EU (865-868 MHz)</option>
                <option value="China (920-925 MHz)">China (920-925 MHz)</option>
                <option value="Japan (916-921 MHz)">Japan (916-921 MHz)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Gen2 Session
              </label>
              <select
                value={readerState.session}
                onChange={e => updateReaderState({ session: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-medium text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              >
                <option value="S0">S0 (Fast repetition)</option>
                <option value="S1">S1 (Standard Inventory)</option>
                <option value="S2">S2 (Long persistence)</option>
                <option value="S3">S3 (Multi-reader)</option>
              </select>
            </div>
          </div>

          {/* Inventory Mode & Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Inventory Mode
              </label>
              <select
                value={readerState.inventoryMode}
                onChange={e => updateReaderState({ inventoryMode: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              >
                <option value="Fast">Fast (Max Rate)</option>
                <option value="Deep/High Density">Deep / High Density</option>
                <option value="Balanced">Balanced</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Trigger Button Mode
              </label>
              <select
                value={readerState.triggerMode}
                onChange={e => updateReaderState({ triggerMode: e.target.value as any })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#3f51b5]"
              >
                <option value="Toggle">Toggle (Press on/off)</option>
                <option value="Hold to Scan">Hold to Scan</option>
              </select>
            </div>
          </div>

          {/* Buzzer and Vibration toggles */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-[#3f51b5]" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Hardware Buzzer Beep</div>
                  <div className="text-[10px] text-slate-500">Audio chime on tag detection</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={readerState.buzzer}
                onChange={e => {
                  updateReaderState({ buzzer: e.target.checked });
                  if (e.target.checked) handleTestBeep();
                }}
                className="w-5 h-5 rounded-lg text-[#3f51b5] focus:ring-[#3f51b5] accent-[#3f51b5]"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Handle Vibration Feedback</div>
                  <div className="text-[10px] text-slate-500">Haptic pulse in sled grip</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={readerState.vibration}
                onChange={e => updateReaderState({ vibration: e.target.checked })}
                className="w-5 h-5 rounded-lg text-[#3f51b5] focus:ring-[#3f51b5] accent-[#3f51b5]"
              />
            </div>
          </div>

          {/* Advanced Settings Accordion */}
          <div className="border-t border-slate-100 pt-3">
            <button
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-1"
            >
              <span>Advanced RF & Protocol Settings</span>
              {isAdvancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isAdvancedOpen && (
              <div className="mt-3 space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Q-Value (Dynamic Anti-collision)</span>
                  <span className="font-mono font-bold text-slate-900">Q = {readerState.qValue}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Target Algorithm</span>
                  <span className="font-mono font-bold text-slate-900">Flag {readerState.targetAlgorithm}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Auto-Reconnect on Signal Loss</span>
                  <span className="font-bold text-emerald-700">Enabled</span>
                </div>

                <div className="pt-2 border-t border-slate-200 flex justify-between">
                  <button
                    onClick={() => updateReaderState({ qValue: 4, rfPower: 27, session: 'S1' })}
                    className="text-[11px] text-[#3f51b5] font-bold flex items-center gap-1 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset RF Defaults
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono">FW: 3.1.2-H103</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
