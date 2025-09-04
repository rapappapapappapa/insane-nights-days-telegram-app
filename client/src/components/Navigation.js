import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();
  
  // Ne montrer la navigation que sur les pages autres que l'accueil
  if (location.pathname === '/') {
    return null;
  }

  return (
    <nav className="bg-insane-dark border-b border-insane-orange/30 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo et Titre */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-insane-orange rounded-lg flex items-center justify-center">
              <span className="text-insane-black font-bold text-sm">I</span>
            </div>
            <span className="text-insane-orange font-bold text-lg">Insane</span>
          </Link>

          {/* Bouton Retour */}
          <Link
            to="/"
            className="text-insane-white/70 hover:text-insane-orange transition-colors duration-300 text-sm"
          >
            🏠 Accueil
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
