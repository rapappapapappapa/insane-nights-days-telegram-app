import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

const DAY_KEYS = ['M', 'Ma', 'Me', 'J', 'V', 'S', 'D'];

export const DEFAULT_AVAILABLE_DAYS = {
  M: true,
  Ma: true,
  Me: true,
  J: true,
  V: true,
  S: false,
  D: false,
};

export function getPresetGenreLabels(language) {
  const fr = language === 'fr';
  return [
    { id: 'photographe', label: fr ? 'Photographe' : 'Photographer' },
    { id: 'videaste', label: fr ? 'Vidéaste' : 'Videographer' },
    { id: 'vj', label: fr ? 'VJ / VDJ' : 'VJ / VDJ' },
    { id: 'eclairage', label: fr ? 'Éclairagiste' : 'Lighting' },
    { id: 'son', label: fr ? 'Sonorisation' : 'Sound / PA' },
    { id: 'streaming', label: fr ? 'Streaming live' : 'Live streaming' },
    { id: 'drone', label: fr ? 'Drone' : 'Drone' },
    { id: 'graphiste', label: fr ? 'Graphiste / branding' : 'Graphic / branding' },
    { id: 'decor', label: fr ? 'Décoration / scénographie' : 'Decor / staging' },
    { id: 'animation', label: fr ? 'Animation / MC' : 'Hosting / MC' },
  ];
}

/** Compare trimmed lowercase */
export function genresIncludePreset(selectedGenres, presetLabel) {
  const t = presetLabel.trim().toLowerCase();
  return selectedGenres.some((g) => String(g).trim().toLowerCase() === t);
}

export default function PrestataireGenreAndAvailabilityFields({
  language,
  prestationGenres,
  onChangePrestationGenres,
  availableDays,
  onChangeAvailableDays,
  availableStatus,
  onChangeAvailableStatus,
  customGenreInput,
  onChangeCustomGenreInput,
  onAddCustomGenre,
}) {
  const presets = getPresetGenreLabels(language);

  const togglePreset = (label) => {
    const t = label.trim().toLowerCase();
    const has = prestationGenres.some((g) => String(g).trim().toLowerCase() === t);
    if (has) {
      onChangePrestationGenres(prestationGenres.filter((g) => String(g).trim().toLowerCase() !== t));
    } else {
      onChangePrestationGenres([...prestationGenres, label.trim()]);
    }
  };

  const removeGenre = (label) => {
    const t = String(label).trim().toLowerCase();
    onChangePrestationGenres(prestationGenres.filter((g) => String(g).trim().toLowerCase() !== t));
  };

  const toggleDay = (day) => {
    onChangeAvailableDays({ ...availableDays, [day]: !availableDays[day] });
  };

  return (
    <>
      <Text style={styles.sectionTitle}>{language === 'fr' ? 'GENRES DE PRESTATION' : 'SERVICE TYPES'}</Text>
      <Text style={styles.hint}>
        {language === 'fr'
          ? 'Sélectionnez au moins un genre (vous pouvez en cumuler plusieurs).'
          : 'Pick at least one type (you can combine several).'}
      </Text>
      <View style={styles.chipWrap}>
        {presets.map((p) => {
          const active = genresIncludePreset(prestationGenres, p.label);
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => togglePreset(p.label)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.label}>{language === 'fr' ? 'Autre (personnaliser)' : 'Other (custom)'}</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={customGenreInput}
          onChangeText={onChangeCustomGenreInput}
          placeholder={language === 'fr' ? 'Ex. maquilleuse, catering…' : 'e.g. makeup, catering…'}
          placeholderTextColor="rgba(255,255,255,0.4)"
          onSubmitEditing={onAddCustomGenre}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onAddCustomGenre}>
          <Text style={styles.addBtnText}>{language === 'fr' ? 'Ajouter' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
      {prestationGenres.length > 0 ? (
        <View style={styles.selectedWrap}>
          <Text style={styles.label}>{language === 'fr' ? 'Sélection actuelle' : 'Current selection'}</Text>
          <View style={styles.chipWrap}>
            {prestationGenres.map((g, idx) => (
              <TouchableOpacity key={`${g}-${idx}`} style={styles.tag} onPress={() => removeGenre(g)}>
                <Text style={styles.tagText}>{g} ✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
        {language === 'fr' ? 'DISPONIBILITÉS' : 'AVAILABILITY'}
      </Text>
      <Text style={styles.hint}>
        {language === 'fr'
          ? 'Choisissez les jours où vous acceptez les demandes de réservation.'
          : 'Choose the days when you accept booking requests.'}
      </Text>
      <View style={styles.daysContainer}>
        {DAY_KEYS.map((day) => (
          <TouchableOpacity
            key={day}
            style={[styles.dayButton, availableDays[day] && styles.dayButtonActive]}
            onPress={() => toggleDay(day)}
          >
            <Text style={[styles.dayButtonText, availableDays[day] && styles.dayButtonTextActive]}>{day}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.label}>{language === 'fr' ? 'Statut' : 'Status'}</Text>
        <TouchableOpacity
          style={[styles.toggle, availableStatus && styles.toggleActive]}
          onPress={() => onChangeAvailableStatus(!availableStatus)}
        >
          <View style={[styles.toggleThumb, availableStatus && styles.toggleThumbActive]} />
        </TouchableOpacity>
      </View>
      <Text style={styles.statusText}>
        {availableStatus
          ? language === 'fr'
            ? 'Disponible pour les invitations organisateurs'
            : 'Available for organizer invitations'
          : language === 'fr'
            ? 'Indisponible — vous n’apparaissez pas dans la liste booker'
            : 'Unavailable — hidden from organizer search'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { color: Colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 },
  hint: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  label: { color: Colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(77,163,255,0.15)' },
  chipText: { color: Colors.text, fontSize: 13 },
  chipTextActive: { fontWeight: '700', color: Colors.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
    marginRight: 10,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  selectedWrap: { marginTop: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: { color: Colors.text, fontSize: 13 },
  daysContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  dayButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
    marginBottom: 8,
  },
  dayButtonActive: { borderColor: Colors.primary, backgroundColor: 'rgba(77,163,255,0.15)' },
  dayButtonText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
  dayButtonTextActive: { color: Colors.primary },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: Colors.primary },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: { alignSelf: 'flex-end' },
  statusText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 8, marginBottom: 8 },
});
