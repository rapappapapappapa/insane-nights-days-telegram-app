/**
 * Génération des contrats PDF alignés sur les modèles NOX :
 * - docs/contract-templates/CONTRAT_PRESTATION_ARTISTIQUE.pdf
 * - docs/contract-templates/CONTRAT_NOX_ORGANISATEUR_LIEU_VERSION_DYNAMIQUE.pdf
 */

const PDFDocument = require('pdfkit');

const PAYMENT_TERMS_LABELS = {
  jour_booking: 'Jour du booking',
  'j-1_prestation': 'J-1 de la prestation',
  'j+1_prestation': 'J+1 de la prestation',
  j15: 'J+15',
  'j+15': 'J+15',
  j30: 'J+30',
  'j+30': 'J+30',
};

/** Taux commission plateforme sur le cachet DJ (modèle NOX art. 3) */
const NOX_DJ_COMMISSION_RATE = 0.1;

/** Taux par défaut commission lieu si non renseigné dans le payload */
const NOX_VENUE_COMMISSION_RATE = 0.1;

/** Clés contractPayload.cancellation → libellés PDF (FR) */
const CANCELLATION_LABELS_FR = {
  free_j30: 'Au moins 30 jours avant l’événement : annulation sans frais.',
  free_j14: 'Au moins 14 jours avant : annulation sans frais.',
  free_j7: 'Au moins 7 jours avant : annulation sans frais.',
  fee50_between_j7_j14: 'Entre 7 et 14 jours avant : 50 % du montant dû.',
  fee50_under_j7: 'Moins de 7 jours avant : 50 % du montant dû.',
  fee100_under_j7: 'Moins de 7 jours avant : 100 % du montant dû.',
  fee100_under_j3: 'Moins de 3 jours avant : 100 % du montant dû.',
};

function resolveCancellation(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const k = String(raw).trim();
  return CANCELLATION_LABELS_FR[k] || k;
}

function formatDate(date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatAddr(parts) {
  return parts.filter(Boolean).join(', ') || '—';
}

function roundMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return Math.round(Number(n) * 100) / 100;
}

/**
 * Texte issu du contractPayload (mobile / JSON) : évite TypeError si la valeur est un nombre
 * alors que l’ancien code appelait .trim() directement (ex. notes, financialClause).
 */
function payloadText(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    const t = v.trim();
    return t === '' ? null : t;
  }
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return null;
}

function contentWidth(doc) {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function p(doc, text, opts = {}) {
  doc.fontSize(10).font('Helvetica').fillColor('black').text(String(text), {
    width: contentWidth(doc),
    align: 'left',
    ...opts,
  });
}

function space(doc, h = 12) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + h > bottom - 20) doc.addPage();
}

function titleLine(doc, text, size = 11) {
  space(doc, 24);
  doc.fontSize(size).font('Helvetica-Bold').fillColor('black').text(text, { width: contentWidth(doc) });
  doc.moveDown(0.35);
}

function bookerPersonName(booker) {
  return [booker?.prenom, booker?.nom].filter(Boolean).join(' ') || '';
}

function organizerDisplayName(booker) {
  const person = bookerPersonName(booker);
  if (booker?.companyName?.trim()) return booker.companyName.trim();
  return person || '—';
}

function organizerRepresentative(booker) {
  const person = bookerPersonName(booker);
  if (booker?.companyName?.trim() && person) return person;
  return person || '—';
}

function paymentTermsLabel(payloadKey) {
  if (payloadKey == null) return '—';
  const k = String(payloadKey);
  return PAYMENT_TERMS_LABELS[k] || k;
}

function amountNum(row, payload) {
  const n = row?.paymentAmount ?? payload?.priceEur ?? payload?.amount ?? payload?.rentAmount;
  if (n == null) return null;
  const v = Number(n);
  return Number.isNaN(v) ? null : v;
}

/**
 * Contrat DJ — aligné modèle « Contrat de Booking Nox - DJ / Organisateur »
 */
