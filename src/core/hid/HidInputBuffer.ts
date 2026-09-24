import { HidScannerConfig } from './HidScannerConfig';

export type BufferFlushCallback = (rawContent: string, terminator: string) => void;

export class HidInputBuffer {
  private buffer: string = '';
  private timestamps: number[] = [];
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private config: HidScannerConfig;
  private onFlush: BufferFlushCallback;

  constructor(config: HidScannerConfig, onFlush: BufferFlushCallback) {
    this.config = config;
    this.onFlush = onFlush;
  }

  public updateConfig(config: HidScannerConfig): void {
    this.config = config;
  }

  public getCurrentBuffer(): string {
    return this.buffer;
  }

  /**
   * Append a character or handle control keys.
   * Returns true if a terminator was encountered and the buffer was flushed.
   */
  public append(char: string | null, keyName?: string): boolean {
    const now = Date.now();
    this.clearTimer();

    // 1. Handle Backspace
    if (keyName === 'Backspace' || char === '\b') {
      if (this.buffer.length > 0) {
        this.buffer = this.buffer.slice(0, -1);
        this.timestamps.pop();
      }
      return false;
    }

    // 2. Check if this key constitutes a configured terminator
    const isTerminator = this.isTerminatorKey(char, keyName);

    if (isTerminator) {
      const raw = this.buffer;
      const term = keyName || (char ?? 'UNKNOWN');
      this.reset();
      if (raw.length > 0) {
        this.onFlush(raw, term);
      }
      return true;
    }

    // If no printable char, ignore
    if (!char) {
      return false;
    }

    // 3. Append printable char
    this.buffer += char;
    this.timestamps.push(now);

    // 4. Schedule timeout handling
    this.armTimeout();

    return false;
  }

  private isTerminatorKey(char: string | null, keyName?: string): boolean {
    const suffix = this.config.suffix;

    if (suffix === 'ENTER') {
      return keyName === 'Enter' || keyName === 'NumpadEnter' || char === '\r' || char === '\n';
    }

    if (suffix === 'TAB') {
      return keyName === 'Tab' || char === '\t';
    }

    if (suffix === 'CR') {
      return char === '\r';
    }

    if (suffix === 'LF') {
      return char === '\n';
    }

    if (suffix === 'CRLF') {
      if (char === '\n' && this.buffer.endsWith('\r')) {
        // Remove the preceding '\r' from the buffer before flush
        this.buffer = this.buffer.slice(0, -1);
        return true;
      }
      return false;
    }

    if (suffix === 'NONE') {
      return false;
    }

    return false;
  }

  private armTimeout(): void {
    const timeoutMs = this.config.interCharacterTimeoutMs;

    this.timeoutTimer = setTimeout(() => {
      if (this.buffer.length > 0) {
        if (this.config.suffix === 'NONE') {
          // In NONE mode, timeout marks completion of the scan
          const raw = this.buffer;
          this.reset();
          this.onFlush(raw, 'TIMEOUT');
        } else {
          // In terminator modes, if stale characters remain uncompleted for too long,
          // clear them so they do not contaminate the next scan
          this.reset();
        }
      }
    }, Math.max(timeoutMs, 100));
  }

  private clearTimer(): void {
    if (this.timeoutTimer !== null) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  public reset(): void {
    this.clearTimer();
    this.buffer = '';
    this.timestamps = [];
  }

  public getAverageInterCharTime(): number {
    if (this.timestamps.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < this.timestamps.length; i++) {
      sum += this.timestamps[i] - this.timestamps[i - 1];
    }
    return sum / (this.timestamps.length - 1);
  }
}
