import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { CANCELLATION_POLICY_OPTIONS } from '../constants/contractPayload';

export default function CancellationPolicyPickerModal({ visible, onClose, value, onSelect, language, styles }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.paymentTermsOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.paymentTermsModalContent}>
          <Text style={styles.contractModalTitle}>
            {language === 'fr' ? 'Conditions d’annulation' : 'Cancellation policy'}
          </Text>
          {CANCELLATION_POLICY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.paymentTermsOption,
                value === opt.value && styles.paymentTermsOptionSelected,
              ]}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
            >
              <Text
                style={[
                  styles.paymentTermsOptionText,
                  value === opt.value && styles.paymentTermsOptionTextSelected,
                ]}
              >
                {language === 'fr' ? opt.labelFr : opt.labelEn}
              </Text>
              {value === opt.value ? <Text style={styles.paymentTermsCheck}>✓</Text> : null}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.paymentTermsClose} onPress={onClose}>
            <Text style={styles.contractButtonText}>{language === 'fr' ? 'Fermer' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
