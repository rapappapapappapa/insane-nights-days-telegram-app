import React from 'react';
import { Text, View, TouchableOpacity, Modal } from 'react-native';

export default function BookerEventPostCreateModal(props) {
  const { language, styles, postCreateModal, setPostCreateModal, navigate, goBack } = props;
  return (
          <Modal
            visible={!!postCreateModal}
            transparent
            animationType="fade"
            onRequestClose={() => setPostCreateModal(null)}
          >
            <View style={styles.successModalOverlay}>
              <View style={styles.successModalCard}>
                <Text style={styles.successModalTitle}>
                  {language === 'fr' ? 'Événement créé' : 'Event created'}
                </Text>
                <Text style={styles.successModalSubtitle}>
                  {postCreateModal?.title
                    ? `« ${postCreateModal.title} »`
                    : language === 'fr'
                      ? 'Ton événement est en ligne côté organisateur.'
                      : 'Your event is set up on the organizer side.'}
                </Text>
                <Text style={styles.successModalHint}>
                  {language === 'fr'
                    ? 'Prochaines étapes : utilise les chats privés (DJ, lieu) et le chat de groupe pour les invitations et les contrats NOX. Les billets utilisent le prix saisi à l’étape Détails.'
                    : 'Next: use private chats (DJs, venue) and the group chat for invitations and NOX contracts. Tickets use the price from the Details step.'}
                </Text>
                <TouchableOpacity
                  style={styles.successModalPrimary}
                  onPress={() => {
                    const id = postCreateModal?.eventId;
                    setPostCreateModal(null);
                    navigate('bookerDashboard', { openBookings: true, highlightEventId: id });
                  }}
                >
                  <Text style={styles.successModalPrimaryText}>
                    {language === 'fr' ? 'Voir mes événements' : 'View my events'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.successModalSecondary}
                  onPress={() => {
                    setPostCreateModal(null);
                    goBack();
                  }}
                >
                  <Text style={styles.successModalSecondaryText}>
                    {language === 'fr' ? 'Fermer' : 'Close'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
  );
}
