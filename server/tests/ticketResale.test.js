const test = require('node:test');
const assert = require('node:assert');
const { resaleEligibility, availableListingWhere } = require('../utils/ticketResale');

const base = {
  userId: 'u1',
  status: 'valid',
  scannedAt: null,
  scannedVenueIds: [],
  price: 15,
  paymentIntentId: 'pi_1',
  payment: { userId: 'u1' },
  event: { status: 'UPCOMING' },
};

test('resaleEligibility accepte un billet payé par son détenteur', () => {
  assert.strictEqual(resaleEligibility(base, 'u1'), null);
});

test('resaleEligibility refuse billet transféré, gratuit, scanné ou événement fermé', () => {
  assert.match(resaleEligibility({ ...base, userId: 'u2' }, 'u2'), /transféré/);
  assert.match(resaleEligibility({ ...base, price: 0 }, 'u1'), /payants/);
  assert.match(resaleEligibility({ ...base, status: 'used' }, 'u1'), /servi/);
  assert.match(resaleEligibility({ ...base, scannedVenueIds: ['v1'] }, 'u1'), /servi/);
  assert.match(resaleEligibility({ ...base, event: { status: 'ONGOING' } }, 'u1'), /fermée/);
  assert.match(resaleEligibility(base, 'autre'), /introuvable/);
});

test('availableListingWhere inclut les réservations expirées', () => {
  const now = new Date('2026-11-19T10:00:00Z');
  assert.deepStrictEqual(availableListingWhere(now), {
    OR: [{ status: 'ACTIVE' }, { status: 'RESERVED', reservedUntil: { lt: now } }],
  });
});
