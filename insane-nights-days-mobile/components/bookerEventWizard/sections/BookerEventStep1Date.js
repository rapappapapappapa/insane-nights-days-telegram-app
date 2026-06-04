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

export default function BookerEventStep1Date(props) {
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
                    {language === 'fr' ? 'Étape 1 : Date et durée' : 'Step 1: Date and duration'}
                  </Text>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Date' : 'Date'} *
                    </Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={openDatePicker}
                    >
                      <Text style={[styles.selectButtonText, !formData.date && styles.placeholderText]}>
                        {formData.date
                          ? new Date(eventDateTime).toLocaleDateString(
                              language === 'fr' ? 'fr-FR' : 'en-US',
                              { day: '2-digit', month: '2-digit', year: 'numeric' }
                            )
                          : language === 'fr'
                          ? 'Choisir une date'
                          : 'Choose a date'}
                      </Text>
                      <Text style={styles.chevron}>📅</Text>
                    </TouchableOpacity>
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Heure de début' : 'Start time'} *
                    </Text>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={openTimePicker}
                    >
                      <Text style={[styles.selectButtonText, !formData.time && styles.placeholderText]}>
                        {formData.time
                          ? formData.time
                          : language === 'fr'
                          ? 'Choisir une heure'
                          : 'Choose a time'}
                      </Text>
                      <Text style={styles.chevron}>⏰</Text>
                    </TouchableOpacity>
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Durée de la soirée (heures)' : 'Event duration (hours)'} *
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={language === 'fr' ? 'Ex: 4' : 'Ex: 4'}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={formData.durationHours}
                      onChangeText={(value) => handleChange('durationHours', value)}
                    />
                  </View>
    
                  <TouchableOpacity
                    style={[styles.nextButton, (!formData.date || !formData.time || !formData.durationHours) && styles.nextButtonDisabled]}
                    onPress={() => {
                      if (formData.date && formData.time && formData.durationHours) {
                        setCurrentStep(2);
                      }
                    }}
                    disabled={!formData.date || !formData.time || !formData.durationHours}
                  >
                    <Text style={styles.nextButtonText}>
                      {language === 'fr' ? 'Suivant →' : 'Next →'}
                    </Text>
                  </TouchableOpacity>
                </>
  );
}
