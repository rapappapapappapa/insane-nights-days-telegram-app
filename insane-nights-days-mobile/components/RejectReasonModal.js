import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';

const REJECT_REASONS = [
  { value: 'unavailable', labelFr: 'Indisponible à cette date', labelEn: 'Unavailable on this date' },
  { value: 'price_conditions', labelFr: 'Tarif / conditions non adaptés', labelEn: 'Price / conditions not suitable' },
  { value: 'other_engagement', labelFr: 'Déjà engagé ailleurs', labelEn: 'Already booked elsewhere' },
  { value: 'venue_not_suitable', labelFr: 'Lieu non adapté', labelEn: 'Venue not suitable' },
  { value: 'genre_not_suitable', labelFr: 'Genre musical non adapté', labelEn: 'Music genre not suitable' },
  { value: 'other', labelFr: 'Autre (précisez)', labelEn: 'Other (please specify)' },
];

export default function RejectReasonModal({
  visible,
  onClose,
  onConfirm,
  title,
  confirmLabel,
  language = 'fr',
  loading = false,
}) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setCustomReason('');
    }
  }, [visible]);

  const handleConfirm = () => {
    const reason =
      selectedReason === 'other'
        ? (customReason?.trim() || (language === 'fr' ? 'Autre' : 'Other'))
        : REJECT_REASONS.find((r) => r.value === selectedReason)?.[language === 'fr' ? 'labelFr' : 'labelEn'] || selectedReason;
    onConfirm(reason);
  };

  const isOther = selectedReason === 'other';
  const canConfirm = selectedReason && (selectedReason !== 'other' || customReason?.trim());

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modal}
        >
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>
            {language === 'fr'
              ? 'Choisissez une raison :'
              : 'Choose a reason:'}
          </Text>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {REJECT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[
                  styles.optionItem,
                  selectedReason === r.value && styles.optionItemSelected,
                ]}
                onPress={() => setSelectedReason(r.value)}
              >
                <Text style={[
                  styles.optionText,
                  selectedReason === r.value && styles.optionTextSelected,
                ]}>
                  {language === 'fr' ? r.labelFr : r.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isOther && (
            <TextInput
              style={styles.customInput}
              placeholder={language === 'fr' ? 'Votre raison...' : 'Your reason...'}
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              maxLength={500}
            />
          )}

          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={onClose}>
              <Text style={styles.buttonCancelText}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonConfirm]}
              onPress={handleConfirm}
              disabled={loading || !canConfirm}
            >
              {loading ? (
                <Text style={styles.buttonConfirmText}>...</Text>
              ) : (
                <Text style={styles.buttonConfirmText}>{confirmLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  hint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 12,
  },
  optionsScroll: {
    maxHeight: 220,
    marginBottom: 12,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionItemSelected: {
    borderColor: 'rgba(77,163,255,0.6)',
    backgroundColor: 'rgba(77,163,255,0.15)',
  },
  optionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  customInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  buttonCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonConfirm: {
    backgroundColor: '#EF4444',
  },
  buttonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
