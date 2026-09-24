import { DEFAULT_HID_CONFIG, HidScannerConfig } from './HidScannerConfig';
import { HidDebugState, HidScanEvent } from './HidScanEvent';
import { HidInputBuffer } from './HidInputBuffer';
import { RfidParser } from './RfidParser';

export type HidScanListener = (event: HidScanEvent) => void;
export type HidDebugListener = (state: HidDebugState) => void;

export class HidScannerService {
  private config: HidScannerConfig;
  private buffer: HidInputBuffer;
  private active: boolean = false;
  private scanListeners: Set<HidScanListener> = new Set();
  private debugListeners: Set<HidDebugListener> = new Set();

  private debugState: HidDebugState = {
    lastKey: '',
    currentBuffer: '',
    lastTerminator: '',
    lastRawInput: '',
    lastNormalizedEpc: '',
    lastValid: false,
    lastTimestamp: 0,
  };

  constructor(initialConfig: Partial<HidScannerConfig> = {}) {
    this.config = { ...DEFAULT_HID_CONFIG, ...initialConfig };
    this.buffer = new HidInputBuffer(this.config, this.handleBufferFlush.bind(this));
  }

  public isRunning(): boolean {
    return this.active;
  }

  public getConfig(): HidScannerConfig {
    return { ...this.config };
  }

  public configure(newConfig: Partial<HidScannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.buffer.updateConfig(this.config);
  }

  public getDebugState(): HidDebugState {
    return { ...this.debugState };
  }

  /**
   * Start listening for Bluetooth HID keyboard events.
   * Idempotent: safe to call multiple times without creating duplicate listeners.
   */
  public start(): void {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
  }

  /**
   * Stop listening for keyboard events and reset input buffer.
   */
  public stop(): void {
    if (!this.active) return;
    this.active = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    this.buffer.reset();
  }

  /**
   * Subscribe to RFID scan events.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: HidScanListener): () => void {
    this.scanListeners.add(listener);
    return () => {
      this.unsubscribe(listener);
    };
  }

  public unsubscribe(listener: HidScanListener): void {
    this.scanListeners.delete(listener);
  }

  /**
   * Subscribe to real-time debug state changes.
   */
  public subscribeDebug(listener: HidDebugListener): () => void {
    this.debugListeners.add(listener);
    return () => {
      this.debugListeners.delete(listener);
    };
  }

  public unsubscribeDebug(listener: HidDebugListener): void {
    this.debugListeners.delete(listener);
  }

  /**
   * Central Keydown Handler.
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.active) return;

    const target = event.target as HTMLElement | null;
    const isInputTarget =
      target !== null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);

    const { char, keyName, isControlKey } = this.resolveKeyEvent(event);

    // Update debug last key
    this.debugState.lastKey = keyName || char || 'UNKNOWN';

    // If key has no representation and isn't a control key, skip
    if (!char && !keyName) {
      return;
    }

    // When the user is NOT typing into an input field:
    // Prevent default on terminators (like Enter or Tab) to avoid accidental form submits or scrolling
    if (!isInputTarget && (keyName === 'Enter' || keyName === 'Tab' || keyName === 'NumpadEnter')) {
      event.preventDefault();
    }

    // Feed to input buffer
    const didFlush = this.buffer.append(char, keyName);

    // Update debug state current buffer
    this.debugState.currentBuffer = this.buffer.getCurrentBuffer();
    this.notifyDebugListeners();

    // If a complete RFID scan terminated while inside an input field,
    // prevent default Enter behavior (like form submission) if the scanned item was a valid RFID
    if (didFlush && isInputTarget && keyName === 'Enter') {
      if (this.debugState.lastValid) {
        event.preventDefault();
      }
    }
  };

  /**
   * Resolve key character and normalized key name across Android WebViews.
   */
  private resolveKeyEvent(event: KeyboardEvent): {
    char: string | null;
    keyName: string;
    isControlKey: boolean;
  } {
    const key = event.key;
    const code = event.code;
    const keyCode = event.keyCode;

    // Check Enter
    if (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter' || keyCode === 13) {
      return { char: '\n', keyName: 'Enter', isControlKey: true };
    }

    // Check Tab
    if (key === 'Tab' || code === 'Tab' || keyCode === 9) {
      return { char: '\t', keyName: 'Tab', isControlKey: true };
    }

    // Check Backspace
    if (key === 'Backspace' || code === 'Backspace' || keyCode === 8) {
      return { char: null, keyName: 'Backspace', isControlKey: true };
    }

    // Check standard printable characters
    if (key && key.length === 1) {
      return { char: key, keyName: key, isControlKey: false };
    }

    // Fallback for Android WebView code names
    if (code && code.startsWith('Key') && code.length === 4) {
      const c = code.charAt(3);
      const res = event.shiftKey ? c.toUpperCase() : c.toLowerCase();
      return { char: res, keyName: res, isControlKey: false };
    }

    if (code && code.startsWith('Digit') && code.length === 6) {
      const c = code.charAt(5);
      return { char: c, keyName: c, isControlKey: false };
    }

    return { char: null, keyName: key || code || String(keyCode), isControlKey: false };
  }

  /**
   * Buffer flushed: parse, validate, and emit event.
   */
  private handleBufferFlush(rawContent: string, terminator: string): void {
    const now = Date.now();
    const event = RfidParser.parse(rawContent, this.config, now);

    // Update debug state
    this.debugState = {
      lastKey: this.debugState.lastKey,
      currentBuffer: '',
      lastTerminator: terminator,
      lastRawInput: rawContent,
      lastNormalizedEpc: event.value,
      lastValid: event.valid,
      lastValidationMessage: event.validationMessage,
      lastTimestamp: now,
    };

    // Emit event to subscribers
    this.scanListeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error('[HidScannerService] Error in scan listener:', err);
      }
    });

    this.notifyDebugListeners();
  }

  private notifyDebugListeners(): void {
    this.debugListeners.forEach(listener => {
      try {
        listener({ ...this.debugState });
      } catch (err) {
        console.error('[HidScannerService] Error in debug listener:', err);
      }
    });
  }
}

// Global Singleton Instance
export const hidScannerService = new HidScannerService();
