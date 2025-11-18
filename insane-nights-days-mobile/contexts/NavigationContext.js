import React, { createContext, useContext, useState, useCallback } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [currentPage, setCurrentPage] = useState('home');
  const [routeParams, setRouteParams] = useState(undefined);

  const navigate = useCallback((page, params) => {
    setCurrentPage(page);
    setRouteParams(params);
  }, []);

  const goBack = useCallback(() => {
    // Pour l'instant, retour à l'accueil
    // On pourra améliorer avec un historique plus tard
    setCurrentPage('home');
    setRouteParams(undefined);
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

