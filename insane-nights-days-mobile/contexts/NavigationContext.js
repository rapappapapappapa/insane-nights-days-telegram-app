import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { resolveNavigationTarget } from '../utils/legacyScreenRedirects';

const NavigationContext = createContext();

/** Contexte auth injecté par App.js pour résoudre home / feed / events legacy. */
let legacyNavigationContextGetter = () => ({});

export function setLegacyNavigationContext(getter) {
  legacyNavigationContextGetter = typeof getter === 'function' ? getter : () => ({});
}

export function NavigationProvider({ children }) {
  const [currentPage, setCurrentPage] = useState('splash');
  const [routeParams, setRouteParams] = useState(undefined);
  /** Pile vide au départ : le bouton retour matériel Android ne « recule » pas sur une fausse entrée. */
  const historyRef = useRef([]);
  /** Page de repli quand goBack() est appelé sans historique (définie par App.js selon auth + rôle). */
  const backFallbackRef = useRef('splash');

  const setBackFallback = useCallback((page) => {
    if (page) backFallbackRef.current = page;
  }, []);

  const navigate = useCallback((page, params) => {
    const context = legacyNavigationContextGetter();
    const { page: resolvedPage, params: resolvedParams } = resolveNavigationTarget(page, params, context);
    if (currentPage !== resolvedPage) {
      historyRef.current.push(currentPage);
      if (historyRef.current.length > 10) {
        historyRef.current.shift();
      }
    }
    setCurrentPage(resolvedPage);
    setRouteParams(resolvedParams);
  }, [currentPage]);

  const goBack = useCallback(() => {
    if (historyRef.current.length > 0) {
      const previousPage = historyRef.current.pop();
      setCurrentPage(previousPage);
      setRouteParams(undefined);
    } else {
      setCurrentPage(backFallbackRef.current);
      setRouteParams(undefined);
    }
  }, []);

  const tryHardwareBack = useCallback(() => {
    if (historyRef.current.length > 0) {
      const previousPage = historyRef.current.pop();
      setCurrentPage(previousPage);
      setRouteParams(undefined);
      return true;
    }
    return false;
  }, []);

  return (
    <NavigationContext.Provider
      value={{ currentPage, routeParams, navigate, goBack, tryHardwareBack, setBackFallback }}
    >
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
