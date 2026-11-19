import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { NoxButton, NoxInput, NoxScreenHeader, NoxText } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

/** Réglages d’adhésion d’un collectif (HelloAsso) et liste des adhérents. */
export default function CollectifSettingsPage() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [members, setMembers] = useState([]);
  const [slug, setSlug] = useState('');
  const [label, setLabel] = useState('');
  const [price, setPrice] = useState('0');
  const [enabled, setEnabled] = useState(false);

  const load = useCallback(async () => {
    if (!user?.token) return;
    try {
      const [settingsRes, membersRes] = await Promise.all([
        api.getCollectifSettings(user.token),
        api.getCollectifMembers(user.token).catch(() => null),
      ]);
      if (settingsRes?.success) {
        setData(settingsRes);
        setSlug(settingsRes.settings.organizationSlug || '');
        setLabel(settingsRes.settings.label || '');
        setPrice(String((settingsRes.settings.priceCents || 0) / 100).replace('.', ','));
        setEnabled(!!settingsRes.settings.enabled);
      }
      setMembers(Array.isArray(membersRes?.members) ? membersRes.members : []);
    } catch (error) {
      showError(error?.message || (fr ? 'Chargement impossible.' : 'Could not load.'));
    } finally {
      setLoading(false);
    }
  }, [user?.token, fr, showError]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.updateCollectifSettings(user.token, {
        organizationSlug: slug,
        label,
        priceEuros: price,
        enabled,
      });
      if (res?.success) {
        showSuccess(res.message || (fr ? 'Réglages enregistrés.' : 'Saved.'));
        load();
      } else {
        showError(res?.message || (fr ? 'Enregistrement impossible.' : 'Could not save.'));
      }
    } catch (error) {
      showError(error?.message || (fr ? 'Enregistrement impossible.' : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  };

  const priceNumber = Number(String(price).replace(',', '.')) || 0;
  const paidWithoutHelloAsso = enabled && priceNumber > 0 && data && !data.helloAssoConfigured;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Adhésions' : 'Memberships'}
        subtitle={fr ? 'Collectif · HelloAsso' : 'Collective · HelloAsso'}
        onBack={goBack}
      />
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
      ) : !data?.isCollectif ? (
        <NoxText variant="secondary" style={styles.empty}>
          {fr
            ? 'Les adhésions sont réservées aux organisateurs de type Collectif.'
            : 'Memberships are only for Collective organizers.'}
        </NoxText>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <NoxText style={styles.cardTitle}>{fr ? 'Adhésions ouvertes via NOX' : 'Open memberships on NOX'}</NoxText>
                  <NoxText style={styles.cardSub}>
                    {fr
                      ? 'Affiche un bouton « Rejoindre le collectif » sur ton profil public.'
                      : 'Shows a “Join the collective” button on your public profile.'}
                  </NoxText>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={setEnabled}
                  trackColor={{ true: Colors.primary, false: Colors.borderSubtle }}
                />
              </View>
            </View>

            <NoxInput
              label={fr ? 'Nom de l’adhésion' : 'Membership name'}
              value={label}
              onChangeText={setLabel}
              placeholder={fr ? 'Adhésion annuelle' : 'Annual membership'}
              maxLength={80}
            />
            <NoxInput
              label={fr ? 'Prix (€ / an, 0 = gratuite)' : 'Price (€ / year, 0 = free)'}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
            <NoxInput
              label={fr ? 'Slug de ton organisation HelloAsso' : 'Your HelloAsso organization slug'}
              value={slug}
              onChangeText={(v) => setSlug(v.trim().toLowerCase())}
              placeholder="mon-collectif"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <NoxText style={styles.help}>
              {fr
                ? 'C’est la fin de l’adresse de ta page : helloasso.com/associations/mon-collectif. Le paiement est encaissé par HelloAsso, directement sur le compte du collectif.'
                : 'It’s the end of your page address: helloasso.com/associations/my-collective.'}
            </NoxText>

            {paidWithoutHelloAsso ? (
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={18} color={Colors.warning} />
                <NoxText style={styles.noticeText}>
                  {fr
                    ? 'Le paiement HelloAsso n’est pas encore activé sur NOX : ton bouton affichera « Adhésions bientôt disponibles ». Les adhésions gratuites fonctionnent déjà.'
                    : 'HelloAsso payments are not live on NOX yet. Free memberships already work.'}
                </NoxText>
              </View>
            ) : null}

            <NoxButton label={fr ? 'Enregistrer' : 'Save'} onPress={save} loading={saving} disabled={saving} />

            <NoxText style={styles.sectionTitle}>
              {fr ? `Adhérents (${data.membersCount})` : `Members (${data.membersCount})`}
            </NoxText>
            {members.length === 0 ? (
              <NoxText variant="secondary">{fr ? 'Aucun adhérent pour le moment.' : 'No members yet.'}</NoxText>
            ) : (
              members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    {m.profileImage ? (
                      <Image source={{ uri: normalizeMediaUrl(m.profileImage) }} style={StyleSheet.absoluteFillObject} />
                    ) : (
                      <NoxText style={styles.avatarLetter}>{(m.pseudo || '?').charAt(0).toUpperCase()}</NoxText>
                    )}
                  </View>
                  <NoxText style={styles.memberName} numberOfLines={1}>
                    {m.pseudo}
                  </NoxText>
                  {m.validUntil ? (
                    <NoxText style={styles.memberUntil}>
                      {new Date(m.validUntil).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' })}
                    </NoxText>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Layout.screenPaddingHorizontal, paddingBottom: 140, gap: Spacing.sm },
  empty: { textAlign: 'center', marginTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  card: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: primaryAlpha(0.5),
    backgroundColor: Colors.backgroundCard,
    marginBottom: Spacing.lg,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardTitle: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.text },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  help: { fontSize: 12, lineHeight: 17, color: Colors.textTertiary, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  notice: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: 'rgba(245,158,11,0.5)',
    backgroundColor: 'rgba(245,158,11,0.08)',
    marginBottom: Spacing.md,
  },
  noticeText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 17, color: Colors.text, marginTop: Spacing.xl },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderSubtle,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryAlpha(0.15),
  },
  avatarLetter: { fontFamily: FontFamily.bold, color: Colors.text },
  memberName: { flex: 1, fontSize: 15, color: Colors.text },
  memberUntil: { fontSize: 12, color: Colors.textTertiary },
});
