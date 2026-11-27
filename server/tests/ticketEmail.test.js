const test = require('node:test');
const assert = require('node:assert');
const { buildHtml } = require('../utils/ticketEmail');

const event = {
  title: 'Afterwork <Insane>',
  date: '2026-11-29T14:12:00.000Z',
  time: '19h30',
  location: '1 Avenue Félix Faure, 69007 Lyon',
  venue: { venueName: 'Insane HQ' },
};
const tickets = [{ qrCode: 'TICKET_ABC', tierLabel: 'Early', contentId: 'ticket-qr-1' }];

test('mail d’achat : date, heure, lieu, montant et QR intégré', () => {
  const html = buildHtml({ event, tickets, kind: 'purchase', amountPaid: 12.5 });
  assert.match(html, /Dimanche 29 novembre 2026 à 19h30/);
  assert.match(html, /Insane HQ — 1 Avenue Félix Faure/);
  assert.match(html, /12,50 €/);
  assert.match(html, /src="cid:ticket-qr-1"/);
  assert.match(html, /Afterwork &lt;Insane&gt;/);
  assert.match(html, /n’est plus valable/);
});

test('mail de transfert : expéditeur, sans montant', () => {
  const html = buildHtml({ event, tickets, kind: 'transfer', fromName: 'Para', amountPaid: 12.5 });
  assert.match(html, /Para t’a transféré un billet/);
  assert.doesNotMatch(html, /Montant payé/);
});

test('billet gratuit affiché « Gratuit »', () => {
  const html = buildHtml({ event, tickets, kind: 'purchase', amountPaid: 0 });
  assert.match(html, /Gratuit/);
});
