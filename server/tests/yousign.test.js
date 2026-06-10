const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  splitSignerName,
  verifyYousignWebhookSignature,
  isYousignConfigured,
} = require('../utils/yousign');

test('splitSignerName découpe prénom / nom', () => {
  assert.deepEqual(splitSignerName('Marie Dupont'), { firstName: 'Marie', lastName: 'Dupont' });
  assert.deepEqual(splitSignerName('Jean-Michel de la Tour'), {
    firstName: 'Jean-Michel',
    lastName: 'de la Tour',
  });
});

test('splitSignerName gère nom simple et valeurs vides', () => {
  // Yousign exige first_name ET last_name non vides
  assert.deepEqual(splitSignerName('Madonna'), { firstName: 'Madonna', lastName: 'Madonna' });
  assert.deepEqual(splitSignerName(''), { firstName: 'Signataire', lastName: 'Signataire' });
  assert.deepEqual(splitSignerName(null, 'DJ'), { firstName: 'DJ', lastName: 'DJ' });
});

test('isYousignConfigured dépend de YOUSIGN_API_KEY', () => {
  const saved = process.env.YOUSIGN_API_KEY;
  delete process.env.YOUSIGN_API_KEY;
  assert.equal(isYousignConfigured(), false);
  process.env.YOUSIGN_API_KEY = 'test-key';
  assert.equal(isYousignConfigured(), true);
  if (saved === undefined) delete process.env.YOUSIGN_API_KEY;
  else process.env.YOUSIGN_API_KEY = saved;
});

test('verifyYousignWebhookSignature valide le HMAC sha256', () => {
  const saved = process.env.YOUSIGN_WEBHOOK_SECRET;
  process.env.YOUSIGN_WEBHOOK_SECRET = 'secret-test';
  const body = Buffer.from(JSON.stringify({ event_name: 'signature_request.done' }));
  const digest = crypto.createHmac('sha256', 'secret-test').update(body).digest('hex');

  assert.equal(verifyYousignWebhookSignature(body, `sha256=${digest}`), true);
  assert.equal(verifyYousignWebhookSignature(body, 'sha256=mauvaise-signature'), false);
  assert.equal(verifyYousignWebhookSignature(body, undefined), false);
  assert.equal(verifyYousignWebhookSignature(null, `sha256=${digest}`), false);

  if (saved === undefined) delete process.env.YOUSIGN_WEBHOOK_SECRET;
  else process.env.YOUSIGN_WEBHOOK_SECRET = saved;
});

test('verifyYousignWebhookSignature accepte tout si aucun secret configuré', () => {
  const saved = process.env.YOUSIGN_WEBHOOK_SECRET;
  delete process.env.YOUSIGN_WEBHOOK_SECRET;
  assert.equal(verifyYousignWebhookSignature(Buffer.from('x'), 'sha256=peu-importe'), true);
  if (saved !== undefined) process.env.YOUSIGN_WEBHOOK_SECRET = saved;
});
