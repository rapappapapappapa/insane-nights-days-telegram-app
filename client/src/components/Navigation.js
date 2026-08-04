/**
 * Barre de navigation
 *
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Logo cliquable vers /
 * - Liens: Accueil, Événements, Feed (si connecté), Profil (si connecté)
 * - Masquée sur la page d'accueil (/)
 *
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 *
 * 1. MENU BURGER (mobile)
 *    - Sur petit écran, afficher un menu hamburger
 *    - Drawer ou dropdown avec les liens
 *
 * 2. NOTIFICATIONS
 *    - Icône cloche avec badge du nombre de notifications non lues
 *    - api.getFeedNotificationsUnreadCount(token)
 *    - Lien vers /notifications
 *
 * 3. SWITCHER DE PROFIL
 *    - Dropdown pour basculer Community / DJ / Organisateur / Venue
 *    - api.switchProfile(token, profileType)
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { user } = useAuth();

  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="bg-nox-dark border-b border-nox-primary/30 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-nox-primary rounded-lg flex items-center justify-center">
              <span className="text-nox-black font-bold text-sm">I</span>
            </div>
            <span className="text-nox-primary font-bold text-lg">Nox</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/events"
              className="text-nox-white/70 hover:text-nox-primary transition text-sm"
            >
              Événements
            </Link>
            {user?.isAuthenticated ? (
              <>
                <Link
                  to="/feed"
                  className="text-nox-white/70 hover:text-nox-primary transition text-sm"
                >
                  Feed
                </Link>
                <Link
                  to="/profile"
                  className="text-nox-white/70 hover:text-nox-primary transition text-sm"
                >
                  Profil
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="text-nox-primary hover:text-orange-400 transition text-sm font-medium"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
