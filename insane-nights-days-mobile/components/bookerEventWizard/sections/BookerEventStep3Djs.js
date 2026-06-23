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
import {
  emptyDjSlot,
  applyEqualDjSlotTimes,
} from '../../../utils/bookerEventWizardUtils';

export default function BookerEventStep3Djs(props) {
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
                    {language === 'fr' ? 'Étape 3 : Choisir des DJs' : 'Step 3: Choose DJs'}
                  </Text>
    
                  {!formData.date && (
                    <View style={styles.warningBox}>
                      <Text style={styles.warningText}>
                        {language === 'fr' 
                          ? '⚠️ Veuillez d\'abord sélectionner une date à l\'étape 1 pour voir les DJs disponibles.'
                          : '⚠️ Please select a date in step 1 first to see available DJs.'}
                      </Text>
                    </View>
                  )}
    
                  {formData.date && (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        {language === 'fr' 
                          ? `📅 DJs disponibles le ${new Date(eventDateTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                          : `📅 DJs available on ${new Date(eventDateTime).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                      </Text>
                    </View>
                  )}
    
                  <Text style={styles.stepDescription}>
                    {language === 'fr'
                      ? 'Pour chaque créneau : choisis un DJ, puis ajuste les heures dans la fenêtre (début → début + durée).'
                      : 'For each slot: pick a DJ, then adjust times within the event window (start → start + duration).'}
                  </Text>
    
                  {/* Liste des slots DJ */}
                  {djSlots.map((slotRow, index) => {
                    const selectedDj = slotRow.djId
                      ? availableDjs.find((dj) => dj.userId === slotRow.djId)
                      : null;
                    return (
                      <View key={slotRow.djId ? `dj-${slotRow.djId}` : `empty-slot-${index}`} style={styles.djSlotContainer}>
                        <View style={styles.djSlotHeader}>
                          <Text style={styles.djSlotLabel}>
                            {language === 'fr' ? `Créneau ${index + 1}` : `Slot ${index + 1}`}
                          </Text>
                          {djSlots.length > 1 && (
                            <TouchableOpacity
                              style={styles.removeSlotButton}
                              onPress={() => {
                                const dur = parseFloat(formData.durationHours);
                                const durOk = Number.isFinite(dur) && dur > 0 ? dur : null;
                                let newSlots = djSlots.filter((_, i) => i !== index);
                                if (newSlots.length === 0) newSlots = [emptyDjSlot()];
                                const timed = applyEqualDjSlotTimes(newSlots, formData.time, durOk);
                                setDjSlots(timed);
                              }}
                            >
                              <Text style={styles.removeSlotButtonText}>✕</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.selectButton}
                          onPress={() => {
                            const currentSlotDjId = slotRow.djId;
                            const otherSelectedDjIds = formData.djIds.filter(
                              (id) => id !== currentSlotDjId
                            );
                            navigate('selectDj', {
                              selectedDjIds: otherSelectedDjIds,
                              slotIndex: index,
                              slotIntent: currentSlotDjId ? 'replace' : 'fill',
                              isSlotMode: true,
                              returnTo: 'bookerEventDashboard',
                            });
                          }}
                        >
                          <Text style={[styles.selectButtonText, !selectedDj && styles.placeholderText]}>
                            {selectedDj
                              ? `${selectedDj.artistName} • ${language === 'fr' ? 'prix à convenir' : 'price to agree'}`
                              : language === 'fr'
                                ? 'Sélectionner un DJ'
                                : 'Select a DJ'}
                          </Text>
                          <Text style={styles.chevron}>▼</Text>
                        </TouchableOpacity>
                        {selectedDj ? (
                          <View style={styles.djSlotTimesRow}>
                            <TouchableOpacity
                              style={styles.djSlotTimeButton}
                              onPress={() => openSlotTimeField(index, 'start')}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.djSlotTimeLabel}>
                                {language === 'fr' ? 'Début' : 'Start'}
                              </Text>
                              <Text style={styles.djSlotTimeValue}>
                                {slotRow.slotStart || '—'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.djSlotTimeButton}
                              onPress={() => openSlotTimeField(index, 'end')}
                              activeOpacity={0.85}
                            >
                              <Text style={styles.djSlotTimeLabel}>
                                {language === 'fr' ? 'Fin' : 'End'}
                              </Text>
                              <Text style={styles.djSlotTimeValue}>
                                {slotRow.slotEnd || '—'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
    
                  {/* Bouton pour ajouter un slot */}
                  <TouchableOpacity
                    style={styles.addSlotButton}
                    onPress={() => {
                      setDjSlots([...djSlots, emptyDjSlot()]);
                    }}
                  >
                    <Text style={styles.addSlotButtonText}>
                      + {language === 'fr' ? 'Ajouter un créneau DJ' : 'Add DJ slot'}
                    </Text>
                  </TouchableOpacity>
    
                  {djSlots.filter((s) => s.djId).length > 0 && (
                    <View style={styles.selectedInfo}>
                      <Text style={styles.selectedInfoText}>
                        ✓ {language === 'fr' ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}:{' '}
                        {djSlots.filter((s) => s.djId).length}
                      </Text>
                    </View>
                  )}
    
                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={styles.backButtonStep}
                      onPress={() => setCurrentStep(2)}
                    >
                      <Text style={styles.backButtonStepText}>
                        ← {language === 'fr' ? 'Précédent' : 'Previous'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.nextButton,
                        djSlots.filter((s) => s.djId).length === 0 && styles.nextButtonDisabled,
                      ]}
                      onPress={() => {
                        if (djSlots.filter((s) => s.djId).length > 0) {
                          setCurrentStep(4);
                        }
                      }}
                      disabled={djSlots.filter((s) => s.djId).length === 0}
                    >
                      <Text style={styles.nextButtonText}>
                        {language === 'fr' ? 'Suivant →' : 'Next →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
  );
}
