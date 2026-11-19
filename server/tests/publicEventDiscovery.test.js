const test = require('node:test');
const assert = require('node:assert/strict');
const {
  publishedOnFeedEventWhere,
  upcomingPublishedFeedEventWhere,
  canViewEvent,
} = require('../utils/publicEventDiscovery');

/** Prisma factice : chaque table renvoie `matches` sur findFirst, sinon null. */
function fakePrisma(matches = {}) {
  const table = (name) => ({
    findFirst: async () => (matches[name] ? { id: `${name}-1` } : null),
  });
  return {
    eventDj: table('eventDj'),
    ticket: table('ticket'),
    eventStaff: table('eventStaff'),
    userBooker: table('userBooker'),
    eventVenue: table('eventVenue'),
    eventPrestataire: table('eventPrestataire'),
    userVenue: table('userVenue'),
  };
}

const UNPUBLISHED = { id: 'evt-1', publishedOnFeed: false, bookerId: 'bk-1', venueId: 'vn-1' };

test('publishedOnFeedEventWhere — exige publication feed', () => {
  assert.deepEqual(publishedOnFeedEventWhere(), { publishedOnFeed: true });
  assert.deepEqual(publishedOnFeedEventWhere({ status: 'UPCOMING' }), {
    publishedOnFeed: true,
    status: 'UPCOMING',
  });
});

test('upcomingPublishedFeedEventWhere — à venir publiés', () => {
  const now = new Date('2026-08-14T10:00:00.000Z');
  const where = upcomingPublishedFeedEventWhere({ now });
  assert.equal(where.publishedOnFeed, true);
  assert.equal(where.status, 'UPCOMING');
  assert.deepEqual(where.date, { gte: now });
});

test('canViewEvent — événement publié visible sans compte', async () => {
  const event = { id: 'evt-1', publishedOnFeed: true };
  assert.equal(await canViewEvent(fakePrisma(), event, null), true);
});

test('canViewEvent — non publié invisible pour un anonyme ou un tiers', async () => {
  assert.equal(await canViewEvent(fakePrisma(), UNPUBLISHED, null), false);
  assert.equal(await canViewEvent(fakePrisma(), UNPUBLISHED, { id: 'u-tiers' }), false);
});

test('canViewEvent — visible pour chaque partie prenante', async () => {
  const parties = [
    'eventDj',
    'ticket',
    'eventStaff',
    'userBooker',
    'eventVenue',
    'eventPrestataire',
    'userVenue',
  ];
  for (const party of parties) {
    const visible = await canViewEvent(fakePrisma({ [party]: true }), UNPUBLISHED, { id: 'u-1' });
    assert.equal(visible, true, `${party} devrait voir son événement non publié`);
  }
});

test('canViewEvent — admin voit tout, événement absent invisible', async () => {
  assert.equal(await canViewEvent(fakePrisma(), UNPUBLISHED, { id: 'u-1', role: 'ADMIN' }), true);
  assert.equal(await canViewEvent(fakePrisma(), null, { id: 'u-1', role: 'ADMIN' }), false);
});
