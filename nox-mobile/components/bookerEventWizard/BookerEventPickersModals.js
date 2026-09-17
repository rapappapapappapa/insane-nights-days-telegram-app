import React from 'react';
import { Text, View, TouchableOpacity, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getEventMinLeadDaysFromEnv,
  getMinEventCalendarDate,
} from '../../utils/bookerEventWizardUtils';

export default function BookerEventPickersModals(props) {
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
    slotTimePicker,
    setSlotTimePicker,
    tempSlotTime,
    setTempSlotTime,
    updateSlotTimeFromPicker,
  } = props;

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
                        minimumDate={
                          getEventMinLeadDaysFromEnv() > 0
                            ? getMinEventCalendarDate(getEventMinLeadDaysFromEnv())
                            : undefined
                        }
                        onChange={(_, selectedDate) => {
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
                        onChange={(_, selectedTime) => {
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
      
            {/* Modal créneau DJ (iOS) */}
            {Platform.OS === 'ios' && slotTimePicker && (
              <Modal
                visible={true}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSlotTimePicker(null)}
              >
                <TouchableOpacity
                  style={styles.datePickerModalOverlay}
                  activeOpacity={1}
                  onPress={() => setSlotTimePicker(null)}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                    style={styles.datePickerModalContent}
                  >
                    <View style={styles.datePickerHeader}>
                      <Text style={styles.datePickerTitle}>
                        {slotTimePicker.field === 'start'
                          ? language === 'fr'
                            ? 'Heure de début du créneau'
                            : 'Slot start time'
                          : language === 'fr'
                            ? 'Heure de fin du créneau'
                            : 'Slot end time'}
                      </Text>
                      <TouchableOpacity
                        style={styles.datePickerCloseButton}
                        onPress={() => setSlotTimePicker(null)}
                      >
                        <Text style={styles.datePickerCloseButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={tempSlotTime}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        themeVariant="light"
                        onChange={(_, t) => {
                          if (t) setTempSlotTime(t);
                        }}
                        style={styles.datePicker}
                      />
                    </View>
                    <View style={styles.datePickerFooter}>
                      <TouchableOpacity
                        style={styles.datePickerCancelButton}
                        onPress={() => setSlotTimePicker(null)}
                      >
                        <Text style={styles.datePickerCancelButtonText}>
                          {language === 'fr' ? 'Annuler' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.datePickerConfirmButton}
                        onPress={() => {
                          updateSlotTimeFromPicker(slotTimePicker.index, slotTimePicker.field, tempSlotTime);
                          setSlotTimePicker(null);
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
