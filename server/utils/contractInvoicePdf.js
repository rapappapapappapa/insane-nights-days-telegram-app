/**
 * Facture / reçu de paiement PDF après règlement Stripe d'un contrat booking.
 */

const PDFDocument = require('pdfkit');

function formatEurosFromCents(cents) {
  if (cents == null || Number.isNaN(Number(cents))) return '—';
  return `${(Number(cents) / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDateFr(d) {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAddr(parts) {
  return parts.filter(Boolean).join(', ') || '—';
}

function bookerDisplayName(booker) {
  if (!booker) return '—';
  if (booker.companyName?.trim()) return booker.companyName.trim();
  return [booker.prenom, booker.nom].filter(Boolean).join(' ') || 'Organisateur';
}

const KIND_LABELS = {
  dj: 'Prestation artistique (DJ)',
  venue: 'Prestation lieu',
  prestataire: 'Prestation prestataire',
};

/**
 * @returns {Promise<Buffer>}
 */
async function generateBookingInvoicePdf({
  kind,
  invoiceNumber,
  paidAt,
  amountCents,
  currency = 'eur',
  stripePaymentIntentId,
  event,
  booker,
  counterpartyName,
  bookerEmail,
  counterpartyEmail,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const eventDate = event?.date ? formatDateFr(event.date) : '—';
    const eventTime = event?.time || '';
    const amountLabel = formatEurosFromCents(amountCents);
    const cur = (currency || 'eur').toUpperCase();

    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Nox — Plateforme de booking', { align: 'center', width: w });
    doc.moveDown(0.3);
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#111').text('FACTURE / REÇU DE PAIEMENT', {
      align: 'center',
      width: w,
    });
    doc.moveDown(1);

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111').text('Références');
    doc.font('Helvetica').fillColor('#333');
    doc.text(`N° facture : ${invoiceNumber || '—'}`);
    doc.text(`Date de paiement : ${formatDateFr(paidAt)}`);
    if (stripePaymentIntentId) {
      doc.text(`Réf. Stripe : ${stripePaymentIntentId}`);
    }
    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').text('Payeur (organisateur)');
    doc.font('Helvetica');
    doc.text(bookerDisplayName(booker));
    if (bookerEmail) doc.text(bookerEmail);
    const bookerAddr = formatAddr([booker?.address, booker?.postalCode, booker?.city, booker?.country]);
    if (bookerAddr !== '—') doc.text(bookerAddr);
    if (booker?.siret) doc.text(`SIRET : ${booker.siret}`);
    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').text('Bénéficiaire');
    doc.font('Helvetica');
    doc.text(counterpartyName || '—');
    if (counterpartyEmail) doc.text(counterpartyEmail);
    doc.moveDown(0.8);

    doc.font('Helvetica-Bold').text('Prestation');
    doc.font('Helvetica');
    doc.text(KIND_LABELS[kind] || 'Prestation');
    doc.text(`Événement : ${event?.title || '—'}`);
    doc.text(`Date : ${eventDate}${eventTime ? ` à ${eventTime}` : ''}`);
    doc.moveDown(1);

    doc.font('Helvetica-Bold').text('Détail du règlement');
    doc.font('Helvetica');
    doc.text(`Montant payé (TTC) : ${amountLabel} ${cur !== 'EUR' ? cur : ''}`.trim());
    doc.text('Mode de paiement : Carte bancaire (Stripe)');
    doc.moveDown(1.2);

    doc.fontSize(9).fillColor('#666').text(
      'Ce document atteste du paiement du contrat sur Nox. La version signée du contrat vous sera envoyée par email une fois la signature électronique finalisée.',
      { width: w }
    );

    doc.end();
  });
}

module.exports = {
  formatEurosFromCents,
  generateBookingInvoicePdf,
};
