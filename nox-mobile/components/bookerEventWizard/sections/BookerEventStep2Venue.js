import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxText } from '../../nox';
import Colors from '../../../constants/colors';
import BookerEventVenuePickerModal from '../BookerEventVenuePickerModal';

export default function BookerEventStep2Venue(props) {
  const {
    language,
    styles,
    venues,
    loadingVenues,
    handleChange,
    selectedVenue,
    navigate,
    flushDraftNow,
  } = props;

  const [venuePickerVisible, setVenuePickerVisible] = useState(false);

  const handleSelectVenue = (venue) => {
    if (!venue?.id) return;
    handleChange('venueId', venue.id);
    setVenuePickerVisible(false);
  };

  const handleViewVenueProfile = async (venue) => {
    if (!venue?.id || !navigate) return;
    setVenuePickerVisible(false);
    await flushDraftNow?.();
    navigate('venueProfile', { venueId: venue.id });
  };

  return (
    <>
      <NoxText variant="title" style={styles.sectionTitle}>
        {language === 'fr' ? 'Où ?' : 'Where?'}
      </NoxText>

      <TouchableOpacity
        style={styles.choiceCard}
        onPress={() => setVenuePickerVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.choiceIcon}>
          <Ionicons name="business" size={22} color={Colors.primaryLight} />
        </View>
        <View style={styles.choiceBody}>
          <NoxText style={styles.choiceLabel}>{language === 'fr' ? 'Lieu' : 'Venue'}</NoxText>
          <NoxText style={[styles.choiceValue, !selectedVenue && styles.placeholderText]}>
            {selectedVenue
              ? selectedVenue.venueName || selectedVenue.name
              : language === 'fr'
                ? 'Choisir un lieu'
                : 'Choose a venue'}
          </NoxText>
          {selectedVenue?.address ? (
            <NoxText variant="secondary" style={{ marginTop: 4 }}>
              {selectedVenue.address}
              {selectedVenue.city ? `, ${selectedVenue.city}` : ''}
            </NoxText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>

      <BookerEventVenuePickerModal
        visible={venuePickerVisible}
        language={language}
        styles={styles}
        venues={venues}
        loadingVenues={loadingVenues}
        onClose={() => setVenuePickerVisible(false)}
        onSelectVenue={handleSelectVenue}
        onViewProfile={handleViewVenueProfile}
      />
    </>
  );
}
