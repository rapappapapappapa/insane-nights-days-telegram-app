/**
 * Page Profil utilisateur
 * 
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Affichage des infos utilisateur (username, email)
 * - Bouton déconnexion
 * - Liens vers événements et tickets
 * 
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 * 
 * 1. CHANGER DE MOT DE PASSE
 *    - Formulaire: ancien mot de passe, nouveau, confirmation
 *    - api.changePassword(token, oldPassword, newPassword, confirmPassword)
 * 
 * 2. SWITCHER DE PROFIL (Community / DJ / Organisateur / Venue)
 *    - api.getUserProfiles(token) pour lister les profils
 *    - api.switchProfile(token, profileType)
 *    - Afficher le profil actif et permettre de basculer
 * 
 * 3. ÉDITER LE PROFIL
 *    - Selon le type: Community (pseudo, genres), DJ (artistName, bio...), etc.
 *    - Pages dédiées ou modal
 * 
 * 4. MES TICKETS
 *    - api.getMyTickets(token)
 *    - Liste des tickets avec QR code (api.getTicketQR)
 * 
 * 5. RGPD: EXPORT / SUPPRESSION
 *    - api.exportUserData(token) -> télécharger JSON
 *    - api.deleteAccount(token, password) -> confirmation
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!user?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-nox-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-nox-white/70 mb-4">Connecte-toi pour accéder à ton profil.</p>
          <Link to="/login" className="text-nox-primary hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nox-black py-6 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-nox-white mb-6">Mon profil</h1>

        <div className="bg-nox-gray border border-nox-primary/30 rounded-xl p-6 mb-6">
          <div className="w-16 h-16 bg-nox-primary rounded-full flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-nox-black">
              {(user.username || user.email || '?').charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="font-medium text-nox-white">{user.username || 'Utilisateur'}</p>
          <p className="text-sm text-nox-white/70">{user.email}</p>
          {user.activeProfileType && (
            <p className="text-xs text-nox-primary mt-1">Profil actif : {user.activeProfileType}</p>
          )}
        </div>

        <div className="space-y-3">
          <Link
            to="/events"
            className="block w-full bg-nox-gray border border-nox-primary/30 rounded-lg py-3 px-4 text-nox-white hover:border-nox-primary/60 transition text-center"
          >
            Voir les événements
          </Link>
          <Link
            to="/tickets"
            className="block w-full bg-nox-gray border border-nox-primary/30 rounded-lg py-3 px-4 text-nox-white hover:border-nox-primary/60 transition text-center"
          >
            Mes tickets
          </Link>
        </div>

        <button
          onClick={handleLogout}
          className="w-full mt-8 py-3 text-red-400 hover:text-red-300 border border-red-500/50 rounded-lg transition"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
