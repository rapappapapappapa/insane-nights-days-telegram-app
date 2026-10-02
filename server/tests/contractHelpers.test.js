const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hashContract,
  eventDjResponderRole,
  venueContractResponderRole,
} = require('../utils/contractHelpers');

test('hashContract est déterministe pour un même payload', () => {
  const payload = { fee: 500, currency: 'EUR', slots: ['22:00'] };
  assert.equal(hashContract(payload), hashContract({ ...payload }));
});

test('eventDjResponderRole alterne booker et DJ selon contractSentBy', () => {
  assert.equal(eventDjResponderRole({ contractSentBy: 'BOOKER' }), 'DJ');
  assert.equal(eventDjResponderRole({ contractSentBy: 'DJ' }), 'BOOKER');
  assert.equal(eventDjResponderRole({}), 'DJ');
});

test('venueContractResponderRole alterne booker et lieu', () => {
  assert.equal(venueContractResponderRole({ contractSentBy: 'BOOKER' }), 'VENUE');
  assert.equal(venueContractResponderRole({ contractSentBy: 'VENUE' }), 'BOOKER');
});