async function generateDjContractPdf({
  event,
  booker,
  dj,
  eventDj,
  venue,
  organizerEmail,
  djEmail,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const payload = eventDj?.contractPayload || {};
    const amount = amountNum(eventDj, payload);
    const depositPercent = payload.depositPercent ?? null;
    const paymentTerms = paymentTermsLabel(payload.paymentTerms);
    const cancellation = resolveCancellation(payload.cancellation);
    const notes = payloadText(payload.notes);
    const equipment = payloadText(payload.equipment);
    const eventEnd = payloadText(payload.eventEnd);

    const feeNox = amount != null ? roundMoney(Number(amount) * NOX_DJ_COMMISSION_RATE) : null;
    const feeTotal =
      amount != null && feeNox != null ? roundMoney(Number(amount) + feeNox) : null;

    const vatLine = dj?.vatNumber
      ? `N° TVA : ${dj.vatNumber} (facturation par l'Artiste)`
      : 'Non applicable — selon facturation de l\'Artiste';

    const eventAddress =
      formatAddr([venue?.address, venue?.postalCode, venue?.city, venue?.country]) !== '—'
        ? formatAddr([venue?.address, venue?.postalCode, venue?.city, venue?.country])
        : event?.location || '—';

    doc.fontSize(9).font('Helvetica').fillColor('#333').text('Contrat de Booking Nox - DJ / Organisateur', {
      align: 'center',
      width: contentWidth(doc),
    });
    doc.moveDown(0.25);
    doc.fontSize(16).font('Helvetica-Bold').text('CONTRAT DE PRESTATION ARTISTIQUE', {
      align: 'center',
      width: contentWidth(doc),
    });
    doc.moveDown(1);
    p(doc, 'Entre les soussignés :');
    doc.moveDown(0.75);

    titleLine(doc, '1 — Organisateur', 11);
    p(doc, `Nom / Société : ${organizerDisplayName(booker)}`);
    p(doc, `Représenté par : ${organizerRepresentative(booker)}`);
    p(doc, `Adresse : ${formatAddr([booker?.address, booker?.postalCode, booker?.city, booker?.country])}`);
    p(doc, `SIRET : ${booker?.siret || '—'}`);
    p(doc, `Email : ${organizerEmail || '—'}`);
    p(doc, 'Ci-après dénommé « l\'Organisateur »');
    doc.moveDown(0.75);
    p(doc, 'ET');
    doc.moveDown(0.75);

    titleLine(doc, '2 — Artiste / DJ', 11);
    p(doc, `Nom de scène : ${dj?.artistName || '—'}`);
    p(doc, `Nom légal / société : ${dj?.legalName || '—'}`);
    p(doc, `Adresse : ${formatAddr([dj?.address, dj?.postalCode, dj?.country])}`);
    p(doc, `SIRET : ${dj?.siret || '—'}`);
    p(doc, `TVA : ${dj?.vatNumber || '—'}`);
    p(doc, `Email : ${djEmail || '—'}`);
    p(doc, 'Ci-après dénommé « l\'Artiste »');
    doc.moveDown(0.75);
    p(doc, 'Les parties conviennent ce qui suit :');
    doc.moveDown(0.75);

    titleLine(doc, 'Article 1 — Objet', 11);
    p(doc, "L'Artiste s'engage à réaliser une prestation musicale dans le cadre de l'événement suivant :");
    doc.moveDown(0.35);
    p(doc, `Nom de l'événement : ${event?.title || '—'}`);
    p(doc, `Lieu : ${venue?.venueName || event?.venue?.venueName || '—'}`);
    p(doc, `Adresse : ${eventAddress}`);
    p(doc, `Date : ${formatDate(event?.date)}`);
    p(doc, `Horaires : ${event?.time || '—'} – ${eventEnd || 'fin selon programmation'}`);
    p(doc, `Notes : ${notes || '—'}`);

    titleLine(doc, "Article 2 — Cachet de l'Artiste", 11);
    p(doc, 'Le cachet convenu entre les parties est de :');
    doc.moveDown(0.25);
    p(doc, `Montant artiste : ${amount != null ? `${roundMoney(amount)} €` : '—'}`);
    p(doc, `TVA : ${vatLine}`);
    p(doc, `Total artiste : ${amount != null ? `${roundMoney(amount)} €` : '—'}`);
    doc.moveDown(0.35);
    p(doc, 'Modalités de paiement :');
    p(doc, paymentTerms);
    p(doc, 'Acompte :');
    p(doc, depositPercent != null ? `${depositPercent} %` : '—');
    p(doc, "Le paiement du cachet est effectué directement par l'Organisateur à l'Artiste.");

    titleLine(doc, 'Article 3 — Commission NOX', 11);
    p(doc, 'La mise en relation entre les parties a été effectuée via la plateforme NOX.');
    p(doc, "Une commission de service de 10 % du cachet de l'Artiste est due à NOX.");
    p(doc, `Montant commission NOX : ${feeNox != null ? `${feeNox} €` : '—'}`);
    p(doc, `Montant total payé par l'Organisateur : ${feeTotal != null ? `${feeTotal} €` : '—'}`);
    p(doc, "Cette commission est indépendante du cachet de l'Artiste.");
    p(doc, 'Le paiement de cette commission conditionne la validation du contrat.');
    p(
      doc,
      'La commission est payable à NOX lors de la signature électronique du présent contrat via la plateforme.'
    );

    titleLine(doc, 'Article 4 — Paiement', 11);
    p(doc, "L'Organisateur s'engage à régler :");
    p(doc, '- la commission NOX via la plateforme');
    p(doc, "- le cachet de l'Artiste directement à l'Artiste");
    doc.moveDown(0.35);
    p(doc, 'Le non-paiement de la commission peut entraîner l\'annulation du booking.');

    titleLine(doc, 'Article 5 — Acompte', 11);
    p(doc, 'Si un acompte est prévu :');
    p(doc, "L'Organisateur s'engage à verser un acompte de :");
    p(doc, depositPercent != null ? `${depositPercent} %` : '— (non précisé)');
    p(doc, 'dans les conditions suivantes :');
    p(doc, paymentTerms || '—');
    p(doc, "L'acompte n'est pas remboursable sauf accord des parties.");

    titleLine(doc, 'Article 6 — Annulation', 11);
    p(doc, 'Conditions d\'annulation :');
    p(doc, cancellation || '—');
    doc.moveDown(0.25);
    p(doc, 'Force majeure : selon le droit commun et l’accord des parties.');

    titleLine(doc, 'Article 7 — Responsabilités', 11);
    p(doc, "L'Organisateur est responsable :");
    p(doc, '- autorisations');
    p(doc, '- sécurité');
    p(doc, '- assurance');
    p(doc, '- matériel');
    doc.moveDown(0.25);
    p(doc, "L'Artiste est responsable :");
    p(doc, '- prestation');
    p(doc, '- comportement');
    p(doc, '- facturation');

    titleLine(doc, 'Article 8 — Matériel', 11);
    p(doc, 'Matériel fourni par l\'Organisateur :');
    p(doc, equipment || 'Non détaillé — les parties peuvent préciser par écrit.');
    p(doc, "L'Artiste s'engage à utiliser le matériel avec soin.");

    titleLine(doc, 'Article 9 — Plateforme NOX', 11);
    p(doc, 'NOX agit uniquement comme plateforme de mise en relation.');
    p(doc, "NOX n'est pas partie au contrat.");
    p(doc, "NOX n'est pas responsable :");
    p(doc, "- du paiement du cachet");
    p(doc, '- de la prestation');
    p(doc, '- des incidents');
    p(doc, '- des annulations');
    p(doc, '- des dommages');

    titleLine(doc, 'Article 10 — Non contournement', 11);
    p(doc, 'Les parties reconnaissent avoir été mises en relation via NOX.');
    p(
      doc,
      "Elles s'engagent à ne pas conclure directement de prestation similaire sans passer par la plateforme pendant une durée de 12 mois."
    );
    p(doc, 'Toute violation peut entraîner des frais équivalents à la commission.');

    titleLine(doc, 'Article 11 — Signature électronique', 11);
    p(doc, 'Le présent contrat est signé électroniquement via NOX.');
    p(doc, 'La signature vaut acceptation.');
    const signDate =
      eventDj?.bookerAcceptedAt && eventDj?.djAcceptedAt
        ? formatDate(
            new Date(Math.max(new Date(eventDj.bookerAcceptedAt).getTime(), new Date(eventDj.djAcceptedAt).getTime()))
          )
        : formatDate(new Date());
    p(doc, `Date : ${signDate}`);
    p(doc, '');
    p(doc, `Signature Organisateur${eventDj?.bookerAcceptedAt ? ` — accepté le ${formatDate(eventDj.bookerAcceptedAt)}` : ''}`);
    p(doc, `Signature Artiste${eventDj?.djAcceptedAt ? ` — accepté le ${formatDate(eventDj.djAcceptedAt)}` : ''}`);

    doc.end();
  });
}

