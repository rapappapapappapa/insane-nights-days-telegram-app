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
import { summarizeEquipmentRentalBlurb, djSlotsToFormDjFields } from '../../../utils/bookerEventWizardUtils';
import { ticketPricingBreakdown, NOX_COMMISSION_RATE, TVA_RATE } from '../../../utils/ticketPricingUtils';

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
    coverImageUri,
    navigate,
    hasBookerEventTitle,
    hasBookerEventPrice,
  } = props;

  const djSummary = djSlotsToFormDjFields(djSlots);

  return (
<>
                  <Text style={styles.sectionTitle}>
                    {language === 'fr' ? 'Étape 5 : Récapitulatif' : 'Step 5: Summary'}
                  </Text>
                  <Text style={styles.stepDescription}>
                    {language === 'fr'
                      ? 'Aucun paiement Stripe n’est demandé ici : tu confirmes la création de l’événement ; les montants définitifs passent par les contrats (chat).'
                      : 'No Stripe payment here: you confirm event creation; final amounts are set via contracts (chat).'}
                  </Text>
    
                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>
                      {language === 'fr' ? 'Récapitulatif de l\'événement' : 'Event Summary'}
                    </Text>
    
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

                    {(() => {
                      const b = ticketPricingBreakdown(formData.price);
                      if (!b) return null;
                      const tvaPct = Math.round(TVA_RATE * 100);
                      const comPct = Math.round(NOX_COMMISSION_RATE * 100);
                      return (
                        <View style={styles.summarySection}>
                          <Text style={styles.summaryLabel}>
                            {language === 'fr'
                              ? `TVA & commission Nox (indicatif, billet standard)`
                              : `VAT & Nox fee (indicative, standard ticket)`}
                          </Text>
                          <Text style={styles.summaryValue}>
                            {language === 'fr'
                              ? `Prix public TTC : ${b.ttc} € (HT ${b.ht} € + TVA ${tvaPct} % ${b.tva} €)`
                              : `Public price incl. VAT: ${b.ttc} € (excl. ${b.ht} € + VAT ${tvaPct}% ${b.tva} €)`}
                          </Text>
                          <Text style={styles.summaryValue}>
                            {language === 'fr'
                              ? `Commission Nox ${comPct} % : −${b.commission} € / billet`
                              : `Nox fee ${comPct}%: −${b.commission} € / ticket`}
                          </Text>
                          <Text style={styles.summaryValue}>
                            {language === 'fr'
                              ? `Reversement estimé : ${b.netOrganizer} € / billet`
                              : `Estimated payout: ${b.netOrganizer} € / ticket`}
                          </Text>
                          <Text style={styles.summarySubValue}>
                            {language === 'fr'
                              ? 'La commission est déduite du reversement organisateur — le prix payé par l\'acheteur ne change pas.'
                              : 'The fee is deducted from the organizer payout — the buyer price does not change.'}
                          </Text>
                        </View>
                      );
                    })()}
    
                    {selectedVenue && (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'Lieu' : 'Venue'}
                        </Text>
                        <Text style={styles.summaryValue}>{selectedVenue.venueName}</Text>
                        <Text style={styles.summarySubValue}>{selectedVenue.address}</Text>
                      </View>
                    )}
    
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
                      <Text style={styles.summarySubValue}>
                        {language === 'fr'
                          ? 'Indicatif uniquement — pas de paiement en ligne pour la location ici.'
                          : 'Indicative only — no online rental payment here.'}
                      </Text>
                    </View>
    
                    <View style={styles.costBreakdown}>
                      <Text style={styles.costTitle}>
                        {language === 'fr' ? 'Détail des coûts (indicatif)' : 'Cost breakdown (indicative)'}
                      </Text>
                      <Text style={styles.costDisclaimer}>
                        {language === 'fr'
                          ? 'Les montants affichés pour le lieu sont une estimation (notamment à partir de la note) — ce n’est pas un devis contractuel. Le cachet DJ et les conditions réelles sont fixés dans les contrats NOX.'
                          : 'Venue amounts shown are an estimate (including from ratings)—not a binding quote. DJ fees and final terms are set in NOX contracts.'}
                      </Text>
    
                      {selectedVenue && (
                        <View style={styles.costRow}>
                          <Text style={styles.costLabel}>
                            {language === 'fr' ? 'Lieu' : 'Venue'} ({selectedVenue.venueName})
                          </Text>
                          <Text style={styles.costValue}>
                            {(() => {
                              const venueBase = typeof selectedVenue.averageRatingGlobal === 'number'
                                ? 50 + selectedVenue.averageRatingGlobal * 10
                                : 50;
                              return `${Math.round(venueBase)} €`;
                            })()}
                          </Text>
                        </View>
                      )}
    
                      <View style={styles.costRow}>
                        <Text style={styles.costLabel}>
                          {language === 'fr' ? 'DJs' : 'DJs'}
                        </Text>
                        <Text style={styles.costValue}>
                          {language === 'fr' ? 'Prix à convenir (contrat)' : 'Price to agree (contract)'}
                        </Text>
                      </View>
    
                      <View style={styles.costTotal}>
                        <Text style={styles.costTotalLabel}>
                          {language === 'fr' ? 'Total' : 'Total'}
                        </Text>
                        <Text style={styles.costTotalValue}>
                          {formData.price ? `${formData.price} €` : (language === 'fr' ? 'À définir' : 'To define')}
                        </Text>
                      </View>
                    </View>
                  </View>
    
                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={styles.backButtonStep}
                      onPress={() => setCurrentStep(4)}
                    >
                      <Text style={styles.backButtonStepText}>
                        ← {language === 'fr' ? 'Précédent' : 'Previous'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.createButton, creating && styles.createButtonDisabled]}
                      onPress={handleCreateEvent}
                      disabled={creating || !hasBookerEventTitle(formData) || !hasBookerEventPrice(formData)}
                    >
                      {creating ? (
                        <ActivityIndicator color={Colors.background} />
                      ) : (
                        <Text style={styles.createButtonText}>
                          {language === 'fr' ? 'Confirmer et créer l\'événement' : 'Confirm and create event'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
  );
}
