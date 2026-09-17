/**
 * Media storage abstraction:
 * - local (disk): existing /uploads/media
 * - r2: Cloudflare R2 via S3-compatible API
 */

const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const MEDIA_STORAGE = (process.env.MEDIA_STORAGE || 'local').toLowerCase(); // 'local' | 'r2'

const R2_ENDPOINT = process.env.R2_ENDPOINT; // e.g. https://<accountid>.r2.cloudflarestorage.com
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL; // e.g. https://cdn.example.com (recommended) or https://<bucket>.<accountid>.r2.dev

function ensureR2Configured() {
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE_URL) {
    throw new Error('R2 non configuré: R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET/R2_PUBLIC_BASE_URL requis.');
  }
}

function makeObjectKey(prefix, originalName) {
  const ext = path.extname(originalName || '').slice(0, 16);
  const rand = crypto.randomBytes(16).toString('hex');
  const safePrefix = String(prefix || 'media').replace(/^\//, '').replace(/\/+$/, '');
  return `${safePrefix}/${Date.now()}-${rand}${ext}`;
}

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '');
}

function publicUrlForKey(key) {
  return `${normalizeBaseUrl(R2_PUBLIC_BASE_URL)}/${String(key).replace(/^\//, '')}`;
}

function keyFromPublicUrl(url) {
  if (!url) return null;
  const base = normalizeBaseUrl(R2_PUBLIC_BASE_URL);
  if (!base) return null;
  if (!String(url).startsWith(base)) return null;
  const rest = String(url).slice(base.length);
  return rest.replace(/^\//, '') || null;
}

let s3 = null;
function getS3() {
  if (s3) return s3;
  ensureR2Configured();
  s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  return s3;
}

async function uploadToR2({ buffer, contentType, key }) {
  const client = getS3();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || 'application/octet-stream',
    })
  );
  return { key, url: publicUrlForKey(key) };
}

async function deleteFromR2({ key, url }) {
  const resolvedKey = key || keyFromPublicUrl(url);
  if (!resolvedKey) return { success: false, skipped: true };
  const client = getS3();
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: resolvedKey,
    })
  );
  return { success: true };
}

module.exports = {
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  deleteFromR2,
  publicUrlForKey,
  keyFromPublicUrl,
};

