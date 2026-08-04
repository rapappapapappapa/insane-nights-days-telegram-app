import React from 'react';
import { Text, View, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/** Sélecteurs date/heure iOS (création d'événement legacy). */
export default function BookerDateTimePickers(props) {
  const {
    language,
    styles,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    setEventDateTime,
    handleChange,
  } = props;

  if (Platform.OS !== 'ios') return null;

  return (
    <>
            {/* Modal pour le sélecteur de date */}
            {Platform.OS === 'ios' && (
            <Modal
              visible={showDatePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowDatePicker(false)}
            >
              <TouchableOpacity
                style={styles.datePickerModalOverlay}
                activeOpacity={1}
                onPress={() => setShowDatePicker(false)}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                  style={styles.datePickerModalContent}
                >
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>
                      {language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
                    </Text>
                    <TouchableOpacity
                      style={styles.datePickerCloseButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerCloseButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant="light"
                      textColor={Platform.OS === 'android' ? '#000000' : undefined}
                      onChange={(_, selectedDate) => {
                        // On met juste à jour la date temporaire sans fermer
                        if (selectedDate) {
                          setTempDate(selectedDate);
                        }
                      }}
                      style={styles.datePicker}
                    />
                  </View>
                  <View style={styles.datePickerFooter}>
                    <TouchableOpacity
                      style={styles.datePickerCancelButton}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerCancelButtonText}>
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerConfirmButton}
                      onPress={() => {
                        setEventDateTime((prev) => {
                          const newDate = new Date(tempDate);
                          newDate.setHours(prev.getHours());
                          newDate.setMinutes(prev.getMinutes());
                          return newDate;
                        });
                        handleChange('date', tempDate.toISOString());
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.datePickerConfirmButtonText}>
                        {language === 'fr' ? 'Valider' : 'Confirm'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
            )}
      
            {/* Modal pour le sélecteur d'heure */}
            {Platform.OS === 'ios' && (
            <Modal
              visible={showTimePicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowTimePicker(false)}
            >
              <TouchableOpacity
                style={styles.datePickerModalOverlay}
                activeOpacity={1}
                onPress={() => setShowTimePicker(false)}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                  style={styles.datePickerModalContent}
                >
                  <View style={styles.datePickerHeader}>
                    <Text style={styles.datePickerTitle}>
                      {language === 'fr' ? 'Sélectionner une heure' : 'Select a time'}
                    </Text>
                    <TouchableOpacity
                      style={styles.datePickerCloseButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.datePickerCloseButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.datePickerContainer}>
                    <DateTimePicker
                      value={tempTime}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      themeVariant="light"
                      textColor={Platform.OS === 'android' ? '#000000' : undefined}
                      onChange={(_, selectedTime) => {
                        // On met juste à jour l'heure temporaire sans fermer
                        if (selectedTime) {
                          setTempTime(selectedTime);
                        }
                      }}
                      style={styles.datePicker}
                    />
                  </View>
                  <View style={styles.datePickerFooter}>
                    <TouchableOpacity
                      style={styles.datePickerCancelButton}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.datePickerCancelButtonText}>
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerConfirmButton}
                      onPress={() => {
                        setEventDateTime((prev) => {
                          const newDate = new Date(prev);
                          newDate.setHours(tempTime.getHours());
                          newDate.setMinutes(tempTime.getMinutes());
                          return newDate;
                        });
                        const hours = tempTime.getHours().toString().padStart(2, '0');
                        const minutes = tempTime.getMinutes().toString().padStart(2, '0');
                        handleChange('time', `${hours}:${minutes}`);
                        setShowTimePicker(false);
                      }}
                    >
                      <Text style={styles.datePickerConfirmButtonText}>
                        {language === 'fr' ? 'Valider' : 'Confirm'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
            )}
    </>
  );
}
