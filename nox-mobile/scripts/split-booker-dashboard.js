/**
 * One-off helper: extrait sections/modales de BookerDashboardPage.js
 * Usage: node scripts/split-booker-dashboard.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'screens/dashboard/BookerDashboardPage.js');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);

const slice = (from, to) => lines.slice(from - 1, to).join('\n');

const profilBody = slice(1678, 1850);
const eventsBody = slice(1853, 2112);
const datePickersBody = slice(2116, 2271);
const chatBody = slice(2273, 2742);
const contractBody = slice(2744, 2989);
const editEventBody = slice(2991, 3113);

const profilFile = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/colors';
import { normalizeMediaUrl } from '../../../api/config';

/** Onglet profil — dashboard organisateur. */
export default function BookerProfilSection(props) {
  const {
    language,
    styles,
    loadingProfile,
    bookerProfile,
    profileImage,
    profileForm,
    setProfileForm,
    uploadingProfileImage,
    pickProfileImage,
    savingProfile,
    saveBookerProfile,
  } = props;

  return (
${profilBody.split('\n').map((l) => '    ' + l).join('\n')}
  );
}
`;

const eventsImports = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../../constants/colors';
import BookerTicketHoldersSection from '../../BookerTicketHoldersSection';

/** Liste des événements — dashboard organisateur. */
export default function BookerEventsSection(props) {
  const {
    language,
    styles,
    navigate,
    myEvents,
    loadingEvents,
    pulseEventId,
    openVenueChat,
    openPrestataireChat,
    openGroupChat,
    openChat,
    markBookingAsPaid,
    markingPaymentEventDjId,
    openEditEvent,
    handlePublishToFeed,
    publishingEventId,
    handleDeleteEvent,
    deletingEventId,
  } = props;

  return (
`;

const eventsFile = eventsImports + eventsBody.split('\n').map((l) => '    ' + l).join('\n') + '\n  );\n}\n';

const datePickersFile = `import React from 'react';
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
${datePickersBody.split('\n').map((l) => '      ' + l).join('\n')}
    </>
  );
}
`;

const chatImports = `import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { normalizeMediaUrl } from '../../../api/config';
import {
  buildVenueContractPayload,
  buildDjContractPayload,
  contractAcceptAckLabel,
  contractReadBeforeSendLabel,
  dealTypeLabel,
} from '../../../constants/contractPayload';
import ContractDraftEditorFields from '../../ContractDraftEditorFields';

/** Modal chat + contrat inline (dashboard organisateur). */
export default function BookerChatModal(props) {
`;

// chat modal needs many props - pass whole props object spread
const chatFile =
  chatImports +
  '  return (\n' +
  chatBody
    .split('\n')
    .map((l) => '    ' + l)
    .join('\n') +
  '\n  );\n}\n';

const contractImports = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import ContractDraftEditorFields from '../../ContractDraftEditorFields';
import DealTypePickerModal from '../../DealTypePickerModal';
import CancellationPolicyPickerModal from '../../CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../../EventEndTimePickerModal';
import ContractPdfPreviewModal from '../../ContractPdfPreviewModal';
import {
  buildVenueContractPayload,
  buildDjContractPayload,
} from '../../../constants/contractPayload';

/** Modals contrat hors chat (dashboard organisateur). */
export default function BookerContractModals(props) {
`;

const contractFile =
  contractImports +
  '  return (\n' +
  contractBody
    .split('\n')
    .map((l) => '    ' + l)
    .join('\n') +
  '\n  );\n}\n';

const editEventFile = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../../constants/colors';
import { normalizeMediaUrl } from '../../../api/config';

/** Modal édition événement (dashboard organisateur). */
export default function BookerEditEventModal(props) {
  const {
    language,
    styles,
    editEventVisible,
    setEditEventVisible,
    editEventDraft,
    setEditEventDraft,
    editEventSaving,
    editEventUploading,
    pickEditEventImage,
    saveEditEvent,
  } = props;

  return (
${editEventBody.split('\n').map((l) => '    ' + l).join('\n')}
  );
}
`;

const outDir = path.join(root, 'components/bookerDashboard');
const sectionsDir = path.join(outDir, 'sections');
fs.mkdirSync(sectionsDir, { recursive: true });

fs.writeFileSync(path.join(sectionsDir, 'BookerProfilSection.js'), profilFile);
fs.writeFileSync(path.join(sectionsDir, 'BookerEventsSection.js'), eventsFile);
fs.writeFileSync(path.join(outDir, 'BookerDateTimePickers.js'), datePickersFile);
fs.writeFileSync(path.join(outDir, 'BookerChatModal.js'), chatFile);
fs.writeFileSync(path.join(outDir, 'BookerContractModals.js'), contractFile);
fs.writeFileSync(path.join(outDir, 'BookerEditEventModal.js'), editEventFile);

console.log('Created booker dashboard components in', outDir);
