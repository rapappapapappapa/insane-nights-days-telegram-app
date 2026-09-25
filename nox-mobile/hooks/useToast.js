import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer les notifications Toast
 * Simplifie l'utilisation du composant Toast dans les écrans
 * 
 * @returns {Object} - { toast, showToast, hideToast }
 */
export function useToast() {
  const [toast, setToast] = useState({ 
    visible: false, 
    message: '', 
    type: 'info' // 'success', 'error', 'warning', 'info'
  });

  /**
   * Affiche un toast
   * @param {string} message - Le message à afficher
   * @param {string} type - Le type de toast ('success', 'error', 'warning', 'info')
   */
  const showToast = useCallback((message, type = 'info') => {
    setToast({
      visible: true,
      message,
      type,
    });
  }, []);

  /**
   * Cache le toast
   */
  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  /**
   * Méthodes de convenance pour chaque type
   */
  const showSuccess = useCallback((message) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message) => {
    showToast(message, 'error');
  }, [showToast]);

  const showWarning = useCallback((message) => {
    showToast(message, 'warning');
  }, [showToast]);

  const showInfo = useCallback((message) => {
    showToast(message, 'info');
  }, [showToast]);

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
}
