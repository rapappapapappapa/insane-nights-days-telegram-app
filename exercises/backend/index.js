const express = require('express');
const cors = require('cors');
// TODO: importer les autres dépendances nécessaires (uuid, qrcode, etc.)

const app = express();
const PORT = process.env.PORT || 5000;

// TODO: activer les middlewares utiles (CORS, JSON, ...)

// TODO: initialiser les tableaux en mémoire pour users, events, tickets

// TODO: définir des événements par défaut (au moins 2) et les injecter dans events

// === Routes à implémenter ===

// 1. POST /api/wallet/connect
// - Vérifier si l'utilisateur existe
// - Créer le user sinon
// - Générer un token et renvoyer les infos

// 2. GET /api/user/:userId
// - Retourner le profil complet

// 3. GET /api/events
// - Retourner la liste des événements

// 4. POST /api/tickets/buy
// - Vérifier les disponibilités
// - Créer les tickets et mettre à jour user & event

// 5. GET /api/user/:userId/tickets
// - Retourner les tickets achetés

// 6. GET /api/tickets/:ticketId/qr
// - Générer un QR code (utiliser qrcode)

// 7. GET /api/stats
// - Retourner quelques stats globales

// Route de test
app.get('/api/test', (req, res) => {
  res.json({
    message: '🎯 À toi de jouer ! Implémente les routes ci-dessus.',
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend exercice en écoute sur http://localhost:${PORT}`);
});



