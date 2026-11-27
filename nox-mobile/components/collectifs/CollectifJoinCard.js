import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxButton, NoxText } from '../nox';

function tierPriceLabel(cents, fr) {
  if (cents == null) return fr ? 'Prix libre' : 'Pay what you want';
  if (cents === 0) return fr ? 'Gratuit' : 'Free';
  return `${(cents / 100).toFixed(2).replace('.', ',').replace(',00', '')} €`;
}

/**
 * Bloc adhésion sur le profil public d’un collectif : formules lues sur HelloAsso,
 * paiement sur la page HelloAsso, puis vérification par l’email du compte NOX.
 */
export default function CollectifJoinCard({ bookerId, collectifName, token, fr, showError, showSuccess }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    if (!token || !bookerId) return;
    try {
      const res = await api.getCollectifMembership(token, bookerId);
      setInfo(res?.success ? res : null);
    } catch {
      setInfo(null);
    }
  }, [token, bookerId]);

  useEffect(() => {
    load();
  }, [load]);

  const check = useCallback(
    async ({ silentIfMissing = false } = {}) => {
      setChecking(true);
      try {
        const res = await api.syncCollectifMembership(token, bookerId);
        if (res?.membership?.status === 'ACTIVE') {
          showSuccess?.(fr ? `Bienvenue chez ${collectifName} !` : `Welcome to ${collectifName}!`);
          await load();
        } else if (!silentIfMissing) {
          showError?.(
            fr
              ? 'Aucune adhésion trouvée sur HelloAsso avec l’email de ton compte NOX. Si tu viens de payer, réessaie dans une minute.'
              : 'No HelloAsso membership found with your NOX account email. If you just paid, try again in a minute.',
          );
        }
      } catch (error) {
        if (!silentIfMissing) showError?.(error?.message || (fr ? 'Vérification impossible.' : 'Could not check.'));
      } finally {
        setChecking(false);
      }
    },
    [token, bookerId, fr, collectifName, load, showError, showSuccess],
  );

  if (!info?.adhesion?.enabled) return null;
  const { adhesion, membership } = info;

  const join = async () => {
    if (!adhesion.url) return;
    setBusy(true);
    try {
      await WebBrowser.openBrowserAsync(adhesion.url);
      if (adhesion.tracked) await check({ silentIfMissing: true });
    } catch (error) {
      showError?.(error?.message || (fr ? 'Impossible d’ouvrir HelloAsso.' : 'Could not open HelloAsso.'));
    } finally {
      setBusy(false);
    }
  };

  if (membership?.status === 'ACTIVE') {
    const until = membership.validUntil
      ? new Date(membership.validUntil).toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : null;
    return (
      <View style={[styles.card, styles.cardMember]}>
        <Ionicons name="checkmark-circle" size={22} color={Colors.primaryLight} />
        <View style={styles.body}>
          <NoxText style={styles.title}>{fr ? `Membre de ${collectifName}` : `${collectifName} member`}</NoxText>
          <NoxText style={styles.sub}>
            {[membership.tierLabel, until ? (fr ? `jusqu’au ${until}` : `until ${until}`) : null].filter(Boolean).join(' · ') ||
              (fr ? 'Adhésion active' : 'Active membership')}
          </NoxText>
        </View>
      </View>
    );
  }

  const expired = membership?.status === 'EXPIRED';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="people-outline" size={22} color={Colors.primaryLight} />
        <View style={styles.body}>
          <NoxText style={styles.title}>{adhesion.title}</NoxText>
          <NoxText style={styles.sub}>
            {expired
              ? fr ? 'Ton adhésion a expiré' : 'Your membership expired'
              : fr ? 'Soutiens le collectif en devenant membre' : 'Support the collective by becoming a member'}
          </NoxText>
        </View>
      </View>

      {adhesion.tiers.length > 0 ? (
        <View style={styles.tiers}>
          {adhesion.tiers.map((t) => (
            <View key={t.id} style={styles.tierRow}>
              <View style={styles.body}>
                <NoxText style={styles.tierLabel}>{t.label}</NoxText>
                {t.description ? (
                  <NoxText style={styles.tierDesc} numberOfLines={2}>
                    {t.description}
                  </NoxText>
                ) : null}
              </View>
              <NoxText style={styles.tierPrice}>{tierPriceLabel(t.priceCents, fr)}</NoxText>
            </View>
          ))}
        </View>
      ) : null}

      <NoxButton
        label={
          expired
            ? fr ? 'Renouveler sur HelloAsso' : 'Renew on HelloAsso'
            : fr ? 'Adhérer sur HelloAsso' : 'Join on HelloAsso'
        }
        onPress={join}
        loading={busy}
        disabled={busy || checking || !adhesion.url}
      />
      {adhesion.tracked ? (
        <>
          <NoxButton
            variant="ghost"
            label={fr ? 'J’ai déjà adhéré · vérifier' : 'I already joined · check'}
            onPress={() => check()}
            loading={checking}
            disabled={busy || checking}
          />
          <NoxText style={styles.hint}>
            {fr
              ? 'Paiement sur HelloAsso, directement au collectif. Utilise l’email de ton compte NOX pour que ton adhésion apparaisse ici.'
              : 'Payment on HelloAsso, straight to the collective. Use your NOX account email so your membership shows up here.'}
          </NoxText>
        </>
      ) : (
        <NoxText style={styles.hint}>
          {fr ? 'Les formules et le paiement sont gérés sur HelloAsso, directement par le collectif.' : 'Tiers and payment are handled on HelloAsso by the collective.'}
        </NoxText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: primaryAlpha(0.5),
    backgroundColor: Colors.backgroundCard,
    marginTop: Spacing.lg,
  },
  cardMember: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.text },
  sub: { fontSize: 13, color: Colors.textSecondary },
  tiers: { gap: Spacing.xs },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderSubtle,
  },
  tierLabel: { fontSize: 14, color: Colors.text },
  tierDesc: { fontSize: 12, color: Colors.textTertiary },
  tierPrice: { fontFamily: FontFamily.bold, fontSize: 14, color: Colors.text },
  hint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
});
