/**
 * Envoi de la facture / reçu de paiement par email après règlement Stripe du contrat.
 * Distinct de l'email « contrat signé » (envoyé après signature Yousign).
 */

const prisma = require('../lib/prisma');
const { sendMail, isConfigured } = require('./mailer');
const { formatEurosFromCents, generateBookingInvoicePdf } = require('./contractInvoicePdf');
const { resolveVenueProfileForVenueContract } = require('./contractPdf');

function formatInvoiceHtml({
  kind,
  invoiceNumber,
  paidAt,
  amountCents,
  currency,
  eventTitle,
  eventDate,
  eventTime,
  bookerName,
  counterpartyName,
  stripePaymentIntentId,
}) {
  const amount = formatEurosFromCents(amountCents);
  const cur = (currency || 'eur').toUpperCase();
  const dateStr = paidAt
    ? new Date(paidAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const kindLabel =
    kind === 'venue' ? 'Lieu' : kind === 'prestataire' ? 'Prestataire' : 'DJ';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body{font-family:sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
h1{color:#FF1744;font-size:20px}
.detail{margin:8px 0}
.label{font-weight:600;color:#666}
</style></head>
<body>
  <h1>Paiement reçu — facture</h1>
  <p>Le règlement du contrat a bien été enregistré sur Nox. La facture est jointe à cet email.</p>
  <div class="detail"><span class="label">N° facture :</span> ${invoiceNumber || '—'}</div>
  <div class="detail"><span class="label">Date :</span> ${dateStr}</div>
  <div class="detail"><span class="label">Événement :</span> ${eventTitle || '—'}</div>
  <div class="detail"><span class="label">Date événement :</span> ${eventDate || '—'}${eventTime ? ` à ${eventTime}` : ''}</div>
  <div class="detail"><span class="label">Organisateur :</span> ${bookerName || '—'}</div>
  <div class="detail"><span class="label">${kindLabel} :</span> ${counterpartyName || '—'}</div>
  <div class="detail"><span class="label">Montant payé :</span> ${amount} ${cur !== 'EUR' ? cur : ''}</div>
  <div class="detail"><span class="label">Paiement :</span> Carte bancaire (Stripe)</div>
  ${stripePaymentIntentId ? `<div class="detail"><span class="label">Réf. :</span> ${stripePaymentIntentId}</div>` : ''}
  <p style="margin-top:24px;font-size:12px;color:#999">La signature électronique du contrat vous sera envoyée séparément. Une fois signé, vous recevrez le PDF du contrat par email.</p>
</body>
</html>`;
}

function bookerDisplayName(booker) {
  if (!booker) return 'Organisateur';
  if (booker.companyName?.trim()) return booker.companyName.trim();
  return [booker.prenom, booker.nom].filter(Boolean).join(' ') || 'Organisateur';
}

async function loadInvoiceContext(kind, bookingId) {
  if (kind === 'dj') {
    const ed = await prisma.eventDj.findUnique({
      where: { id: bookingId },
      include: { event: { include: { booker: true, venue: true } } },
    });
    if (!ed || ed.paymentStatus !== 'PAID') return null;
    const [bookerUser, djUser, djProfile] = await Promise.all([
      ed.event?.booker?.userId
        ? prisma.user.findUnique({ where: { id: ed.event.booker.userId }, select: { email: true } })
        : null,
      prisma.user.findUnique({ where: { id: ed.djId }, select: { email: true } }),
      prisma.userDj.findFirst({ where: { userId: ed.djId } }),
    ]);
    return {
      row: ed,
      booker: ed.event?.booker,
      bookerUser,
      counterpartyUser: djUser,
      counterpartyName: djProfile?.legalName || djProfile?.artistName || 'DJ',
      event: ed.event,
    };
  }
  if (kind === 'venue') {
    const ev = await prisma.eventVenue.findUnique({
      where: { id: bookingId },
      include: { event: { include: { booker: true, venue: true } }, venue: true },
    });
    if (!ev || ev.paymentStatus !== 'PAID') return null;
    const venueResolved = resolveVenueProfileForVenueContract(ev.event, ev.venue, ev);
    const [bookerUser, venueUser] = await Promise.all([
      ev.event?.booker?.userId
        ? prisma.user.findUnique({ where: { id: ev.event.booker.userId }, select: { email: true } })
        : null,
      venueResolved?.userId
        ? prisma.user.findUnique({ where: { id: venueResolved.userId }, select: { email: true } })
        : ev.venue?.userId
          ? prisma.user.findUnique({ where: { id: ev.venue.userId }, select: { email: true } })
          : null,
    ]);
    return {
      row: ev,
      booker: ev.event?.booker,
      bookerUser,
      counterpartyUser: venueUser,
      counterpartyName: venueResolved?.venueName || ev.venue?.venueName || 'Lieu',
      event: ev.event,
    };
  }
  const ep = await prisma.eventPrestataire.findUnique({
    where: { id: bookingId },
    include: { event: { include: { booker: true, venue: true } }, prestataire: true },
  });
  if (!ep || ep.paymentStatus !== 'PAID') return null;
  const prestUserId = ep.prestataire?.userId;
  const [bookerUser, prestUser] = await Promise.all([
    ep.event?.booker?.userId
      ? prisma.user.findUnique({ where: { id: ep.event.booker.userId }, select: { email: true } })
      : null,
    prestUserId ? prisma.user.findUnique({ where: { id: prestUserId }, select: { email: true } }) : null,
  ]);
  return {
    row: ep,
    booker: ep.event?.booker,
    bookerUser,
    counterpartyUser: prestUser,
    counterpartyName: ep.prestataire?.businessName || 'Prestataire',
    event: ep.event,
  };
}

/**
 * Envoie la facture PDF au booker et au prestataire (DJ / lieu / prestataire).
 */
async function sendContractPaymentInvoiceEmail(kind, bookingId) {
  if (!isConfigured()) return;
  try {
    const ctx = await loadInvoiceContext(kind, bookingId);
    if (!ctx) return;

    const { row, booker, bookerUser, counterpartyUser, counterpartyName, event } = ctx;
    const eventDate = event?.date
      ? new Date(event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    let pdfBuffer = null;
    try {
      pdfBuffer = await generateBookingInvoicePdf({
        kind,
        invoiceNumber: row.invoiceNumber,
        paidAt: row.paidAt,
        amountCents: row.paymentAmount,
        currency: row.paymentCurrency,
        stripePaymentIntentId: row.stripePaymentIntentId,
        event,
        booker,
        counterpartyName,
        bookerEmail: bookerUser?.email,
        counterpartyEmail: counterpartyUser?.email,
      });
    } catch (pdfErr) {
      console.error('[contractInvoiceEmail] Erreur génération PDF:', pdfErr);
    }

    const html = formatInvoiceHtml({
      kind,
      invoiceNumber: row.invoiceNumber,
      paidAt: row.paidAt,
      amountCents: row.paymentAmount,
      currency: row.paymentCurrency,
      eventTitle: event?.title,
      eventDate,
      eventTime: event?.time,
      bookerName: bookerDisplayName(booker),
      counterpartyName,
      stripePaymentIntentId: row.stripePaymentIntentId,
    });

    const safeName = String(counterpartyName || 'prestation').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const filename = `Facture_${row.invoiceNumber || bookingId}_${safeName}.pdf`;
    const attachments = pdfBuffer ? [{ filename, content: pdfBuffer }] : [];
    const subject = `[Nox] Facture — ${event?.title || 'Événement'} — ${formatEurosFromCents(row.paymentAmount)}`;
    const emails = [...new Set([bookerUser?.email, counterpartyUser?.email].filter(Boolean))];

    for (const email of emails) {
      await sendMail({ to: email, subject, html, attachments });
    }
  } catch (err) {
    console.error('[contractInvoiceEmail] Erreur envoi facture:', kind, bookingId, err);
  }
}

module.exports = {
  sendContractPaymentInvoiceEmail,
  formatEurosFromCents,
};
