import React from 'react';
import { Text, View, TouchableOpacity, Modal } from 'react-native';
import { styles } from '../../screens/feed/FeedPage.styles';

export default function FeedReportModal({
  visible,
  language,
  reportReasons,
  onSelectReason,
  onClose,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {language === 'fr' ? 'Signaler ce post' : 'Report this post'}
          </Text>
          <Text style={styles.modalSubtitle}>
            {language === 'fr' ? 'Choisis une raison.' : 'Choose a reason.'}
          </Text>

          {reportReasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={styles.modalButton}
              onPress={() => onSelectReason(reason)}
              accessibilityRole="button"
              accessibilityLabel={reason.label}
            >
              <Text style={styles.modalButtonText}>{reason.label}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.modalButton, styles.modalCancelButton]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Annuler le signalement' : 'Cancel report'}
          >
            <Text style={styles.modalCancelButtonText}>
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
