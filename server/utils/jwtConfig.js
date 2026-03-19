/**
 * Configuration JWT centralisée
 * En production, JWT_SECRET est requis (pas de fallback).
 * En dev, un fallback permet de démarrer sans .env.
 */
const isProduction = process.env.NODE_ENV === 'production';
const secret = process.env.JWT_SECRET || (isProduction ? null : 'insane-nights-days-secret-key-change-in-production');

if (!secret) {
  throw new Error(
    'JWT_SECRET est requis en production. Définissez dans .env ou Railway/Render.'
  );
}

module.exports = {
  JWT_SECRET: secret,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};
