import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour debouncer une valeur
 * @param {any} value - La valeur à debouncer
 * @param {number} delay - Le délai en millisecondes (défaut: 300ms)
 * @returns {any} La valeur debouncée
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

