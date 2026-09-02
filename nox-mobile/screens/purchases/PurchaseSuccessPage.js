import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { openDiscover, navigateToHome, openEventPreview } from '../../utils/noxNavigation';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxButton, NoxCard } from '../../components/nox';

export default function PurchaseSuccessPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();

  const eventId = routeParams?.eventId ?? null;
  const eventTitle = routeParams?.eventTitle ?? null;
  const quantity = Number(routeParams?.quantity ?? 1);
  const amount = routeParams?.amount ?? null;

  const subtitle = useMemo(() => {
    if (eventTitle) {
      return fr
        ? `Ton billet est prêt pour : ${eventTitle}`
        : `Your ticket is ready for: ${eventTitle}`;
    }
    return fr ? 'Ton billet est prêt.' : 'Your ticket is ready.';
  }, [eventTitle, fr]);

  const amountLabel = useMemo(() => {
    if (amount === null || typeof amount === 'undefined') return null;
    if (typeof amount === 'number') return `${amount}€`;
    return String(amount);
  }, [amount]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <View style={styles.inner}>
        <NoxCard style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
          </View>
          <NoxText variant="title" style={styles.title}>
            {fr ? 'Paiement confirmé' : 'Payment confirmed'}
          </NoxText>
          <NoxText variant="secondary" style={styles.subtitle}>
            {subtitle}
          </NoxText>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <NoxText variant="secondary">{fr ? 'Quantité' : 'Quantity'}</NoxText>
              <NoxText variant="form">{Number.isFinite(quantity) ? quantity : 1}</NoxText>
            </View>
            {amountLabel ? (
              <View style={styles.detailRow}>
                <NoxText variant="secondary">{fr ? 'Montant' : 'Amount'}</NoxText>
                <NoxText variant="titleSecondary" style={{ color: Colors.primary }}>
                  {amountLabel}
                </NoxText>
              </View>
            ) : null}
          </View>

          <NoxButton label={fr ? 'Voir mes billets' : 'View my tickets'} onPress={() => navigate('tickets')} />

          <View style={styles.secondaryRow}>
            <NoxButton
              label={fr ? "Retour à l'événement" : 'Back to event'}
              variant="secondary"
              onPress={() => {
                if (eventId) {
                  openEventPreview(navigate, user?.activeProfileType, eventId);
                } else {
                  openDiscover(navigate, user?.activeProfileType);
                }
              }}
              style={styles.secondaryBtn}
            />
            <NoxButton
              label={fr ? 'Accueil' : 'Home'}
              variant="ghost"
              onPress={() => navigateToHome(navigate, user?.activeProfileType)}
              style={styles.secondaryBtn}
            />
          </View>
        </NoxCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPaddingHorizontal,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  details: {
    alignSelf: 'stretch',
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryRow: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  secondaryBtn: {
    minHeight: 44,
  },
});
