/** Types d’organisateur (`UserBooker.bookerType`), enregistrés en français ou en anglais selon l’époque. */
const KIND_BY_TYPE = {
  collectif: 'collectif',
  agency: 'agency',
  agence: 'agency',
  independent: 'independent',
  indépendant: 'independent',
  independant: 'independent',
};

const KIND_ORDER = ['collectif', 'agency', 'independent'];

export function organizerKind(bookerType) {
  return KIND_BY_TYPE[String(bookerType || '').trim().toLowerCase()] || null;
}

export function organizerTypeLabel(bookerType, fr) {
  switch (organizerKind(bookerType)) {
    case 'collectif':
      return fr ? 'Collectif' : 'Collective';
    case 'agency':
      return fr ? 'Agence' : 'Agency';
    case 'independent':
      return fr ? 'Indépendant' : 'Independent';
    default:
      return bookerType || (fr ? 'Organisateur' : 'Organizer');
  }
}

/** Collectifs, agences et indépendants (collectifs en premier). */
export function suggestedOrganizers(bookers) {
  return (Array.isArray(bookers) ? bookers : [])
    .filter((b) => organizerKind(b?.bookerType))
    .sort((a, b) => KIND_ORDER.indexOf(organizerKind(a.bookerType)) - KIND_ORDER.indexOf(organizerKind(b.bookerType)));
}
