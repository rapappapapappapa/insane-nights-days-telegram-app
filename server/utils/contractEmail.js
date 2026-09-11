/**
 * Envoi des contrats acceptés par email aux parties (Organisateur ↔ DJ, Organisateur ↔ Lieu)
 * Appelé après qu'un contrat soit passé en statut SIGNED (acceptation sur NOX).
 * Génère un PDF formaté et l'attache à l'email.
 */

const prisma = require('../lib/prisma');
const { sendMail, isConfigured } = require('./mailer');
const {
  generateDjContractPdf,
  generateVenueContractPdf,
  generatePrestataireContractPdf,
  resolveVenueProfileForVenueContract,
} = require('./contractPdf');

const PAYMENT_TERMS_LABELS = {
  jour_booking: { fr: 'Jour booking', en: 'Booking day' },
  'j-1_prestation': { fr: 'J-1 prestation', en: 'D-1 performance' },
  'j+1_prestation': { fr: 'J+1 prestation', en: 'D+1 performance' },
  'j+15': { fr: 'J+15', en: 'D+15' },
  'j+30': { fr: 'J+30', en: 'D+30' },
};

function formatContractHtml({ type, eventTitle, eventDate, eventTime, partyName, amount, currency, depositPercent, paymentTerms, lang = 'fr' }) {
  const isFr = lang === 'fr';
  const termsLabel = paymentTerms && PAYMENT_TERMS_LABELS[paymentTerms]
    ? PAYMENT_TERMS_LABELS[paymentTerms][isFr ? 'fr' : 'en']
    : paymentTerms || '-';

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
  <h1>${isFr ? 'Contrat accepté' : 'Contract accepted'}</h1>
  <p>${isFr ? 'Le contrat a été accepté par les deux parties sur NOX.' : 'The contract has been accepted by both parties on NOX.'}</p>
  <div class="detail"><span class="label">${isFr ? 'Événement' : 'Event'}:</span> ${eventTitle || '-'}</div>
  <div class="detail"><span class="label">${isFr ? 'Date' : 'Date'}:</span> ${eventDate || '-'} ${eventTime ? `à ${eventTime}` : ''}</div>
  ${type === 'dj' ? `<div class="detail"><span class="label">${isFr ? 'DJ' : 'DJ'}:</span> ${partyName || '-'}</div>` : ''}
  ${type === 'venue' ? `<div class="detail"><span class="label">${isFr ? 'Lieu' : 'Venue'}:</span> ${partyName || '-'}</div>` : ''}
  ${type === 'prestataire' ? `<div class="detail"><span class="label">${isFr ? 'Prestataire' : 'Provider'}:</span> ${partyName || '-'}</div>` : ''}
  <div class="detail"><span class="label">${isFr ? 'Montant' : 'Amount'}:</span> ${amount != null ? `${amount} ${(currency || 'EUR').toUpperCase()}` : '-'}</div>
  ${depositPercent != null ? `<div class="detail"><span class="label">${isFr ? 'Acompte' : 'Deposit'}:</span> ${depositPercent} %</div>` : ''}
  <div class="detail"><span class="label">${isFr ? 'Modalités de paiement' : 'Payment terms'}:</span> ${termsLabel}</div>
  <p style="margin-top:24px;font-size:12px;color:#999">${isFr ? 'La version PDF du contrat est jointe à cet email.' : 'The contract PDF is attached to this email.'}</p>
</body>
</html>`;
}

/**
 * Envoie le contrat accepté (EventDj) par email à l'organisateur et au DJ, avec PDF joint
 */
async function sendContractSignedEmailDj(eventDjId) {
  if (!isConfigured()) return;
  try {
    const ed = await prisma.eventDj.findUnique({
      where: { id: eventDjId },
      include: {
        event: { include: { booker: true, venue: true } },
      },
    });
    if (!ed || ed.contractStatus !== 'SIGNED') return;

    const [bookerUser, djUser] = await Promise.all([
      ed.event?.booker?.userId
        ? prisma.user.findUnique({ where: { id: ed.event.booker.userId }, select: { email: true } })
        : null,
      prisma.user.findUnique({ where: { id: ed.djId }, select: { email: true } }),
    ]);
    const djProfile = await prisma.userDj.findFirst({ where: { userId: ed.djId } });
    const artistName = djProfile?.artistName || 'DJ';

    const payload = ed.contractPayload || {};
    const amount = ed.paymentAmount ?? payload.priceEur ?? payload.amount ?? null;
    const currency = (ed.paymentCurrency || payload.currency || 'eur').toUpperCase();
    const depositPercent = payload.depositPercent ?? null;
    const paymentTerms = payload.paymentTerms ?? null;
    const eventDate = ed.event?.date ? new Date(ed.event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
    const eventTime = ed.event?.time || null;

    const html = formatContractHtml({
      type: 'dj',
      eventTitle: ed.event?.title,
      eventDate,
      eventTime,
      partyName: artistName,
      amount,
      currency,
      depositPercent,
      paymentTerms,
    });

    // Générer le PDF du contrat
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateDjContractPdf({
        event: ed.event,
        booker: ed.event?.booker,
        dj: djProfile,
        eventDj: ed,
        venue: ed.event?.venue,
        organizerEmail: bookerUser?.email || null,
        djEmail: djUser?.email || null,
      });
    } catch (pdfErr) {
      console.error('[contractEmail] Erreur génération PDF DJ:', pdfErr);
    }

    const subject = `[Nox] Contrat accepté - ${ed.event?.title || 'Événement'} - ${artistName}`;
    const emails = [...new Set([bookerUser?.email, djUser?.email].filter(Boolean))];
    const attachments = pdfBuffer ? [{ filename: `Contrat_DJ_${ed.event?.title || 'evenement'}_${artistName}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_'), content: pdfBuffer }] : [];

    for (const email of emails) {
      await sendMail({ to: email, subject, html, attachments });
    }
  } catch (err) {
    console.error('[contractEmail] Erreur envoi contrat DJ:', err);
  }
}

