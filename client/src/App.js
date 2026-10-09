/**
 * Application web NOX
 *
 * STRUCTURE DES ROUTES:
 * - /           : Landing (non connecté) ou redirection vers /feed (connecté)
 * - /login      : Connexion / Inscription
 * - /feed       : Fil d'actualité (connecté)
 * - /events     : Liste des événements (public)
 * - /event/:id  : Détail d'un événement (public)
 * - /profile    : Profil utilisateur (connecté)
 * - /tickets    : Mes tickets (connecté)
 * - /admin      : Admin (si role ADMIN)
 *
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 *
 * 1. ROUTE PROTÉGÉE (ProtectedRoute)
 *    - Composant qui redirige vers /login si non connecté
 *    - Utiliser pour /feed, /profile, /tickets
 *
 * 2. PAGE LEGAL (CGU, CGV, confidentialité)
 *    - Route /legal?type=cgu|privacy|cgv|mentions
 *    - Afficher le contenu selon le paramètre
 *
 * 3. PAGE MOT DE PASSE OUBLIÉ
 *    - /forgot-password : saisir email
 *    - /reset-password : saisir code + nouveau mot de passe
 *
 * 4. GESTION DES ERREURS 401
 *    - Intercepter les réponses 401 (token expiré)
 *    - Déconnecter et rediriger vers /login
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';

import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import FeedPage from './pages/FeedPage';
import WelcomePage from './pages/WelcomePage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ProfilePage from './pages/ProfilePage';
import TicketsPage from './pages/TicketsPage';
import AdminPage from './pages/AdminPage';

import Navigation from './components/Navigation';

// Redirection si non connecté
function ProtectedRoute({ children }) {
  const { user, isInitializing } = useAuth();
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-nox-black flex items-center justify-center">
        <div className="text-nox-white">Chargement...</div>
      </div>
    );
  }
  if (!user?.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <WelcomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/event/:id" element={<EventDetailPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/tickets" element={<TicketsPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    try {
      const { initTelegramApp } = require('./telegram-web-app');
      initTelegramApp?.();
    } catch {
      // Pas dans Telegram, mode web classique
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="App min-h-screen bg-nox-black text-nox-white">
          <Navigation />
          <main className="flex-1">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
