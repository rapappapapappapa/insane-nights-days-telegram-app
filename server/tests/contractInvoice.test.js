const test = require('node:test');
const assert = require('node:assert/strict');
const { formatEurosFromCents } = require('../utils/contractInvoicePdf');
const { formatEurosFromCents: formatFromEmail } = require('../utils/contractInvoiceEmail');

test('formatEurosFromCents', () => {
  assert.equal(formatEurosFromCents(15000), '150,00 €');
  assert.equal(formatEurosFromCents(99), '0,99 €');
  assert.equal(formatEurosFromCents(null), '—');
  assert.equal(formatFromEmail(25050), '250,50 €');
});
