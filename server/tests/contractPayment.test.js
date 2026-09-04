const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveContractAmountCents,
  assertPayloadHasMinAmount,
} = require('../utils/contractPayment');

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

test('assertPayloadHasMinAmount — refuse sans prix', () => {
  assert.throws(() => assertPayloadHasMinAmount({}), /0,50/);
  assert.throws(() => assertPayloadHasMinAmount({ priceEur: 0 }), /0,50/);
});

test('assertPayloadHasMinAmount — accepte 0,50 €', () => {
  assert.equal(assertPayloadHasMinAmount({ priceEur: 0.5 }), 50);
});
