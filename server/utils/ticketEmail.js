/**
 * Email « Billet confirmé » : récapitulatif de la soirée, montant payé et QR code de chaque billet.
 * Le QR change après un transfert ou une revente : le mail le rappelle, le code à jour reste dans l’app.
 * Sans configuration email (RESEND_* ou SMTP_*), rien n’est envoyé.
 */
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const { sendMail, isConfigured } = require('./mailer');
const { tierLabelForTicket } = require('./ticketTierDisplay');
const { eventDay, parseEventTime } = require('./eventSchedule');

const MAX_QR_PER_EMAIL = 10;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatEuros(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return 'Gratuit';
  return `${n.toFixed(2).replace('.', ',')} €`;
}

function formatEventDate(date) {
  const ymd = eventDay(date);
  if (!ymd) return '';
  const label = new Date(`${ymd}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const INTROS = {
  purchase: (n) => (n > 1 ? `Tes ${n} billets sont confirmés.` : 'Ton billet est confirmé.'),
  resale: () => 'Ton billet acheté en revente est confirmé.',
  transfer: (n, fromName) => `${fromName || 'Un membre NOX'} t’a transféré un billet.`,
};

function buildHtml({ event, tickets, kind, fromName, amountPaid }) {
  const time = parseEventTime(event.time);
  const place = [event.venue?.venueName, event.location].filter(Boolean).join(' — ');
  const rows = [
    ['Date', `${formatEventDate(event.date)}${time ? ` à ${time.replace(':', 'h')}` : ''}`],
    place ? ['Lieu', place] : null,
    ['Billets', String(tickets.length)],
    kind === 'transfer' ? null : ['Montant payé', formatEuros(amountPaid)],
  ].filter(Boolean);

  const ticketBlocks = tickets
    .map(
      (t, i) => `
    <div style="margin:16px 0;padding:16px;border:1px solid #e5e5e5;border-radius:12px;text-align:center">
      <div style="font-weight:600;margin-bottom:8px">Billet ${tickets.length > 1 ? `${i + 1} ` : ''}${t.tierLabel ? `· ${escapeHtml(t.tierLabel)}` : ''}</div>
      ${t.contentId ? `<img src="cid:${t.contentId}" width="200" height="200" alt="QR code du billet" style="display:block;margin:0 auto" />` : ''}
      <div style="font-family:monospace;font-size:12px;color:#666;margin-top:8px">${escapeHtml(t.qrCode)}</div>
    </div>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
  <h1 style="font-size:22px;margin:0 0 4px">${escapeHtml(event.title)}</h1>
  <p style="margin:0 0 16px;color:#444">${escapeHtml(INTROS[kind](tickets.length, fromName))}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 0;color:#666">${label}</td><td style="padding:6px 0;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`,
      )
      .join('')}
  </table>
  ${ticketBlocks}
  <p style="font-size:13px;color:#444;background:#f5f5f5;padding:12px;border-radius:8px">
    Présente ce QR code à l’entrée, ou celui de l’onglet <strong>Billets</strong> de l’app NOX.
    Si tu transfères ou revends ce billet, ce code n’est plus valable : le code à jour est toujours dans l’app.
  </p>
  <p style="font-size:12px;color:#999;margin-top:24px">NOX — support@nox.world</p>
</body></html>`;
}

/**
 * @param {object} p
 * @param {string} p.userId destinataire (détenteur actuel des billets)
 * @param {string[]} [p.ticketIds]
 * @param {string} [p.paymentIntentId] billets créés par ce paiement (si `ticketIds` absent)
 * @param {'purchase'|'resale'|'transfer'} [p.kind]
 * @param {string} [p.fromName] expéditeur d’un transfert
 * @param {number} [p.amountPaid] montant en euros ; par défaut la somme des prix des billets
 */
async function sendTicketEmail({ userId, ticketIds, paymentIntentId, kind = 'purchase', fromName, amountPaid }) {
  if (!isConfigured()) return false;
  try {
    const where = ticketIds?.length ? { id: { in: ticketIds } } : paymentIntentId ? { paymentIntentId } : null;
    if (!where) return false;
    const [user, tickets] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.ticket.findMany({
        where: { ...where, userId, status: 'valid' },
        orderBy: { purchaseDate: 'asc' },
        select: {
          id: true,
          qrCode: true,
          tierId: true,
          price: true,
          event: {
            select: {
              title: true,
              date: true,
              time: true,
              location: true,
              ticketTiers: true,
              venue: { select: { venueName: true } },
            },
          },
        },
      }),
    ]);
    if (!user?.email || !tickets.length) return false;

    const event = tickets[0].event;
    const attachments = [];
    const shown = await Promise.all(
      tickets.map(async (t, i) => {
        const item = { qrCode: t.qrCode, tierLabel: tierLabelForTicket(event.ticketTiers, t.tierId) };
        if (i < MAX_QR_PER_EMAIL) {
          item.contentId = `ticket-qr-${i + 1}`;
          attachments.push({
            filename: `billet-${i + 1}.png`,
            content: await QRCode.toBuffer(t.qrCode, { width: 400, margin: 1 }),
            contentId: item.contentId,
          });
        }
        return item;
      }),
    );

    const paid = amountPaid ?? tickets.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    await sendMail({
      to: user.email,
      subject:
        kind === 'transfer'
          ? `[NOX] Billet reçu — ${event.title}`
          : `[NOX] ${tickets.length > 1 ? `${tickets.length} billets confirmés` : 'Billet confirmé'} — ${event.title}`,
      html: buildHtml({ event, tickets: shown, kind, fromName, amountPaid: paid }),
      attachments,
    });
    return true;
  } catch (error) {
    console.error('[ticketEmail] envoi échoué', error?.message || error);
    return false;
  }
}

module.exports = { sendTicketEmail, buildHtml };
