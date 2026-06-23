import React, { useState, useMemo } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useEventForm } from '../../../contexts/EventFormContext';
import BookerEventDjPickerModal from '../BookerEventDjPickerModal';

export default function BookerEventStep3Djs(props) {
  const {
    language,
    styles,
    formData,
    eventDateTime,
    availableDjs,
    loadingDjs,
    currentStep,
    setCurrentStep,
    djSlots,
    openSlotTimeField,
    showError,
  } = props;

  const { assignDjToWizardSlot, appendWizardDjSlot, removeWizardDjSlotAt, clearWizardDjSlotAt } =
    useEventForm();

  const [pickerSlotIndex, setPickerSlotIndex] = useState(null);

  const durOk = useMemo(() => {
    const dur = parseFloat(formData.durationHours);
    return Number.isFinite(dur) && dur > 0 ? dur : null;
  }, [formData.durationHours]);

  const excludedForPicker = useMemo(() => {
    if (pickerSlotIndex == null) return [];
    return djSlots
      .map((s, i) => (i !== pickerSlotIndex ? s.djId : null))
      .filter(Boolean);
  }, [djSlots, pickerSlotIndex]);

  const filledCount = djSlots.filter((s) => s.djId).length;

  const handleSelectDj = (dj) => {
    if (!dj?.userId || pickerSlotIndex == null) return;
    if (djSlots.some((s, i) => i !== pickerSlotIndex && s.djId === dj.userId)) {
      showError?.(
        language === 'fr'
          ? 'Ce DJ est déjà sur un autre créneau.'
          : 'This DJ is already assigned to another slot.'
      );
      return;
    }
    const intent = djSlots[pickerSlotIndex]?.djId ? 'replace' : 'fill';
    assignDjToWizardSlot(pickerSlotIndex, dj.userId, intent, formData.time, formData.durationHours);
    setPickerSlotIndex(null);
  };

  return (
    <>
      <Text style={styles.sectionTitle}>
        {language === 'fr' ? 'Étape 3 : Choisir des DJs' : 'Step 3: Choose DJs'}
      </Text>

      {!formData.date && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {language === 'fr'
              ? "⚠️ Veuillez d'abord sélectionner une date à l'étape 1 pour voir les DJs disponibles."
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
          ? 'Ajoute un ou plusieurs créneaux, puis choisis un DJ pour chacun (sélection directe, sans quitter cet écran).'
          : 'Add one or more slots, then pick a DJ for each (stays on this screen).'}
      </Text>

      {djSlots.map((slotRow, index) => {
        const selectedDj = slotRow.djId
          ? availableDjs.find((dj) => dj.userId === slotRow.djId)
          : null;
        return (
          <View
            key={slotRow.djId ? `dj-${slotRow.djId}-${index}` : `empty-slot-${index}`}
            style={styles.djSlotContainer}
          >
            <View style={styles.djSlotHeader}>
              <Text style={styles.djSlotLabel}>
                {language === 'fr' ? `Créneau ${index + 1}` : `Slot ${index + 1}`}
              </Text>
              {djSlots.length > 1 && (
                <TouchableOpacity
                  style={styles.removeSlotButton}
                  onPress={() => removeWizardDjSlotAt(index, formData.time, formData.durationHours)}
                >
                  <Text style={styles.removeSlotButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                if (!formData.date) {
                  showError?.(
                    language === 'fr'
                      ? "Choisis d'abord une date à l'étape 1."
                      : 'Pick a date in step 1 first.'
                  );
                  return;
                }
                setPickerSlotIndex(index);
              }}
            >
              <Text style={[styles.selectButtonText, !selectedDj && styles.placeholderText]}>
                {selectedDj
                  ? `${selectedDj.artistName} • ${language === 'fr' ? 'prix à convenir' : 'price to agree'}`
                  : language === 'fr'
                    ? 'Choisir un DJ'
                    : 'Choose a DJ'}
              </Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            {selectedDj ? (
              <>
                <View style={styles.djSlotTimesRow}>
                  <TouchableOpacity
                    style={styles.djSlotTimeButton}
                    onPress={() => openSlotTimeField(index, 'start')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.djSlotTimeLabel}>
                      {language === 'fr' ? 'Début' : 'Start'}
                    </Text>
                    <Text style={styles.djSlotTimeValue}>{slotRow.slotStart || '—'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.djSlotTimeButton}
                    onPress={() => openSlotTimeField(index, 'end')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.djSlotTimeLabel}>
                      {language === 'fr' ? 'Fin' : 'End'}
                    </Text>
                    <Text style={styles.djSlotTimeValue}>{slotRow.slotEnd || '—'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.djSlotClearBtn}
                  onPress={() => clearWizardDjSlotAt(index, formData.time, formData.durationHours)}
                >
                  <Text style={styles.djSlotClearBtnText}>
                    {language === 'fr' ? 'Retirer ce DJ' : 'Remove this DJ'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        );
      })}

      <TouchableOpacity style={styles.addSlotButton} onPress={appendWizardDjSlot}>
        <Text style={styles.addSlotButtonText}>
          + {language === 'fr' ? 'Ajouter un créneau DJ' : 'Add DJ slot'}
        </Text>
      </TouchableOpacity>

      {filledCount > 0 && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            ✓ {language === 'fr' ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}: {filledCount}
          </Text>
        </View>
      )}

      <View style={styles.stepButtons}>
        <TouchableOpacity style={styles.backButtonStep} onPress={() => setCurrentStep(2)}>
          <Text style={styles.backButtonStepText}>
            ← {language === 'fr' ? 'Précédent' : 'Previous'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextButton, filledCount === 0 && styles.nextButtonDisabled]}
          onPress={() => {
            if (filledCount > 0) setCurrentStep(4);
          }}
          disabled={filledCount === 0}
        >
          <Text style={styles.nextButtonText}>
            {language === 'fr' ? 'Suivant →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>

      <BookerEventDjPickerModal
        visible={pickerSlotIndex != null}
        slotIndex={pickerSlotIndex}
        language={language}
        styles={styles}
        availableDjs={availableDjs}
        loadingDjs={loadingDjs}
        excludedDjUserIds={excludedForPicker}
        onClose={() => setPickerSlotIndex(null)}
        onSelectDj={handleSelectDj}
      />
    </>
  );
}
