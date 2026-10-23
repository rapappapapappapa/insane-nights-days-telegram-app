import React from 'react';
import { Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';

export default function PrestataireBookingsSection({
  language,
  styles,
  loadingBookings,
  bookings,
  openChat,
}) {
  return (
    <>
      <Text style={styles.title}>
        {language === 'fr' ? 'Mes prestations' : 'My bookings'}
      </Text>
      {loadingBookings ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
      ) : bookings.length === 0 ? (
        <Text style={styles.hint}>
          {language === 'fr' ? 'Aucune invitation pour le moment.' : 'No invitations yet.'}
        </Text>
      ) : (
        bookings.map((b) => (
          <View key={b.eventPrestataireId} style={styles.card}>
            <Text style={styles.cardTitle}>{b.eventTitle}</Text>
            <Text style={styles.cardMeta}>
              {new Date(b.eventDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} · {b.eventTime}
            </Text>
            <Text style={styles.cardMeta}>{b.invitationStatus}</Text>
            <TouchableOpacity style={styles.chatBtn} onPress={() => openChat(b.eventPrestataireId)}>
              <Text style={styles.chatBtnText}>💬 {language === 'fr' ? 'Chat & contrat' : 'Chat & contract'}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </>
  );
}
