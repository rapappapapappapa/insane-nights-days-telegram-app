/**
 * Backfill DJ styles (UserDj.genre) for profiles missing a style.
 * - Does NOT touch existing non-empty genres
 * - Does NOT touch excluded artist names (case-insensitive)
 *
 * Usage:
 *   node scripts/backfill_dj_genres.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const EXCLUDED_ARTISTS = new Set(['paraledingu', 'ezekiel', 'djbest']);

// Liste de styles "safe" pour la démo (tu peux ajuster)
const GENRES = [
  'Techno',
  'House',
  'Afro House',
  'Amapiano',
  'Hip-Hop',
  'R&B',
  'Drum & Bass',
  'Trance',
  'Disco',
  'Reggaeton',
];

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function hashStringToInt(s) {
  // Simple hash déterministe
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickGenre(artistName) {
  const key = norm(artistName) || 'dj';
  const idx = hashStringToInt(key) % GENRES.length;
  return GENRES[idx];
}

async function main() {
  const djs = await prisma.userDj.findMany({
    select: { id: true, artistName: true, genre: true, userId: true },
    orderBy: { createdAt: 'asc' },
  });

  let skippedExcluded = 0;
  let skippedAlreadySet = 0;
  let updated = 0;

  const preview = [];

  for (const dj of djs) {
    const nameNorm = norm(dj.artistName);

    if (EXCLUDED_ARTISTS.has(nameNorm)) {
      skippedExcluded++;
      continue;
    }

    if (dj.genre && String(dj.genre).trim() !== '') {
      skippedAlreadySet++;
      continue;
    }

    const genre = pickGenre(dj.artistName);

    await prisma.userDj.update({
      where: { id: dj.id },
      data: { genre },
    });

    updated++;
    if (preview.length < 12) {
      preview.push({ artistName: dj.artistName, id: dj.id, genre });
    }
  }

  console.log('\n=== Backfill DJ genre ===');
  console.log('Total DJs:', djs.length);
  console.log('Updated (genre set):', updated);
  console.log('Skipped (excluded):', skippedExcluded);
  console.log('Skipped (already had genre):', skippedAlreadySet);
  console.log('\nPreview (first updates):');
  console.table(preview);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