/**
 * Envoie le contrat accepté (EventVenue) par email à l'organisateur et au lieu, avec PDF joint
 */
async function sendContractSignedEmailVenue(eventVenueId) {
  if (!isConfigured()) return;
  try {
    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { include: { booker: true, venue: true } }, venue: true },
    });
    if (!ev || ev.contractStatus !== 'SIGNED') return;

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
    const venueName = venueResolved?.venueName || ev.venue?.venueName || 'Lieu';

    const payload = ev.contractPayload || {};
    const amount = ev.paymentAmount ?? payload.priceEur ?? payload.amount ?? null;
    const currency = (ev.paymentCurrency || payload.currency || 'eur').toUpperCase();
    const depositPercent = payload.depositPercent ?? null;
    const paymentTerms = payload.paymentTerms ?? null;
    const eventDate = ev.event?.date ? new Date(ev.event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
    const eventTime = ev.event?.time || null;

    const html = formatContractHtml({
      type: 'venue',
      eventTitle: ev.event?.title,
      eventDate,
      eventTime,
      partyName: venueName,
      amount,
      currency,
      depositPercent,
      paymentTerms,
    });

    // Générer le PDF du contrat
    let pdfBuffer = null;
    try {
      pdfBuffer = await generateVenueContractPdf({
        event: ev.event,
        booker: ev.event?.booker,
        venue: ev.venue,
        eventVenue: ev,
        organizerEmail: bookerUser?.email || null,
        venueEmail: venueUser?.email || null,
      });
    } catch (pdfErr) {
      console.error('[contractEmail] Erreur génération PDF Venue:', pdfErr);
    }

    const subject = `[Nox] Contrat accepté - ${ev.event?.title || 'Événement'} - ${venueName}`;
    const emails = [...new Set([bookerUser?.email, venueUser?.email].filter(Boolean))];
    const attachments = pdfBuffer ? [{ filename: `Contrat_Lieu_${ev.event?.title || 'evenement'}_${venueName}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_'), content: pdfBuffer }] : [];

    for (const email of emails) {
      await sendMail({ to: email, subject, html, attachments });
    }
  } catch (err) {
    console.error('[contractEmail] Erreur envoi contrat Venue:', err);
  }
}

/**
 * Envoie le contrat accepté (EventPrestataire) par email
 */
async function sendContractSignedEmailPrestataire(eventPrestataireId) {
  if (!isConfigured()) return;
  try {
    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { include: { booker: true, venue: true } }, prestataire: true },
    });
    if (!ep || ep.contractStatus !== 'SIGNED') return;

    const prestUserId = ep.prestataire?.userId;
    const [bookerUser, prestUser] = await Promise.all([
      ep.event?.booker?.userId
        ? prisma.user.findUnique({ where: { id: ep.event.booker.userId }, select: { email: true } })
        : null,
      prestUserId ? prisma.user.findUnique({ where: { id: prestUserId }, select: { email: true } }) : null,
    ]);
    const name = ep.prestataire?.businessName || 'Prestataire';

    const payload = ep.contractPayload || {};
    const amount = ep.paymentAmount ?? payload.priceEur ?? payload.amount ?? null;
    const currency = (ep.paymentCurrency || payload.currency || 'eur').toUpperCase();
    const depositPercent = payload.depositPercent ?? null;
    const paymentTerms = payload.paymentTerms ?? null;
    const eventDate = ep.event?.date ? new Date(ep.event.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null;
    const eventTime = ep.event?.time || null;

    const html = formatContractHtml({
      type: 'prestataire',
      eventTitle: ep.event?.title,
      eventDate,
      eventTime,
      partyName: name,
      amount,
      currency,
      depositPercent,
      paymentTerms,
    });

    let pdfBuffer = null;
    try {
      pdfBuffer = await generatePrestataireContractPdf({
        event: ep.event,
        booker: ep.event?.booker,
        prestataire: ep.prestataire,
        eventPrestataire: ep,
        organizerEmail: bookerUser?.email || null,
        prestataireEmail: prestUser?.email || null,
      });
    } catch (pdfErr) {
      console.error('[contractEmail] Erreur génération PDF Prestataire:', pdfErr);
    }

    const subject = `[Nox] Contrat accepté - ${ep.event?.title || 'Événement'} - ${name}`;
    const emails = [...new Set([bookerUser?.email, prestUser?.email].filter(Boolean))];
    const attachments = pdfBuffer
      ? [{ filename: `Contrat_Prestataire_${ep.event?.title || 'evenement'}_${name}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_'), content: pdfBuffer }]
      : [];

    for (const email of emails) {
      await sendMail({ to: email, subject, html, attachments });
    }
  } catch (err) {
    console.error('[contractEmail] Erreur envoi contrat Prestataire:', err);
  }
}

module.exports = {
  sendContractSignedEmailDj,
  sendContractSignedEmailVenue,
  sendContractSignedEmailPrestataire,
};
