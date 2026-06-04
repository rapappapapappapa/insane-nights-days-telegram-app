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

export default function BookerEventStep4Details(props) {
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
                    {language === 'fr' ? 'Étape 4 : Détails' : 'Step 4: Details'}
                  </Text>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Titre de l\'événement' : 'Event title'} *
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={language === 'fr' ? 'Ex: Soirée Techno Underground' : 'Ex: Underground Techno Night'}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={formData.title}
                      onChangeText={(value) => handleChange('title', value)}
                    />
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'prix de la place' : 'price of the place'} (€)
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={formData.price}
                      onChangeText={(value) => handleChange('price', value)}
                    />
                    <Text style={styles.helperText}>
                      {language === 'fr'
                        ? 'Le prix DJ sera fixé via un contrat (chat privé). Tu peux proposer plusieurs tarifs entrée : le montant ci‑dessus est le palier standard (« general ») ; ajoute les autres sous « autres tarifs ».'
                        : 'DJ fee is set via contract (private chat). You can offer several admission tiers: the amount above is the standard (« general ») tier; add more under « other tiers ».'}
                    </Text>
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.subsectionLabel}>
                      {language === 'fr' ? 'Autres tarifs (optionnel)' : 'Other ticket tiers (optional)'}
                    </Text>
                    <Text style={styles.helperText}>
                      {language === 'fr'
                        ? 'Pour chaque ligne : nom du billet (ex. early bird), prix en euros, quota max optionnel.'
                        : 'Per row: tier name (e.g. early bird), price in EUR, optional max tickets.'}
                    </Text>
                    {(formData.extraTicketTiers || []).map((row, idx) => (
                      <View key={`extratier-${idx}`} style={{ marginBottom: 12 }}>
                        <View style={[styles.equipRow, { marginBottom: 0 }]}>
                          <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder={
                              language === 'fr'
                                ? 'Libellé (ex. early bird)'
                                : 'Label (e.g. early bird)'
                            }
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={row.label || ''}
                            onChangeText={(v) => updateExtraTicketTier(idx, 'label', v)}
                          />
                          <TextInput
                            style={[styles.input, { width: 72, marginLeft: 8 }]}
                            placeholder="€"
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            keyboardType="numeric"
                            value={String(row.price ?? '')}
                            onChangeText={(v) => updateExtraTicketTier(idx, 'price', v)}
                          />
                          <TouchableOpacity
                            style={styles.equipMiniBtn}
                            onPress={() => removeExtraTicketTier(idx)}
                            accessibilityRole="button"
                            accessibilityLabel={
                              language === 'fr' ? `Supprimer le tarif ${idx + 1}` : `Remove tier ${idx + 1}`
                            }
                          >
                            <Text style={styles.equipMiniBtnText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={[styles.input, { marginTop: 8 }]}
                          placeholder={
                            language === 'fr' ? 'Quota max pour ce tarif (vide = illimité)' : 'Max tickets for this tier (empty = unlimited)'
                          }
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          keyboardType="numeric"
                          value={String(row.maxSold ?? '')}
                          onChangeText={(v) => updateExtraTicketTier(idx, 'maxSold', v)}
                        />
                      </View>
                    ))}
                    <TouchableOpacity style={styles.saveCatalogBtn} onPress={addExtraTicketTier}>
                      <Text style={styles.saveCatalogBtnText}>
                        {language === 'fr' ? '+ Ajouter un tarif' : '+ Add ticket tier'}
                      </Text>
                    </TouchableOpacity>
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Capacité' : 'Capacity'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="200"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      keyboardType="numeric"
                      value={formData.capacity}
                      onChangeText={(value) => handleChange('capacity', value)}
                    />
                    {selectedVenue?.maxCapacity != null ? (
                      <Text style={styles.helperText}>
                        {language === 'fr'
                          ? `Plafond indiqué par le lieu : ${selectedVenue.maxCapacity} places (la création sera refusée au-delà).`
                          : `Venue limit: ${selectedVenue.maxCapacity} guests (creation will be blocked above that).`}
                      </Text>
                    ) : null}
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Genre musical' : 'Music genre'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder={language === 'fr' ? 'Ex: Techno, House, Electro' : 'Ex: Techno, House, Electro'}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={formData.genre}
                      onChangeText={(value) => handleChange('genre', value)}
                    />
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Description' : 'Description'}
                    </Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder={language === 'fr' ? 'Description de l\'événement...' : 'Event description...'}
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      multiline
                      numberOfLines={4}
                      value={formData.description}
                      onChangeText={(value) => handleChange('description', value)}
                    />
                  </View>
    
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Image de couverture (optionnel)' : 'Cover image (optional)'}
                    </Text>
                    {coverImageUri ? (
                      <View style={styles.coverPreviewRow}>
                        <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
                        <TouchableOpacity
                          style={[styles.coverRemoveBtn, { marginLeft: 12 }]}
                          onPress={() => setCoverImageUri(null)}
                        >
                          <Text style={styles.coverRemoveBtnText}>
                            {language === 'fr' ? 'Retirer' : 'Remove'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.selectButton} onPress={pickCoverImage}>
                        <Text style={styles.selectButtonText}>
                          {language === 'fr' ? 'Choisir une image' : 'Choose image'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
    
                  <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
                    {language === 'fr' ? 'Location de matériel (optionnel)' : 'Equipment rental (optional)'}
                  </Text>
                  <Text style={styles.helperText}>
                    {language === 'fr'
                      ? 'Catalogue NOX + ton matériel enregistré. Rien n’est facturé automatiquement ici — à préciser avec les prestataires / lieu.'
                      : 'NOX catalog + your saved gear. Nothing is billed here — clarify with vendors / venue.'}
                  </Text>
    
                  <TouchableOpacity
                    style={styles.equipToggleRow}
                    onPress={() =>
                      handleChange('equipmentRentalEnabled', !formData.equipmentRentalEnabled)
                    }
                    activeOpacity={0.85}
                  >
                    <View style={[styles.toggle, formData.equipmentRentalEnabled && styles.toggleActive]}>
                      <View
                        style={[
                          styles.toggleThumb,
                          formData.equipmentRentalEnabled && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                    <Text style={styles.equipToggleLabel}>
                      {formData.equipmentRentalEnabled
                        ? language === 'fr'
                          ? 'Location proposée sur cette fête'
                          : 'Rental offered for this event'
                        : language === 'fr'
                          ? 'Pas de location listée'
                          : 'No rental listed'}
                    </Text>
                  </TouchableOpacity>
    
                  {formData.equipmentRentalEnabled ? (
                    <>
                      <Text style={styles.subsectionLabel}>
                        {language === 'fr' ? 'Matériel NOX (présélection)' : 'NOX preset packages'}
                      </Text>
                      <View style={styles.equipChipWrap}>
                        {rentalPresets.map((p) => {
                          const active = (formData.equipmentRentalPresetIds || []).includes(p.id);
                          return (
                            <TouchableOpacity
                              key={p.id}
                              style={[styles.equipChip, active && styles.equipChipActive]}
                              onPress={() => toggleEquipmentPreset(p.id)}
                            >
                              <Text style={[styles.equipChipText, active && styles.equipChipTextActive]}>
                                {p.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
    
                      <Text style={styles.subsectionLabel}>
                        {language === 'fr' ? 'Mon catalogue (réutilisable)' : 'My reusable catalog'}
                      </Text>
                      <View style={styles.equipRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder={language === 'fr' ? 'Article…' : 'Item…'}
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={rentalCatalogLabel}
                          onChangeText={setRentalCatalogLabel}
                        />
                        <TextInput
                          style={[styles.input, { width: 56, marginLeft: 8 }]}
                          placeholder="×1"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          keyboardType="numeric"
                          value={rentalCatalogQty}
                          onChangeText={setRentalCatalogQty}
                        />
                        <TouchableOpacity style={styles.equipMiniBtn} onPress={addCatalogRow}>
                          <Text style={styles.equipMiniBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      {rentalCatalogItems.map((it) => (
                        <View key={it.id} style={styles.equipCatalogRow}>
                          <Text style={styles.equipCatalogText}>
                            {it.label} ×{it.qty}
                          </Text>
                          <TouchableOpacity onPress={() => removeCatalogRow(it.id)}>
                            <Text style={styles.equipRemoveText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        style={[styles.saveCatalogBtn, savingRentalCatalog && { opacity: 0.6 }]}
                        onPress={saveRentalCatalogToProfile}
                        disabled={savingRentalCatalog}
                      >
                        <Text style={styles.saveCatalogBtnText}>
                          {savingRentalCatalog
                            ? language === 'fr'
                              ? 'Enregistrement…'
                              : 'Saving…'
                            : language === 'fr'
                              ? 'Enregistrer mon catalogue sur le profil'
                              : 'Save catalog to profile'}
                        </Text>
                      </TouchableOpacity>
    
                      <Text style={styles.subsectionLabel}>
                        {language === 'fr'
                          ? 'Inclure du matériel pour cet événement'
                          : 'Include gear for this event'}
                      </Text>
                      <View style={styles.equipChipWrap}>
                        {rentalCatalogItems.map((it) => {
                          const lines = formData.equipmentRentalOrganizerLines || [];
                          const active = lines.some(
                            (l) =>
                              String(l.label).trim() === String(it.label).trim() &&
                              Number(l.qty || 1) === Number(it.qty || 1)
                          );
                          return (
                            <TouchableOpacity
                              key={it.id}
                              style={[styles.equipChip, active && styles.equipChipActive]}
                              onPress={() => toggleOrganizerLineFromCatalog(it)}
                            >
                              <Text style={[styles.equipChipText, active && styles.equipChipTextActive]}>
                                {it.label} ×{it.qty}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
    
                      <Text style={styles.subsectionLabel}>
                        {language === 'fr' ? 'Ligne ponctuelle (seulement cet événement)' : 'One-off line (this event only)'}
                      </Text>
                      <View style={styles.equipRow}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder={language === 'fr' ? 'Ex. projecteur…' : 'e.g. projector…'}
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          value={eventRentalExtraLabel}
                          onChangeText={setEventRentalExtraLabel}
                        />
                        <TextInput
                          style={[styles.input, { width: 56, marginLeft: 8 }]}
                          placeholder="×1"
                          placeholderTextColor="rgba(255,255,255,0.4)"
                          keyboardType="numeric"
                          value={eventRentalExtraQty}
                          onChangeText={setEventRentalExtraQty}
                        />
                        <TouchableOpacity style={styles.equipMiniBtn} onPress={addEventOnlyEquipmentLine}>
                          <Text style={styles.equipMiniBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
    
                      {(formData.equipmentRentalOrganizerLines || []).length > 0 ? (
                        <View style={{ marginTop: 8 }}>
                          <Text style={styles.subsectionLabel}>
                            {language === 'fr' ? 'Sélection événement' : 'Event selection'}
                          </Text>
                          {(formData.equipmentRentalOrganizerLines || []).map((l, idx) => (
                            <View key={`${l.label}-${idx}`} style={styles.equipCatalogRow}>
                              <Text style={styles.equipCatalogText}>
                                {l.label} ×{l.qty || 1}
                              </Text>
                              <TouchableOpacity onPress={() => removeOrganizerLineAt(idx)}>
                                <Text style={styles.equipRemoveText}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : null}
    
                      <Text style={styles.subsectionLabel}>{language === 'fr' ? 'Notes' : 'Notes'}</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder={language === 'fr' ? 'Modalités, retrait, caution…' : 'Terms, pickup, deposit…'}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        value={formData.equipmentRentalNotes}
                        onChangeText={(v) => handleChange('equipmentRentalNotes', v)}
                      />
                    </>
                  ) : null}
    
                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={styles.backButtonStep}
                      onPress={() => setCurrentStep(3)}
                    >
                      <Text style={styles.backButtonStepText}>
                        ← {language === 'fr' ? 'Précédent' : 'Previous'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.nextButton,
                        (!hasBookerEventTitle(formData) || !hasBookerEventPrice(formData)) && styles.nextButtonDisabled,
                      ]}
                      onPress={() => {
                        if (hasBookerEventTitle(formData) && hasBookerEventPrice(formData)) {
                          setCurrentStep(5);
                        }
                      }}
                      disabled={!hasBookerEventTitle(formData) || !hasBookerEventPrice(formData)}
                    >
                      <Text style={styles.nextButtonText}>
                        {language === 'fr' ? 'Suivant →' : 'Next →'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
  );
}
