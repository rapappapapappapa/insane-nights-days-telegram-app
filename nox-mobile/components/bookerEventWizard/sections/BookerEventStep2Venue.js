import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxText } from '../../nox';
import Colors from '../../../constants/colors';
import BookerEventVenuePickerModal from '../BookerEventVenuePickerModal';

export default function BookerEventStep2Venue(props) {
  const {
    language,
    styles,
    venues,
    loadingVenues,
    handleChange,
    venueStops,
    selectVenueForStop,
    addVenueStop,
    removeVenueStop,
    openSlotTimeField,
    navigate,
    flushDraftNow,
  } = props;

  const fr = language === 'fr';
  const [pickingIndex, setPickingIndex] = useState(null);
  const stops = venueStops?.length ? venueStops : [{ venueId: '', slotStart: '', slotEnd: '' }];
  const isItinerary = stops.length > 1;
  const lastFilled = !!stops[stops.length - 1]?.venueId;

  const handleSelectVenue = (venue) => {
    if (!venue?.id || pickingIndex == null) return;
    if (stops.some((s, i) => i !== pickingIndex && s.venueId === venue.id)) return;
    selectVenueForStop(pickingIndex, venue.id);
    setPickingIndex(null);
  };

  const handleViewVenueProfile = async (venue) => {
    if (!venue?.id || !navigate) return;
    handleChange('venuePickingIndex', pickingIndex ?? 0);
    setPickingIndex(null);
    await flushDraftNow?.();
    navigate('venueProfile', { venueId: venue.id });
  };

  const handleAddStop = () => {
    addVenueStop();
    setPickingIndex(stops.length);
  };

  return (
    <>
      <NoxText variant="title" style={styles.sectionTitle}>
        {fr ? 'Où ?' : 'Where?'}
      </NoxText>
      {isItinerary ? (
        <NoxText variant="secondary" style={{ marginBottom: 12 }}>
          {fr
            ? 'La soirée passe d’un lieu à l’autre. Chaque lieu reçoit sa demande et son contrat.'
            : 'The night moves from one venue to the next. Each venue gets its own request and contract.'}
        </NoxText>
      ) : null}

      {stops.map((stop, index) => {
        const venue = venues.find((v) => v.id === stop.venueId);
        return (
          <View key={`stop-${index}`} style={styles.choiceCard}>
            <View style={styles.choiceIcon}>
              {isItinerary ? (
                <NoxText style={{ color: Colors.primaryLight, fontWeight: '700', fontSize: 16 }}>
                  {index + 1}
                </NoxText>
              ) : (
                <Ionicons name="business" size={22} color={Colors.primaryLight} />
              )}
            </View>
            <View style={styles.choiceBody}>
              <TouchableOpacity onPress={() => setPickingIndex(index)} activeOpacity={0.85}>
                <NoxText style={styles.choiceLabel}>
                  {isItinerary ? (fr ? `Lieu ${index + 1}` : `Venue ${index + 1}`) : fr ? 'Lieu' : 'Venue'}
                </NoxText>
                <NoxText style={[styles.choiceValue, !venue && styles.placeholderText]}>
                  {venue ? venue.venueName || venue.name : fr ? 'Choisir un lieu' : 'Choose a venue'}
                </NoxText>
                {venue?.address ? (
                  <NoxText variant="secondary" style={{ marginTop: 4 }}>
                    {venue.address}
                    {venue.city ? `, ${venue.city}` : ''}
                  </NoxText>
                ) : null}
              </TouchableOpacity>

              {isItinerary ? (
                <View style={styles.djSlotTimesRow}>
                  <TouchableOpacity
                    style={styles.djSlotTimeButton}
                    onPress={() => openSlotTimeField(index, 'start', 'venue')}
                    activeOpacity={0.85}
                  >
                    <NoxText style={styles.djSlotTimeLabel}>{fr ? 'Arrivée' : 'Arrive'}</NoxText>
                    <NoxText style={styles.djSlotTimeValue}>{stop.slotStart || '—'}</NoxText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.djSlotTimeButton}
                    onPress={() => openSlotTimeField(index, 'end', 'venue')}
                    activeOpacity={0.85}
                  >
                    <NoxText style={styles.djSlotTimeLabel}>{fr ? 'Départ' : 'Leave'}</NoxText>
                    <NoxText style={styles.djSlotTimeValue}>{stop.slotEnd || '—'}</NoxText>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {isItinerary ? (
              <TouchableOpacity
                onPress={() => removeVenueStop(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel={fr ? 'Retirer ce lieu' : 'Remove this venue'}
              >
                <Ionicons name="close" size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            )}
          </View>
        );
      })}

      {lastFilled ? (
        <TouchableOpacity style={styles.discloseRow} onPress={handleAddStop} activeOpacity={0.8}>
          <NoxText style={styles.discloseAction}>
            + {fr ? 'Ajouter un lieu (la soirée continue ailleurs)' : 'Add a venue (the night moves on)'}
          </NoxText>
        </TouchableOpacity>
      ) : null}

      <BookerEventVenuePickerModal
        visible={pickingIndex != null}
        language={language}
        styles={styles}
        venues={venues.filter(
          (v) => !stops.some((s, i) => i !== pickingIndex && s.venueId === v.id)
        )}
        loadingVenues={loadingVenues}
        onClose={() => setPickingIndex(null)}
        onSelectVenue={handleSelectVenue}
        onViewProfile={handleViewVenueProfile}
      />
    </>
  );
}
