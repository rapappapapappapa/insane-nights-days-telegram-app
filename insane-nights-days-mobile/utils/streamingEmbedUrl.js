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

  const uriScheme = u.match(/^spotify:(track|playlist|album|episode|artist|show):([a-zA-Z0-9]+)/i);
  if (uriScheme) {
    return `https://open.spotify.com/embed/${uriScheme[1].toLowerCase()}/${uriScheme[2]}`;
  }

  const patterns = [
    /open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|playlist|album|episode|artist|show)\/([a-zA-Z0-9]+)/i,
    /www\.spotify\.com\/(?:intl-[a-z]{2}\/|[a-z]{2}\/)?(artist|album|track|playlist|show|episode)\/([a-zA-Z0-9]+)/i,
  ];
  for (const re of patterns) {
    const m = u.match(re);
    if (m) {
      return `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}`;
    }
  }
  return null;
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

/**
 * @param {string} url
 * @param {'spotify'|'soundcloud'} provider
 * @returns {{ uri: string, title: string } | null}
 */
export function resolveStreamingEmbed(url, provider) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (provider === 'spotify') {
    const uri = spotifyOpenUrlToEmbedUrl(trimmed);
    return uri ? { uri, title: 'Spotify' } : null;
  }
  if (provider === 'soundcloud') {
    const uri = soundcloudUrlToWidgetUrl(trimmed);
    return uri ? { uri, title: 'SoundCloud' } : null;
  }
  return null;
}
