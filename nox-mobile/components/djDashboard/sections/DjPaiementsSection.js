import React from 'react';
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

/** Onglet dashboard DJ. */
export default function DjPaiementsSection(props) {
  const {
    language,
    styles,
    navigate,
    showConfirm,
    Colors,
    djProfile,
    bannerImage,
    profileImage,
    uploadingBannerImage,
    uploadingProfileImage,
    pickDjProfileImage,
    artistName,
    pseudo,
    setPseudo,
    realName,
    legalName,
    setLegalName,
    address,
    setAddress,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    siret,
    setSiret,
    vatNumber,
    setVatNumber,
    bio,
    setBio,
    birthDate,
    genre,
    setGenre,
    city,
    mainCity,
    setMainCity,
    languages,
    setLanguages,
    soundcloudUrl,
    setSoundcloudUrl,
    spotifyUrl,
    setSpotifyUrl,
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    tiktokUrl,
    setTiktokUrl,
    handleSave,
    saving,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    equipment,
    setEquipment,
    bookings,
    loadingBookings,
    processingInvitation,
    openChat,
    openGroupChat,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    ratingsData,
    loadingRatings,
    fetchRatings,
    photos,
    setPhotos,
    videos,
    setVideos,
    pickImage,
    pickVideo,
    deleteMedia,
    setSelectedVideo,
    setVideoPlayerVisible,
    setEditingTitle,
    setEditTitleValue,
    normalizeMediaUrl,
  } = props;

  return (
<ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'PAIEMENTS' : 'PAYMENTS'}
            </Text>
            <Text style={styles.comingSoon}>
              {language === 'fr'
                ? 'Pour le moment, cette section affiche vos achats (tickets). Les paiements “DJ” (revenus) seront ajoutés plus tard.'
                : 'For now, this section shows your purchases (tickets). DJ payouts/earnings will be added later.'}
            </Text>
            <TouchableOpacity style={styles.saveButton} onPress={() => navigate('purchases')}>
              <Text style={styles.saveButtonText}>
                {language === 'fr' ? 'Voir mes achats' : 'View my purchases'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

  );
}
