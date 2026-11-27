import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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

function formatEuros(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',').replace(',00', '')} €`;
}

/** Adhésions d’un collectif : lien vers le formulaire HelloAsso (formules et tarifs gérés là-bas) et adhérents. */
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
  const [formUrl, setFormUrl] = useState('');
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
        setFormUrl(settingsRes.settings.formUrl || '');
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
      const res = await api.updateCollectifSettings(user.token, { formUrl, enabled });
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

  const tiers = data?.form?.tiers || [];

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
                      ? 'Affiche tes formules HelloAsso et un bouton « Adhérer » sur ton profil public.'
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
              label={fr ? 'Lien de ton formulaire d’adhésion HelloAsso' : 'Your HelloAsso membership form link'}
              value={formUrl}
              onChangeText={(v) => setFormUrl(v.trim())}
              placeholder="https://www.helloasso.com/associations/mon-collectif/adhesions/adhesion-2026"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <NoxText style={styles.help}>
              {fr
                ? 'Crée tes formules (tarifs, durée, réductions…) directement sur HelloAsso, puis colle ici l’adresse de la page d’adhésion. NOX affiche les formules et envoie tes membres payer sur HelloAsso, directement sur le compte du collectif.'
                : 'Create your tiers on HelloAsso, then paste the membership page address here. NOX shows them and sends members to pay on HelloAsso.'}
            </NoxText>

            {data.form ? (
              <View style={styles.preview}>
                <NoxText style={styles.previewTitle}>
                  {fr ? `Formules lues sur HelloAsso · ${data.form.title}` : `Tiers from HelloAsso · ${data.form.title}`}
                </NoxText>
                {tiers.length === 0 ? (
                  <NoxText style={styles.cardSub}>{fr ? 'Aucune formule dans ce formulaire.' : 'No tiers in this form.'}</NoxText>
                ) : (
                  tiers.map((t) => (
                    <View key={t.id} style={styles.tierRow}>
                      <NoxText style={styles.tierLabel} numberOfLines={1}>
                        {t.label}
                      </NoxText>
                      <NoxText style={styles.tierPrice}>
                        {t.priceCents == null ? (fr ? 'Prix libre' : 'Pay what you want') : t.priceCents === 0 ? (fr ? 'Gratuit' : 'Free') : formatEuros(t.priceCents)}
                      </NoxText>
                    </View>
                  ))
                )}
              </View>
            ) : formUrl && data.settings.formUrl ? (
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={18} color={Colors.warning} />
                <NoxText style={styles.noticeText}>
                  {data.helloAssoConfigured
                    ? fr
                      ? 'NOX n’arrive pas à lire ce formulaire pour le moment. Vérifie le lien et que le formulaire est publié.'
                      : 'NOX can’t read this form right now. Check the link and that the form is published.'
                    : fr
                      ? 'La connexion HelloAsso n’est pas encore activée sur NOX : ton profil affiche un bouton vers ta page HelloAsso, sans le détail des formules ni le badge « Membre ».'
                      : 'HelloAsso is not connected on NOX yet: your profile links to your HelloAsso page, without tiers or member badge.'}
                </NoxText>
              </View>
            ) : null}

            {data.settings.formUrl ? (
              <NoxButton
                variant="secondary"
                label={fr ? 'Ouvrir ma page HelloAsso' : 'Open my HelloAsso page'}
                onPress={() => Linking.openURL(data.form?.url || data.settings.formUrl)}
              />
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
                  {m.tierLabel ? (
                    <NoxText style={styles.memberUntil} numberOfLines={1}>
                      {m.tierLabel}
                    </NoxText>
                  ) : null}
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
  preview: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  previewTitle: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.text, marginBottom: Spacing.xs },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: 4 },
  tierLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  tierPrice: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.text },
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
