import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useRFID } from '../../context/RFIDContext';
import { AndroidTopBar } from '../common/AndroidTopBar';
import { hidScannerService } from '../../core/hid/HidScannerService';
import { HidScanEvent, HidDebugState } from '../../core/hid/HidScanEvent';
import { HidScannerConfig, DEFAULT_HID_CONFIG } from '../../core/hid/HidScannerConfig';
import { soundManager } from '../../utils/audio';

export const ScannerTestScreen: React.FC = () => {
  const { navigateTo } = useRFID();

  // Scan state
  const [lastEvent, setLastEvent] = useState<HidScanEvent | null>(null);
  const [events, setEvents] = useState<HidScanEvent[]>([]);
  const [totalReads, setTotalReads] = useState<number>(0);
  const [invalidReads, setInvalidReads] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Settings modal / view
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [config, setConfig] = useState<HidScannerConfig>(hidScannerService.getConfig());

  // Debug section collapsible
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [debugState, setDebugState] = useState<HidDebugState>(hidScannerService.getDebugState());

  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    // 1. Ensure HID service is active
    hidScannerService.start();

    // 2. Subscribe to RFID scan events
    const unsubscribeScan = hidScannerService.subscribe((event: HidScanEvent) => {
      setLastEvent(event);
      setEvents(prev => [event, ...prev].slice(0, 20));

      if (event.valid) {
        setTotalReads(prev => prev + 1);
        if (soundRef.current) {
          soundManager.playTagBeep(2600, 0.05, 0.15);
        }
      } else {
        setInvalidReads(prev => prev + 1);
        if (soundRef.current) {
          soundManager.playAlertBeep();
        }
      }
    });

    // 3. Subscribe to real-time debug state
    const unsubscribeDebug = hidScannerService.subscribeDebug((debug: HidDebugState) => {
      setDebugState(debug);
    });

    // Cleanup: Unsubscribe listeners when unmounting ScannerTestScreen
    return () => {
      unsubscribeScan();
      unsubscribeDebug();
    };
  }, []);

  const handleClear = () => {
    setLastEvent(null);
    setEvents([]);
    setTotalReads(0);
    setInvalidReads(0);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    hidScannerService.configure(config);
    setShowSettings(false);
  };

  const handleResetSettings = () => {
    setConfig({ ...DEFAULT_HID_CONFIG });
    hidScannerService.configure(DEFAULT_HID_CONFIG);
  };

  const formatTime = (ts: number): string => {
    if (!ts) return '--:--:--';
    const d = new Date(ts);
    return d.toTimeString().split(' ')[0];
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f0f2f5] overflow-y-auto no-scrollbar pb-24">
      <AndroidTopBar
        title="Scanner Test"
        subtitle="H103 Bluetooth HID Direct Test"
        showReaderChip={false}
      />

      <div className="p-4 space-y-4">
        {/* Hardware Status Banner */}
        <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black tracking-tight uppercase">H103 HID RFID SCANNER</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-300">Status:</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    READY
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Input Mode</div>
              <div className="text-xs font-mono font-bold text-indigo-300">Bluetooth HID</div>
            </div>
          </div>
        </div>

        {/* Action Buttons: CLEAR, SETTINGS, SOUND */}
        <div className="flex items-center gap-2">
          <button
            id="btn-scanner-clear"
            onClick={handleClear}
            className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 active:bg-slate-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-slate-500" />
            <span>CLEAR</span>
          </button>

          <button
            id="btn-scanner-settings"
            onClick={() => setShowSettings(!showSettings)}
            className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-xs flex items-center justify-center gap-1.5 active:bg-slate-100 transition-colors"
          >
            <Sliders className="w-4 h-4 text-[#3f51b5]" />
            <span>SETTINGS</span>
          </button>

          <button
            id="btn-scanner-sound-toggle"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border shadow-xs transition-colors flex items-center justify-center ${
              soundEnabled
                ? 'bg-indigo-50 border-indigo-200 text-[#3f51b5]'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
            title={soundEnabled ? 'Mute Scan Beep' : 'Unmute Scan Beep'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>

        {/* Settings Panel Modal / Accordion */}
        {showSettings && (
          <div className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-md space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#3f51b5]" /> HID Parser Settings
              </h3>
              <button
                onClick={handleResetSettings}
                className="text-[11px] font-bold text-[#3f51b5] flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Terminator Suffix
                  </label>
                  <select
                    value={config.suffix}
                    onChange={e => setConfig({ ...config, suffix: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold"
                  >
                    <option value="ENTER">ENTER (\r or \n)</option>
                    <option value="TAB">TAB (\t)</option>
                    <option value="CR">CR (\r)</option>
                    <option value="LF">LF (\n)</option>
                    <option value="CRLF">CRLF (\r\n)</option>
                    <option value="NONE">NONE (Timeout only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Validation Format
                  </label>
                  <select
                    value={config.validation}
                    onChange={e => setConfig({ ...config, validation: e.target.value as any })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold"
                  >
                    <option value="HEX">HEX (0-9, A-F)</option>
                    <option value="ANY">ANY (Alphanumeric)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Min Length
                  </label>
                  <input
                    type="number"
                    value={config.minLength}
                    onChange={e => setConfig({ ...config, minLength: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Max Length
                  </label>
                  <input
                    type="number"
                    value={config.maxLength}
                    onChange={e => setConfig({ ...config, maxLength: parseInt(e.target.value, 10) || 128 })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    value={config.interCharacterTimeoutMs}
                    onChange={e =>
                      setConfig({ ...config, interCharacterTimeoutMs: parseInt(e.target.value, 10) || 100 })
                    }
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Prefix to Strip
                </label>
                <input
                  type="text"
                  placeholder="e.g. EPC: (leave empty if none)"
                  value={config.prefix}
                  onChange={e => setConfig({ ...config, prefix: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.uppercase}
                    onChange={e => setConfig({ ...config, uppercase: e.target.checked })}
                    className="w-4 h-4 rounded text-[#3f51b5] accent-[#3f51b5]"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Uppercase Normalization</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.trimWhitespace}
                    onChange={e => setConfig({ ...config, trimWhitespace: e.target.checked })}
                    className="w-4 h-4 rounded text-[#3f51b5] accent-[#3f51b5]"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Trim Whitespace</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#3f51b5] text-white font-bold rounded-lg shadow-sm"
                >
                  Apply Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* LAST RFID CARD */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-black uppercase text-slate-500 tracking-wider">LAST RFID</span>
            {lastEvent ? (
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  lastEvent.valid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}
              >
                {lastEvent.valid ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>VALID</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>INVALID</span>
                  </>
                )}
              </span>
            ) : null}
          </div>

          {lastEvent ? (
            <div className="space-y-3">
              <div
                className={`p-3.5 rounded-xl border font-mono text-base font-black break-all select-all tracking-wide ${
                  lastEvent.valid
                    ? 'bg-indigo-50/70 text-[#1a237e] border-indigo-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {lastEvent.value || '<empty>'}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Length</div>
                  <div className="font-mono font-black text-slate-800 text-sm">{lastEvent.length} chars</div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Validation</div>
                  <div
                    className={`font-bold text-sm ${lastEvent.valid ? 'text-emerald-700' : 'text-red-600'}`}
                  >
                    {lastEvent.valid ? 'VALID' : lastEvent.validationMessage || 'INVALID'}
                  </div>
                </div>
              </div>

              {/* Raw Input Display */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Raw Input</div>
                <div className="font-mono text-slate-700 break-all select-all text-[11px]">
                  {JSON.stringify(lastEvent.rawInput)}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-sm font-black text-slate-700 tracking-wide uppercase">
                WAITING FOR RFID INPUT
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Press the physical trigger on the paired H103 reader to scan an RFID tag.
              </p>
            </div>
          )}
        </div>

        {/* STATS SUMMARY CARD */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">TOTAL READS</div>
            <div className="font-mono font-black text-xl text-[#3f51b5] mt-0.5">{totalReads}</div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">INVALID READS</div>
            <div
              className={`font-mono font-black text-xl mt-0.5 ${
                invalidReads > 0 ? 'text-red-600' : 'text-slate-400'
              }`}
            >
              {invalidReads}
            </div>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase">LAST SCAN</div>
            <div className="font-mono font-bold text-xs text-slate-800 mt-1.5 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{lastEvent ? formatTime(lastEvent.timestamp) : '--:--:--'}</span>
            </div>
          </div>
        </div>

        {/* LAST 20 RFID EVENTS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-slate-700">LAST 20 RFID EVENTS</h3>
            <span className="text-[10px] font-mono font-bold text-slate-500">{events.length} recorded</span>
          </div>

          {events.length > 0 ? (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto font-mono text-xs">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-100/70 text-[10px] font-black text-slate-600 uppercase">
                <span className="col-span-3">Time</span>
                <span className="col-span-6">EPC</span>
                <span className="col-span-3 text-right">Status</span>
              </div>

              {events.map((ev, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center hover:bg-slate-50">
                  <span className="col-span-3 text-slate-500 text-[11px]">{formatTime(ev.timestamp)}</span>
                  <span className="col-span-6 font-bold text-slate-800 truncate" title={ev.value}>
                    {ev.value || '<empty>'}
                  </span>
                  <span className="col-span-3 text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        ev.valid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {ev.valid ? 'VALID' : 'INVALID'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">
              No RFID events received yet
            </div>
          )}
        </div>

        {/* COLLAPSIBLE DEBUG INFORMATION SECTION */}
        <div className="bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="w-full p-3.5 flex items-center justify-between hover:bg-slate-800/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                HARDWARE DEBUG CONSOLE
              </span>
            </div>
            {showDebug ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {showDebug && (
            <div className="p-4 border-t border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Last Key:</div>
                  <div className="text-amber-400 font-bold mt-0.5">{debugState.lastKey || '<none>'}</div>
                </div>

                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Terminator:</div>
                  <div className="text-amber-400 font-bold mt-0.5">{debugState.lastTerminator || '<none>'}</div>
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Current Buffer:</div>
                <div className="text-emerald-400 break-all mt-0.5">
                  {debugState.currentBuffer ? `"${debugState.currentBuffer}"` : '<empty>'}
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Last Raw Input:</div>
                <div className="text-slate-300 break-all mt-0.5">
                  {debugState.lastRawInput ? JSON.stringify(debugState.lastRawInput) : '<none>'}
                </div>
              </div>

              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Normalized EPC:</div>
                <div className="text-indigo-300 font-bold break-all mt-0.5">
                  {debugState.lastNormalizedEpc || '<none>'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Valid:</div>
                  <div className={`font-bold mt-0.5 ${debugState.lastValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {debugState.lastValid ? 'YES' : 'NO'}
                    {debugState.lastValidationMessage ? ` (${debugState.lastValidationMessage})` : ''}
                  </div>
                </div>

                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase font-sans font-bold">Timestamp:</div>
                  <div className="text-slate-400 mt-0.5">
                    {debugState.lastTimestamp ? formatTime(debugState.lastTimestamp) : '<none>'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
