import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import StarRating from '../StarRating';
import Colors from '../../constants/colors';

/** Sélection DJ in-app (modal) — évite la navigation selectDj / profil qui perdait la grille multi-créneaux. */
export default function BookerEventDjPickerModal({
  visible,
  slotIndex,
  language,
  styles,
  availableDjs,
  loadingDjs,
  excludedDjUserIds = [],
  onClose,
  onSelectDj,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const excluded = new Set(excludedDjUserIds.filter(Boolean));
    return (availableDjs || []).filter((dj) => {
      if (excluded.has(dj.userId)) return false;
      if (!searchQuery.trim()) return true;
      return dj.artistName?.toLowerCase().includes(searchQuery.trim().toLowerCase());
    });
  }, [availableDjs, excludedDjUserIds, searchQuery]);

  const slotLabel =
    slotIndex != null
      ? language === 'fr'
        ? `Créneau ${slotIndex + 1}`
        : `Slot ${slotIndex + 1}`
      : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.djPickerOverlay}>
        <View style={styles.djPickerSheet}>
          <View style={styles.djPickerHeader}>
            <Text style={styles.djPickerTitle}>
              {language === 'fr' ? 'Choisir un DJ' : 'Choose a DJ'}
              {slotLabel ? ` · ${slotLabel}` : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.djPickerClose} hitSlop={12}>
              <Text style={styles.djPickerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.djPickerSearch}
            placeholder={language === 'fr' ? 'Rechercher un artiste…' : 'Search artist…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loadingDjs ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView style={styles.djPickerList} keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <Text style={styles.djPickerEmpty}>
                  {language === 'fr' ? 'Aucun DJ disponible.' : 'No DJ available.'}
                </Text>
              ) : (
                filtered.map((dj) => (
                  <TouchableOpacity
                    key={dj.userId}
                    style={styles.djPickerRow}
                    onPress={() => onSelectDj(dj)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.djPickerRowName}>{dj.artistName || '—'}</Text>
                      {dj.genre ? (
                        <Text style={styles.djPickerRowMeta}>🎧 {dj.genre}</Text>
                      ) : null}
                    </View>
                    <StarRating rating={dj.averageRatingGlobal || 0} size={14} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
