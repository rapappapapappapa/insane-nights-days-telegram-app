/**
 * Envoi de notifications via l’API Expo Push (HTTPS).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isLikelyExpoPushToken(token) {
  return typeof token === 'string' && /^ExponentPushToken\[/.test(token.trim());
}

/**
 * @param {Array<{ to: string, title?: string, body?: string, data?: object, sound?: string }>} messages
 */
async function sendExpoPushBatch(messages) {
  const valid = messages.filter((m) => m && isLikelyExpoPushToken(m.to));
  if (!valid.length) return { data: [] };

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(valid),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[expoPush] HTTP error', res.status, JSON.stringify(json).slice(0, 500));
  }
  return json;
}

/**
 * @param {string[]} tokens
 * @param {{ title: string, body: string, data?: object }} payload
 */
async function sendExpoPushToTokens(tokens, { title, body, data = {} }) {
  const unique = [...new Set(tokens.filter(isLikelyExpoPushToken))];
  if (!unique.length) return;

  const chunks = [];
  for (let i = 0; i < unique.length; i += 100) {
    chunks.push(unique.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    const messages = chunk.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data: typeof data === 'object' && data !== null ? data : {},
    }));
    try {
      await sendExpoPushBatch(messages);
    } catch (e) {
      console.error('[expoPush] send failed', e?.message || e);
    }
  }
}

module.exports = {
  sendExpoPushToTokens,
  isLikelyExpoPushToken,
};
