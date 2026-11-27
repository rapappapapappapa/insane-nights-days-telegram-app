const test = require('node:test');
const assert = require('node:assert');
const { parseEventTime, eventWindow, eventStatusAt, normalizeEventDate } = require('../utils/eventSchedule');

test('normalizeEventDate ramène le jour choisi à Paris à minuit UTC', () => {
  assert.strictEqual(normalizeEventDate('2026-11-29').toISOString(), '2026-11-29T00:00:00.000Z');
  // Sélecteur ouvert à 00 h 30 heure de Paris le 29 → instant ISO encore le 28 en UTC.
  assert.strictEqual(normalizeEventDate('2026-11-28T23:30:00.000Z').toISOString(), '2026-11-29T00:00:00.000Z');
  // Sélecteur ouvert l’après-midi.
  assert.strictEqual(normalizeEventDate('2026-07-14T14:05:00.000Z').toISOString(), '2026-07-14T00:00:00.000Z');
  assert.strictEqual(normalizeEventDate('pas une date'), null);
  assert.strictEqual(normalizeEventDate(''), null);
});

test('parseEventTime accepte les formats saisis par les organisateurs', () => {
  assert.strictEqual(parseEventTime('19:30'), '19:30');
  assert.strictEqual(parseEventTime('19h30'), '19:30');
  assert.strictEqual(parseEventTime('23h'), '23:00');
  assert.strictEqual(parseEventTime('9:05'), '09:05');
  assert.strictEqual(parseEventTime('25:00'), null);
  assert.strictEqual(parseEventTime(''), null);
});

test('eventWindow ignore l’heure stockée dans date et lit time à l’heure de Paris', () => {
  const hiver = eventWindow({ date: '2026-11-29T14:12:00.000Z', time: '19h30', durationHours: 4 });
  assert.strictEqual(hiver.start.toISOString(), '2026-11-29T18:30:00.000Z');
  assert.strictEqual(hiver.end.toISOString(), '2026-11-29T22:30:00.000Z');

  const ete = eventWindow({ date: '2026-07-14T00:00:00.000Z', time: '23:00' });
  assert.strictEqual(ete.start.toISOString(), '2026-07-14T21:00:00.000Z');
  assert.strictEqual(ete.end.toISOString(), '2026-07-15T03:00:00.000Z');
});

test('eventStatusAt : à venir jusqu’au début, en cours pendant la soirée, terminé ensuite', () => {
  const event = { date: '2026-11-29T09:00:00.000Z', time: '23:00', durationHours: 6 };
  assert.strictEqual(eventStatusAt(event, new Date('2026-11-29T16:00:00.000Z')), 'UPCOMING');
  assert.strictEqual(eventStatusAt(event, new Date('2026-11-30T01:00:00.000Z')), 'ONGOING');
  assert.strictEqual(eventStatusAt(event, new Date('2026-11-30T05:00:00.000Z')), 'FINISHED');
});
