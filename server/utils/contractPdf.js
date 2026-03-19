/**
 * Génération de contrats PDF signés (Organisateur ↔ DJ, Organisateur ↔ Lieu)
 * Format professionnel avec tous les champs légaux et conditions.
 */

const PDFDocument = require('pdfkit');

const PAYMENT_TERMS_LABELS = {
  jour_booking: 'Jour du booking',
  'j-1_prestation': 'J-1 de la prestation',
  'j+1_prestation': 'J+1 de la prestation',
  'j+15': 'J+15',
  'j+30': 'J+30',
};

function formatDate(date) {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAddr(parts) {
  return parts.filter(Boolean).join(', ') || '-';
}

/**
 * Génère un PDF de contrat Organisateur ↔ DJ
 */
async function generateDjContractPdf({ event, booker, dj, eventDj, venue }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const payload = eventDj?.contractPayload || {};
    const amount = eventDj?.paymentAmount ?? payload?.priceEur ?? payload?.amount ?? null;
    const currency = (eventDj?.paymentCurrency || payload?.currency || 'eur').toUpperCase();
    const depositPercent = payload?.depositPercent ?? null;
    const paymentTerms = payload?.paymentTerms ? (PAYMENT_TERMS_LABELS[payload.paymentTerms] || payload.paymentTerms) : null;
    const cancellation = payload?.cancellation ?? null;
    const notes = payload?.notes ?? null;

    // En-tête
    doc.fontSize(18).font('Helvetica-Bold').text('CONTRAT DE PRESTATION DJ', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('Entre les parties ci-dessous désignées', { align: 'center' });
    doc.moveDown(1.5);

    // Partie 1 : L'ORGANISATEUR
    doc.fontSize(14).font('Helvetica-Bold').text('1. L\'ORGANISATEUR (CONTRACTANT)', { continued: false });
    doc.fontSize(10).font('Helvetica');
    const bookerName = [booker?.prenom, booker?.nom].filter(Boolean).join(' ') || '-';
    doc.text(`Nom : ${bookerName}`);
    if (booker?.companyName) doc.text(`Raison sociale : ${booker.companyName}`);
    doc.text(`Adresse : ${formatAddr([booker?.address, booker?.postalCode, booker?.city, booker?.country])}`);
    if (booker?.siret) doc.text(`SIRET : ${booker.siret}`);
    doc.text(`Téléphone : ${booker?.phonePro || '-'}`);
    doc.moveDown(1);

    // Partie 2 : LE DJ (PRESTATAIRE)
    doc.fontSize(14).font('Helvetica-Bold').text('2. LE DJ (PRESTATAIRE)', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom d'artiste : ${dj?.artistName || '-'}`);
    if (dj?.legalName) doc.text(`Nom civil : ${dj.legalName}`);
    doc.text(`Adresse : ${formatAddr([dj?.address, dj?.postalCode, dj?.country])}`);
    if (dj?.siret) doc.text(`SIRET : ${dj.siret}`);
    if (dj?.vatNumber) doc.text(`N° TVA : ${dj.vatNumber}`);
    doc.text(`Téléphone : ${dj?.phone || '-'}`);
    doc.moveDown(1);

    // Objet
    doc.fontSize(14).font('Helvetica-Bold').text('3. OBJET', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Le présent contrat a pour objet la prestation de DJ pour l'événement suivant :`);
    doc.moveDown(0.5);
    doc.text(`Événement : ${event?.title || '-'}`);
    doc.text(`Date : ${formatDate(event?.date)}`);
    doc.text(`Heure : ${event?.time || '-'}`);
    doc.text(`Lieu : ${venue?.venueName || event?.venue?.venueName || '-'}`);
    if (venue?.address) doc.text(`Adresse du lieu : ${venue.address}`);
    doc.moveDown(1);

    // Conditions financières
    doc.fontSize(14).font('Helvetica-Bold').text('4. CONDITIONS FINANCIÈRES', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Montant total : ${amount != null ? `${amount} ${currency}` : 'À définir'}`);
    if (depositPercent != null) doc.text(`Acompte : ${depositPercent} %`);
    doc.text(`Modalités de paiement : ${paymentTerms || '-'}`);
    doc.moveDown(1);

    // Annulation
    doc.fontSize(14).font('Helvetica-Bold').text('5. ANNULATION', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(cancellation || 'Non spécifié');
    doc.moveDown(1);

    // Notes
    if (notes) {
      doc.fontSize(14).font('Helvetica-Bold').text('6. CONDITIONS PARTICULIÈRES', { continued: false });
      doc.fontSize(10).font('Helvetica');
      doc.text(notes);
      doc.moveDown(1);
    }

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('7. SIGNATURES', { continued: false });
    doc.fontSize(10).font('Helvetica');
    if (eventDj?.bookerAcceptedAt) doc.text(`Organisateur : accepté le ${formatDate(eventDj.bookerAcceptedAt)}`);
    if (eventDj?.djAcceptedAt) doc.text(`DJ : accepté le ${formatDate(eventDj.djAcceptedAt)}`);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('Contrat signé électroniquement via les deux parties sur la plateforme.', { align: 'center' });

    doc.end();
  });
}

/**
 * Génère un PDF de contrat Organisateur ↔ Lieu
 */
async function generateVenueContractPdf({ event, booker, venue, eventVenue }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const payload = eventVenue?.contractPayload || {};
    const amount = eventVenue?.paymentAmount ?? payload?.priceEur ?? payload?.amount ?? null;
    const currency = (eventVenue?.paymentCurrency || payload?.currency || 'eur').toUpperCase();
    const depositPercent = payload?.depositPercent ?? null;
    const paymentTerms = payload?.paymentTerms ? (PAYMENT_TERMS_LABELS[payload.paymentTerms] || payload.paymentTerms) : null;
    const cancellation = payload?.cancellation ?? null;
    const notes = payload?.notes ?? null;

    // En-tête
    doc.fontSize(18).font('Helvetica-Bold').text('CONTRAT DE LOCATION DE SALLE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('Entre les parties ci-dessous désignées', { align: 'center' });
    doc.moveDown(1.5);

    // Partie 1 : L'ORGANISATEUR
    doc.fontSize(14).font('Helvetica-Bold').text('1. L\'ORGANISATEUR (CONTRACTANT)', { continued: false });
    doc.fontSize(10).font('Helvetica');
    const bookerName = [booker?.prenom, booker?.nom].filter(Boolean).join(' ') || '-';
    doc.text(`Nom : ${bookerName}`);
    if (booker?.companyName) doc.text(`Raison sociale : ${booker.companyName}`);
    doc.text(`Adresse : ${formatAddr([booker?.address, booker?.postalCode, booker?.city, booker?.country])}`);
    if (booker?.siret) doc.text(`SIRET : ${booker.siret}`);
    doc.text(`Téléphone : ${booker?.phonePro || '-'}`);
    doc.moveDown(1);

    // Partie 2 : LE LIEU (LOUER)
    doc.fontSize(14).font('Helvetica-Bold').text('2. LE LIEU (LOUER)', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom du lieu : ${venue?.venueName || '-'}`);
    if (venue?.companyName) doc.text(`Raison sociale : ${venue.companyName}`);
    if (venue?.legalRepresentative) doc.text(`Représentant légal : ${venue.legalRepresentative}`);
    doc.text(`Adresse : ${formatAddr([venue?.address, venue?.postalCode, venue?.city, venue?.country])}`);
    if (venue?.siret) doc.text(`SIRET : ${venue.siret}`);
    doc.moveDown(1);

    // Objet
    doc.fontSize(14).font('Helvetica-Bold').text('3. OBJET', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Le présent contrat a pour objet la location de la salle pour l'événement suivant :`);
    doc.moveDown(0.5);
    doc.text(`Événement : ${event?.title || '-'}`);
    doc.text(`Date : ${formatDate(event?.date)}`);
    doc.text(`Heure : ${event?.time || '-'}`);
    doc.moveDown(1);

    // Conditions financières
    doc.fontSize(14).font('Helvetica-Bold').text('4. CONDITIONS FINANCIÈRES', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(`Montant total : ${amount != null ? `${amount} ${currency}` : 'À définir'}`);
    if (depositPercent != null) doc.text(`Acompte : ${depositPercent} %`);
    doc.text(`Modalités de paiement : ${paymentTerms || '-'}`);
    doc.moveDown(1);

    // Annulation
    doc.fontSize(14).font('Helvetica-Bold').text('5. ANNULATION', { continued: false });
    doc.fontSize(10).font('Helvetica');
    doc.text(cancellation || 'Non spécifié');
    doc.moveDown(1);

    // Notes
    if (notes) {
      doc.fontSize(14).font('Helvetica-Bold').text('6. CONDITIONS PARTICULIÈRES', { continued: false });
      doc.fontSize(10).font('Helvetica');
      doc.text(notes);
      doc.moveDown(1);
    }

    // Signatures
    doc.fontSize(14).font('Helvetica-Bold').text('7. SIGNATURES', { continued: false });
    doc.fontSize(10).font('Helvetica');
    if (eventVenue?.bookerAcceptedAt) doc.text(`Organisateur : accepté le ${formatDate(eventVenue.bookerAcceptedAt)}`);
    if (eventVenue?.venueAcceptedAt) doc.text(`Lieu : accepté le ${formatDate(eventVenue.venueAcceptedAt)}`);
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('Contrat signé électroniquement via les deux parties sur la plateforme.', { align: 'center' });

    doc.end();
  });
}

module.exports = {
  generateDjContractPdf,
  generateVenueContractPdf,
};
