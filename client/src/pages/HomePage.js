/**
 * Page d'accueil (landing) - Visible quand l'utilisateur n'est pas connecté
 * 
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Affichage du logo et du titre
 * - Boutons "Se connecter" et "S'inscrire" qui redirigent vers /login
 * - Si déjà connecté, redirection vers /feed
 * 
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 * 
 * 1. PRÉSENTATION / HERO
 *    - Section hero avec image de fond, slogan accrocheur
 *    - Bouton CTA "Découvrir les événements"
 * 
 * 2. APERÇU DES ÉVÉNEMENTS À VENIR
 *    - Afficher 3-4 événements à venir (api.getEvents())
 *    - Cartes cliquables vers /event/:id
 * 
 * 3. TÉMOIGNAGES / AVANTAGES
 *    - Section "Pourquoi Insane ?" avec icônes
 *    - Témoignages de DJs ou organisateurs
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Si connecté, rediriger vers le feed
  useEffect(() => {
    if (!isInitializing && user?.isAuthenticated) {
      navigate('/feed', { replace: true });
    }
  }, [user?.isAuthenticated, isInitializing, navigate]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center">
        <div className="text-insane-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-insane-black flex items-center justify-center px-4">
      <div className="text-center max-w-sm mx-auto">
        {/* Logo Insane */}
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-insane-orange rounded-2xl mb-8 shadow-2xl">
            <span className="text-insane-black font-black text-3xl">I</span>
          </div>
        </div>

        {/* Titre */}
        <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl font-black text-insane-white mb-4">
            Insane
            <span className="text-insane-orange"> Nights</span>
            <br />
            <span className="text-insane-orange">& Days</span>
          </h1>
          <p className="text-insane-white/70 mb-12 text-sm leading-relaxed">
            Découvre les événements, connecte-toi à la communauté
          </p>
        </div>

        {/* Boutons Connexion / Inscription */}
        <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} space-y-3`}>
          <button
            onClick={() => navigate('/login')}
            className="w-full font-bold py-4 px-8 rounded-2xl bg-insane-orange text-insane-black hover:bg-orange-500 transition-all duration-300 text-lg"
          >
            Se connecter
          </button>
          <button
            onClick={() => navigate('/login?mode=register')}
            className="w-full font-bold py-4 px-8 rounded-2xl border-2 border-insane-orange text-insane-orange hover:bg-insane-orange/10 transition-all duration-300 text-lg"
          >
            S'inscrire
          </button>
          <button
            onClick={() => navigate('/events')}
            className="w-full font-medium py-3 text-insane-white/70 hover:text-insane-orange transition text-sm"
          >
            Voir les événements sans compte →
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
