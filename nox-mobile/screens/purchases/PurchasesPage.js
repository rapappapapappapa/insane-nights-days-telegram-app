import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { openDiscover, navigateToHome, openEventPreview } from '../../utils/noxNavigation';
import { api } from '../../api/config';
import Colors from '../../constants/colors';
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
  const { navigate } = useNavigation();
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
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButtonTop}
          onPress={() => navigateToHome(navigate, user?.activeProfileType)}
          accessibilityRole="button"
          accessibilityLabel={language === 'fr' ? 'Retour' : 'Back'}
        >
          <Text style={styles.backButtonTopText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🧾 {language === 'fr' ? 'Mes achats' : 'My purchases'}</Text>
          <Text style={styles.subtitle}>
            {language === 'fr' ? 'Historique de vos paiements' : 'Your payment history'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
          </View>
        ) : !hasPurchases ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>
              {language === 'fr' ? 'Aucun achat pour le moment' : 'No purchases yet'}
            </Text>
            <Text style={styles.emptyText}>
              {language === 'fr'
                ? 'Achetez un ticket sur un événement à venir pour voir apparaître vos achats ici.'
                : 'Buy a ticket for an upcoming event to see your purchases here.'}
            </Text>
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={() => openDiscover(navigate, user?.activeProfileType)}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Voir les événements' : 'Browse events'}
            >
              <Text style={styles.primaryCtaText}>{language === 'fr' ? 'Voir les événements' : 'Browse events'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {payments.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                style={styles.card}
                onPress={() => {
                  if (p?.event?.id) {
                    openEventPreview(navigate, user?.activeProfileType, p.event.id);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  `${p?.event?.title || (language === 'fr' ? 'Événement' : 'Event')}. ${language === 'fr' ? 'Voir le détail' : 'View details'}`
                }
              >
                <View style={styles.rowTop}>
                  <View style={styles.left}>
                    <Text style={styles.eventTitle}>{p?.event?.title || (language === 'fr' ? 'Événement' : 'Event')}</Text>
                    <Text style={styles.date}>{formatDate(p.createdAt)}</Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={styles.amount}>{centsToEuros(p.amount)}</Text>
                    <Text style={styles.status}>{getStatusLabel(p.status, language)}</Text>
                  </View>
                </View>

                <View style={styles.rowBottom}>
                  <Text style={styles.meta}>
                    {language === 'fr' ? 'Quantité' : 'Quantity'}: {p.quantity ?? 1} • {language === 'fr' ? 'Devise' : 'Currency'}: {String(p.currency || 'eur').toUpperCase()}
                  </Text>
                  <TouchableOpacity
                    style={styles.ticketsButton}
                    onPress={() => navigate('tickets')}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Mes tickets' : 'My tickets'}
                  >
                    <Text style={styles.ticketsButtonText}>{language === 'fr' ? 'Mes tickets' : 'My tickets'}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryCta: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  primaryCtaText: {
    color: Colors.background,
    fontWeight: '900',
  },
  list: {
    gap: 14,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderActive,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  date: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  amount: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '900',
  },
  status: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  meta: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    flex: 1,
  },
  ticketsButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  ticketsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
});

