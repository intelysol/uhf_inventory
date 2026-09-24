import { HidScannerConfig } from './HidScannerConfig';
import { HidScanEvent } from './HidScanEvent';

export class RfidParser {
  /**
   * Parse and validate raw RFID input from Bluetooth HID keyboard.
   *
   * Processing pipeline:
   * 1. Remove CR/LF
   * 2. Trim whitespace (if trimWhitespace is true)
   * 3. Strip configured prefix (if configured)
   * 4. Uppercase (if uppercase is true)
   * 5. Length validation (minLength <= len <= maxLength)
   * 6. Format validation (HEX / ANY)
   */
  public static parse(rawInput: string, config: HidScannerConfig, timestamp = Date.now()): HidScanEvent {
    let processed = rawInput;

    // 1. Remove CR and LF characters
    processed = processed.replace(/[\r\n]+/g, '');

    // 2. Trim whitespace if enabled
    if (config.trimWhitespace) {
      processed = processed.trim();
    }

    // 3. Remove configured prefix if present
    if (config.prefix && processed.startsWith(config.prefix)) {
      processed = processed.slice(config.prefix.length);
      if (config.trimWhitespace) {
        processed = processed.trim();
      }
    }

    // 4. Uppercase if enabled
    if (config.uppercase) {
      processed = processed.toUpperCase();
    }

    const length = processed.length;

    // Check empty input
    if (length === 0) {
      return {
        value: '',
        rawInput,
        length: 0,
        timestamp,
        valid: false,
        validationMessage: 'Empty RFID input',
      };
    }

    // Check minimum length
    if (length < config.minLength) {
      return {
        value: processed,
        rawInput,
        length,
        timestamp,
        valid: false,
        validationMessage: `RFID TOO SHORT (min: ${config.minLength}, got: ${length})`,
      };
    }

    // Check maximum length
    if (length > config.maxLength) {
      return {
        value: processed,
        rawInput,
        length,
        timestamp,
        valid: false,
        validationMessage: `RFID TOO LONG (max: ${config.maxLength}, got: ${length})`,
      };
    }

    // Check HEX format validation
    if (config.validation === 'HEX') {
      const hexRegex = /^[0-9A-F]+$/i;
      if (!hexRegex.test(processed)) {
        const invalidChars = processed.replace(/[0-9A-F]/gi, '');
        const distinctInvalid = Array.from(new Set(invalidChars.split(''))).join(', ');
        return {
          value: processed,
          rawInput,
          length,
          timestamp,
          valid: false,
          validationMessage: `Invalid HEX character (found: '${distinctInvalid}')`,
        };
      }
    }

    return {
      value: processed,
      rawInput,
      length,
      timestamp,
      valid: true,
    };
  }
}
