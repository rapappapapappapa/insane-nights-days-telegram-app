# Guide de Configuration Cloudflare R2

Ce guide vous explique comment configurer Cloudflare R2 pour le stockage permanent des images de votre application.

## 📋 Étape 1 : Créer un compte Cloudflare R2

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Connectez-vous ou créez un compte
3. Dans le menu de gauche, cliquez sur **"R2"** (ou cherchez "R2" dans la barre de recherche)

## 📦 Étape 2 : Créer un bucket R2

1. Cliquez sur **"Create bucket"**
2. Donnez un nom à votre bucket (ex: `nox-media`)
3. Choisissez une localisation (ex: `Europe (Warsaw)` ou `United States of America (Washington, D.C.)`)
4. Cliquez sur **"Create bucket"**

## 🔑 Étape 3 : Créer des API Tokens (clés d'accès)

1. Dans le menu R2, cliquez sur **"Manage R2 API Tokens"** (ou allez dans **"Account Home"** > **"R2 API Tokens"**)
2. Cliquez sur **"Create API token"**
3. Configurez le token :
   - **Token name** : `nox-r2-token` (ou un nom de votre choix)
   - **Permissions** : Sélectionnez **"Object Read & Write"**
   - **TTL** : Laissez vide (pas d'expiration) ou définissez une date lointaine
   - **Buckets** : Sélectionnez votre bucket spécifique (recommandé) ou "All buckets"
4. Cliquez sur **"Create API Token"**
5. **⚠️ IMPORTANT** : Copiez immédiatement :
   - **Access Key ID** (commence souvent par des lettres/chiffres)
   - **Secret Access Key** (une longue chaîne aléatoire)
   - ⚠️ **Vous ne pourrez plus voir le Secret Access Key après** - sauvegardez-le !

## 🌐 Étape 4 : Configurer l'accès public (R2_PUBLIC_BASE_URL)

Vous avez deux options :

### Option A : Utiliser le domaine R2.dev (plus simple, gratuit)

1. Dans votre bucket R2, allez dans l'onglet **"Settings"**
2. Trouvez la section **"Public access"** ou **"Custom Domain"**
3. Activez **"Public access"** si disponible
4. Notez l'URL publique de votre bucket (format: `https://<bucket-name>.<account-id>.r2.dev`)
   - Exemple : `https://nox-media.abc123def456.r2.dev`

### Option B : Utiliser un domaine custom (recommandé pour production)

1. Dans votre bucket R2, allez dans l'onglet **"Settings"**
2. Trouvez **"Custom Domain"** ou **"Public Access"**
3. Ajoutez un sous-domaine (ex: `cdn.votredomaine.com`)
4. Configurez le DNS dans Cloudflare pour pointer vers R2
5. Utilisez cette URL comme `R2_PUBLIC_BASE_URL`

## 📝 Étape 5 : Trouver votre Account ID et Endpoint

1. Dans le dashboard Cloudflare, allez dans **"Account Home"** (icône de profil en haut à droite)
2. Notez votre **Account ID** (une chaîne aléatoire)
3. Votre `R2_ENDPOINT` sera : `https://<account-id>.r2.cloudflarestorage.com`
   - Exemple : `https://abc123def456.r2.cloudflarestorage.com`

## 🔧 Étape 6 : Configurer les variables dans Railway

Dans Railway, ajoutez/modifiez ces variables d'environnement :

### Variables à configurer :

```
MEDIA_STORAGE=r2
```

```
R2_ENDPOINT=https://<VOTRE-ACCOUNT-ID>.r2.cloudflarestorage.com
```
**Exemple** : `https://abc123def456.r2.cloudflarestorage.com`

```
R2_ACCESS_KEY_ID=<VOTRE-ACCESS-KEY-ID>
```
**Exemple** : `abc123def456789012345678901234567890`

```
R2_SECRET_ACCESS_KEY=<VOTRE-SECRET-ACCESS-KEY>
```
**Exemple** : `xyz789abcdef012345678901234567890123456789012345678901234567890`

```
R2_BUCKET=<NOM-DE-VOTRE-BUCKET>
```
**Exemple** : `nox-media`

```
R2_PUBLIC_BASE_URL=https://<bucket-name>.<account-id>.r2.dev
```
**Exemple** : `https://nox-media.abc123def456.r2.dev`

**OU** si vous utilisez un domaine custom :
```
R2_PUBLIC_BASE_URL=https://cdn.votredomaine.com
```

## ✅ Étape 7 : Vérifier la configuration

1. Dans Railway, cliquez sur **"Apply changes"** puis **"Deploy"**
2. Attendez que le déploiement se termine
3. Testez en uploadant une image dans votre application
4. Vérifiez que l'image est accessible via l'URL publique

## 🔍 Résumé des valeurs à copier

Voici un exemple de ce que vous devriez avoir :

```
MEDIA_STORAGE=r2
R2_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=abc123def456789012345678901234567890
R2_SECRET_ACCESS_KEY=xyz789abcdef012345678901234567890123456789012345678901234567890
R2_BUCKET=nox-media
R2_PUBLIC_BASE_URL=https://nox-media.abc123def456.r2.dev
```

## ⚠️ Notes importantes

- **Sécurité** : Ne partagez jamais vos clés d'accès R2 publiquement
- **Coûts** : R2 a un plan gratuit généreux (10 GB de stockage, 1 million de requêtes/mois)
- **Performance** : Les images seront servies depuis le réseau Cloudflare (rapide partout dans le monde)
- **Permanence** : Les fichiers seront stockés de manière permanente, même après redéploiement Railway

## 🆘 Dépannage

Si vous avez des erreurs :
1. Vérifiez que toutes les variables sont bien définies dans Railway
2. Vérifiez que les clés d'accès sont correctes (pas d'espaces avant/après)
3. Vérifiez que le bucket existe et est accessible
4. Vérifiez que `R2_PUBLIC_BASE_URL` pointe vers un domaine public accessible
