# 🌐 Guide : Utiliser Cloudflared (alternative à ngrok)

## Pourquoi Cloudflared ?

- ✅ **Gratuit** et sans inscription
- ✅ **Simple** à utiliser
- ✅ **Pas de limite** de connexions
- ✅ Alternative à ngrok qui nécessite maintenant un compte

## Installation

```bash
# Télécharger cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared
chmod +x /tmp/cloudflared
```

## Utilisation

### 1. Lancer le tunnel

```bash
/tmp/cloudflared tunnel --url http://localhost:5000
```

### 2. Récupérer l'URL

Cloudflared affichera une URL du type :
```
https://abc123-def456.trycloudflare.com
```

### 3. Mettre à jour api/config.js

Remplace `BASE_URL` par l'URL cloudflared :
```javascript
BASE_URL: 'https://abc123-def456.trycloudflare.com',
```

### 4. Tester

L'app mobile pourra maintenant accéder au backend même en 5G ! 🎉

## Note importante

L'URL change à chaque fois que tu relances cloudflared. Il faudra mettre à jour `api/config.js` à chaque fois.

## Alternative : Wi-Fi

Pour éviter de changer l'URL à chaque fois, connecte simplement ton téléphone au Wi-Fi. C'est plus simple pour le développement ! 😊

