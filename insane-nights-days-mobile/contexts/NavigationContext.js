import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [routeParams, setRouteParams] = useState(undefined);
  const historyRef = useRef(['home']);

  const navigate = useCallback((page, params) => {
    // Ajouter la page actuelle à l'historique avant de naviguer
    if (currentPage !== page) {
      historyRef.current.push(currentPage);
      // Limiter l'historique à 10 pages pour éviter les fuites mémoire
      if (historyRef.current.length > 10) {
        historyRef.current.shift();
      }
    }
    setCurrentPage(page);
    setRouteParams(params);
  }, [currentPage]);

  const goBack = useCallback(() => {
    // Récupérer la page précédente depuis l'historique
    if (historyRef.current.length > 0) {
      const previousPage = historyRef.current.pop(); // Retirer et récupérer la dernière page de l'historique
      setCurrentPage(previousPage);
      setRouteParams(undefined);
    } else {
      // Si pas d'historique, retour à l'accueil ou welcome selon l'état de connexion
    setCurrentPage('home');
    setRouteParams(undefined);
    }
  }, []);

  return (
    <NavigationContext.Provider value={{ currentPage, routeParams, navigate, goBack }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}