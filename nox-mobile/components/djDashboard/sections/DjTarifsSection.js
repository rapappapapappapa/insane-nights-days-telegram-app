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
export default function DjTarifsSection(props) {
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
<KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          >
            <ScrollView 
              style={styles.contentScroll} 
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'DISPONIBILITÉS' : 'AVAILABILITIES'}
          </Text>

          <Text style={styles.comingSoon}>
            {language === 'fr'
              ? 'Le prix sera fixé via un contrat avec l\'organisateur (dans le chat privé).'
              : 'Pricing will be agreed via a contract with the organizer (in private chat).'}
          </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Disponibilités' : 'Availabilities'}</Text>
              <View style={styles.daysContainer}>
                {Object.keys(availableDays).map((day) => (
          <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      availableDays[day] && styles.dayButtonActive
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      availableDays[day] && styles.dayButtonTextActive
                    ]}>
                      {day}
              </Text>
          </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.switchContainer}>
                <Text style={styles.label}>{language === 'fr' ? 'Statut' : 'Status'}</Text>
                <TouchableOpacity
                  style={[styles.toggle, availableStatus && styles.toggleActive]}
                  onPress={() => setAvailableStatus(!availableStatus)}
                >
                  <View style={[styles.toggleThumb, availableStatus && styles.toggleThumbActive]} />
                </TouchableOpacity>
              </View>
              <Text style={styles.statusText}>
                {availableStatus 
                  ? (language === 'fr' ? 'Disponible' : 'Available')
                  : (language === 'fr' ? 'Indisponible' : 'Unavailable')}
              </Text>
        </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                  {language === 'fr' ? 'Enregistrer' : 'Save'}
              </Text>
            )}
          </TouchableOpacity>
      </ScrollView>
          </KeyboardAvoidingView>

  );
}
