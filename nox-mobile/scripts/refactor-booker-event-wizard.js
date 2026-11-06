/**
 * Découpe BookerEventDashboardPage.js en utils, styles, hook, sections, modales.
 */
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../screens/dashboard/BookerEventDashboardPage.js');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
const slice = (a, b) => lines.slice(a - 1, b).join('\n');

// --- utils ---
const utilsBody = slice(28, 258);
fs.writeFileSync(
  path.join(__dirname, '../utils/bookerEventWizardUtils.js'),
  utilsBody +
    '\n\nexport {\n' +
    '  EVENT_CREATION_DRAFT_KEY,\n' +
    '  DRAFT_VERSION,\n' +
    '  emptyDjSlot,\n' +
    '  getEventMinLeadDaysFromEnv,\n' +
    '  getMinEventCalendarDate,\n' +
    '  hasBookerEventTitle,\n' +
    '  hasBookerEventPrice,\n' +
    '  stepRequirementsHint,\n' +
    '  buildDjSlotsFromFormData,\n' +
    '  mergeDjSlotsWithForm,\n' +
    '  getInitialStepFromRouteParams,\n' +
    '  parseResumeStepFromParams,\n' +
    '  getMergedInitialBookerWizardStep,\n' +
    '  isReturnFromVenueOrDjPicker,\n' +
    '  parseHM,\n' +
    '  formatHM,\n' +
    '  applyEqualDjSlotTimes,\n' +
    '  slotFitsEventWindow,\n' +
    '  summarizeEquipmentRentalBlurb,\n' +
    '};\n'
);

// Fix utils: add export keywords to const/functions at top
let utils = fs.readFileSync(path.join(__dirname, '../utils/bookerEventWizardUtils.js'), 'utf8');
utils = utils.replace(/^const EVENT_CREATION_DRAFT_KEY/m, 'export const EVENT_CREATION_DRAFT_KEY');
utils = utils.replace(/^const DRAFT_VERSION/m, 'export const DRAFT_VERSION');
utils = utils.replace(/^function /gm, 'export function ');
utils = utils.replace(/\n\nexport \{\n[\s\S]*\};\n$/, '');
fs.writeFileSync(path.join(__dirname, '../utils/bookerEventWizardUtils.js'), utils);

// --- styles ---
const styleBody = slice(2503).replace(/^const styles = /, 'export const styles = ');
fs.writeFileSync(
  path.join(__dirname, '../screens/dashboard/BookerEventDashboardPage.styles.js'),
  "import { StyleSheet, Platform } from 'react-native';\nimport Colors from '../../constants/colors';\n\n" +
    styleBody
);

// --- hook body (state + handlers, lines 280-1226) ---
const hookBody = slice(280, 1226);
const hookFile = `import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';
import {
  EVENT_CREATION_DRAFT_KEY,
  DRAFT_VERSION,
  emptyDjSlot,
  getEventMinLeadDaysFromEnv,
  getMinEventCalendarDate,
  hasBookerEventTitle,
  hasBookerEventPrice,
  buildDjSlotsFromFormData,
  mergeDjSlotsWithForm,
  getMergedInitialBookerWizardStep,
  isReturnFromVenueOrDjPicker,
  parseHM,
  applyEqualDjSlotTimes,
  slotFitsEventWindow,
} from '../utils/bookerEventWizardUtils';

export function useBookerEventWizard({
  user,
  language,
  routeParams,
  navigate,
  goBack,
  showError,
  showSuccess,
  formData,
  setFormData,
  eventDateTime,
  setEventDateTime,
  resetForm,
  addDj,
  removeDj,
  setVenue,
  coverImageUri,
  setCoverImageUri,
  bookerEventWizardStep,
  setBookerEventWizardStep,
}) {
${hookBody.split('\n').map((l) => '  ' + l).join('\n')}

  return {
    availableDjs,
    venues,
    loadingDjs,
    loadingVenues,
    creating,
    draftGate,
    postCreateModal,
    setPostCreateModal,
    currentStep,
    setCurrentStep,
    djSlots,
    setDjSlots,
    slotTimePicker,
    setSlotTimePicker,
    tempSlotTime,
    setTempSlotTime,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    rentalPresets,
    rentalCatalogItems,
    rentalCatalogLabel,
    setRentalCatalogLabel,
    rentalCatalogQty,
    setRentalCatalogQty,
    eventRentalExtraLabel,
    setEventRentalExtraLabel,
    eventRentalExtraQty,
    setEventRentalExtraQty,
    savingRentalCatalog,
    openDatePicker,
    openTimePicker,
    openSlotTimeField,
    updateSlotTimeFromPicker,
    handleChange,
    toggleEquipmentPreset,
    toggleOrganizerLineFromCatalog,
    addEventOnlyEquipmentLine,
    removeOrganizerLineAt,
    addCatalogRow,
    removeCatalogRow,
    updateExtraTicketTier,
    addExtraTicketTier,
    removeExtraTicketTier,
    saveRentalCatalogToProfile,
    pickCoverImage,
    clearDraftAndRestartWizard,
    handleCreateEvent,
    selectedVenue,
    fetchAvailableDjs,
    fetchVenues,
    hasBookerEventTitle,
    hasBookerEventPrice,
    formData,
    coverImageUri,
    navigate,
  };
}
`;
fs.writeFileSync(path.join(__dirname, '../hooks/useBookerEventWizard.js'), hookFile);

// --- step sections ---
const sectionsDir = path.join(__dirname, '../components/bookerEventWizard/sections');
fs.mkdirSync(sectionsDir, { recursive: true });

