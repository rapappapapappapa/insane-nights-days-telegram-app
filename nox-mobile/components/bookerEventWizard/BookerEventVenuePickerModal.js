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

/** Sélection lieu in-app (modal) — uniformisé avec le sélecteur DJ. */
export default function BookerEventVenuePickerModal({
  visible,
  language,
  styles,
  venues,
  loadingVenues,
  onClose,
  onSelectVenue,
  onViewProfile,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (venues || []).filter((v) => {
      if (!q) return true;
      return (
        v.venueName?.toLowerCase().includes(q) ||
        v.address?.toLowerCase().includes(q)
      );
    });
  }, [venues, searchQuery]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.djPickerOverlay}>
        <View style={styles.djPickerSheet}>
          <View style={styles.djPickerHeader}>
            <Text style={styles.djPickerTitle}>
              {language === 'fr' ? 'Choisir un lieu' : 'Choose a venue'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.djPickerClose} hitSlop={12}>
              <Text style={styles.djPickerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.djPickerSearch}
            placeholder={language === 'fr' ? 'Rechercher un lieu…' : 'Search venue…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loadingVenues ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <ScrollView
              style={styles.djPickerList}
              contentContainerStyle={styles.djPickerListContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {filtered.length === 0 ? (
                <Text style={styles.djPickerEmpty}>
                  {language === 'fr' ? 'Aucun lieu disponible.' : 'No venue available.'}
                </Text>
              ) : (
                filtered.map((venue) => (
                  <View key={venue.id} style={styles.djPickerRow}>
                    <TouchableOpacity
                      style={styles.djPickerRowMain}
                      onPress={() => onSelectVenue(venue)}
                      activeOpacity={0.85}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.djPickerRowName}>{venue.venueName || '—'}</Text>
                        {venue.address ? (
                          <Text style={styles.djPickerRowMeta}>📍 {venue.address}</Text>
                        ) : null}
                        {venue.capacity ? (
                          <Text style={styles.djPickerRowMeta}>
                            👥 {venue.capacity} {language === 'fr' ? 'pers.' : 'cap.'}
                          </Text>
                        ) : null}
                      </View>
                      <StarRating rating={venue.averageRatingGlobal || 0} size={14} />
                    </TouchableOpacity>
                    {onViewProfile ? (
                      <TouchableOpacity
                        style={styles.djPickerProfileBtn}
                        onPress={() => onViewProfile(venue)}
                        hitSlop={8}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.djPickerProfileBtnText}>
                          {language === 'fr' ? '👁 Profil' : '👁 Profile'}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
