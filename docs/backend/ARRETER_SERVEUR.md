# 🛑 Comment arrêter le serveur qui bloque le port 5000

## Méthode rapide

```bash
# Trouve le processus qui utilise le port 5000
lsof -i :5000

# Tue le processus (remplace PID par le numéro trouvé)
kill PID
```

## Méthode en une ligne

```bash
kill $(lsof -t -i:5000)
```

## Vérification

Après avoir tué le processus, vérifie que le port est libre :
```bash
lsof -i :5000
```

Si rien ne s'affiche, le port est libre ! ✅

---

## Pourquoi ça arrive ?

Quand tu lances `npm start`, le serveur reste actif même si tu fermes le terminal. Il faut l'arrêter explicitement avec `Ctrl+C` ou en tuant le processus.

---

## Astuce

Si tu veux éviter ce problème, utilise `Ctrl+C` dans le terminal où tourne le serveur pour l'arrêter proprement.

