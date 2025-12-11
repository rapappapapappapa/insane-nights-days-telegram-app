# Guide de déploiement du backend

## Option 1 : Railway (Recommandé - Gratuit avec limitations)

### Étapes :

1. **Créer un compte sur Railway** : https://railway.app
   - Connecte-toi avec GitHub

2. **Créer un nouveau projet**
   - Clique sur "New Project"
   - Sélectionne "Deploy from GitHub repo"
   - Choisis ton dépôt et le dossier `server`

3. **Configurer les variables d'environnement**
   - Dans les settings du service, ajoute :
     - `JWT_SECRET` : Un secret aléatoire (ex: `openssl rand -hex 32`)
     - `PUBLIC_URL` : L'URL fournie par Railway (sera quelque chose comme `https://ton-app.railway.app`)
     - `DATABASE_URL` : Railway fournit automatiquement une base PostgreSQL, utilise cette variable

4. **Ajouter une base de données PostgreSQL**
   - Dans Railway, ajoute un service "PostgreSQL"
   - Railway génère automatiquement `DATABASE_URL`

5. **Migrer la base de données**
   - Dans les settings du service backend, ajoute une variable :
     - `NIXPACKS_RUN_CMD` : `npx prisma migrate deploy && npm start`
   - Ou exécute manuellement : `npx prisma migrate deploy`

6. **Mettre à jour le schéma Prisma pour PostgreSQL**
   - Modifie `server/prisma/schema.prisma` ligne 9 :
     ```prisma
     datasource db {
       provider = "postgresql"  // Change de "sqlite" à "postgresql"
       url      = env("DATABASE_URL")
     }
     ```
   - **Important** : Fais ce changement directement dans le repo, Railway/Render utilisera PostgreSQL automatiquement

7. **Récupérer l'URL du backend**
   - Railway donne une URL comme `https://ton-app.railway.app`
   - Mets cette URL dans `PUBLIC_URL` et dans l'app mobile (`BASE_URL`)

---

## Option 2 : Render (Alternative gratuite)

### Étapes :

1. **Créer un compte sur Render** : https://render.com
   - Connecte-toi avec GitHub

2. **Créer un nouveau Web Service**
   - "New" > "Web Service"
   - Connecte ton repo GitHub
   - Root Directory : `server`
   - Build Command : `npm install && npx prisma generate`
   - Start Command : `npm start`

3. **Ajouter une base PostgreSQL**
   - "New" > "PostgreSQL"
   - Render génère automatiquement `DATABASE_URL`

4. **Configurer les variables d'environnement**
   - Dans les settings du service :
     - `JWT_SECRET` : Un secret aléatoire
     - `PUBLIC_URL` : L'URL Render (ex: `https://ton-app.onrender.com`)
     - `DATABASE_URL` : Fourni automatiquement par Render

5. **Migrer la base de données**
   - Dans les settings, ajoute une variable :
     - `POST_DEPLOY_COMMAND` : `npx prisma migrate deploy`

---

## Option 3 : Cloudflare Tunnel permanent (Garde le backend local)

Si tu veux garder le backend sur ta machine mais avec une URL fixe :

1. **Installer Cloudflare Tunnel** : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. **Créer un tunnel permanent** :
   ```bash
   cloudflared tunnel create insane-nights-backend
   ```

3. **Configurer le tunnel** :
   ```bash
   cloudflared tunnel route dns insane-nights-backend api.ton-domaine.com
   ```

4. **Lancer le tunnel** :
   ```bash
   cloudflared tunnel run insane-nights-backend
   ```

---

## Après le déploiement

1. **Mettre à jour l'URL dans l'app mobile** :
   - Modifie `insane-nights-days-mobile/api/config.js`
   - Change `BASE_URL` avec l'URL du backend déployé

2. **Tester l'API** :
   - Vérifie que `https://ton-backend.railway.app/api/health` répond

3. **Générer l'APK avec la nouvelle URL** :
   - L'APK utilisera automatiquement la `BASE_URL` configurée

---

## Notes importantes

- **Stockage des fichiers** : Railway/Render ont un stockage éphémère. Les fichiers uploadés seront perdus au redémarrage.
  - **Solution** : Utiliser un service de stockage (S3, Cloudflare R2, etc.) pour les médias
  - **Alternative temporaire** : Les fichiers restent tant que le service ne redémarre pas

- **Base de données** : SQLite ne fonctionne pas bien en production. Utilise PostgreSQL avec Railway/Render.

- **Coûts** : Railway et Render ont des plans gratuits avec limitations (downtime après inactivité sur Render, limites de ressources sur Railway).

