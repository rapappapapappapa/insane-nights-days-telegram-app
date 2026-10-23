/**
 * Extrait les onglets de DjDashboardPage en composants sections/.
 */
const fs = require('fs');
const path = require('path');

const mobileRoot = path.join(__dirname, '..', '..', 'nox-mobile');
const pagePath = path.join(mobileRoot, 'screens', 'dashboard', 'DjDashboardPage.js');
const lines = fs.readFileSync(pagePath, 'utf8').split('\n');
const sectionsDir = path.join(mobileRoot, 'components', 'djDashboard', 'sections');
fs.mkdirSync(sectionsDir, { recursive: true });

const PROP_KEYS = [
  'language', 'styles', 'navigate', 'showConfirm', 'Colors', 'djProfile',
  'bannerImage', 'profileImage', 'uploadingBannerImage', 'uploadingProfileImage',
  'pickDjProfileImage', 'artistName', 'pseudo', 'setPseudo', 'realName',
  'legalName', 'setLegalName', 'address', 'setAddress', 'postalCode', 'setPostalCode',
  'country', 'setCountry', 'siret', 'setSiret', 'vatNumber', 'setVatNumber',
  'bio', 'setBio', 'birthDate', 'genre', 'setGenre', 'city', 'mainCity', 'setMainCity',
  'languages', 'setLanguages', 'soundcloudUrl', 'setSoundcloudUrl', 'spotifyUrl', 'setSpotifyUrl',
  'youtubeUrl', 'setYoutubeUrl', 'instagramUrl', 'setInstagramUrl', 'tiktokUrl', 'setTiktokUrl',
  'handleSave', 'saving', 'availableDays', 'toggleDay', 'availableStatus', 'setAvailableStatus',
  'equipment', 'setEquipment', 'bookings', 'loadingBookings', 'processingInvitation',
  'openChat', 'openGroupChat', 'handleAcceptInvitation', 'handleRejectInvitation', 'handleCancelBooking',
  'ratingsData', 'loadingRatings', 'fetchRatings', 'photos', 'setPhotos', 'videos', 'setVideos',
  'pickImage', 'pickVideo', 'deleteMedia', 'setSelectedVideo', 'setVideoPlayerVisible',
  'setEditingTitle', 'setEditTitleValue', 'normalizeMediaUrl',
];

const destructureBlock = `  const {
    ${PROP_KEYS.join(',\n    ')},
  } = props;\n`;

const reactImports = `import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/colors';
import StarRating from '../../StarRating';
`;

const sections = [
  { name: 'DjProfilSection', start: 1431, end: 1780 },
  { name: 'DjTarifsSection', start: 1783, end: 1856 },
  { name: 'DjMaterielSection', start: 1859, end: 1899 },
  { name: 'DjBookingsSection', start: 1902, end: 2204 },
  { name: 'DjAvisSection', start: 2207, end: 2297 },
  { name: 'DjPaiementsSection', start: 2300, end: 2316 },
  { name: 'DjMediasSection', start: 2319, end: 2532 },
];

for (const s of sections) {
  let body = lines.slice(s.start - 1, s.end).join('\n');
  body = body.replace(/^\s*return\s*\(\s*\n?/, '');
  body = body.replace(/\n\s*\);\s*$/, '\n');

  if (s.name === 'DjBookingsSection') {
    body = body.replace(
      /^\s*\/\/[^\n]*\n\s*const pendingInvitations[^\n]+\n\s*const acceptedBookings[^\n]+\n\s*const rejectedInvitations[^\n]+\n\s*\n\s*return\s*\(\s*\n?/,
      '',
    );
  }

  const preBody =
    s.name === 'DjBookingsSection'
      ? `  const pendingInvitations = bookings.filter(b => b.invitationStatus === 'PENDING');
  const acceptedBookings = bookings.filter(b => b.invitationStatus === 'ACCEPTED');
  const rejectedInvitations = bookings.filter(b => b.invitationStatus === 'REJECTED');

`
      : '';

  const content = `${reactImports}
/** Onglet dashboard DJ. */
export default function ${s.name}(props) {
${destructureBlock}
${preBody}  return (
${body}
  );
}
`;
  fs.writeFileSync(path.join(sectionsDir, `${s.name}.js`), content);
  console.log('Wrote', s.name);
}

const renderContentStart = lines.findIndex((l) => l.includes('const renderContent = () => {'));
let renderContentEnd = -1;
let depth = 0;
for (let i = renderContentStart; i < lines.length; i++) {
  if (lines[i].includes('const renderContent')) depth = 1;
  if (i > renderContentStart && lines[i].trim() === '};' && lines[i + 1]?.trim() === '') {
    renderContentEnd = i;
    break;
  }
}

const importsBlock = `import DjProfilSection from '../../components/djDashboard/sections/DjProfilSection';
import DjTarifsSection from '../../components/djDashboard/sections/DjTarifsSection';
import DjMaterielSection from '../../components/djDashboard/sections/DjMaterielSection';
import DjBookingsSection from '../../components/djDashboard/sections/DjBookingsSection';
import DjAvisSection from '../../components/djDashboard/sections/DjAvisSection';
import DjPaiementsSection from '../../components/djDashboard/sections/DjPaiementsSection';
import DjMediasSection from '../../components/djDashboard/sections/DjMediasSection';
`;

const propObject = PROP_KEYS.map((k) => `    ${k},`).join('\n');

const newRenderBlock = `  const dashboardProps = {
${propObject}
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'profil':
        return <DjProfilSection {...dashboardProps} />;
      case 'tarifs':
        return <DjTarifsSection {...dashboardProps} />;
      case 'materiel':
        return <DjMaterielSection {...dashboardProps} />;
      case 'bookings':
        return <DjBookingsSection {...dashboardProps} />;
      case 'avis':
        return <DjAvisSection {...dashboardProps} />;
      case 'paiements':
        return <DjPaiementsSection {...dashboardProps} />;
      case 'medias':
        return <DjMediasSection {...dashboardProps} />;
      default:
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {menuItems.find((item) => item.id === activeSection)?.label || 'Section'}
            </Text>
            <Text style={styles.comingSoon}>
              {language === 'fr' ? 'Bientôt disponible...' : 'Coming soon...'}
            </Text>
          </View>
        );
    }
  };`;

let main = lines.join('\n');
if (!main.includes('DjProfilSection')) {
  main = main.replace(
    "import { styles, SIDEBAR_WIDTH } from './DjDashboardPage.styles';",
    `import { styles, SIDEBAR_WIDTH } from './DjDashboardPage.styles';\n${importsBlock}`,
  );
}

const before = lines.slice(0, renderContentStart).join('\n');
const after = lines.slice(renderContentEnd + 1).join('\n');
main = `${before}\n${newRenderBlock}\n${after}`;
fs.writeFileSync(pagePath, main);
console.log('Updated DjDashboardPage.js, lines:', main.split('\n').length);
