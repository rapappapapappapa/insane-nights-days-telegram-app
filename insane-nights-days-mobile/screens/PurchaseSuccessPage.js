import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import Colors from '../constants/colors';

export default function PurchaseSuccessPage() {
  const { language } = useLanguage();
  const { navigate, routeParams } = useNavigation();

  const eventId = routeParams?.eventId ?? null;
  const eventTitle = routeParams?.eventTitle ?? null;
  const quantity = Number(routeParams?.quantity ?? 1);
  const amount = routeParams?.amount ?? null; // ex: 10 (euros) ou "10€"

  const subtitle = useMemo(() => {
    if (eventTitle) {
      return language === 'fr'
        ? `Votre ticket est prêt pour : ${eventTitle}`
        : `Your ticket is ready for: ${eventTitle}`;
    }
    return language === 'fr'
      ? 'Votre ticket est prêt.'
      : 'Your ticket is ready.';
  }, [eventTitle, language]);

  const amountLabel = useMemo(() => {
    if (amount === null || typeof amount === 'undefined') return null;
    if (typeof amount === 'number') return `${amount}€`;
    return String(amount);
  }, [amount]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.card}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>
          {language === 'fr' ? 'Paiement confirmé' : 'Payment confirmed'}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {language === 'fr' ? 'Quantité' : 'Quantity'}
            </Text>
            <Text style={styles.detailValue}>{Number.isFinite(quantity) ? quantity : 1}</Text>
          </View>
          {amountLabel ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{language === 'fr' ? 'Montant' : 'Amount'}</Text>
              <Text style={styles.detailValue}>{amountLabel}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigate('tickets')}>
          <Text style={styles.primaryButtonText}>
            {language === 'fr' ? 'Voir mes tickets' : 'View my tickets'}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (eventId) {
                navigate('eventDetail', { eventId });
              } else {
                navigate('events');
              }
            }}
          >
            <Text style={styles.secondaryButtonText}>
              {language === 'fr' ? "Retour à l'événement" : 'Back to event'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigate('welcome')}>
            <Text style={styles.secondaryButtonText}>
              {language === 'fr' ? 'Accueil' : 'Home'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors?.backgroundCard ?? '#121217',
    borderWidth: 1,
    borderColor: Colors?.borderActive ?? 'rgba(255,23,68,0.35)',
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  icon: {
    fontSize: 46,
    textAlign: 'center',
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  details: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    marginTop: 10,
    backgroundColor: Colors?.primary ?? '#FF1744',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});

