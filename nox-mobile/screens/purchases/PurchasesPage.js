import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { openDiscover, openEventPreview } from '../../utils/noxNavigation';
import { api } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxText, NoxButton, NoxCard, NoxScreenHeader } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

const centsToEuros = (amountCents) => {
  const n = Number(amountCents);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 100).toFixed(2)}€`;
};

const formatDate = (iso) => {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(iso);
  }
};

const getStatusLabel = (status, language) => {
  if (!status) return '—';
  const s = String(status).toLowerCase();
  if (s === 'fulfilled') return language === 'fr' ? 'Confirmé' : 'Confirmed';
  if (s === 'succeeded') return language === 'fr' ? 'Payé' : 'Paid';
  if (s === 'created') return language === 'fr' ? 'En attente' : 'Pending';
  if (s === 'failed') return language === 'fr' ? 'Échec' : 'Failed';
  return status;
};

export default function PurchasesPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { navigate, goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  const fetchPayments = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await api.getMyPayments(user.token);
      if (res?.success && Array.isArray(res.payments)) {
        setPayments(res.payments);
      } else {
        setPayments([]);
      }
    } catch (e) {
      console.error('Erreur récupération paiements:', e);
      showError(e?.message || (language === 'fr' ? 'Erreur lors du chargement des achats.' : 'Failed to load purchases.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('splash');
      return;
    }
    if (!user?.token) {
      setLoading(false);
      showError(language === 'fr' ? 'Token manquant. Veuillez vous reconnecter.' : 'Missing token. Please log in again.');
      return;
    }
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.isAuthenticated, user?.token]);

  const hasPurchases = useMemo(() => payments.length > 0, [payments]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Historique d’achat' : 'Purchase history'}
        subtitle={fr ? 'Paiements Stripe confirmés' : 'Confirmed Stripe payments'}
        onBack={goBack}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <NoxText variant="secondary">{fr ? 'Chargement…' : 'Loading…'}</NoxText>
          </View>
        ) : !hasPurchases ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="receipt-outline" size={40} color={Colors.primary} />
            </View>
            <NoxText variant="titleSecondary" style={styles.emptyTitle}>
              {fr ? 'Aucun achat pour le moment' : 'No purchases yet'}
            </NoxText>
            <NoxText variant="secondary" style={styles.emptyText}>
              {fr
                ? 'Achète un billet sur un événement à venir pour retrouver tes paiements ici.'
                : 'Buy a ticket for an upcoming event to see your payments here.'}
            </NoxText>
            <NoxButton
              label={fr ? 'Découvrir les événements' : 'Browse events'}
              onPress={() => openDiscover(navigate, user?.activeProfileType)}
            />
          </View>
        ) : (
          <View style={styles.list}>
            {payments.map((p) => {
              const status = String(p.status || '').toLowerCase();
              const isOk = status === 'fulfilled' || status === 'succeeded';
              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (p?.event?.id) {
                      openEventPreview(navigate, user?.activeProfileType, p.event.id);
                    }
                  }}
                  accessibilityRole="button"
                >
                  <NoxCard style={styles.card}>
                  <View style={styles.rowTop}>
                    <View style={styles.left}>
                      <NoxText variant="form" style={styles.eventTitle} numberOfLines={2}>
                        {p?.event?.title || (fr ? 'Événement' : 'Event')}
                      </NoxText>
                      <NoxText variant="secondary" style={styles.date}>
                        {formatDate(p.createdAt)}
                      </NoxText>
                    </View>
                    <View style={styles.right}>
                      <NoxText variant="titleSecondary" style={styles.amount}>
                        {centsToEuros(p.amount)}
                      </NoxText>
                      <NoxText
                        variant="secondary"
                        style={[styles.status, isOk ? styles.statusOk : styles.statusPending]}
                      >
                        {getStatusLabel(p.status, language)}
                      </NoxText>
                    </View>
                  </View>

                  <View style={styles.rowBottom}>
                    <NoxText variant="secondary" style={styles.meta}>
                      {fr ? 'Quantité' : 'Quantity'}: {p.quantity ?? 1} · {String(p.currency || 'eur').toUpperCase()}
                    </NoxText>
                    <NoxButton
                      label={fr ? 'Mes billets' : 'My tickets'}
                      variant="ghost"
                      onPress={() => navigate('tickets')}
                      style={styles.ticketsButton}
                      fullWidth={false}
                    />
                  </View>
                  </NoxCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
    gap: Spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.md,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  left: {
    flex: 1,
    gap: Spacing.xs,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  eventTitle: {
    flex: 1,
  },
  date: {
    fontSize: 12,
  },
  amount: {
    color: Colors.primary,
  },
  status: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusOk: {
    color: Colors.success,
  },
  statusPending: {
    color: Colors.warning,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  meta: {
    flex: 1,
    fontSize: 12,
  },
  ticketsButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.md,
  },
});

