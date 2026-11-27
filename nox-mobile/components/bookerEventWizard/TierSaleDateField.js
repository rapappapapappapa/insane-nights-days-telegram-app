import React, { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';

/** "JJ/MM/AAAA" ↔ Date (format attendu par parseSaleDateInput). */
export function parseFrDate(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatFrDate(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

export default function TierSaleDateField({
  styles,
  language,
  label,
  placeholder,
  value,
  onChange,
  minimumDate,
  maximumDate,
  containerStyle,
}) {
  const fr = language === 'fr';
  const [iosTemp, setIosTemp] = useState(null);
  const current = parseFrDate(value);

  const clamp = (d) => {
    if (minimumDate && d < minimumDate) return new Date(minimumDate);
    if (maximumDate && d > maximumDate) return new Date(maximumDate);
    return d;
  };

  const open = () => {
    const initial = clamp(current || minimumDate || new Date());
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, picked) => {
          if (event?.type === 'set' && picked) onChange(formatFrDate(picked));
        },
      });
      return;
    }
    setIosTemp(initial);
  };

  return (
    <View style={[{ flex: 1 }, containerStyle]}>
      <TouchableOpacity
        style={[styles.djSlotTimeButton, { flexDirection: 'row', alignItems: 'center' }]}
        onPress={open}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.djSlotTimeLabel}>{label}</Text>
          <Text style={[styles.djSlotTimeValue, !current && { color: Colors.textTertiary, fontWeight: '400', fontSize: 14 }]}>
            {current ? value : placeholder}
          </Text>
        </View>
        {current ? (
          <TouchableOpacity
            onPress={() => onChange('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={fr ? 'Effacer la date' : 'Clear date'}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="calendar-outline" size={18} color={Colors.primaryLight} />
        )}
      </TouchableOpacity>

      {Platform.OS === 'ios' && iosTemp ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setIosTemp(null)}>
          <TouchableOpacity style={styles.datePickerModalOverlay} activeOpacity={1} onPress={() => setIosTemp(null)}>
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={styles.datePickerModalContent}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>{label}</Text>
                <TouchableOpacity style={styles.datePickerCloseButton} onPress={() => setIosTemp(null)}>
                  <Text style={styles.datePickerCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={iosTemp}
                  mode="date"
                  display="spinner"
                  themeVariant="light"
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={(_, picked) => picked && setIosTemp(picked)}
                  style={styles.datePicker}
                />
              </View>
              <View style={styles.datePickerFooter}>
                <TouchableOpacity style={styles.datePickerCancelButton} onPress={() => setIosTemp(null)}>
                  <Text style={styles.datePickerCancelButtonText}>{fr ? 'Annuler' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePickerConfirmButton}
                  onPress={() => {
                    onChange(formatFrDate(clamp(iosTemp)));
                    setIosTemp(null);
                  }}
                >
                  <Text style={styles.datePickerConfirmButtonText}>{fr ? 'Valider' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}
