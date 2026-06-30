/**
 * ErrorBoundary - Gestion centralisée des erreurs React
 * Capture les erreurs dans les composants enfants et affiche une UI de fallback
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import logger from '../utils/logger';
import Colors from '../constants/colors';
import { FontFamily } from '../constants/typography';

function formatComponentStack(errorInfo) {
  if (!errorInfo?.componentStack) return null;
  return errorInfo.componentStack.split('\n').slice(0, 8).join('\n').trim();
}

function formatJsStack(error) {
  if (!error?.stack) return null;
  return error.stack.split('\n').slice(0, 6).join('\n').trim();
}

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
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const context = this.props.context || this.props.title || 'App';
    logger.error('[ErrorBoundary]', context, {
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
    });
    console.error('[ErrorBoundary]', context, error?.message, error?.stack);
    if (errorInfo?.componentStack) {
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    this.setState({
      error,
      errorInfo,
    });
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
      const { error, errorInfo } = this.state;
      const jsStack = formatJsStack(error);
      const compStack = formatComponentStack(errorInfo);

      if (this.props.fallback) {
        return this.props.fallback(error, this.handleReset);
      }

      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Ionicons name="alert-circle" size={56} color={Colors.primary} />
            <Text style={styles.title}>
              {this.props.title || 'Oups ! Une erreur est survenue'}
            </Text>
            {this.props.context ? (
              <Text style={styles.contextLabel}>{this.props.context}</Text>
            ) : null}
            <Text style={styles.message}>
              {this.props.message ||
                'Une erreur inattendue s\'est produite. Détail ci-dessous :'}
            </Text>

            <View style={styles.errorDetails}>
              <Text style={styles.errorSectionTitle}>Message</Text>
              <Text style={styles.errorText} selectable>
                {error?.message || error?.toString?.() || 'Erreur inconnue'}
              </Text>
              {error?.name ? (
                <Text style={styles.errorMeta}>Type: {error.name}</Text>
              ) : null}
              {jsStack ? (
                <>
                  <Text style={[styles.errorSectionTitle, styles.errorSectionGap]}>Stack JS</Text>
                  <Text style={styles.errorTextMono} selectable>
                    {jsStack}
                  </Text>
                </>
              ) : null}
              {compStack ? (
                <>
                  <Text style={[styles.errorSectionTitle, styles.errorSectionGap]}>Composant</Text>
                  <Text style={styles.errorTextMono} selectable>
                    {compStack}
                  </Text>
                </>
              ) : null}
            </View>

            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>
                {this.props.buttonLabel || 'Réessayer'}
              </Text>
            </TouchableOpacity>

            {this.props.onRetry ? (
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
            ) : null}
          </ScrollView>
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  contextLabel: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorDetails: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    maxWidth: 420,
  },
  errorSectionTitle: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  errorSectionGap: {
    marginTop: 12,
  },
  errorText: {
    color: Colors.primary,
    fontSize: 14,
    fontFamily: FontFamily.medium,
    lineHeight: 20,
  },
  errorMeta: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
    fontFamily: FontFamily.regular,
  },
  errorTextMono: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
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
    fontFamily: FontFamily.bold,
  },
});

export default ErrorBoundary;
