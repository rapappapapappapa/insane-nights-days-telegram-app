import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

/**
 * Liste des porteurs de billets pour une carte événement (organisateur) avec filtre par nom.
 */
export default function BookerTicketHoldersSection({ language, ticketHolders, styles: S }) {
  const [query, setQuery] = useState('');
  const list = Array.isArray(ticketHolders) ? ticketHolders : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((h) => (h.displayName || '').toLowerCase().includes(q));
  }, [list, query]);

  if (list.length === 0) return null;

  const showSearch = list.length > 3;

  return (
    <View style={S.ticketHoldersBlock}>
      <Text style={S.eventInfoLabel}>
        {language === 'fr' ? '🎫 Participants (billets)' : '🎫 Ticket holders'} ({list.length})
        {filtered.length !== list.length ? ` · ${filtered.length}` : ''}
      </Text>
      {showSearch ? (
        <TextInput
          style={local.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={language === 'fr' ? 'Filtrer par nom…' : 'Filter by name…'}
          placeholderTextColor="rgba(255,255,255,0.45)"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={
            language === 'fr' ? 'Filtrer les participants par nom' : 'Filter participants by name'
          }
        />
      ) : null}
      {filtered.map((h) => (
        <Text
          key={h.ticketId}
          style={[S.ticketHolderLine, h.entered && S.ticketHolderEntered]}
          numberOfLines={1}
        >
          {h.entered ? '✓ ' : '· '}
          {h.displayName}
          {h.ticketStatus && h.ticketStatus !== 'valid' && h.ticketStatus !== 'used'
            ? ` (${h.ticketStatus})`
            : ''}
        </Text>
      ))}
      {filtered.length === 0 && query.trim() ? (
        <Text style={local.emptyFilter}>
          {language === 'fr' ? 'Aucun nom ne correspond.' : 'No matching name.'}
        </Text>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  searchInput: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  emptyFilter: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
  },
});
