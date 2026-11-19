import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../api/config';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxButton, NoxText } from '../nox';

function formatEuros(cents) {
  return (cents / 100).toFixed(2).replace('.', ',').replace(',00', '');
}

/** Bloc « Rejoindre le collectif » (adhésion HelloAsso) sur le profil public d’un collectif. */
export default function CollectifJoinCard({ bookerId, collectifName, token, fr, showError, showSuccess }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

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

  if (!info?.adhesion?.enabled) return null;
  const { adhesion, membership } = info;
  const isMember = membership?.status === 'ACTIVE';
  const priceLabel =
    adhesion.priceCents > 0 ? `${formatEuros(adhesion.priceCents)} €` : fr ? 'gratuite' : 'free';

  const join = async () => {
    setBusy(true);
    try {
      const res = await api.joinCollectif(token, bookerId);
      if (!res?.success) {
        showError?.(res?.message || (fr ? 'Adhésion impossible.' : 'Could not join.'));
        return;
      }
      if (res.status === 'ACTIVE') {
        showSuccess?.(res.message);
        await load();
        return;
      }
      if (res.redirectUrl) {
        await WebBrowser.openAuthSessionAsync(res.redirectUrl, res.returnUrlPrefix);
        const synced = await api.syncCollectifMembership(token, res.membershipId);
        if (synced?.membership?.status === 'ACTIVE') {
          showSuccess?.(fr ? `Bienvenue chez ${collectifName} !` : `Welcome to ${collectifName}!`);
        } else {
          showError?.(
            fr
              ? 'Paiement non confirmé pour le moment. Si tu as payé, ton adhésion s’activera dans quelques minutes.'
              : 'Payment not confirmed yet. If you paid, your membership will activate shortly.',
          );
        }
        await load();
      }
    } catch (error) {
      showError?.(error?.message || (fr ? 'Adhésion impossible.' : 'Could not join.'));
    } finally {
      setBusy(false);
    }
  };

  if (isMember) {
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
          {until ? (
            <NoxText style={styles.sub}>{fr ? `Adhésion valable jusqu’au ${until}` : `Valid until ${until}`}</NoxText>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="people-outline" size={22} color={Colors.primaryLight} />
        <View style={styles.body}>
          <NoxText style={styles.title}>{adhesion.label}</NoxText>
          <NoxText style={styles.sub}>
            {membership?.status === 'EXPIRED'
              ? fr
                ? `Ton adhésion a expiré · ${priceLabel}`
                : `Your membership expired · ${priceLabel}`
              : fr
                ? `Soutiens le collectif · ${priceLabel}`
                : `Support the collective · ${priceLabel}`}
          </NoxText>
        </View>
      </View>
      <NoxButton
        label={
          adhesion.available
            ? membership?.status === 'EXPIRED'
              ? fr ? 'Renouveler mon adhésion' : 'Renew membership'
              : fr ? 'Rejoindre le collectif' : 'Join the collective'
            : fr ? 'Adhésions bientôt disponibles' : 'Memberships coming soon'
        }
        onPress={join}
        loading={busy}
        disabled={busy || !adhesion.available}
      />
      {adhesion.priceCents > 0 && adhesion.available ? (
        <NoxText style={styles.hint}>
          {fr ? 'Paiement sécurisé sur HelloAsso, directement au collectif.' : 'Secure payment on HelloAsso, straight to the collective.'}
        </NoxText>
      ) : null}
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
  hint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center' },
});
