/**
 * Système de logging sécurisé
 * Masque automatiquement les données sensibles (tokens, mots de passe, etc.)
 * Conforme RGPD et bonnes pratiques de sécurité
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

class Logger {
  constructor() {
    // En développement, afficher tous les logs
    // En production, seulement les erreurs
    this.level = __DEV__ ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
    this.enabled = true;
  }

  /**
   * Sanitize les données pour masquer les informations sensibles
   * @param {any} data - Les données à sanitizer
   * @returns {any} - Les données sanitizées
   */
  sanitize(data) {
    if (data === null || data === undefined) {
      return data;
    }

    // Si c'est une string, masquer les tokens et mots de passe
    if (typeof data === 'string') {
      let sanitized = data;
      
      // Masquer les tokens JWT (Bearer token)
      sanitized = sanitized.replace(
        /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/g,
        'Bearer [REDACTED]'
      );
      
      // Masquer les tokens seuls (format JWT)
      sanitized = sanitized.replace(
        /[\w-]+\.[\w-]+\.[\w-]+/g,
        (match) => {
          // Vérifier si c'est un token JWT (3 parties séparées par des points)
          if (match.split('.').length === 3) {
            return '[TOKEN_REDACTED]';
          }
          return match;
        }
      );
      
      // Masquer les mots de passe dans les strings
      sanitized = sanitized.replace(
        /password["\s:=]+([^"}\s,]+)/gi,
        'password": "[REDACTED]'
      );
      
      return sanitized;
    }

    // Si c'est un objet, sanitizer récursivement
    if (typeof data === 'object') {
      // Gérer les arrays
      if (Array.isArray(data)) {
        return data.map(item => this.sanitize(item));
      }

      // Gérer les objets
      const sanitized = { ...data };
      
      // Liste des clés sensibles à masquer
      const sensitiveKeys = [
        'token',
        'password',
        'passwordHash',
        'secret',
        'apiKey',
        'accessToken',
        'refreshToken',
        'authorization',
        'auth',
        'credentials',
        'privateKey',
        'sessionId',
      ];

      for (const key in sanitized) {
        const lowerKey = key.toLowerCase();
        
        // Masquer les clés sensibles
        if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          // Sanitizer récursivement les objets imbriqués
          sanitized[key] = this.sanitize(sanitized[key]);
        } else if (typeof sanitized[key] === 'string') {
          // Sanitizer les strings dans les objets
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Formate les arguments pour le logging
   * @param {Array} args - Les arguments à formater
   * @returns {Array} - Les arguments formatés et sanitizés
   */
  formatArgs(args) {
    return args.map(arg => {
      try {
        // Pour les erreurs, préserver le message et le type même après sanitization
        if (arg instanceof Error) {
          const sanitized = this.sanitize({
            name: arg.name,
            message: arg.message,
            status: arg.status,
            isTokenExpired: arg.isTokenExpired,
            stack: __DEV__ ? arg.stack?.substring(0, 200) : undefined,
          });
          // Si l'objet est vide après sanitization, retourner au moins le message
          if (!sanitized || Object.keys(sanitized).length === 0) {
            return `Error: ${arg.message || arg.toString() || 'Unknown error'}`;
          }
          return sanitized;
        }
        const sanitized = this.sanitize(arg);
        // Si l'objet devient vide après sanitization, retourner un indicateur
        if (typeof sanitized === 'object' && sanitized !== null && Object.keys(sanitized).length === 0) {
          return '[Empty object after sanitization]';
        }
        return sanitized;
      } catch (error) {
        // Si erreur lors de la sanitization, retourner au moins le type
        return `[Error sanitizing: ${arg?.constructor?.name || typeof arg}]`;
      }
    });
  }

  /**
   * Log de debug (seulement en développement)
   * @param {...any} args - Arguments à logger
   */
  debug(...args) {
    if (!this.enabled || this.level > LOG_LEVELS.DEBUG) return;
    const sanitized = this.formatArgs(args);
    console.log('[DEBUG]', ...sanitized);
  }

  /**
   * Log d'information
   * @param {...any} args - Arguments à logger
   */
  info(...args) {
    if (!this.enabled || this.level > LOG_LEVELS.INFO) return;
    const sanitized = this.formatArgs(args);
    console.log('[INFO]', ...sanitized);
  }

  /**
   * Log d'avertissement
   * @param {...any} args - Arguments à logger
   */
  warn(...args) {
    if (!this.enabled || this.level > LOG_LEVELS.WARN) return;
    const sanitized = this.formatArgs(args);
    console.warn('[WARN]', ...sanitized);
  }

  /**
   * Log d'erreur
   * @param {...any} args - Arguments à logger
   */
  error(...args) {
    if (!this.enabled || this.level > LOG_LEVELS.ERROR) return;
    const sanitized = this.formatArgs(args);
    console.error('[ERROR]', ...sanitized);
    
    // En production, on pourrait envoyer les erreurs à un service de monitoring
    // comme Sentry, Bugsnag, etc.
    if (!__DEV__) {
      // TODO: Intégrer un service de monitoring
      // Sentry.captureException(new Error(sanitized.join(' ')));
    }
  }

  /**
   * Désactiver le logging (utile pour les tests)
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Activer le logging
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Définir le niveau de log
   * @param {number} level - Le niveau de log (LOG_LEVELS.DEBUG, INFO, WARN, ERROR)
   */
  setLevel(level) {
    this.level = level;
  }
}

// Exporter une instance singleton
const logger = new Logger();

export default logger;

// Exporter aussi la classe et les constantes pour les cas avancés
export { Logger, LOG_LEVELS };
