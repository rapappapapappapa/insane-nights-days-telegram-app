import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxText } from '../../nox';
import Colors from '../../../constants/colors';
import TierSaleDateField, { parseFrDate } from '../TierSaleDateField';

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
    venueStops,
    removeExtraTicketTier,
    saveRentalCatalogToProfile,
    pickCoverImage,
    handleCreateEvent,
    selectedVenue,
    coverImageUri,
    setCoverImageUri,
    navigate,
    hasBookerEventTitle,
    hasBookerEventPrice,
  } = props;

  const saleMinDate = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  })();
  const eventDay = (() => {
    const src = eventDateTime || (formData.date ? new Date(formData.date) : null);
    if (!src || Number.isNaN(src.getTime())) return null;
    return new Date(src.getFullYear(), src.getMonth(), src.getDate());
  })();
  const itineraryStops = (venueStops || []).filter((s) => s.venueId);
  const isItinerary = itineraryStops.length > 1;
  const venueLabel = (id) => (venues || []).find((v) => v.id === id)?.venueName || '—';
  const tierCoversAll = (row) =>
    !Array.isArray(row.venueIds) ||
    row.venueIds.length === 0 ||
    itineraryStops.every((s) => row.venueIds.includes(s.venueId));
  const toggleTierVenue = (idx, row, venueId) => {
    const current = tierCoversAll(row) ? [] : row.venueIds.filter((v) => itineraryStops.some((s) => s.venueId === v));
    const next = current.includes(venueId) ? current.filter((v) => v !== venueId) : [...current, venueId];
    updateExtraTicketTier(idx, 'venueIds', next.length === itineraryStops.length ? [] : next);
  };
  const renderTierChip = (key, label, active, onPress) => (
    <TouchableOpacity
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? Colors.primary : Colors.borderSubtle,
        backgroundColor: active ? 'rgba(40,82,232,0.25)' : 'transparent',
      }}
    >
      <Text style={{ color: active ? Colors.text : Colors.textSecondary, fontSize: 13 }}>{label}</Text>
    </TouchableOpacity>
  );

  const [tiersOpen, setTiersOpen] = useState(() =>
    (formData.extraTicketTiers || []).some(
      (row) => String(row?.label || '').trim() || String(row?.price ?? '').trim()
    )
  );
  const [gearOpen, setGearOpen] = useState(() => !!formData.equipmentRentalEnabled);

  return (
<>
                  <NoxText variant="title" style={styles.sectionTitle}>
                    {language === 'fr' ? 'Les détails' : 'The details'}
                  </NoxText>

                  <View style={styles.wizardBlock}>
                  <NoxText style={styles.wizardBlockTitle}>
                    {language === 'fr' ? 'Affiche' : 'Poster'}
                  </NoxText>
    
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
    
                  </View>

                  <View style={styles.wizardBlock}>
                  <NoxText style={styles.wizardBlockTitle}>
                    {language === 'fr' ? 'Billets' : 'Tickets'}
                  </NoxText>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      {language === 'fr' ? 'Prix de la place' : 'Ticket price'} (€)
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
                      {isItinerary
                        ? language === 'fr'
                          ? 'Prix TTC du pass toute la soirée (tous les lieux). Ajoute un tarif pour vendre une seule partie.'
                          : 'Price incl. VAT of the full-night pass (all venues). Add a tier to sell a single part.'
                        : language === 'fr'
                          ? 'Prix TTC du billet standard. Le cachet DJ se signe dans le contrat.'
                          : 'Standard ticket price incl. VAT. The DJ fee is set in the contract.'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.discloseRow}
                    onPress={() => setTiersOpen((open) => !open)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.discloseAction}>
                      {tiersOpen
                        ? language === 'fr'
                          ? 'Masquer les autres tarifs'
                          : 'Hide other tiers'
                        : language === 'fr'
                          ? 'Ajouter des tarifs'
                          : 'Add ticket tiers'}
                    </Text>
                    <Ionicons
                      name={tiersOpen ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.primaryLight}
                    />
                  </TouchableOpacity>

                  {tiersOpen ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.subsectionLabel}>
                      {language === 'fr' ? 'Autres tarifs (optionnel)' : 'Other ticket tiers (optional)'}
                    </Text>
                    <Text style={styles.helperText}>
                      {language === 'fr'
                        ? 'Pour chaque ligne : nom du billet (ex. early bird), prix TTC en euros, quota max optionnel, et fenêtre de vente optionnelle (phases : early bird → standard → last minute).'
                        : 'Per row: tier name (e.g. early bird), price incl. VAT, optional max tickets, optional sale window (phases: early bird → standard → last minute).'}
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
                        <View style={[styles.equipRow, { marginTop: 8, marginBottom: 0 }]}>
                          <TierSaleDateField
                            styles={styles}
                            language={language}
                            label={language === 'fr' ? 'Début de vente' : 'Sale start'}
                            placeholder={language === 'fr' ? 'Dès maintenant' : 'Right away'}
                            value={row.saleStart}
                            onChange={(v) => updateExtraTicketTier(idx, 'saleStart', v)}
                            minimumDate={saleMinDate}
                            maximumDate={parseFrDate(row.saleEnd) || eventDay || undefined}
                          />
                          <TierSaleDateField
                            styles={styles}
                            language={language}
                            label={language === 'fr' ? 'Fin de vente' : 'Sale end'}
                            placeholder={language === 'fr' ? "Jusqu'à l'événement" : 'Until the event'}
                            value={row.saleEnd}
                            onChange={(v) => updateExtraTicketTier(idx, 'saleEnd', v)}
                            minimumDate={parseFrDate(row.saleStart) || saleMinDate}
                            maximumDate={eventDay || undefined}
                            containerStyle={{ marginLeft: 8 }}
                          />
                        </View>
                        {isItinerary ? (
                          <View style={{ marginTop: 10 }}>
                            <Text style={styles.helperText}>
                              {language === 'fr' ? 'Valable pour' : 'Valid for'}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                              {renderTierChip(
                                `all-${idx}`,
                                language === 'fr' ? 'Toute la soirée' : 'Whole night',
                                tierCoversAll(row),
                                () => updateExtraTicketTier(idx, 'venueIds', [])
                              )}
                              {itineraryStops.map((stop, stopIdx) =>
                                renderTierChip(
                                  `${idx}-${stop.venueId}`,
                                  `${stopIdx + 1}. ${venueLabel(stop.venueId)}`,
                                  !tierCoversAll(row) && row.venueIds.includes(stop.venueId),
                                  () => toggleTierVenue(idx, row, stop.venueId)
                                )
                              )}
                            </View>
                          </View>
                        ) : null}
                      </View>
                    ))}
                    <TouchableOpacity style={styles.saveCatalogBtn} onPress={addExtraTicketTier}>
                      <Text style={styles.saveCatalogBtnText}>
                        {language === 'fr' ? '+ Ajouter un tarif' : '+ Add ticket tier'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  ) : null}
    
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
                  </View>


                  <View style={styles.wizardBlock}>
                  <TouchableOpacity
                    style={styles.discloseRow}
                    onPress={() => setGearOpen((open) => !open)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.discloseLabel}>
                      {language === 'fr' ? 'Matériel' : 'Equipment'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={styles.discloseAction}>
                        {gearOpen
                          ? language === 'fr'
                            ? 'Masquer'
                            : 'Hide'
                          : language === 'fr'
                            ? 'Proposer du matériel'
                            : 'Offer equipment'}
                      </Text>
                      <Ionicons
                        name={gearOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={Colors.primaryLight}
                      />
                    </View>
                  </TouchableOpacity>
                  {gearOpen ? (
                  <>
                  <NoxText variant="secondary" style={styles.helperText}>
                    {language === 'fr'
                      ? 'Catalogue NOX + ton matériel enregistré. Rien n’est facturé automatiquement ici — à préciser avec les prestataires / lieu.'
                      : 'NOX catalog + your saved gear. Nothing is billed here — clarify with vendors / venue.'}
                  </NoxText>
    
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
                  </>
                  ) : null}
    
                  </View>

                </>
  );
}
