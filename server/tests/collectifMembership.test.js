const test = require('node:test');
const assert = require('node:assert');
const { effectiveMembership, adhesionInfo } = require('../routes/registerCollectifRoutes');

test('effectiveMembership passe une adhésion échue en EXPIRED', () => {
  const past = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 86400000);
  assert.strictEqual(effectiveMembership({ id: 'm', status: 'ACTIVE', validUntil: past }).status, 'EXPIRED');
  assert.strictEqual(effectiveMembership({ id: 'm', status: 'ACTIVE', validUntil: future }).status, 'ACTIVE');
  assert.strictEqual(effectiveMembership(null), null);
});

test('adhesionInfo : gratuite disponible sans HelloAsso, payante seulement si configuré', () => {
  delete process.env.HELLOASSO_ENABLED;
  const collectif = { bookerType: 'Collectif', helloAssoAdhesionEnabled: true, helloAssoOrganizationSlug: 'asso-techno' };
  assert.strictEqual(adhesionInfo({ ...collectif, helloAssoAdhesionPriceCents: 0 }).available, true);
  assert.strictEqual(adhesionInfo({ ...collectif, helloAssoAdhesionPriceCents: 1500 }).available, false);

  process.env.HELLOASSO_ENABLED = 'true';
  process.env.HELLOASSO_CLIENT_ID = 'id';
  process.env.HELLOASSO_CLIENT_SECRET = 'secret';
  assert.strictEqual(adhesionInfo({ ...collectif, helloAssoAdhesionPriceCents: 1500 }).available, true);
  assert.strictEqual(adhesionInfo({ ...collectif, bookerType: 'Promoteur', helloAssoAdhesionPriceCents: 0 }).enabled, false);
  delete process.env.HELLOASSO_ENABLED;
  delete process.env.HELLOASSO_CLIENT_ID;
  delete process.env.HELLOASSO_CLIENT_SECRET;
});
