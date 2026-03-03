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
 *    - Dropdown pour basculer Community / DJ / Booker / Venue
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
    <nav className="bg-insane-dark border-b border-insane-orange/30 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-insane-orange rounded-lg flex items-center justify-center">
              <span className="text-insane-black font-bold text-sm">I</span>
            </div>
            <span className="text-insane-orange font-bold text-lg">Insane</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/events"
              className="text-insane-white/70 hover:text-insane-orange transition text-sm"
            >
              Événements
            </Link>
            {user?.isAuthenticated ? (
              <>
                <Link
                  to="/feed"
                  className="text-insane-white/70 hover:text-insane-orange transition text-sm"
                >
                  Feed
                </Link>
                <Link
                  to="/profile"
                  className="text-insane-white/70 hover:text-insane-orange transition text-sm"
                >
                  Profil
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="text-insane-orange hover:text-orange-400 transition text-sm font-medium"
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
