/**
 * Met à jour UserDj.profileImage à partir de DjMedia (title='profile')
 * pour les DJs qui ont une photo de profil dans DjMedia mais pas dans UserDj.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const profileMedias = await prisma.djMedia.findMany({
    where: { type: 'photo', title: 'profile' },
    orderBy: { createdAt: 'desc' },
  });
  const byDj = new Map();
  for (const m of profileMedias) {
    if (!byDj.has(m.djId)) byDj.set(m.djId, m);
  }

  let updated = 0;
  for (const media of byDj.values()) {
    const dj = await prisma.userDj.findUnique({
      where: { id: media.djId },
      select: { profileImage: true },
    });
    if (!dj) continue;
    if (dj.profileImage) continue; // Déjà une image
    await prisma.userDj.update({
      where: { id: media.djId },
      data: { profileImage: media.url },
    });
    updated++;
    console.log('[backfill] DJ', media.djId, '-> profileImage:', media.url?.slice(0, 50) + '...');
  }
  console.log('[backfill] Terminé.', updated, 'DJ(s) mis à jour.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
