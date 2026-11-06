# Scripts de maintenance et seed

Ces scripts sont utilisés pour initialiser ou maintenir la base de données.
Ils ne sont pas nécessaires au fonctionnement du serveur.

## update-booker-pseudo-defaults.js

Définit un pseudo par défaut (Nom Prénom) pour les bookers qui n'en ont pas.
À exécuter après déploiement pour les bookers déjà inscrits :

```bash
node server/scripts/update-booker-pseudo-defaults.js
```
