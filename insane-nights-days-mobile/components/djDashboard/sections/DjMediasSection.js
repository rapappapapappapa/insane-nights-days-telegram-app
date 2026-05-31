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
export default function DjMediasSection(props) {
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
            <View style={styles.mediaHeader}>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'MÉDIAS' : 'MEDIA'}
              </Text>
              <TouchableOpacity style={styles.addFileButton} onPress={pickImage}>
                <Text style={styles.addFileButtonText}>
                  {language === 'fr' ? '+ Ajouter un fichier' : '+ Add a file'}
                </Text>
              </TouchableOpacity>
    </View>

            {/* Photos */}
            <Text style={styles.mediaSubtitle}>
              {language === 'fr' ? 'PHOTOS' : 'PHOTOS'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr'
                ? 'Galerie de portfolio. Pour la photo de profil ou la bannière : onglet « Profil artiste », touchez l’image — la galerie s’ouvre directement.'
                : 'Portfolio gallery. For profile photo or banner: open « Artist Profile », tap the image — your gallery opens directly.'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            <View style={styles.mediaGrid}>
              {photos.map((photo, index) => (
                <View key={photo.id || index} style={styles.mediaItem}>
                  <Image source={{ uri: normalizeMediaUrl(photo.url) }} style={styles.mediaImage} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      if (photo.id) {
                        showConfirm(
                          language === 'fr' ? 'Supprimer' : 'Delete',
                          language === 'fr' ? 'Supprimer cette photo ?' : 'Delete this photo?',
                          [
                            { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                            { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteMedia(photo.id, 'photo') },
                          ]
                        );
                      } else {
                        // Si pas d'ID, supprimer seulement de l'état local
                        setPhotos(photos.filter((_, i) => i !== index));
                      }
                    }}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addMediaButton} onPress={pickImage}>
                <Text style={styles.addMediaButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Vidéos */}
            <Text style={styles.mediaSubtitle}>
              {language === 'fr' ? 'VIDÉOS' : 'VIDEOS'}
            </Text>
            <Text style={styles.mediaHint}>
              {language === 'fr' ? 'Taille max ~100 Mo par média' : 'Max size ~100 MB per media'}
            </Text>
            <View style={styles.mediaList}>
              {videos.map((video, index) => {
                const rawVideoUrl = video?.url || (typeof video === 'string' ? video : null);
                const videoUrl = normalizeMediaUrl(rawVideoUrl);
                const videoTitle = video?.title || `${language === 'fr' ? 'Vidéo' : 'Video'} ${index + 1}`;
                
                if (!videoUrl || typeof videoUrl !== 'string') {
                  return null;
                }
                
                const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                const isLocalFile = videoUrl.startsWith('local:') ||
                  (videoTitle && typeof videoTitle === 'string' && (
                    videoTitle.toLowerCase().includes('tracer') || 
                    videoTitle.toLowerCase().includes('gogg')
                  )) ||
                  (!videoUrl.startsWith('http') && !videoUrl.startsWith('file://'));
                
                let finalVideoUrl = videoUrl;
                if (isLocalFile) {
                  // Vidéos locales : pas de require statique (asset absent du repo) — URL normalisée ou ignorée
                  finalVideoUrl = normalizeMediaUrl(videoUrl) || videoUrl;
                } else {
                  // Pour les URLs HTTP/HTTPS, s'assurer qu'elles sont complètes
                  if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
                    // Vérifier si c'est une URL de l'ancien tunnel Cloudflare et la remplacer
                    const oldTunnelPattern = /https?:\/\/[^\/]+\.trycloudflare\.com/;
                    if (oldTunnelPattern.test(videoUrl)) {
                      // Remplacer l'ancienne URL du tunnel par la nouvelle
                      finalVideoUrl = normalizeMediaUrl(videoUrl);
                    } else {
                      finalVideoUrl = videoUrl;
                    }
                  } else {
                    finalVideoUrl = normalizeMediaUrl(videoUrl);
                  }
                }
                
                let youtubeId = null;
                if (isYouTube) {
                  const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                  if (match) youtubeId = match[1];
                }
                const thumbnailUrl = youtubeId 
                  ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
                  : null;
                
                return (
                  <TouchableOpacity
                    key={video.id || index}
                    style={styles.videoItem}
                    onPress={() => {
                      setSelectedVideo({
                        url: isYouTube ? videoUrl : finalVideoUrl,
                        title: videoTitle,
                        thumbnail: thumbnailUrl,
                        isYouTube: isYouTube,
                      });
                      setVideoPlayerVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.videoThumbnail}>
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={styles.videoThumbnailImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.videoPlaceholder}>
                          <Text style={styles.videoPlaceholderIcon}>🎬</Text>
                          <Text style={styles.videoPlaceholderText} numberOfLines={2}>
                            {videoTitle}
                          </Text>
                        </View>
                      )}
                      <View style={styles.playButtonOverlay}>
                        <Text style={styles.playIconWhite}>▶</Text>
                      </View>
                    </View>
                    <View style={styles.videoInfo}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {videoTitle}
                      </Text>
                    </View>
                    <View style={styles.videoActions}>
                      {video.id && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            setEditingTitle({ type: 'video', id: video.id, currentTitle: videoTitle });
                            setEditTitleValue(videoTitle);
                          }}
                        >
                          <Text style={styles.editButtonText}>✏️</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.deleteButtonVideo}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (video.id) {
                            showConfirm(
                              language === 'fr' ? 'Supprimer' : 'Delete',
                              language === 'fr' ? 'Supprimer cette vidéo ?' : 'Delete this video?',
                              [
                                { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                                { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => deleteMedia(video.id, 'video') },
                              ]
                            );
                          } else {
                            setVideos(videos.filter((_, i) => i !== index));
                          }
                        }}
                      >
                        <Text style={styles.deleteButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity 
                style={styles.addVideoButton} 
                onPress={() => {
                  console.log('[Bouton] Add video pressé');
                  pickVideo();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.addVideoButtonText}>
                  {language === 'fr' ? '+ Ajouter une vidéo' : '+ Add video'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.mediaHint, styles.mediaHintLinks]}>
              {language === 'fr'
                ? 'Pas de fichiers audio hébergés ici (droits d’auteur). Pour la musique : liens Spotify / SoundCloud dans l’onglet Profil.'
                : 'No hosted audio here (copyright). For music: Spotify / SoundCloud links under Profile.'}
            </Text>
          </ScrollView>

  );
}
