import test from 'node:test';
import assert from 'node:assert/strict';
import { validateReceiptInput, MAX_RECEIPT_TEXT_LENGTH } from '../src/lib/receipt-input';

test('normalises receipt text without dropping line breaks', () => {
  assert.deepEqual(validateReceiptInput({ text: '  Store\nMilk 20000  ' }), {
    ok: true, text: 'Store\nMilk 20000',
  });
});

test('rejects malformed bodies and non-text values before model calls', () => {
  for (const body of [null, [], 42, 'receipt', {}, { text: null }, { text: 42 }, { text: [] }, { text: {} }, { text: '' }, { text: ' \n ' }]) {
    assert.equal(validateReceiptInput(body).ok, false);
  }
});

test('enforces the request limit at the exact boundary', () => {
  assert.equal(validateReceiptInput({ text: 'x'.repeat(MAX_RECEIPT_TEXT_LENGTH) }).ok, true);
  assert.equal(validateReceiptInput({ text: 'x'.repeat(MAX_RECEIPT_TEXT_LENGTH + 1) }).ok, false);
});
