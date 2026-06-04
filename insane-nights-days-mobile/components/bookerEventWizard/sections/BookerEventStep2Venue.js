import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import Colors from '../../../constants/colors';
import { getEventMinLeadDaysFromEnv } from '../../../utils/bookerEventWizardUtils';

export default function BookerEventStep2Venue(props) {
    const {
    language,
    styles,
    formData,
    setFormData,
    eventDateTime,
    setEventDateTime,
    availableDjs,
    venues,
    loadingDjs,
    loadingVenues,
    creating,
    currentStep,
    setCurrentStep,
    djSlots,
    setDjSlots,
    slotTimePicker,
    setSlotTimePicker,
    tempSlotTime,
    setTempSlotTime,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    rentalPresets,
    rentalCatalogItems,
    rentalCatalogLabel,
    setRentalCatalogLabel,
    rentalCatalogQty,
    setRentalCatalogQty,
    eventRentalExtraLabel,
    setEventRentalExtraLabel,
    eventRentalExtraQty,
    setEventRentalExtraQty,
    savingRentalCatalog,
    openDatePicker,
    openTimePicker,
    openSlotTimeField,
    updateSlotTimeFromPicker,
    handleChange,
    toggleEquipmentPreset,
    toggleOrganizerLineFromCatalog,
    addEventOnlyEquipmentLine,
    removeOrganizerLineAt,
    addCatalogRow,
    removeCatalogRow,
    updateExtraTicketTier,
    addExtraTicketTier,
    removeExtraTicketTier,
    saveRentalCatalogToProfile,
    pickCoverImage,
    handleCreateEvent,
    selectedVenue,
    coverImageUri,
    navigate,
    hasBookerEventTitle,
    hasBookerEventPrice,
  } = props;

  return (
<>
                  <Text style={styles.sectionTitle}>
                    {language === 'fr' ? 'Étape 2 : Choisir un lieu' : 'Step 2: Choose a venue'}
                  </Text>
    
                  <Text style={styles.stepDescription}>
                    {language === 'fr' 
                      ? 'Sélectionne un lieu disponible pour cette date et cette durée.'
                      : 'Select a venue available for this date and duration.'}
                  </Text>
    
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => {
                      navigate('selectVenue', {
                        selectedVenueId: formData.venueId,
                        returnTo: 'bookerEventDashboard',
                      });
                    }}
                  >
                    <Text style={[styles.selectButtonText, !selectedVenue && styles.placeholderText]}>
                      {selectedVenue
                        ? `${selectedVenue.venueName} - ${selectedVenue.address}`
                        : language === 'fr' ? 'Sélectionner un lieu' : 'Select a venue'}
                    </Text>
                    <Text style={styles.chevron}>▼</Text>
                  </TouchableOpacity>
    
                  {selectedVenue && (
                    <View style={styles.selectedInfo}>
                      <Text style={styles.selectedInfoText}>
                        ✓ {language === 'fr' ? 'Lieu sélectionné' : 'Venue selected'}: {selectedVenue.venueName}
                      </Text>
                    </View>
                  )}
    
                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={styles.backButtonStep}
                      onPress={() => setCurrentStep(1)}
                    >
                      <Text style={styles.backButtonStepText}>
                        ← {language === 'fr' ? 'Précédent' : 'Previous'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.nextButton, !selectedVenue && styles.nextButtonDisabled]}
                      onPress={() => {
                        if (selectedVenue) {
                          setCurrentStep(3);
                        }
                      }}
                      disabled={!selectedVenue}
                    >
                      <Text style={styles.nextButtonText}>
                        {language === 'fr' ? 'Suivant →' : 'Next →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
  );
}
