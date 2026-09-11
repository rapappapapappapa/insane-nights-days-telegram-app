const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeTicketTiersInput,
  parseTicketTiersFromDb,
  resolvePurchaseTier,
  minTierPriceEUR,
  isTierOnSale,
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

test('normalizeTicketTiersInput accepte saleStart / saleEnd (phases)', () => {
  const tiers = normalizeTicketTiersInput([
    { label: 'Early bird', price: 15, saleEnd: '2026-07-01T00:00:00.000Z' },
    { label: 'Regular', price: 25, saleStart: '2026-07-01T00:00:00.000Z' },
  ]);

  assert.equal(tiers[0].saleEnd, '2026-07-01T00:00:00.000Z');
  assert.equal(tiers[0].saleStart, undefined);
  assert.equal(tiers[1].saleStart, '2026-07-01T00:00:00.000Z');
});

test('normalizeTicketTiersInput rejette une fenêtre de vente inversée', () => {
  assert.throws(
    () =>
      normalizeTicketTiersInput([
        { label: 'Bad', price: 10, saleStart: '2026-07-02', saleEnd: '2026-07-01' },
      ]),
    /Fenêtre de vente invalide/,
  );
  assert.throws(
    () => normalizeTicketTiersInput([{ label: 'Bad', price: 10, saleStart: 'pas-une-date' }]),
    /saleStart invalide/,
  );
});

test('isTierOnSale respecte la fenêtre de vente', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');
  assert.equal(isTierOnSale({ price: 10 }, now), true);
  assert.equal(isTierOnSale({ price: 10, saleEnd: '2026-06-30T00:00:00.000Z' }, now), true);
  assert.equal(isTierOnSale({ price: 10, saleEnd: '2026-06-01T00:00:00.000Z' }, now), false);
  assert.equal(isTierOnSale({ price: 10, saleStart: '2026-07-01T00:00:00.000Z' }, now), false);
});

test('resolvePurchaseTier refuse un tarif hors fenêtre de vente', () => {
  const past = new Date(Date.now() - 86400000).toISOString();
  const future = new Date(Date.now() + 86400000).toISOString();
  const event = {
    price: 0,
    ticketTiers: [
      { id: 'early', label: 'Early bird', price: 15, saleEnd: past },
      { id: 'std', label: 'Standard', price: 25, saleStart: past, saleEnd: future },
    ],
  };

  assert.equal(resolvePurchaseTier(event, 'early').error, 'TIER_NOT_ON_SALE');
  assert.deepEqual(resolvePurchaseTier(event, 'std'), { unitEuros: 25, tierId: 'std' });
});

test('minTierPriceEUR onlyOnSale ignore les tarifs hors vente', () => {
  const past = new Date(Date.now() - 86400000).toISOString();
  const tiers = [
    { id: 'early', price: 15, saleEnd: past },
    { id: 'std', price: 25 },
  ];

  assert.equal(minTierPriceEUR(tiers), 15);
  assert.equal(minTierPriceEUR(tiers, { onlyOnSale: true }), 25);
});
