export interface HidScanEvent {
  value: string;
  timestamp: number;
  rawInput: string;
  length: number;
  valid: boolean;
  validationMessage?: string;
}

export interface HidDebugState {
  lastKey: string;
  currentBuffer: string;
  lastTerminator: string;
  lastRawInput: string;
  lastNormalizedEpc: string;
  lastValid: boolean;
  lastValidationMessage?: string;
  lastTimestamp: number;
}
