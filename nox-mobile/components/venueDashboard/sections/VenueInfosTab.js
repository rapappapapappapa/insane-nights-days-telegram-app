import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import StarRating from '../../StarRating';
import { normalizeMediaUrl } from '../../../api/config';
import { SCREEN_WIDTH } from '../../../utils/venueDashboardUtils';

export default function VenueInfosTab(props) {
  const {
    language, styles, venue, ratings, photos, videos, navigate, user,
    savingMedia, pickMedia, handleDeleteMedia, deletingMediaId,
    setSelectedVideo, setVideoModalVisible, bookings, loadingBookings,
    processingInvitation, openVenueChat, handleAcceptVenueInvitation,
    handleRejectVenueInvitation, handleCancelVenueBooking, showConfirm,
    setRejectModalVisible, setRejectModalEventVenueId, setRejectModalAction,
  } = props;
  return (
    <View style={styles.card}>
                <Text style={styles.venueName}>{venue.venueName}</Text>
                <Text style={styles.venueAddress}>📍 {venue.address}</Text>
                {ratings ? (
                  <View style={styles.ratingRow}>
                    <StarRating rating={ratings.averageRatingGlobal ?? 0} size={20} showStars={false} />
                    <Text style={styles.ratingValue}>{(ratings.averageRatingGlobal ?? 0).toFixed(1)} / 5</Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => navigate('venueProfile', { venueId: venue.id })}
                >
                  <Text style={styles.profileButtonText}>
                    {language === 'fr' ? 'Voir le profil public' : 'View public profile'}
                  </Text>
                </TouchableOpacity>
              </View>
  );
}
