export interface HidScannerConfig {
  prefix: string;
  suffix: 'ENTER' | 'TAB' | 'CR' | 'LF' | 'CRLF' | 'NONE';
  minLength: number;
  maxLength: number;
  validation: 'HEX' | 'ANY';
  uppercase: boolean;
  trimWhitespace: boolean;
  interCharacterTimeoutMs: number;
}

export const DEFAULT_HID_CONFIG: HidScannerConfig = {
  prefix: '',
  suffix: 'ENTER',
  minLength: 4,
  maxLength: 128,
  validation: 'HEX',
  uppercase: true,
  trimWhitespace: true,
  interCharacterTimeoutMs: 100,
};
