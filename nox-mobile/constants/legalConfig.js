/**
 * Infos légales centralisées (app + URLs publiques pour les stores).
 * Compléter LEGAL_PUBLISHER_* avant soumission App Store / Play Store.
 */

export const LEGAL_APP_NAME = 'Nox';
export const LEGAL_APP_NAME_LONG = 'NOX';

export const LEGAL_SUPPORT_EMAIL = 'support@nox.world';

export const LEGAL_LAST_UPDATED_FR = '17 juin 2026';
export const LEGAL_LAST_UPDATED_EN = '17 June 2026';

/** À compléter par l'éditeur avant publication store */
export const LEGAL_PUBLISHER_NAME = '[Raison sociale à compléter]';
export const LEGAL_PUBLISHER_ADDRESS = '[Adresse du siège à compléter]';
export const LEGAL_PUBLISHER_DIRECTOR = '[Directeur de publication à compléter]';
export const LEGAL_HOST_NAME = 'Railway Corp.';
export const LEGAL_HOST_ADDRESS = '548 Market St, San Francisco, CA 94104, USA';

const PLACEHOLDERS = {
  '[email à compléter]': LEGAL_SUPPORT_EMAIL,
  '[email to be completed]': LEGAL_SUPPORT_EMAIL,
  '[À compléter par l\'éditeur]': LEGAL_LAST_UPDATED_FR,
  '[To be completed by the publisher]': LEGAL_LAST_UPDATED_EN,
  '[À compléter]': LEGAL_LAST_UPDATED_FR,
  '[To be completed]': LEGAL_LAST_UPDATED_EN,
  '[Identité du responsable à compléter]': `${LEGAL_PUBLISHER_NAME} — ${LEGAL_PUBLISHER_ADDRESS}`,
  '[Controller identity to be completed]': `${LEGAL_PUBLISHER_NAME} — ${LEGAL_PUBLISHER_ADDRESS}`,
  '[Raison sociale :]** [À compléter]': `**Raison sociale :** ${LEGAL_PUBLISHER_NAME}`,
};

/** Remplace les placeholders restants dans les textes légaux */
export function applyLegalPlaceholders(text) {
  let out = text;
  out = out.replace(/\*\*Raison sociale :\*\* \[À compléter\]/g, `**Raison sociale :** ${LEGAL_PUBLISHER_NAME}`);
  out = out.replace(/\*\*Siège social :\*\* \[Adresse à compléter\]/g, `**Siège social :** ${LEGAL_PUBLISHER_ADDRESS}`);
  out = out.replace(/\*\*Email :\*\* \[À compléter\]/g, `**Email :** ${LEGAL_SUPPORT_EMAIL}`);
  out = out.replace(/\[Nom de l'hébergeur à compléter\]/g, LEGAL_HOST_NAME);
  out = out.replace(/\[Adresse à compléter\]/g, LEGAL_HOST_ADDRESS);
  out = out.replace(/\[Nom à compléter\]/g, LEGAL_PUBLISHER_DIRECTOR);
  out = out.replace(/\*\*Company name:\*\* \[To be completed\]/g, `**Company name:** ${LEGAL_PUBLISHER_NAME}`);
  out = out.replace(/\*\*Registered office:\*\* \[Address to be completed\]/g, `**Registered office:** ${LEGAL_PUBLISHER_ADDRESS}`);
  out = out.replace(/\*\*Email:\*\* \[To be completed\]/g, `**Email:** ${LEGAL_SUPPORT_EMAIL}`);
  out = out.replace(/\[Host name to be completed\]/g, LEGAL_HOST_NAME);
  out = out.replace(/\[Address to be completed\]/g, LEGAL_HOST_ADDRESS);
  out = out.replace(/\[Name to be completed\]/g, LEGAL_PUBLISHER_DIRECTOR);

  for (const [from, to] of Object.entries(PLACEHOLDERS)) {
    out = out.split(from).join(to);
  }
  return out;
}

/** URLs publiques (obligatoires App Store / Play Store) — base = API prod sans slash final */
export function getLegalPublicUrls(apiBase) {
  const base = (apiBase || '').replace(/\/$/, '');
  return {
    privacy: `${base}/legal/privacy.html`,
    cgu: `${base}/legal/cgu.html`,
    cgv: `${base}/legal/cgv.html`,
    mentions: `${base}/legal/mentions.html`,
    index: `${base}/legal/`,
  };
}