function venueDealType(payload) {
  const raw = payload.dealType || payload.deal_type || 'fixed_rent';
  return String(raw).trim();
}

/**
 * Partie « Lieu » du contrat : lorsque l’invitation est acceptée, on aligne sur le lieu
 * rattaché à l’événement (création) — `event.venue`. Sinon profil issu du lien EventVenue.
 */
function resolveVenueProfileForVenueContract(event, venueFromEventVenue, eventVenue) {
  if (eventVenue?.status === 'ACCEPTED' && event?.venue) {
    return event.venue;
  }
  return venueFromEventVenue;
}

function numPayload(payload, ...keys) {
  for (const k of keys) {
    if (payload[k] != null) {
      const v = Number(payload[k]);
      if (!Number.isNaN(v)) return v;
    }
  }
  return null;
}

/**
 * Contrat Lieu — aligné modèle « CONTRAT NOX — ORGANISATEUR / LIEU »
 */
async function generateVenueContractPdf({
  event,
  booker,
  venue,
  eventVenue,
  organizerEmail,
  venueEmail,
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, autoFirstPage: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const payload = eventVenue?.contractPayload || {};
    const amount = amountNum(eventVenue, payload);
    const dealType = venueDealType(payload);
    const depositPercent = payload.depositPercent ?? null;
    const paymentTerms = paymentTermsLabel(payload.paymentTerms);
    const cancellation = resolveCancellation(payload.cancellation);
    const notes = payloadText(payload.notes);
    const eventEnd = payloadText(payload.eventEnd);
    const equipmentVenue = payloadText(payload.equipmentVenue) || payloadText(payload.equipment_venue);
    const equipmentOrganizer =
      payloadText(payload.equipmentOrganizer) || payloadText(payload.equipment_organizer);
    const customTerms = payloadText(payload.customTerms) || payloadText(payload.custom_terms) || notes;

    const splitBarOrg = numPayload(payload, 'splitBarOrg', 'split_bar_org');
    const splitBarVenue = numPayload(payload, 'splitBarVenue', 'split_bar_venue');
    const splitTicketOrg = numPayload(payload, 'splitTicketOrg', 'split_ticket_org');
    const splitTicketVenue = numPayload(payload, 'splitTicketVenue', 'split_ticket_venue');
    const minimumGuarantee = numPayload(payload, 'minimumGuarantee', 'minimum_guarantee');
    const splitTerms =
      payloadText(payload.splitTerms) || payloadText(payload.split_terms) || '—';

    const venueProfile = resolveVenueProfileForVenueContract(event, venue, eventVenue);

    const noxFee = amount != null ? roundMoney(Number(amount) * NOX_VENUE_COMMISSION_RATE) : null;
    const totalFee =
      amount != null && noxFee != null ? roundMoney(Number(amount) + noxFee) : noxFee != null ? noxFee : null;

    const venueAddr = formatAddr([venueProfile?.address, venueProfile?.postalCode, venueProfile?.city, venueProfile?.country]);

    doc.fontSize(9).font('Helvetica').fillColor('#333').text('CONTRAT NOX — ORGANISATEUR / LIEU (VERSION DYNAMIQUE)', {
      align: 'center',
      width: contentWidth(doc),
    });
    doc.moveDown(0.25);
    doc.fontSize(14).font('Helvetica-Bold').text("CONTRAT DE MISE À DISPOSITION DE LIEU ET ORGANISATION D'ÉV\u00c9NEMENT", {
      align: 'center',
      width: contentWidth(doc),
    });
    doc.moveDown(1);
    p(doc, 'Entre les soussignés :');
    doc.moveDown(0.75);

    titleLine(doc, "1 — L'Organisateur", 11);
    p(doc, `Nom / Société : ${organizerDisplayName(booker)}`);
    p(doc, `Représenté par : ${organizerRepresentative(booker)}`);
    p(doc, `Adresse : ${formatAddr([booker?.address, booker?.postalCode, booker?.city, booker?.country])}`);
    p(doc, `SIRET : ${booker?.siret || '—'}`);
    p(doc, `Email : ${organizerEmail || '—'}`);
    p(doc, `Téléphone : ${booker?.phonePro || '—'}`);
    p(doc, 'Ci-après dénommé « l\'Organisateur »');
    doc.moveDown(0.75);
    p(doc, 'ET');
    doc.moveDown(0.75);

    titleLine(doc, '2 — Le Lieu / Exploitant', 11);
    p(doc, `Nom établissement : ${venueProfile?.venueName || '—'}`);
    p(doc, `Société : ${venueProfile?.companyName || '—'}`);
    p(doc, `Représenté par : ${venueProfile?.legalRepresentative || '—'}`);
    p(doc, `Adresse : ${venueAddr}`);
    p(doc, `SIRET : ${venueProfile?.siret || '—'}`);
    p(doc, `Email : ${venueEmail || '—'}`);
    p(doc, 'Ci-après dénommé « le Lieu »');
    doc.moveDown(0.75);
    p(doc, 'Les parties conviennent ce qui suit :');
    doc.moveDown(0.75);

    titleLine(doc, 'Article 1 — Objet', 11);
    p(doc, 'Le Lieu met à disposition ses installations pour l\'événement suivant :');
    doc.moveDown(0.35);
    p(doc, `Nom : ${event?.title || '—'}`);
    p(doc, `Date : ${formatDate(event?.date)}`);
    p(doc, `Horaires : ${event?.time || '—'} – ${eventEnd || 'fin selon programmation'}`);
    p(doc, `Adresse : ${venueAddr}`);
    p(doc, 'Notes :');
    p(doc, notes || '—');

    titleLine(doc, 'Article 2 — Conditions financières', 11);
    p(doc, 'Les parties conviennent des modalités suivantes :');
    const financialClause = payloadText(payload.financialClause);
    if (financialClause) {
      p(doc, financialClause);
      doc.moveDown(0.35);
    }

    const cas = (label, bodyFn) => {
      titleLine(doc, label, 10);
      bodyFn();
      doc.moveDown(0.35);
    };

    if (dealType === 'fixed_rent') {
      cas('> CAS 1 — Location fixe', () => {
        p(doc, 'Le Lieu est mis à disposition moyennant la somme de :');
        p(doc, `${amount != null ? `${roundMoney(amount)} €` : '—'}`);
        p(doc, 'Modalités :');
        p(doc, paymentTerms);
        p(doc, 'Acompte :');
        p(doc, depositPercent != null ? `${depositPercent} %` : '—');
        p(doc, 'Le paiement est effectué par l\'Organisateur au Lieu.');
      });
    } else if (dealType === 'bar_only') {
      cas('> CAS 2 — Le lieu garde le bar', () => {
        p(doc, 'Le Lieu met à disposition ses installations sans frais de location.');
        p(doc, 'Le Lieu conserve l\'intégralité des recettes du bar.');
        p(doc, 'L\'Organisateur conserve les recettes de billetterie.');
      });
    } else if (dealType === 'revenue_split') {
      cas('> CAS 3 — Partage des recettes', () => {
        p(doc, 'Les recettes seront réparties comme suit :');
        p(doc, 'Bar :');
        p(doc, `Organisateur : ${splitBarOrg != null ? `${splitBarOrg} %` : '—'}`);
        p(doc, `Lieu : ${splitBarVenue != null ? `${splitBarVenue} %` : '—'}`);
        p(doc, 'Billetterie :');
        p(doc, `Organisateur : ${splitTicketOrg != null ? `${splitTicketOrg} %` : '—'}`);
        p(doc, `Lieu : ${splitTicketVenue != null ? `${splitTicketVenue} %` : '—'}`);
        p(doc, 'Le règlement s\'effectuera après l\'événement.');
      });
    } else if (dealType === 'rent_plus_split') {
      cas('> CAS 4 — Location + partage', () => {
        p(doc, 'Le Lieu est loué pour :');
        p(doc, `${amount != null ? `${roundMoney(amount)} €` : '—'}`);
        p(doc, 'Les recettes seront réparties :');
        p(doc, 'Bar :');
        p(doc, `Organisateur : ${splitBarOrg != null ? `${splitBarOrg} %` : '—'}`);
        p(doc, `Lieu : ${splitBarVenue != null ? `${splitBarVenue} %` : '—'}`);
        p(doc, 'Billetterie :');
        p(doc, `Organisateur : ${splitTicketOrg != null ? `${splitTicketOrg} %` : '—'}`);
        p(doc, `Lieu : ${splitTicketVenue != null ? `${splitTicketVenue} %` : '—'}`);
      });
    } else if (dealType === 'minimum_guarantee') {
      cas('> CAS 5 — Minimum garanti', () => {
        p(doc, 'L\'Organisateur garantit un minimum de :');
        p(doc, `${minimumGuarantee != null ? `${roundMoney(minimumGuarantee)} €` : '—'}`);
        p(doc, 'Si les recettes dépassent ce montant, un partage pourra être appliqué :');
        p(doc, splitTerms);
      });
    } else if (dealType === 'custom') {
      cas('> CAS 6 — Accord personnalisé', () => {
        p(doc, 'Les parties conviennent des modalités suivantes :');
        p(doc, customTerms || '—');
      });
    } else {
      cas(`> Accord (${dealType})`, () => {
        p(doc, customTerms || paymentTerms || '—');
      });
    }

    titleLine(doc, 'Article 3 — Commission NOX', 11);
    p(doc, 'La mise en relation a été effectuée via la plateforme NOX.');
    p(doc, 'Une commission de service de 10 % du montant principal convenu est due à NOX.');
    p(doc, `Montant commission : ${noxFee != null ? `${noxFee} €` : '—'}`);
    p(doc, `Total : ${totalFee != null ? `${totalFee} €` : '—'}`);
    p(doc, 'Le paiement de la commission peut être exigé lors de la validation du contrat.');
    p(doc, 'NOX agit uniquement comme plateforme technique.');
    p(doc, "NOX n'est pas partie au contrat.");

    titleLine(doc, 'Article 4 — Obligations du Lieu', 11);
    p(doc, 'Le Lieu s\'engage à :');
    p(doc, '- fournir les installations');
    p(doc, '- être en conformité');
    p(doc, '- disposer des autorisations');
    p(doc, '- être assuré');
    doc.moveDown(0.25);
    p(doc, 'Le Lieu reste responsable :');
    p(doc, '- du bâtiment');
    p(doc, '- de la sécurité structurelle');
    p(doc, '- des autorisations administratives');

    titleLine(doc, 'Article 5 — Obligations de l\'Organisateur', 11);
    p(doc, 'L\'Organisateur s\'engage à :');
    p(doc, '- respecter la réglementation');
    p(doc, '- respecter la capacité');
    p(doc, '- respecter les horaires');
    p(doc, '- assurer l\'événement si nécessaire');
    doc.moveDown(0.25);
    p(doc, 'L\'Organisateur est responsable :');
    p(doc, '- du public');
    p(doc, '- des artistes');
    p(doc, '- du matériel extérieur');
    p(doc, '- des dommages causés');

    titleLine(doc, 'Article 6 — Matériel', 11);
    p(doc, 'Matériel fourni par le Lieu :');
    p(doc, equipmentVenue || '—');
    p(doc, 'Matériel apporté par l\'Organisateur :');
    p(doc, equipmentOrganizer || '—');
    p(doc, 'Tout dommage sera à la charge du responsable.');

    titleLine(doc, 'Article 7 — Annulation', 11);
    p(doc, 'Conditions d\'annulation :');
    p(doc, cancellation || '—');
    doc.moveDown(0.25);
    p(doc, 'Force majeure : selon le droit commun et l’accord des parties.');

    titleLine(doc, 'Article 8 — Horaires et nuisances', 11);
    p(doc, 'L\'Organisateur s\'engage à respecter :');
    p(doc, '- horaires');
    p(doc, '- volume sonore');
    p(doc, '- règlement intérieur');
    doc.moveDown(0.25);
    p(doc, 'Le Lieu peut interrompre l\'événement en cas de non-respect.');

    titleLine(doc, 'Article 9 — Responsabilité', 11);
    p(doc, 'Chaque partie est responsable de ses actes.');
    p(doc, 'Le Lieu n\'est pas responsable :');
    p(doc, '- des artistes');
    p(doc, '- du public');
    p(doc, '- du matériel extérieur');
    doc.moveDown(0.25);
    p(doc, 'L\'Organisateur n\'est pas responsable :');
    p(doc, '- des défauts du bâtiment');
    p(doc, '- des autorisations du Lieu');

    titleLine(doc, 'Article 10 — NOX', 11);
    p(doc, 'La mise en relation a été effectuée via NOX.');
    p(doc, "NOX n'est pas responsable :");
    p(doc, '- du paiement');
    p(doc, '- de l\'événement');
    p(doc, '- des incidents');
    p(doc, '- des annulations');
    p(doc, '- des dommages');

    titleLine(doc, 'Article 11 — Non contournement', 11);
    p(doc, 'Les parties reconnaissent avoir été mises en relation via NOX.');
    p(doc, 'Elles s\'engagent à ne pas conclure directement sans passer par la plateforme pendant 12 mois.');
    p(doc, 'Toute violation peut entraîner des frais équivalents à la commission.');

    titleLine(doc, 'Article 12 — Signature électronique', 11);
    p(doc, 'Le contrat est validé via NOX.');
    p(doc, 'La validation vaut signature.');
    const signDate =
      eventVenue?.bookerAcceptedAt && eventVenue?.venueAcceptedAt
        ? formatDate(
            new Date(
              Math.max(
                new Date(eventVenue.bookerAcceptedAt).getTime(),
                new Date(eventVenue.venueAcceptedAt).getTime()
              )
            )
          )
        : formatDate(new Date());
    p(doc, `Date : ${signDate}`);
    p(doc, '');
    p(
      doc,
      `Signature Organisateur${eventVenue?.bookerAcceptedAt ? ` — ${formatDate(eventVenue.bookerAcceptedAt)}` : ''}`
    );
    p(doc, `Signature Lieu${eventVenue?.venueAcceptedAt ? ` — ${formatDate(eventVenue.venueAcceptedAt)}` : ''}`);

    doc.end();
  });
}

module.exports = {
  generateDjContractPdf,
  generateVenueContractPdf,
  resolveVenueProfileForVenueContract,
};
