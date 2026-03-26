import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { DEAL_TYPE_OPTIONS } from '../constants/contractPayload';

export default function DealTypePickerModal({ visible, onClose, value, onSelect, language, styles }) {
  const dt = value || 'fixed_rent';
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.paymentTermsOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.paymentTermsModalContent}>
          <Text style={styles.contractModalTitle}>{language === 'fr' ? "Type d'accord" : 'Deal type'}</Text>
          {DEAL_TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.paymentTermsOption, dt === opt.value && styles.paymentTermsOptionSelected]}
              onPress={() => {
                onSelect(opt.value);
                onClose();
              }}
            >
              <Text style={[styles.paymentTermsOptionText, dt === opt.value && styles.paymentTermsOptionTextSelected]}>
                {language === 'fr' ? opt.labelFr : opt.labelEn}
              </Text>
              {dt === opt.value ? <Text style={styles.paymentTermsCheck}>✓</Text> : null}
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
