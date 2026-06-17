const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveContractAmountCents } = require('../utils/contractPayment');

test('resolveContractAmountCents — priceEur en euros', () => {
  assert.equal(resolveContractAmountCents({ contractPayload: { priceEur: 150 } }), 15000);
});

test('resolveContractAmountCents — rentAmount lieu', () => {
  assert.equal(resolveContractAmountCents({ contractPayload: { rentAmount: 80.5 } }), 8050);
});

test('resolveContractAmountCents — paymentAmount déjà en centimes', () => {
  assert.equal(resolveContractAmountCents({ paymentAmount: 12000, contractPayload: {} }), 12000);
});

test('resolveContractAmountCents — montant invalide', () => {
  assert.equal(resolveContractAmountCents({ contractPayload: {} }), null);
  assert.equal(resolveContractAmountCents({ contractPayload: { priceEur: 0 } }), null);
});
