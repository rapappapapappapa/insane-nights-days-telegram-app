import React, { useState, useMemo, useEffect } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { useEventForm } from '../../../contexts/EventFormContext';
import { NoxText } from '../../nox';
import BookerEventDjPickerModal from '../BookerEventDjPickerModal';
import { applyVenueDjSlotTimes } from '../../../utils/bookerEventWizardUtils';

export default function BookerEventStep3Djs(props) {
  const {
    language,
    styles,
    formData,
    eventDateTime,
    availableDjs,
    loadingDjs,
    djSlots,
    setDjSlots,
    venues,
    venueStops,
    openSlotTimeField,
    showError,
    navigate,
    flushDraftNow,
  } = props;

  const fr = language === 'fr';
  const { assignDjToWizardSlot, appendWizardDjSlot, removeWizardDjSlotAt, clearWizardDjSlotAt } =
    useEventForm();

  /** { index: créneau existant | null (nouveau), venueId: lieu visé en parcours } */
  const [pickerTarget, setPickerTarget] = useState(null);

  const stops = useMemo(() => (venueStops || []).filter((s) => s.venueId), [venueStops]);
  const isItinerary = stops.length > 1;
  const stopsKey = stops.map((s) => `${s.venueId}@${s.slotStart}-${s.slotEnd}`).join('|');

  /** Parcours : DJs sans lieu → 1er lieu ; horaires recalés si hors du créneau de leur lieu. */
  useEffect(() => {
    if (!isItinerary) return;
    setDjSlots((prev) => {
      const ids = stops.map((s) => s.venueId);
      const needsVenue = prev.some((s) => s.djId && !ids.includes(s.venueId));
      const fixedVenue = needsVenue
        ? prev.map((s) => (s.djId && !ids.includes(s.venueId) ? { ...s, venueId: ids[0] } : s))
        : prev;
      const next = applyVenueDjSlotTimes(fixedVenue, stops, { onlyInvalid: true });
      const changed = next.some(
        (s, i) =>
          s.venueId !== prev[i]?.venueId ||
          s.slotStart !== prev[i]?.slotStart ||
          s.slotEnd !== prev[i]?.slotEnd
      );
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isItinerary, stopsKey]);

  const venueName = (id) => (venues || []).find((v) => v.id === id)?.venueName || (fr ? 'ce lieu' : 'this venue');

  const excludedForPicker = useMemo(() => {
    if (!pickerTarget) return [];
    return djSlots
      .filter((s, i) => i !== pickerTarget.index && (!isItinerary || s.venueId === pickerTarget.venueId))
      .map((s) => s.djId)
      .filter(Boolean);
  }, [djSlots, pickerTarget, isItinerary]);

  const filledCount = new Set(djSlots.filter((s) => s.djId).map((s) => s.djId)).size;

  const requireDate = () => {
    if (formData.date) return true;
    showError?.(fr ? "Choisis d'abord une date à l'étape 1." : 'Pick a date in step 1 first.');
    return false;
  };

  const handleSelectDj = (dj) => {
    if (!dj?.userId || !pickerTarget) return;
    const { index, venueId } = pickerTarget;

    if (isItinerary) {
      if (djSlots.some((s, i) => i !== index && s.djId === dj.userId && s.venueId === venueId)) {
        showError?.(fr ? 'Ce DJ joue déjà dans ce lieu.' : 'This DJ already plays at this venue.');
        return;
      }
      setDjSlots((prev) => {
        const next =
          index == null
            ? [
                ...prev.filter((s) => s.djId),
                { djId: dj.userId, venueId, slotStart: '', slotEnd: '' },
              ]
            : prev.map((s, i) => (i === index ? { ...s, djId: dj.userId } : s));
        return applyVenueDjSlotTimes(next, stops);
      });
      setPickerTarget(null);
      return;
    }

    if (djSlots.some((s, i) => i !== index && s.djId === dj.userId)) {
      showError?.(fr ? 'Ce DJ est déjà sur un autre créneau.' : 'This DJ is already assigned to another slot.');
      return;
    }
    const intent = djSlots[index]?.djId ? 'replace' : 'fill';
    assignDjToWizardSlot(index, dj.userId, intent, formData.time, formData.durationHours);
    setPickerTarget(null);
  };

  const removeSlot = (index) => {
    if (isItinerary) {
      setDjSlots((prev) => applyVenueDjSlotTimes(prev.filter((_, i) => i !== index), stops));
      return;
    }
    removeWizardDjSlotAt(index, formData.time, formData.durationHours);
  };

  const handleViewDjProfile = async (dj) => {
    if (!dj?.userId || !navigate) return;
    setPickerTarget(null);
    await flushDraftNow?.();
    navigate('djProfile', { djUserId: dj.userId, djId: dj.djId });
  };

  const renderSlot = (slotRow, index, label, canRemove) => {
    const selectedDj = slotRow.djId ? availableDjs.find((dj) => dj.userId === slotRow.djId) : null;
    const djDisplayName =
      selectedDj?.artistName || (slotRow.djId ? (fr ? 'DJ sélectionné' : 'Selected DJ') : null);
    return (
      <View
        key={slotRow.djId ? `dj-${slotRow.djId}-${index}` : `empty-slot-${index}`}
        style={styles.djSlotContainer}
      >
        <View style={styles.djSlotHeader}>
          <Text style={styles.djSlotLabel}>{label}</Text>
          {canRemove && (
            <TouchableOpacity style={styles.removeSlotButton} onPress={() => removeSlot(index)}>
              <Text style={styles.removeSlotButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => requireDate() && setPickerTarget({ index, venueId: slotRow.venueId ?? null })}
        >
          <Text style={[styles.selectButtonText, !djDisplayName && styles.placeholderText]}>
            {djDisplayName
              ? `${djDisplayName} • ${fr ? 'prix à convenir' : 'price to agree'}`
              : fr
                ? 'Choisir un DJ'
                : 'Choose a DJ'}
          </Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>

        {slotRow.djId ? (
          <>
            <View style={styles.djSlotTimesRow}>
              <TouchableOpacity
                style={styles.djSlotTimeButton}
                onPress={() => openSlotTimeField(index, 'start')}
                activeOpacity={0.85}
              >
                <Text style={styles.djSlotTimeLabel}>{fr ? 'Début' : 'Start'}</Text>
                <Text style={styles.djSlotTimeValue}>{slotRow.slotStart || '—'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.djSlotTimeButton}
                onPress={() => openSlotTimeField(index, 'end')}
                activeOpacity={0.85}
              >
                <Text style={styles.djSlotTimeLabel}>{fr ? 'Fin' : 'End'}</Text>
                <Text style={styles.djSlotTimeValue}>{slotRow.slotEnd || '—'}</Text>
              </TouchableOpacity>
            </View>
            {!isItinerary ? (
              <TouchableOpacity
                style={styles.djSlotClearBtn}
                onPress={() => clearWizardDjSlotAt(index, formData.time, formData.durationHours)}
              >
                <Text style={styles.djSlotClearBtnText}>{fr ? 'Retirer ce DJ' : 'Remove this DJ'}</Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <NoxText variant="title" style={styles.sectionTitle}>
        {fr ? 'Qui joue ?' : 'Who is playing?'}
      </NoxText>

      {!formData.date && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {fr
              ? "⚠️ Veuillez d'abord sélectionner une date à l'étape 1 pour voir les DJs disponibles."
              : '⚠️ Please select a date in step 1 first to see available DJs.'}
          </Text>
        </View>
      )}

      {formData.date && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {fr
              ? `📅 DJs disponibles le ${new Date(eventDateTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
              : `📅 DJs available on ${new Date(eventDateTime).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          </Text>
        </View>
      )}

      <NoxText variant="secondary" style={styles.stepDescription}>
        {isItinerary
          ? fr
            ? 'Choisis au moins un DJ par lieu. Un même DJ peut jouer dans plusieurs lieux.'
            : 'Pick at least one DJ per venue. The same DJ can play in several venues.'
          : fr
            ? 'Ajoute un ou plusieurs créneaux, puis choisis un DJ pour chacun.'
            : 'Add one or more slots, then pick a DJ for each.'}
      </NoxText>

      {isItinerary ? (
        stops.map((stop, stopIdx) => {
          const rows = djSlots
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => s.djId && s.venueId === stop.venueId);
          return (
            <View key={`stop-${stop.venueId}`} style={styles.wizardBlock}>
              <NoxText style={styles.wizardBlockTitle}>
                {`${stopIdx + 1}. ${venueName(stop.venueId)}`}
                {stop.slotStart && stop.slotEnd ? `  ·  ${stop.slotStart} – ${stop.slotEnd}` : ''}
              </NoxText>
              {rows.length === 0 ? (
                <NoxText variant="secondary" style={{ marginBottom: 8 }}>
                  {fr ? 'Aucun DJ pour ce lieu.' : 'No DJ for this venue yet.'}
                </NoxText>
              ) : null}
              {rows.map(({ s, i }, j) => renderSlot(s, i, `DJ ${j + 1}`, true))}
              <TouchableOpacity
                style={styles.addSlotButton}
                onPress={() => requireDate() && setPickerTarget({ index: null, venueId: stop.venueId })}
              >
                <Text style={styles.addSlotButtonText}>
                  + {fr ? `Ajouter un DJ à ${venueName(stop.venueId)}` : `Add a DJ to ${venueName(stop.venueId)}`}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })
      ) : (
        <>
          {djSlots.map((slotRow, index) =>
            renderSlot(slotRow, index, fr ? `Créneau ${index + 1}` : `Slot ${index + 1}`, djSlots.length > 1)
          )}
          <TouchableOpacity style={styles.addSlotButton} onPress={appendWizardDjSlot}>
            <Text style={styles.addSlotButtonText}>
              + {fr ? 'Ajouter un créneau DJ' : 'Add DJ slot'}
            </Text>
          </TouchableOpacity>
        </>
      )}

      {filledCount > 0 && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedInfoText}>
            ✓ {fr ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}: {filledCount}
          </Text>
        </View>
      )}

      <BookerEventDjPickerModal
        visible={pickerTarget != null}
        slotIndex={pickerTarget?.index ?? null}
        language={language}
        styles={styles}
        availableDjs={availableDjs}
        loadingDjs={loadingDjs}
        excludedDjUserIds={excludedForPicker}
        onClose={() => setPickerTarget(null)}
        onSelectDj={handleSelectDj}
        onViewProfile={handleViewDjProfile}
      />
    </>
  );
}
