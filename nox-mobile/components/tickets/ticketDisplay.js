import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/theme';
import { NoxText } from '../nox';

export const API_TICKET_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function localDate(dateString) {
  if (!API_TICKET_DATE_RE.test(String(dateString || ''))) return null;
  const d = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTicketDate(dateString, language, month = 'long') {
  const d = localDate(dateString);
  if (!d) return dateString || '';
  return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month,
    year: 'numeric',
  });
}

export function formatPurchaseDate(dateString, language) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildQrPayload(ticket) {
  return JSON.stringify({
    ticketId: ticket.id,
    qrCode: ticket.qrCode,
    eventId: ticket.eventId,
    userId: ticket.userId,
    status: ticket.status,
  });
}

export function isTicketPast(ticket) {
  if (ticket.eventStatus) return ticket.eventStatus === 'FINISHED';
  if (ticket.eventDate) return new Date(ticket.eventDate) < new Date();
  return false;
}

export function hasEnteredWithTicket(ticket) {
  return ticket.status === 'used' || (ticket.scannedVenueIds || []).length > 0;
}

export function ticketGenres(ticket) {
  return String(ticket.eventGenre || '')
    .split(/[,/•|]/)
    .map((g) => g.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function ticketAddress(ticket) {
  return ticket.eventAddress || ticket.eventLocation || ticket.venueName || '';
}

/** Pastille « SAM / 31 / JANV. ». */
export function TicketDatePill({ dateString, language, style }) {
  const d = localDate(dateString);
  if (!d) return null;
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const weekday = d.toLocaleDateString(locale, { weekday: 'short' }).replace('.', '').toUpperCase();
  const month = d.toLocaleDateString(locale, { month: 'short' }).toUpperCase();
  return (
    <View style={[styles.pill, style]}>
      <NoxText style={styles.pillWeekday}>{weekday}</NoxText>
      <NoxText style={styles.pillDay}>{d.getDate()}</NoxText>
      <NoxText style={styles.pillMonth}>{month}</NoxText>
    </View>
  );
}

export function TicketStatusBadge({ past, fr }) {
  return (
    <View style={[styles.badge, past ? styles.badgePast : styles.badgeActive]}>
      <NoxText style={[styles.badgeText, past ? styles.badgeTextPast : styles.badgeTextActive]}>
        {past ? (fr ? 'PASSÉ' : 'PAST') : fr ? 'ACTIF' : 'ACTIVE'}
      </NoxText>
    </View>
  );
}

export function TicketGenreChips({ genres }) {
  if (!genres.length) return null;
  return (
    <View style={styles.chips}>
      {genres.map((g) => (
        <View key={g} style={styles.chip}>
          <NoxText style={styles.chipText}>{g}</NoxText>
        </View>
      ))}
    </View>
  );
}

/** Encadré tarif : icône billet, libellé, « 1 x Billet », prix. */
export function TicketTierBox({ ticket, fr, large = false }) {
  return (
    <View style={[styles.tierBox, large && styles.tierBoxLarge]}>
      <View style={[styles.tierIcon, large && styles.tierIconLarge]}>
        <Ionicons name="ticket-outline" size={large ? 24 : 16} color={Colors.primaryLight} />
      </View>
      <View style={{ flex: 1 }}>
        <NoxText style={[styles.tierLabel, large && styles.tierLabelLarge]} numberOfLines={1}>
          {ticket.tierLabel || (fr ? 'Entrée générale' : 'General admission')}
        </NoxText>
        <NoxText style={[styles.tierQty, large && styles.tierQtyLarge]}>
          {fr ? '1 x Billet' : '1 x Ticket'}
        </NoxText>
      </View>
      {ticket.price != null ? (
        <NoxText style={[styles.tierPrice, large && styles.tierPriceLarge]}>{ticket.price}€</NoxText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 62,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'rgba(10,10,9,0.85)',
  },
  pillWeekday: { fontSize: 11, color: Colors.textSecondary },
  pillDay: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 28, color: Colors.text },
  pillMonth: { fontSize: 11, color: Colors.textSecondary },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  badgeActive: { borderColor: primaryAlpha(0.6), backgroundColor: primaryAlpha(0.15) },
  badgePast: { borderColor: Colors.borderSubtle, backgroundColor: 'rgba(255,255,255,0.06)' },
  badgeText: { fontSize: 11, fontFamily: FontFamily.bold, letterSpacing: 0.4 },
  badgeTextActive: { color: Colors.primaryLight },
  badgeTextPast: { color: Colors.textTertiary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
  },
  chipText: { fontSize: 11, color: Colors.textSecondary },
  tierBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tierBoxLarge: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    borderRadius: Radius.lg,
    borderColor: primaryAlpha(0.5),
    backgroundColor: primaryAlpha(0.06),
  },
  tierIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryAlpha(0.15),
  },
  tierIconLarge: { width: 52, height: 52, borderRadius: Radius.md },
  tierLabel: { fontSize: 13, color: Colors.text, fontFamily: FontFamily.medium },
  tierLabelLarge: { fontSize: 17 },
  tierQty: { fontSize: 11, color: Colors.textTertiary },
  tierQtyLarge: { fontSize: 14 },
  tierPrice: { fontFamily: FontFamily.bold, fontSize: 15, color: Colors.primaryLight },
  tierPriceLarge: { fontSize: 24 },
});
