/**
 * ErrorBoundary - Gestion centralisée des erreurs React
 * Capture les erreurs dans les composants enfants et affiche une UI de fallback
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import logger from '../utils/logger';
import Colors from '../constants/colors';
import { FontFamily } from '../constants/typography';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Met à jour l'état pour afficher l'UI de fallback
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log l'erreur de manière sécurisée
    logger.error('[ErrorBoundary] Erreur capturée:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // En production, on pourrait envoyer l'erreur à un service de monitoring
    // Exemple: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    // Réinitialiser l'état d'erreur
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Afficher l'UI de fallback personnalisée
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      // UI de fallback par défaut
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="alert-circle" size={64} color={Colors.primary} />
            <Text style={styles.title}>
              {this.props.title || 'Oups ! Une erreur est survenue'}
            </Text>
            <Text style={styles.message}>
              {this.props.message || 
                'Une erreur inattendue s\'est produite. Veuillez réessayer.'}
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
            >
              <Text style={styles.buttonText}>
                {this.props.buttonLabel || 'Réessayer'}
              </Text>
            </TouchableOpacity>

            {this.props.onRetry && (
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  this.handleReset();
                  this.props.onRetry?.();
                }}
              >
                <Text style={styles.buttonTextSecondary}>
                  {this.props.retryLabel || 'Recharger'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }

    // Rendre les enfants normalement si pas d'erreur
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    color: '#fff',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: '#1a1a1f',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: Colors.primary,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
  buttonTextSecondary: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;