const stepImports = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import Colors from '../../../constants/colors';
import { getEventMinLeadDaysFromEnv } from '../../../utils/bookerEventWizardUtils';
`;

const steps = [
  { name: 'BookerEventStep1Date', start: 1312, end: 1388 },
  { name: 'BookerEventStep2Venue', start: 1390, end: 1452 },
  { name: 'BookerEventStep3Djs', start: 1454, end: 1636 },
  { name: 'BookerEventStep4Details', start: 1638, end: 2025 },
  { name: 'BookerEventStep5Summary', start: 2028, end: 2207 },
];

for (const s of steps) {
  const body = slice(s.start, s.end);
  fs.writeFileSync(
    path.join(sectionsDir, `${s.name}.js`),
    stepImports +
      `\nexport default function ${s.name}(props) {\n  return (\n` +
      body
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n') +
      '\n  );\n}\n'
  );
}

// --- pickers modals ---
const pickersBody = slice(2211, 2441);
fs.writeFileSync(
  path.join(__dirname, '../components/bookerEventWizard/BookerEventPickersModals.js'),
  `import React from 'react';
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
` +
    pickersBody
      .split('\n')
      .map((l) => '      ' + l)
      .join('\n') +
    `
    </>
  );
}
`
);

// --- post create modal ---
const postBody = slice(2443, 2491);
fs.writeFileSync(
  path.join(__dirname, '../components/bookerEventWizard/BookerEventPostCreateModal.js'),
  `import React from 'react';
import { Text, View, TouchableOpacity, Modal } from 'react-native';

export default function BookerEventPostCreateModal(props) {
  const { language, styles, postCreateModal, setPostCreateModal, navigate, goBack } = props;
  return (
` +
    postBody
      .split('\n')
      .map((l) => '    ' + l)
      .join('\n') +
    '\n  );\n}\n'
);

// --- thin main page ---
const chrome = slice(1252, 1308);
const jsxReturn = slice(1228, 1251) + '\n' + chrome + '\n        <View style={styles.form}>\n';

const thinMain = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useBookerEventWizard } from '../../hooks/useBookerEventWizard';
import { stepRequirementsHint } from '../../utils/bookerEventWizardUtils';
import { styles } from './BookerEventDashboardPage.styles';
import BookerEventStep1Date from '../../components/bookerEventWizard/sections/BookerEventStep1Date';
import BookerEventStep2Venue from '../../components/bookerEventWizard/sections/BookerEventStep2Venue';
import BookerEventStep3Djs from '../../components/bookerEventWizard/sections/BookerEventStep3Djs';
import BookerEventStep4Details from '../../components/bookerEventWizard/sections/BookerEventStep4Details';
import BookerEventStep5Summary from '../../components/bookerEventWizard/sections/BookerEventStep5Summary';
import BookerEventPickersModals from '../../components/bookerEventWizard/BookerEventPickersModals';
import BookerEventPostCreateModal from '../../components/bookerEventWizard/BookerEventPostCreateModal';

export default function BookerEventDashboardPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const {
    formData,
    setFormData,
    eventDateTime,
    setEventDateTime,
    resetForm,
    addDj,
    removeDj,
    setVenue,
    coverImageUri,
    setCoverImageUri,
    bookerEventWizardStep,
    setBookerEventWizardStep,
  } = useEventForm();

  const wizard = useBookerEventWizard({
    user,
    language,
    routeParams,
    navigate,
    goBack,
    showError,
    showSuccess,
    formData,
    setFormData,
    eventDateTime,
    setEventDateTime,
    resetForm,
    addDj,
    removeDj,
    setVenue,
    coverImageUri,
    setCoverImageUri,
    bookerEventWizardStep,
    setBookerEventWizardStep,
  });

  const {
    currentStep,
    setCurrentStep,
    creating,
    clearDraftAndRestartWizard,
    handleCreateEvent,
    draftGate,
    postCreateModal,
    setPostCreateModal,
    ...stepProps
  } = wizard;

  if (draftGate) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const shared = { language, styles, ...stepProps, formData, currentStep, setCurrentStep, navigate, creating };

  return (
` +
    jsxReturn +
    `
          {currentStep === 1 && <BookerEventStep1Date {...shared} />}
          {currentStep === 2 && <BookerEventStep2Venue {...shared} />}
          {currentStep === 3 && <BookerEventStep3Djs {...shared} />}
          {currentStep === 4 && <BookerEventStep4Details {...shared} />}
          {currentStep === 5 && <BookerEventStep5Summary {...shared} handleCreateEvent={handleCreateEvent} />}
        </View>
      </ScrollView>

      <BookerEventPickersModals
        language={language}
        styles={styles}
        showDatePicker={wizard.showDatePicker}
        setShowDatePicker={wizard.setShowDatePicker}
        showTimePicker={wizard.showTimePicker}
        setShowTimePicker={wizard.setShowTimePicker}
        tempDate={wizard.tempDate}
        setTempDate={wizard.setTempDate}
        tempTime={wizard.tempTime}
        setTempTime={wizard.setTempTime}
        setEventDateTime={setEventDateTime}
        handleChange={wizard.handleChange}
        slotTimePicker={wizard.slotTimePicker}
        setSlotTimePicker={wizard.setSlotTimePicker}
        tempSlotTime={wizard.tempSlotTime}
        setTempSlotTime={wizard.setTempSlotTime}
        updateSlotTimeFromPicker={wizard.updateSlotTimeFromPicker}
      />

      <BookerEventPostCreateModal
        language={language}
        styles={styles}
        postCreateModal={postCreateModal}
        setPostCreateModal={setPostCreateModal}
        navigate={navigate}
        goBack={goBack}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}
`;

// Fix Colors import in thin main
const thinFixed = thinMain.replace(
  'import { styles } from',
  "import Colors from '../../constants/colors';\nimport { styles } from"
);
fs.writeFileSync(srcPath, thinFixed);

console.log('Refactor booker event wizard done');
