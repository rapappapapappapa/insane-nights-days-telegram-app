import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

/**
 * Modal de choix de l’heure de fin de prestation (créneaux issus de l’événement).
 * options: { value: 'HH:MM', label: string }[]
 */
export default function EventEndTimePickerModal({ visible, onClose, value, onSelect, language, styles, options }) {
  const list = options && options.length > 0 ? options : [];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.paymentTermsOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.paymentTermsModalContent}>
          <Text style={styles.contractModalTitle}>
            {language === 'fr' ? 'Heure de fin de prestation' : 'Performance end time'}
          </Text>
          {list.map((opt) => {
            const selected = value === opt.value;
            const line =
              language === 'fr' ? `Fin à ${opt.value}` : `End at ${opt.value}`;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.paymentTermsOption, selected && styles.paymentTermsOptionSelected]}
                onPress={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <Text
                  style={[styles.paymentTermsOptionText, selected && styles.paymentTermsOptionTextSelected]}
                >
                  {line}
                </Text>
                {selected ? <Text style={styles.paymentTermsCheck}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.paymentTermsClose} onPress={onClose}>
            <Text style={styles.contractButtonText}>{language === 'fr' ? 'Fermer' : 'Close'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
