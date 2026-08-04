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
export default function DjAvisSection(props) {
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
              {language === 'fr' ? 'AVIS & NOTES' : 'REVIEWS & RATINGS'}
            </Text>
            {loadingRatings ? (
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.loadingText}>
                  {language === 'fr' ? 'Chargement des avis...' : 'Loading reviews...'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.reviewSummaryCard}>
                  <View style={styles.reviewSummaryTop}>
                    <Text style={styles.reviewSummaryTitle}>
                      {language === 'fr' ? 'Note globale' : 'Overall rating'}
                    </Text>
                    <TouchableOpacity onPress={fetchRatings} activeOpacity={0.8}>
                      <Text style={styles.reviewRefresh}>
                        {language === 'fr' ? 'Rafraîchir' : 'Refresh'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.reviewSummaryRow}>
                    <Text style={styles.reviewSummaryScore}>
                      {ratingsData?.ratings?.averageRatingGlobal?.toFixed
                        ? ratingsData.ratings.averageRatingGlobal.toFixed(1)
                        : (ratingsData?.ratings?.averageRatingGlobal ?? '—')}
                      /5
                    </Text>
                    <StarRating
                      rating={Number(ratingsData?.ratings?.averageRatingGlobal || 0)}
                      size={18}
                      showStars={true}
                    />
                  </View>

                  <Text style={styles.reviewSummaryMeta}>
                    {language === 'fr' ? 'Communauté' : 'Community'}: {ratingsData?.ratings?.totalRatingsCommunity ?? 0} •{' '}
                    {language === 'fr' ? 'Organisateur' : 'Organizer'}: {ratingsData?.ratings?.totalRatingsBooker ?? 0} •{' '}
                    {language === 'fr' ? 'Lieu' : 'Venue'}: {ratingsData?.ratings?.totalRatingsVenue ?? 0}
                  </Text>
                </View>

                {Array.isArray(ratingsData?.ratings?.allRatings) && ratingsData.ratings.allRatings.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {ratingsData.ratings.allRatings.slice(0, 20).map((r) => (
                      <View key={r.id} style={styles.reviewCard}>
                        <View style={styles.reviewCardTop}>
                          <Text style={styles.reviewCardType}>
                            {r.raterType === 'COMMUNITY'
                              ? (language === 'fr' ? 'Communauté' : 'Community')
                              : r.raterType === 'BOOKER'
                                ? (language === 'fr' ? 'Organisateur' : 'Organizer')
                                : (language === 'fr' ? 'Lieu' : 'Venue')}
                          </Text>
                          <StarRating rating={Number(r.rating || 0)} size={16} showStars={true} />
                        </View>
                        <Text style={styles.reviewCardEvent} numberOfLines={2}>
                          {r.eventTitle || (language === 'fr' ? 'Événement' : 'Event')}
                        </Text>
                        {r.comment ? (
                          <Text style={styles.reviewCardComment}>{r.comment}</Text>
                        ) : (
                          <Text style={styles.reviewCardCommentEmpty}>
                            {language === 'fr' ? 'Aucun commentaire.' : 'No comment.'}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>⭐</Text>
                    <Text style={styles.emptyStateText}>
                      {language === 'fr' ? 'Aucun avis pour le moment' : 'No reviews yet'}
                    </Text>
                    <Text style={styles.emptyStateSubtext}>
                      {language === 'fr'
                        ? 'Les avis apparaîtront ici après des événements notés.'
                        : 'Reviews will appear here after rated events.'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

  );
}
