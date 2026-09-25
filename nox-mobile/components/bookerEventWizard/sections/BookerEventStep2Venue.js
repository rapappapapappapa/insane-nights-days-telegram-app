import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { NoxText, NoxButton } from '../../nox';
import BookerEventVenuePickerModal from '../BookerEventVenuePickerModal';

export default function BookerEventStep2Venue(props) {
  const {
    language,
    styles,
    formData,
    venues,
    loadingVenues,
    setCurrentStep,
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
      <NoxText variant="form" style={styles.sectionTitle}>
        {language === 'fr' ? 'Étape 2 : Choisir un lieu' : 'Step 2: Choose a venue'}
      </NoxText>

      <NoxText variant="secondary" style={styles.stepDescription}>
        {language === 'fr'
          ? 'Sélectionne un lieu disponible pour cette date et cette durée.'
          : 'Select a venue available for this date and duration.'}
      </NoxText>

      <TouchableOpacity style={styles.selectButton} onPress={() => setVenuePickerVisible(true)}>
        <NoxText style={[styles.selectButtonText, !selectedVenue && styles.placeholderText]}>
          {selectedVenue
            ? `${selectedVenue.venueName} - ${selectedVenue.address}`
            : language === 'fr'
              ? 'Sélectionner un lieu'
              : 'Select a venue'}
        </NoxText>
        <NoxText style={styles.chevron}>▼</NoxText>
      </TouchableOpacity>

      {selectedVenue && (
        <View style={styles.selectedInfo}>
          <NoxText style={styles.selectedInfoText}>
            ✓ {language === 'fr' ? 'Lieu sélectionné' : 'Venue selected'}: {selectedVenue.venueName}
          </NoxText>
        </View>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButtonStep} onPress={() => setCurrentStep(1)}>
          <NoxText style={styles.backButtonStepText}>
            ← {language === 'fr' ? 'Précédent' : 'Previous'}
          </NoxText>
        </TouchableOpacity>
        <NoxButton
          label={language === 'fr' ? 'Suivant →' : 'Next →'}
          fullWidth={false}
          onPress={() => {
            if (selectedVenue) {
              setCurrentStep(3);
            }
          }}
          disabled={!selectedVenue}
          style={[styles.nextButton, { flex: 1, marginTop: 0 }, !selectedVenue && styles.nextButtonDisabled]}
          textStyle={styles.nextButtonText}
        />
      </View>

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
