const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTicketTiersInput,
  parseTicketTiersFromDb,
  resolvePurchaseTier,
  minTierPriceEUR,
} = require('../utils/ticketTiers');

test('normalizeTicketTiersInput valide et normalise les tarifs', () => {
  const tiers = normalizeTicketTiersInput([
    { label: 'Early bird', price: '15,5' },
    { label: 'VIP', price: 30, maxSold: 10 },
  ]);

  assert.equal(tiers.length, 2);
  assert.equal(tiers[0].label, 'Early bird');
  assert.equal(tiers[0].price, 15.5);
  assert.equal(tiers[1].maxSold, 10);
});

test('normalizeTicketTiersInput rejette un tarif sans prix', () => {
  assert.throws(
    () => normalizeTicketTiersInput([{ label: 'Gratuit', price: 0 }]),
    /Tarif invalide/,
  );
});

test('parseTicketTiersFromDb lit JSON string ou tableau', () => {
  assert.deepEqual(parseTicketTiersFromDb('[{"id":"t1","label":"Std","price":10}]'), [
    { id: 't1', label: 'Std', price: 10 },
  ]);
  assert.equal(parseTicketTiersFromDb(null), null);
  assert.equal(parseTicketTiersFromDb('not-json'), null);
});

test('resolvePurchaseTier sans tiers utilise event.price', () => {
  const result = resolvePurchaseTier({ price: 25, ticketTiers: null }, null);
  assert.deepEqual(result, { unitEuros: 25, tierId: null });
});

test('resolvePurchaseTier avec plusieurs tiers exige tierId', () => {
  const event = {
    price: 0,
    ticketTiers: [
      { id: 'std', label: 'Standard', price: 10 },
      { id: 'vip', label: 'VIP', price: 20 },
    ],
  };

  assert.equal(resolvePurchaseTier(event, null).error, 'TIER_REQUIRED');
  assert.deepEqual(resolvePurchaseTier(event, 'vip'), { unitEuros: 20, tierId: 'vip' });
});

test('minTierPriceEUR retourne le prix le plus bas', () => {
  assert.equal(
    minTierPriceEUR([
      { price: 20 },
      { price: 12.5 },
    ]),
    12.5,
  );
  assert.equal(minTierPriceEUR(null), null);
});
