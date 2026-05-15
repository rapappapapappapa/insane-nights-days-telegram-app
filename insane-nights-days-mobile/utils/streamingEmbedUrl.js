/**
 * Conversion de liens publics Spotify / SoundCloud vers des URLs jouables dans une WebView
 * (embeds officiels — pas de SDK natif, pas de rebuild).
 */

/**
 * @param {string} openUrl ex. https://open.spotify.com/track/xxx ou …/intl-fr/track/xxx
 * @returns {string|null} https://open.spotify.com/embed/track/xxx
 */
export function spotifyOpenUrlToEmbedUrl(openUrl) {
  if (!openUrl || typeof openUrl !== 'string') return null;
  const u = openUrl.trim();
  const m = u.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|episode)\/([a-zA-Z0-9]+)/i);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}`;
}

/**
 * @param {string} pageUrl page SoundCloud publique (piste / profil avec morceau exposé)
 * @returns {string|null}
 */
export function soundcloudUrlToWidgetUrl(pageUrl) {
  if (!pageUrl || typeof pageUrl !== 'string') return null;
  const trimmed = pageUrl.trim();
  if (!/^https:\/\//i.test(trimmed) && !/^http:\/\//i.test(trimmed)) return null;
  if (!/soundcloud\.com/i.test(trimmed)) return null;
  const params = new URLSearchParams({
    url: trimmed,
    color: '#ff1744',
    auto_play: 'false',
    hide_related: 'false',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    show_teaser: 'true',
    visual: 'false',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}
