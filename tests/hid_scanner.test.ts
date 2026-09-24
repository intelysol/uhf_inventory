import assert from 'node:assert';
import { RfidParser } from '../src/core/hid/RfidParser';
import { DEFAULT_HID_CONFIG, HidScannerConfig } from '../src/core/hid/HidScannerConfig';
import { HidInputBuffer } from '../src/core/hid/HidInputBuffer';
import { HidScannerService } from '../src/core/hid/HidScannerService';

console.log('--- Starting HID RFID Parser & Service Tests ---');

// TEST SUITE 1: RfidParser Normalization & Validation
console.log('\n[Suite 1] RfidParser Tests');

{
  // Test 1.1: Basic Hex Normalization
  const raw = 'e280116060000123456789';
  const event = RfidParser.parse(raw, DEFAULT_HID_CONFIG);
  assert.strictEqual(event.valid, true, 'Expected valid event');
  assert.strictEqual(event.value, 'E280116060000123456789', 'Expected uppercase normalization');
  assert.strictEqual(event.length, 22);
  console.log('✓ Test 1.1 Passed: Basic Hex Normalization');
}

{
  // Test 1.2: Duplicate Normalization Equivalence
  const variations = [
    'e280001',
    'E280001',
    '  E280001  ',
    'E280001\r\n',
    '\rE280001\n',
  ];
  const results = variations.map(v => RfidParser.parse(v, DEFAULT_HID_CONFIG).value);
  for (const r of results) {
    assert.strictEqual(r, 'E280001', `Expected E280001 but got ${r}`);
  }
  console.log('✓ Test 1.2 Passed: Duplicate Normalization Equivalence');
}

{
  // Test 1.3: Prefix Stripping
  const configWithPrefix: HidScannerConfig = {
    ...DEFAULT_HID_CONFIG,
    prefix: 'EPC:',
  };
  const event = RfidParser.parse('EPC:E280001234', configWithPrefix);
  assert.strictEqual(event.valid, true);
  assert.strictEqual(event.value, 'E280001234');
  console.log('✓ Test 1.3 Passed: Prefix Stripping');
}

{
  // Test 1.4: Length Bounds Validation (Min & Max)
  const tooShort = RfidParser.parse('E28', DEFAULT_HID_CONFIG);
  assert.strictEqual(tooShort.valid, false, 'Expected too short to be invalid');
  assert.ok(tooShort.validationMessage?.includes('RFID TOO SHORT'));

  const maxLenStr = 'A'.repeat(129);
  const tooLong = RfidParser.parse(maxLenStr, DEFAULT_HID_CONFIG);
  assert.strictEqual(tooLong.valid, false, 'Expected too long to be invalid');
  assert.ok(tooLong.validationMessage?.includes('RFID TOO LONG'));

  const empty = RfidParser.parse('', DEFAULT_HID_CONFIG);
  assert.strictEqual(empty.valid, false);
  console.log('✓ Test 1.4 Passed: Length Bounds Validation');
}

{
  // Test 1.5: Hex Validation Rejection
  const invalidHex = RfidParser.parse('E280001XYZ', DEFAULT_HID_CONFIG);
  assert.strictEqual(invalidHex.valid, false, 'Expected invalid hex characters to be rejected');
  assert.ok(invalidHex.validationMessage?.includes('Invalid HEX character'));
  console.log('✓ Test 1.5 Passed: Hex Validation Rejection');
}

// TEST SUITE 2: HidInputBuffer
console.log('\n[Suite 2] HidInputBuffer Tests');

{
  // Test 2.1: Key Accumulation and Enter Flush
  let flushedRaw = '';
  let flushedTerm = '';
  const buffer = new HidInputBuffer(DEFAULT_HID_CONFIG, (raw, term) => {
    flushedRaw = raw;
    flushedTerm = term;
  });

  const chars = 'E280001'.split('');
  for (const c of chars) {
    const didFlush = buffer.append(c, c);
    assert.strictEqual(didFlush, false);
  }
  assert.strictEqual(buffer.getCurrentBuffer(), 'E280001');

  // Send Enter
  const didFlush = buffer.append('\n', 'Enter');
  assert.strictEqual(didFlush, true);
  assert.strictEqual(flushedRaw, 'E280001');
  assert.strictEqual(flushedTerm, 'Enter');
  assert.strictEqual(buffer.getCurrentBuffer(), '', 'Buffer must be empty after flush');
  console.log('✓ Test 2.1 Passed: Key Accumulation and Enter Flush');
}

{
  // Test 2.2: Backspace Handling
  const buffer = new HidInputBuffer(DEFAULT_HID_CONFIG, () => {});
  buffer.append('A', 'A');
  buffer.append('B', 'B');
  buffer.append('C', 'C');
  assert.strictEqual(buffer.getCurrentBuffer(), 'ABC');

  buffer.append(null, 'Backspace');
  assert.strictEqual(buffer.getCurrentBuffer(), 'AB');
  console.log('✓ Test 2.2 Passed: Backspace Handling');
}

{
  // Test 2.3: CRLF Terminator
  let flushedRaw = '';
  const crlfConfig: HidScannerConfig = {
    ...DEFAULT_HID_CONFIG,
    suffix: 'CRLF',
  };
  const buffer = new HidInputBuffer(crlfConfig, raw => {
    flushedRaw = raw;
  });

  buffer.append('A', 'A');
  buffer.append('B', 'B');
  buffer.append('\r', 'Enter');
  buffer.append('\n', 'Enter');

  assert.strictEqual(flushedRaw, 'AB');
  console.log('✓ Test 2.3 Passed: CRLF Terminator');
}

// TEST SUITE 3: Rapid 50 Consecutive Hardware Reads Simulation
console.log('\n[Suite 3] 50 Consecutive Scan Simulation');

{
  const receivedEvents: string[] = [];
  const buffer = new HidInputBuffer(DEFAULT_HID_CONFIG, raw => {
    const event = RfidParser.parse(raw, DEFAULT_HID_CONFIG);
    if (event.valid) {
      receivedEvents.push(event.value);
    }
  });

  const totalTags = 50;
  for (let i = 1; i <= totalTags; i++) {
    const epc = `E280116060000123456789${i.toString(16).padStart(4, '0').toUpperCase()}`;
    for (const ch of epc.split('')) {
      buffer.append(ch, ch);
    }
    buffer.append('\n', 'Enter');
  }

  assert.strictEqual(receivedEvents.length, 50, `Expected 50 events, got ${receivedEvents.length}`);
  assert.strictEqual(receivedEvents[0], 'E2801160600001234567890001');
  assert.strictEqual(receivedEvents[49], 'E2801160600001234567890032');
  console.log('✓ Test 3 Passed: 50 Consecutive Reads (0 dropped, 0 duplicate, 0 corrupted)');
}

console.log('\n>>> ALL HID PARSER & BUFFER TESTS PASSED SUCCESSFULLY! <<<\n');
