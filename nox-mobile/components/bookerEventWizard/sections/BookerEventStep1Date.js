import React from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { NoxText, NoxButton } from '../../nox';

export default function BookerEventStep1Date(props) {
  const {
    language,
    styles,
    formData,
    eventDateTime,
    setCurrentStep,
    handleChange,
    openDatePicker,
    openTimePicker,
  } = props;

  return (
    <>
      <NoxText variant="form" style={styles.sectionTitle}>
        {language === 'fr' ? 'Étape 1 : Date et durée' : 'Step 1: Date and duration'}
      </NoxText>

      <View style={styles.inputGroup}>
        <NoxText variant="label" style={styles.label}>
          {language === 'fr' ? 'Date' : 'Date'} *
        </NoxText>
        <TouchableOpacity style={styles.selectButton} onPress={openDatePicker}>
          <NoxText style={[styles.selectButtonText, !formData.date && styles.placeholderText]}>
            {(() => {
              const placeholder = language === 'fr' ? 'Choisir une date' : 'Choose a date';
              if (!formData.date) return placeholder;
              const candidate =
                eventDateTime instanceof Date && !isNaN(eventDateTime.getTime())
                  ? eventDateTime
                  : new Date(formData.date);
              if (isNaN(candidate.getTime())) return placeholder;
              return candidate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              });
            })()}
          </NoxText>
          <NoxText style={styles.chevron}>📅</NoxText>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <NoxText variant="label" style={styles.label}>
          {language === 'fr' ? 'Heure de début' : 'Start time'} *
        </NoxText>
        <TouchableOpacity style={styles.selectButton} onPress={openTimePicker}>
          <NoxText style={[styles.selectButtonText, !formData.time && styles.placeholderText]}>
            {formData.time
              ? formData.time
              : language === 'fr'
                ? 'Choisir une heure'
                : 'Choose a time'}
          </NoxText>
          <NoxText style={styles.chevron}>⏰</NoxText>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <NoxText variant="label" style={styles.label}>
          {language === 'fr' ? 'Durée de la soirée (heures)' : 'Event duration (hours)'} *
        </NoxText>
        <TextInput
          style={styles.input}
          placeholder={language === 'fr' ? 'Ex: 4' : 'Ex: 4'}
          placeholderTextColor="rgba(255,255,255,0.4)"
          keyboardType="numeric"
          value={formData.durationHours}
          onChangeText={(value) => handleChange('durationHours', value)}
        />
      </View>

      <NoxButton
        label={language === 'fr' ? 'Suivant →' : 'Next →'}
        onPress={() => {
          if (formData.date && formData.time && formData.durationHours) {
            setCurrentStep(2);
          }
        }}
        disabled={!formData.date || !formData.time || !formData.durationHours}
        style={[
          styles.nextButton,
          (!formData.date || !formData.time || !formData.durationHours) && styles.nextButtonDisabled,
        ]}
        textStyle={styles.nextButtonText}
      />
    </>
  );
}
