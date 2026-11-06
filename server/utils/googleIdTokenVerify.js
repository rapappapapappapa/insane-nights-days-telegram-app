/**
 * Vérifie un id_token Google Sign-In / OAuth (mobile ou web).
 * Les CLIENT_ID autorisées doivent correspondre aux apps configurées dans la Google Cloud Console.
 */
const { OAuth2Client } = require('google-auth-library');

function getGoogleOAuthAudiences() {
  const web = (process.env.GOOGLE_OAUTH_WEB_CLIENT_ID || '').trim();
  const ios = (process.env.GOOGLE_OAUTH_IOS_CLIENT_ID || '').trim();
  const android = (process.env.GOOGLE_OAUTH_ANDROID_CLIENT_ID || '').trim();
  return [web, ios, android].filter(Boolean);
}

exports.isGoogleOAuthConfigured = () => getGoogleOAuthAudiences().length > 0;

/**
 * @param {string} idToken
 * @returns {Promise<{ googleId: string, email: string, name: string, picture: string }>}
 */
exports.verifyGoogleIdToken = async (idToken) => {
  const audiences = getGoogleOAuthAudiences();
  if (!audiences.length) {
    const err = new Error('Google OAuth non configuré sur le serveur (IDs clients manquants).');
    err.statusCode = 503;
    throw err;
  }
  if (!idToken || typeof idToken !== 'string') {
    const err = new Error('Token Google manquant.');
    err.statusCode = 400;
    throw err;
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken: idToken.trim(),
    audience: audiences,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    const err = new Error('Réponse Google invalide.');
    err.statusCode = 400;
    throw err;
  }
  const ev = payload.email_verified;
  if (ev !== true && ev !== 'true' && ev !== 1) {
    const err = new Error('Ton compte Google doit avoir une email vérifiée.');
    err.statusCode = 400;
    throw err;
  }

  return {
    googleId: payload.sub,
    email: String(payload.email).toLowerCase().trim(),
    name: typeof payload.name === 'string' ? payload.name.trim() : '',
    picture: typeof payload.picture === 'string' ? payload.picture.trim() : '',
  };
};
