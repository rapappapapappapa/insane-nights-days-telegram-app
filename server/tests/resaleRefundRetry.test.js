const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const updates = [];
let listings = [];
const fakePrisma = {
  ticketResale: {
    findMany: async () => listings,
    update: async ({ where, data }) => {
      updates.push({ id: where.id, ...data });
      return {};
    },
  },
  appNotification: { findMany: async () => [], create: async () => ({}) },
  pushDevice: { findMany: async () => [] },
};
require.cache[path.join(__dirname, '../lib/prisma.js')] = {
  id: 'prisma',
  filename: path.join(__dirname, '../lib/prisma.js'),
  loaded: true,
  exports: fakePrisma,
};

const { retryFailedResaleRefunds } = require('../utils/ticketResale');

const HOUR = 60 * 60 * 1000;
const base = {
  status: 'SOLD',
  sellerId: 'seller',
  eventId: 'ev',
  priceCents: 1500,
  sellerPaymentIntentId: 'pi_seller',
  event: { title: 'Soirée', image: null },
};

function fakeStripe({ existing = [], createStatus = 'succeeded' } = {}) {
  const calls = { created: [] };
  return {
    calls,
    refunds: {
      list: async () => ({ data: existing }),
      create: async (params, opts) => {
        calls.created.push({ params, opts });
        return { id: 're_new', status: createStatus };
      },
    },
  };
}

test('remboursement déjà présent chez Stripe : enregistré sans en recréer', async () => {
  updates.length = 0;
  listings = [{ ...base, id: 'l1', refundStatus: 'failed', soldAt: new Date(Date.now() - HOUR) }];
  const stripe = fakeStripe({ existing: [{ id: 're_old', status: 'succeeded', metadata: { resaleId: 'l1' } }] });
  await retryFailedResaleRefunds({ stripe, force: true });
  assert.strictEqual(stripe.calls.created.length, 0);
  assert.deepStrictEqual(updates[0], { id: 'l1', sellerRefundId: 're_old', refundStatus: 'succeeded' });
});

test('échec récent : nouvelle tentative avec une clé différente de la première', async () => {
  updates.length = 0;
  listings = [{ ...base, id: 'l2', refundStatus: 'failed', soldAt: new Date(Date.now() - HOUR) }];
  const stripe = fakeStripe();
  await retryFailedResaleRefunds({ stripe, force: true });
  assert.strictEqual(stripe.calls.created.length, 1);
  assert.strictEqual(stripe.calls.created[0].params.amount, 1500);
  assert.match(stripe.calls.created[0].opts.idempotencyKey, /^ticket-resale-refund-l2-retry-\d+$/);
  assert.strictEqual(updates[0].refundStatus, 'succeeded');
});

test('échec depuis plus de 48 h : passage en manual, plus de tentative', async () => {
  updates.length = 0;
  listings = [{ ...base, id: 'l3', refundStatus: 'failed', soldAt: new Date(Date.now() - 49 * HOUR) }];
  const stripe = fakeStripe();
  await retryFailedResaleRefunds({ stripe, force: true });
  assert.strictEqual(stripe.calls.created.length, 0);
  assert.deepStrictEqual(updates[0], { id: 'l3', refundStatus: 'manual' });
});
