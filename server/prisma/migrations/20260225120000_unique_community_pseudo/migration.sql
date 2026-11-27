-- Pseudo Communauté unique pour la recherche d'amis
-- Note: plusieurs NULL sont autorisés (PostgreSQL)
CREATE UNIQUE INDEX "UserCommunity_pseudo_key" ON "UserCommunity"("pseudo") WHERE "pseudo" IS NOT NULL;
