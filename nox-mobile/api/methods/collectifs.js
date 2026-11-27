/** Collectifs : formulaire d’adhésion HelloAsso (organisateur) et adhésion (Communauté). */
export function createCollectifsApiMethods({ apiRequest }) {
  return {
    getCollectifSettings: async (token) =>
      apiRequest('/api/booker/me/collectif-settings', { noCache: true }, token),

    updateCollectifSettings: async (token, settings) =>
      apiRequest('/api/booker/me/collectif-settings', { method: 'PUT', body: JSON.stringify(settings) }, token),

    getCollectifMembers: async (token) =>
      apiRequest('/api/booker/me/collectif-members', { noCache: true }, token),

    getCollectifMembership: async (token, bookerId) =>
      apiRequest(`/api/collectifs/${bookerId}/membership`, { noCache: true }, token),

    /** Vérifie sur HelloAsso une adhésion payée avec l’email du compte. */
    syncCollectifMembership: async (token, bookerId) =>
      apiRequest(`/api/collectifs/${bookerId}/membership/sync`, { method: 'POST' }, token),

    getMyCollectifMemberships: async (token) =>
      apiRequest('/api/user/me/collectif-memberships', { noCache: true }, token),
  };
}
