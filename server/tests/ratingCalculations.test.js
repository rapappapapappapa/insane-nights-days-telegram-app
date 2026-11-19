const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDjRatings, calculateVenueRatings } = require('../utils/ratingCalculations');

test('ratingCalculations exporte les fonctions attendues', () => {
  assert.equal(typeof calculateDjRatings, 'function');
  assert.equal(typeof calculateVenueRatings, 'function');
});
