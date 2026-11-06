import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { resolveNavigationTarget } from '../utils/legacyScreenRedirects';

const NavigationContext = createContext();

/** Contexte auth injecté par App.js pour résoudre home / feed / events legacy. */
let legacyNavigationContextGetter = () => ({});

export function setLegacyNavigationContext(getter) {
  legacyNavigationContextGetter = typeof getter === 'function' ? getter : () => ({});
}

function restoreHistoryEntry(entry, setCurrentPage, setRouteParams) {
  if (entry && typeof entry === 'object' && entry.page) {
    setCurrentPage(entry.page);
    setRouteParams(entry.params);
    return;
  }
  if (typeof entry === 'string') {
    setCurrentPage(entry);
    setRouteParams(undefined);
  }
}

export function NavigationProvider({ children }) {
  const [currentPage, setCurrentPage] = useState('splash');
  const [routeParams, setRouteParams] = useState(undefined);
  /** Pile vide au départ : le bouton retour matériel Android ne « recule » pas sur une fausse entrée. */
  const historyRef = useRef([]);
  /** Page de repli quand goBack() est appelé sans historique (définie par App.js selon auth + rôle). */
  const backFallbackRef = useRef('splash');
  const currentPageRef = useRef(currentPage);
  const routeParamsRef = useRef(routeParams);
  currentPageRef.current = currentPage;
  routeParamsRef.current = routeParams;

  const setBackFallback = useCallback((page) => {
    if (page) backFallbackRef.current = page;
  }, []);

  const navigate = useCallback((page, params) => {
    const context = legacyNavigationContextGetter();
    const { page: resolvedPage, params: resolvedParams } = resolveNavigationTarget(page, params, context);
    if (currentPageRef.current !== resolvedPage) {
      historyRef.current.push({
        page: currentPageRef.current,
        params: routeParamsRef.current,
      });
      if (historyRef.current.length > 10) {
        historyRef.current.shift();
      }
    }
    setCurrentPage(resolvedPage);
    setRouteParams(resolvedParams);
  }, []);

  const goBack = useCallback(() => {
    if (historyRef.current.length > 0) {
      restoreHistoryEntry(historyRef.current.pop(), setCurrentPage, setRouteParams);
    } else {
      setCurrentPage(backFallbackRef.current);
      setRouteParams(undefined);
    }
  }, []);

  const tryHardwareBack = useCallback(() => {
    if (historyRef.current.length > 0) {
      restoreHistoryEntry(historyRef.current.pop(), setCurrentPage, setRouteParams);
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
