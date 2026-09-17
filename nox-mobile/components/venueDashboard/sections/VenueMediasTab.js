import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import StarRating from '../../StarRating';
import { normalizeMediaUrl } from '../../../api/config';
import { SCREEN_WIDTH } from '../../../utils/venueDashboardUtils';

export default function VenueMediasTab(props) {
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
                <View style={styles.mediaHeader}>
                  <Text style={styles.sectionTitle}>{language === 'fr' ? 'Médias du lieu' : 'Venue media'}</Text>
                  <View style={styles.mediaActions}>
                    <TouchableOpacity
                      style={styles.addFileButton}
                      onPress={() => pickMedia('photo')}
                      disabled={savingMedia}
                    >
                      <Text style={styles.addFileButtonText}>{language === 'fr' ? '+ Photo' : '+ Photo'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addFileButton, styles.addFileButtonSecondary]}
                      onPress={() => pickMedia('video')}
                      disabled={savingMedia}
                    >
                      <Text style={styles.addFileButtonText}>{language === 'fr' ? '+ Vidéo' : '+ Video'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
    
                {/* Photos */}
                <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Photos' : 'Photos'}</Text>
                <Text style={styles.mediaHint}>
                  {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
                </Text>
                {photos.length > 0 ? (
                  <View style={styles.photoGrid}>
                    {photos.map((photo) => (
                      <View key={photo.id} style={styles.photoWrapper}>
                        <Image
                          source={{ uri: photo.url }}
                          style={styles.photoItem}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.deleteBadge}
                          onPress={() => handleDeleteMedia(photo)}
                          disabled={deletingMediaId === photo.id}
                        >
                          {deletingMediaId === photo.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.deleteBadgeText}>✕</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noMedia}>{language === 'fr' ? 'Aucune photo' : 'No photos yet'}</Text>
                )}
    
                {/* Vidéos */}
                <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Vidéos' : 'Videos'}</Text>
                <Text style={styles.mediaHint}>
                  {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
                </Text>
                {videos.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {videos.map((video) => (
                      <View key={video.id} style={styles.videoItem}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedVideo(video);
                            setVideoModalVisible(true);
                          }}
                        >
                          <View style={styles.videoPlaceholder}>
                            <Text style={styles.playIcon}>▶</Text>
                          </View>
                        </TouchableOpacity>
                        <View style={styles.videoRow}>
                          {video.title ? <Text style={styles.videoTitle}>{video.title}</Text> : <View />}
                          <TouchableOpacity
                            style={styles.deleteBadgeSmall}
                            onPress={() => handleDeleteMedia(video)}
                            disabled={deletingMediaId === video.id}
                          >
                            {deletingMediaId === video.id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.deleteBadgeText}>✕</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noMedia}>{language === 'fr' ? 'Aucune vidéo' : 'No videos yet'}</Text>
                )}
              </View>
  );
}
