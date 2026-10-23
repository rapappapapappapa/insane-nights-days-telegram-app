import React from 'react';
import { Text, View, Image } from 'react-native';
import { NoxText } from '../../nox';
import { summarizeEquipmentRentalBlurb, djSlotsToFormDjFields } from '../../../utils/bookerEventWizardUtils';

export default function BookerEventStep5Summary(props) {
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
    venueStops,
    coverImageUri,
    navigate,
    hasBookerEventTitle,
    hasBookerEventPrice,
  } = props;

  const djSummary = djSlotsToFormDjFields(djSlots);

  return (
<>
                  <NoxText variant="title" style={styles.sectionTitle}>
                    {language === 'fr' ? 'Ça donne ça' : 'Here is the event'}
                  </NoxText>
                  <NoxText variant="secondary" style={styles.stepDescription}>
                    {language === 'fr'
                      ? 'Aucun paiement Stripe n’est demandé ici : tu confirmes la création de l’événement ; les montants définitifs passent par les contrats (chat).'
                      : 'No Stripe payment here: you confirm event creation; final amounts are set via contracts (chat).'}
                  </NoxText>
    
                  <View style={styles.summaryCard}>
                    {coverImageUri ? (
                      <Image source={{ uri: coverImageUri }} style={styles.summaryCover} />
                    ) : null}
                    <Text style={styles.summaryTitle}>{formData.title}</Text>
    
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Titre' : 'Title'}
                      </Text>
                      <Text style={styles.summaryValue}>{formData.title}</Text>
                    </View>
    
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Date et heure' : 'Date and time'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formData.date && new Date(eventDateTime).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                          { day: '2-digit', month: '2-digit', year: 'numeric' }
                        )} {formData.time}
                      </Text>
                    </View>
    
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Durée' : 'Duration'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formData.durationHours} {language === 'fr' ? 'heures' : 'hours'}
                      </Text>
                    </View>
    
                    {(formData.extraTicketTiers || []).some((x) => String(x?.label || '').trim()) ? (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'Tarifs entrée (billets)' : 'Admission tiers'}
                        </Text>
                        <Text style={styles.summaryValue}>
                          • {language === 'fr' ? 'Standard : ' : 'Standard: '}{formData.price ? `${formData.price} €` : '—'}
                        </Text>
                        {(formData.extraTicketTiers || []).map((row, idx) =>
                          row?.label?.trim() ? (
                            <Text key={`su-${idx}`} style={styles.summaryValue}>
                              • {row.label}
                              {row.price ? ` · ${row.price} €` : ''}
                              {row.maxSold ? ` (max ${row.maxSold})` : ''}
                              {String(row.saleStart || '').trim()
                                ? language === 'fr'
                                  ? ` · dès le ${String(row.saleStart).trim()}`
                                  : ` · from ${String(row.saleStart).trim()}`
                                : ''}
                              {String(row.saleEnd || '').trim()
                                ? language === 'fr'
                                  ? ` · jusqu'au ${String(row.saleEnd).trim()}`
                                  : ` · until ${String(row.saleEnd).trim()}`
                                : ''}
                            </Text>
                          ) : null
                        )}
                      </View>
                    ) : null}

                    {venueStops?.length > 1 ? (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'Parcours' : 'Itinerary'}
                        </Text>
                        {venueStops.map((stop, i) => {
                          const v = venues.find((x) => x.id === stop.venueId);
                          return (
                            <View key={`${stop.venueId}-${i}`} style={{ marginBottom: 6 }}>
                              <Text style={styles.summaryValue}>
                                {i + 1}. {v?.venueName || '—'}
                                {stop.slotStart && stop.slotEnd ? `  (${stop.slotStart} – ${stop.slotEnd})` : ''}
                              </Text>
                              {v?.address ? <Text style={styles.summarySubValue}>{v.address}</Text> : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : selectedVenue ? (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'Lieu' : 'Venue'}
                        </Text>
                        <Text style={styles.summaryValue}>{selectedVenue.venueName}</Text>
                        <Text style={styles.summarySubValue}>{selectedVenue.address}</Text>
                      </View>
                    ) : null}
    
                    {djSummary.djIds.length > 0 && (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'DJs et créneaux' : 'DJs and time slots'}
                        </Text>
                        {djSummary.djIds.map((id, i) => {
                          const dj = availableDjs.find((d) => d.userId === id);
                          const a = djSummary.djSlotAssignments?.[i];
                          return (
                            <Text key={id} style={styles.summaryValue}>
                              • {dj?.artistName || id}
                              {a?.slotStart && a?.slotEnd
                                ? `  (${a.slotStart} – ${a.slotEnd})`
                                : ''}
                            </Text>
                          );
                        })}
                      </View>
                    )}
    
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Location de matériel' : 'Equipment rental'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {summarizeEquipmentRentalBlurb(formData, rentalPresets, language) ||
                          (language === 'fr' ? 'Non proposée sur cette fête.' : 'Not offered for this event.')}
                      </Text>
                    </View>

                    <Text style={styles.summarySubValue}>
                      {language === 'fr'
                        ? 'Les prix fermes (lieu, DJ, commission) se signent dans le contrat.'
                        : 'Firm prices (venue, DJ, fee) are set in the contract.'}
                    </Text>
                  </View>
                </>
  );
}
