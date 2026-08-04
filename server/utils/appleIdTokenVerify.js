/**
 * Vérification du jeton d’identité Sign in with Apple (JWT RS256, JWKS Apple).
 * L’audience attendue est le bundle iOS (ex. com.nox.mobile).
 */
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const JWKS_URI = 'https://appleid.apple.com/auth/keys';
const ISSUER = 'https://appleid.apple.com';

function getAppleAudience() {
  return (process.env.APPLE_IOS_BUNDLE_ID || '').trim() || 'com.nox.mobile';
}

function getClient() {
  return jwksClient({
    jwksUri: JWKS_URI,
    cache: true,
    cacheMaxAge: 86_400_000,
    rateLimit: true,
  });
}

/**
 * @param {string} identityToken
 * @returns {Promise<{ appleId: string, email: string | null, emailVerified: boolean }>}
 */
exports.verifyAppleIdentityToken = async (identityToken) => {
  const audience = getAppleAudience();

  if (!identityToken || typeof identityToken !== 'string') {
    const err = new Error('Token Apple manquant.');
    err.statusCode = 400;
    throw err;
  }

  let decoded;
  try {
    decoded = jwt.decode(identityToken.trim(), { complete: true });
  } catch {
    const err = new Error('Token Apple illisible.');
    err.statusCode = 400;
    throw err;
  }

  const kid = decoded?.header?.kid;
  if (!kid) {
    const err = new Error('En-tête JWT Apple invalide.');
    err.statusCode = 400;
    throw err;
  }

  let signingKey;
  try {
    const key = await getClient().getSigningKey(kid);
    signingKey = key.getPublicKey();
  } catch (e) {
    console.error('[verifyAppleIdentityToken] JWKS:', e?.message || e);
    const err = new Error('Impossible de vérifier le certificat Apple.');
    err.statusCode = 503;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(identityToken.trim(), signingKey, {
      algorithms: ['RS256'],
      issuer: ISSUER,
      audience,
    });
  } catch (e) {
    const err = new Error('Token Apple invalide ou expiré.');
    err.statusCode = 401;
    throw err;
  }

  const appleId = typeof payload.sub === 'string' ? payload.sub : null;
  if (!appleId) {
    const err = new Error('Réponse Apple invalide.');
    err.statusCode = 400;
    throw err;
  }

  let email = null;
  if (typeof payload.email === 'string' && payload.email.trim()) {
    email = payload.email.toLowerCase().trim();
  }

  const ev = payload.email_verified;
  const emailVerified = !(ev === false || ev === 'false' || ev === 0);

  return {
    appleId,
    email,
    emailVerified,
  };
};
