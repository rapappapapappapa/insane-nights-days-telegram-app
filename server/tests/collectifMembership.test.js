const test = require('node:test');
const assert = require('node:assert');
const { effectiveMembership, adhesionInfo } = require('../routes/registerCollectifRoutes');
const {
  parseMembershipFormUrl,
  formatMembershipForm,
  findOrderForEmail,
  membershipValidUntil,
} = require('../utils/helloAsso');

test('effectiveMembership passe une adhésion échue en EXPIRED, illimitée reste active', () => {
  const past = new Date(Date.now() - 1000);
  const future = new Date(Date.now() + 86400000);
  assert.strictEqual(effectiveMembership({ id: 'm', status: 'ACTIVE', validUntil: past }).status, 'EXPIRED');
  assert.strictEqual(effectiveMembership({ id: 'm', status: 'ACTIVE', validUntil: future }).status, 'ACTIVE');
  assert.strictEqual(effectiveMembership({ id: 'm', status: 'ACTIVE', validUntil: null }).status, 'ACTIVE');
  assert.strictEqual(effectiveMembership(null), null);
});

test('adhesionInfo : ouverte seulement pour un collectif avec formulaire HelloAsso', () => {
  delete process.env.HELLOASSO_ENABLED;
  const collectif = {
    bookerType: 'Collectif',
    helloAssoAdhesionEnabled: true,
    helloAssoOrganizationSlug: 'asso-techno',
    helloAssoAdhesionFormSlug: 'adhesion-2026',
  };
  const info = adhesionInfo(collectif);
  assert.strictEqual(info.enabled, true);
  assert.strictEqual(info.tracked, false);
  assert.match(info.url, /\/associations\/asso-techno\/adhesions\/adhesion-2026$/);
  assert.strictEqual(adhesionInfo({ ...collectif, helloAssoAdhesionFormSlug: null }).enabled, false);
  assert.strictEqual(adhesionInfo({ ...collectif, bookerType: 'AGENCY' }).enabled, false);

  process.env.HELLOASSO_ENABLED = 'true';
  process.env.HELLOASSO_CLIENT_ID = 'id';
  process.env.HELLOASSO_CLIENT_SECRET = 'secret';
  assert.strictEqual(adhesionInfo(collectif).tracked, true);
  delete process.env.HELLOASSO_ENABLED;
  delete process.env.HELLOASSO_CLIENT_ID;
  delete process.env.HELLOASSO_CLIENT_SECRET;
});

test('parseMembershipFormUrl lit les slugs depuis le lien HelloAsso', () => {
  assert.deepStrictEqual(
    parseMembershipFormUrl('https://www.helloasso.com/associations/Asso-Techno/adhesions/adhesion-2026?utm=x'),
    { organizationSlug: 'asso-techno', formSlug: 'adhesion-2026' },
  );
  assert.strictEqual(parseMembershipFormUrl('https://www.helloasso.com/associations/asso-techno'), null);
});

test('formatMembershipForm garde les formules d’adhésion et leur prix', () => {
  const form = formatMembershipForm(
    {
      title: 'Adhésion 2026',
      validityType: 'MovingYear',
      tiers: [
        { id: 1, label: 'Étudiant', price: 500, tierType: 'Membership' },
        { id: 2, label: 'Soutien', price: 2000, tierType: 'Membership', description: 'Merci !' },
        { id: 3, label: 'Don', tierType: 'Donation' },
        { id: 4, label: 'Prix libre', tierType: 'Membership' },
      ],
    },
    'asso-techno',
    'adhesion-2026',
  );
  assert.strictEqual(form.title, 'Adhésion 2026');
  assert.deepStrictEqual(
    form.tiers.map((t) => [t.label, t.priceCents]),
    [['Étudiant', 500], ['Soutien', 2000], ['Prix libre', null]],
  );
});

test('findOrderForEmail retrouve la dernière adhésion valable de l’email', () => {
  const orders = [
    { id: 30, date: '2026-11-20', payer: { email: 'autre@x.fr' }, items: [{ type: 'Membership', state: 'Processed' }] },
    { id: 20, date: '2026-11-10', payer: { email: 'Marie@X.fr' }, items: [{ type: 'Membership', state: 'Refunded' }] },
    {
      id: 10,
      date: '2026-01-05',
      payer: { email: 'marie@x.fr' },
      amount: { total: 1500 },
      items: [{ type: 'Membership', state: 'Processed', name: 'Soutien' }],
    },
  ];
  const found = findOrderForEmail(orders, ' MARIE@x.fr ');
  assert.strictEqual(found.orderId, '10');
  assert.strictEqual(found.amountCents, 1500);
  assert.strictEqual(found.tierLabel, 'Soutien');
  assert.strictEqual(findOrderForEmail(orders, 'inconnu@x.fr'), null);
});

test('membershipValidUntil : un an glissant, date fixe ou illimitée', () => {
  const date = new Date('2026-03-01T10:00:00Z');
  assert.strictEqual(membershipValidUntil({ validityType: 'MovingYear' }, date).toISOString(), '2027-03-01T10:00:00.000Z');
  assert.strictEqual(
    membershipValidUntil({ validityType: 'Custom', endDate: '2026-12-31T23:00:00Z' }, date).toISOString(),
    '2026-12-31T23:00:00.000Z',
  );
  assert.strictEqual(membershipValidUntil({ validityType: 'Illimited' }, date), null);
  assert.strictEqual(membershipValidUntil(null, date).getUTCFullYear(), 2027);
});
