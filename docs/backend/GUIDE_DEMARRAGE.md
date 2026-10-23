# 🚀 Guide de démarrage du serveur

## Problèmes courants et solutions

### ❌ Erreur : "@prisma/client did not initialize yet"
**Solution :**
```bash
npx prisma generate
```

### ❌ Erreur : "Database does not exist"
**Solution :**
```bash
npx prisma db push
```
ou
```bash
npx prisma migrate dev
```

### ❌ Erreur : "Port 5000 already in use"
**Solution :**
```bash
# Trouve le processus qui utilise le port
lsof -i :5000

# Tue le processus (remplace PID par le numéro trouvé)
kill PID
```

### ❌ Erreur : "Missing required environment variable: DATABASE_URL"
**Solution :**
Crée un fichier `.env` dans le dossier `server/` avec :
```
DATABASE_URL="file:./dev.db"
```

---

## ✅ Ordre de démarrage correct

1. **Installer les dépendances** (si pas déjà fait)
   ```bash
   npm install
   ```

2. **Créer le fichier .env** (si pas déjà fait)
   ```bash
   echo 'DATABASE_URL="file:./dev.db"' > .env
   ```

3. **Générer le client Prisma**
   ```bash
   npx prisma generate
   ```

4. **Créer la base de données**
   ```bash
   npx prisma db push
   ```

5. **Lancer le serveur**
   ```bash
   npm start
   ```

---

## Vérification

Une fois le serveur lancé, teste avec :
```bash
curl http://localhost:5000/api/test
```

Tu devrais voir une réponse JSON avec les stats du serveur.

---

## Scripts disponibles

- `npm start` : Lance le serveur en mode production
- `npm run dev` : Lance le serveur en mode développement (avec nodemon pour auto-reload)

