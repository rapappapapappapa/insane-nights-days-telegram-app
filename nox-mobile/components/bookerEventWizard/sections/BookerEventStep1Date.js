import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxText, NoxInput } from '../../nox';
import Colors from '../../../constants/colors';

export default function BookerEventStep1Date(props) {
  const {
    language,
    styles,
    formData,
    eventDateTime,
    handleChange,
    openDatePicker,
    openTimePicker,
  } = props;

  const dateLabel = (() => {
    const placeholder = language === 'fr' ? 'Choisir une date' : 'Choose a date';
    if (!formData.date) return placeholder;
    const candidate =
      eventDateTime instanceof Date && !isNaN(eventDateTime.getTime())
        ? eventDateTime
        : new Date(formData.date);
    if (isNaN(candidate.getTime())) return placeholder;
    return candidate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  })();

  return (
    <>
      <NoxText variant="title" style={styles.sectionTitle}>
        {language === 'fr' ? 'Quand ?' : 'When?'}
      </NoxText>

      <TouchableOpacity style={styles.choiceCard} onPress={openDatePicker} activeOpacity={0.85}>
        <View style={styles.choiceIcon}>
          <Ionicons name="calendar" size={22} color={Colors.primaryLight} />
        </View>
        <View style={styles.choiceBody}>
          <NoxText style={styles.choiceLabel}>{language === 'fr' ? 'Date' : 'Date'}</NoxText>
          <NoxText style={[styles.choiceValue, !formData.date && styles.placeholderText]}>{dateLabel}</NoxText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.choiceCard} onPress={openTimePicker} activeOpacity={0.85}>
        <View style={styles.choiceIcon}>
          <Ionicons name="time" size={22} color={Colors.primaryLight} />
        </View>
        <View style={styles.choiceBody}>
          <NoxText style={styles.choiceLabel}>{language === 'fr' ? 'Heure de début' : 'Start time'}</NoxText>
          <NoxText style={[styles.choiceValue, !formData.time && styles.placeholderText]}>
            {formData.time || (language === 'fr' ? 'Choisir une heure' : 'Choose a time')}
          </NoxText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.wizardBlock}>
        <NoxInput
          label={language === 'fr' ? 'Durée (heures)' : 'Duration (hours)'}
          placeholder={language === 'fr' ? 'Ex : 6' : 'Ex: 6'}
          keyboardType="numeric"
          value={formData.durationHours}
          onChangeText={(value) => handleChange('durationHours', value)}
        />
      </View>
    </>
  );
}
