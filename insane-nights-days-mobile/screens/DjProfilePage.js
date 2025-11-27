import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import StarRating from '../components/StarRating';
import VideoPlayer from '../components/VideoPlayer';
import AudioPlayer from '../components/AudioPlayer';

const { width } = Dimensions.get('window');

// Générer une image différente basée sur le nom du DJ
const getDjImage = (djName) => {
  if (!djName) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';
  // Utiliser le hash du nom pour sélectionner une image différente
  const hash = djName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const images = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
  ];
  return images[hash % images.length];
};

// Générer une image de background différente
const getDjBackgroundImage = (djName) => {
  if (!djName) return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop';
  const hash = djName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const images = [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
  ];
  return images[hash % images.length];
};

export default function DjProfilePage() {
  const { language } = useLanguage();
  const { routeParams, goBack } = useNavigation();
  const { user } = useAuth();
  const { djId, djUserId } = routeParams || {};
  
  const [dj, setDj] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audio');
  const [media, setMedia] = useState({ photos: [], videos: [], audio: [] });
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);

  useEffect(() => {
    if (djId || djUserId) {
      fetchDjProfile();
    }
  }, [djId, djUserId]);

  const fetchDjProfile = async () => {
    setLoading(true);
    try {
      // Récupérer les notes et les infos du DJ
      const identifier = djUserId || djId;
      const ratingsResponse = await api.getDjRatings(identifier);
      
      if (ratingsResponse && ratingsResponse.success) {
        setRatings(ratingsResponse.ratings);
        // Utiliser les infos du DJ depuis l'API
        if (ratingsResponse.dj) {
          setDj({
            id: ratingsResponse.dj.id,
            userId: ratingsResponse.dj.userId,
            artistName: ratingsResponse.dj.artistName,
            city: ratingsResponse.dj.city,
            phone: ratingsResponse.dj.phone,
            birthDate: ratingsResponse.dj.birthDate,
            // Champs éditables
            bio: ratingsResponse.dj.bio,
            genre: ratingsResponse.dj.genre,
            mainCity: ratingsResponse.dj.mainCity,
            languages: ratingsResponse.dj.languages,
            hourlyRate: ratingsResponse.dj.hourlyRate,
            performanceRate: ratingsResponse.dj.performanceRate,
            minTravelFee: ratingsResponse.dj.minTravelFee,
            extraFees: ratingsResponse.dj.extraFees,
            availableStatus: ratingsResponse.dj.availableStatus,
            averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
          });

          // Récupérer les médias (depuis la réponse ou via API séparée)
          const allMedia = ratingsResponse.media || [];
          if (allMedia.length > 0) {
            setMedia({
              photos: allMedia.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner'),
              videos: allMedia.filter(m => m.type === 'video'),
              audio: allMedia.filter(m => m.type === 'audio'),
            });
            
            // Photo de profil et bannière
            const profileImg = allMedia.find(m => m.type === 'photo' && m.title === 'profile');
            const bannerImg = allMedia.find(m => m.type === 'photo' && m.title === 'banner');
            if (profileImg) setProfileImage(profileImg.url);
            if (bannerImg) setBannerImage(bannerImg.url);
          } else {
            // Fallback : récupérer les médias via API séparée
            try {
              const mediaResponse = await api.getDjMedia(identifier);
              if (mediaResponse && mediaResponse.success) {
                const mediaList = mediaResponse.media || [];
                setMedia({
                  photos: mediaList.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner'),
                  videos: mediaList.filter(m => m.type === 'video'),
                  audio: mediaList.filter(m => m.type === 'audio'),
                });
                
                const profileImg = mediaList.find(m => m.type === 'photo' && m.title === 'profile');
                const bannerImg = mediaList.find(m => m.type === 'photo' && m.title === 'banner');
                if (profileImg) setProfileImage(profileImg.url);
                if (bannerImg) setBannerImage(bannerImg.url);
              }
            } catch (mediaError) {
              console.error('Erreur récupération médias:', mediaError);
            }
          }
        } else {
          // Fallback si les infos ne sont pas disponibles
          setDj({
            id: djId,
            userId: djUserId,
            artistName: routeParams?.djName || 'DJ',
            city: 'Ville inconnue',
            averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
          });
        }
      }
    } catch (error) {
      console.error('Erreur récupération profil DJ:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Impossible de charger le profil.' : 'Unable to load profile.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a1a" />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!dj || !ratings) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === 'fr' ? 'Profil non trouvé' : 'Profile not found'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" />
      
      {/* Header avec photo de profil et background */}
      <View style={styles.header}>
        <View style={styles.backgroundImage}>
          <Image
            source={{ uri: bannerImage || getDjBackgroundImage(dj.artistName) }}
            style={styles.backgroundImageContent}
            blurRadius={3}
          />
        </View>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: profileImage || getDjImage(dj.artistName) }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.djName}>{dj.artistName}</Text>
          <Text style={styles.djLocation}>📍 {dj.mainCity || dj.city || 'Ville inconnue'}, France</Text>
          <TouchableOpacity style={styles.bookButton}>
            <Text style={styles.bookButtonText}>
              {language === 'fr' ? 'BOOKER CE DJ' : 'BOOK THIS DJ'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Infos clés et Bio */}
      <View style={styles.infoSection}>
        <View style={styles.infoColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Infos clés' : 'Key Info'}
          </Text>
          {dj.genre && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {language === 'fr' ? 'Genre:' : 'Genre:'}
              </Text>
              <Text style={styles.infoValue}>{dj.genre}</Text>
            </View>
          )}
          {dj.hourlyRate && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {language === 'fr' ? 'Tarif horaire:' : 'Hourly Rate:'}
              </Text>
              <Text style={styles.infoValue}>{dj.hourlyRate} € / {language === 'fr' ? 'heure' : 'hour'}</Text>
            </View>
          )}
          {dj.performanceRate && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {language === 'fr' ? 'Tarif prestation:' : 'Performance Rate:'}
              </Text>
              <Text style={styles.infoValue}>{dj.performanceRate} €</Text>
            </View>
          )}
          {dj.availableStatus !== undefined && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {language === 'fr' ? 'Disponibilité:' : 'Availability:'}
              </Text>
              <Text style={styles.infoValue}>
                {dj.availableStatus 
                  ? (language === 'fr' ? 'Disponible' : 'Available')
                  : (language === 'fr' ? 'Indisponible' : 'Unavailable')}
              </Text>
            </View>
          )}
          {dj.languages && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>
                {language === 'fr' ? 'Langues:' : 'Languages:'}
              </Text>
              <Text style={styles.infoValue}>{dj.languages}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.bioColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Bio du DJ' : 'DJ Bio'}
          </Text>
          <Text style={styles.bioText}>
            {dj.bio || (language === 'fr'
              ? 'Aucune biographie disponible.'
              : 'No biography available.')}
          </Text>
        </View>
      </View>

      {/* Réseaux sociaux */}
      <View style={styles.socialSection}>
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialIcon}>🎵</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialIcon}>☁️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialIcon}>🎧</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialIcon}>▶️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialIcon}>🎬</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <Text style={styles.socialIcon}>📷</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs pour Sets Audio, Vidéos, Photos, Stories */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audio' && styles.tabActive]}
          onPress={() => setActiveTab('audio')}
        >
          <Text style={[styles.tabText, activeTab === 'audio' && styles.tabTextActive]}>
            {language === 'fr' ? 'SETS AUDIO' : 'AUDIO SETS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'video' && styles.tabActive]}
          onPress={() => setActiveTab('video')}
        >
          <Text style={[styles.tabText, activeTab === 'video' && styles.tabTextActive]}>
            {language === 'fr' ? 'VIDÉOS' : 'VIDEOS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photo' && styles.tabActive]}
          onPress={() => setActiveTab('photo')}
        >
          <Text style={[styles.tabText, activeTab === 'photo' && styles.tabTextActive]}>
            {language === 'fr' ? 'PHOTOS' : 'PHOTOS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stories' && styles.tabActive]}
          onPress={() => setActiveTab('stories')}
        >
          <Text style={[styles.tabText, activeTab === 'stories' && styles.tabTextActive]}>
            {language === 'fr' ? 'STORIES' : 'STORIES'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu des tabs */}
      {activeTab === 'audio' && (
        <View style={styles.mediaContent}>
          {media.audio && media.audio.length > 0 ? (
            media.audio
              .filter(audio => {
                // Filtrer les fichiers audio invalides
                const audioUrl = audio?.url || (typeof audio === 'string' ? audio : null);
                return audioUrl && typeof audioUrl === 'string';
              })
              .map((audio, index) => {
                const audioUrl = audio?.url || (typeof audio === 'string' ? audio : null);
                const audioTitle = audio?.title || `${language === 'fr' ? 'Set audio' : 'Audio Set'} ${index + 1}`;
                
                if (!audioUrl || typeof audioUrl !== 'string') {
                  return null;
                }

                // Pour les fichiers locaux (comme "Tracer"), utiliser require
                let finalAudioUrl = audioUrl;
                if (audioTitle.toLowerCase().includes('tracer') || 
                    audioTitle.toLowerCase().includes('gogg') ||
                    audioUrl.includes('tracer') || 
                    audioUrl.includes('gogg')) {
                  try {
                    // Si c'est un fichier local, on peut essayer de le charger
                    // Pour l'instant, on utilise l'URL telle quelle
                    finalAudioUrl = audioUrl;
                  } catch (e) {
                    console.error('Erreur chargement audio local:', e);
                    finalAudioUrl = audioUrl;
                  }
                }

                return (
                  <AudioPlayer
                    key={audio?.id || index}
                    audioUrl={finalAudioUrl}
                    title={audioTitle}
                  />
                );
              })
          ) : (
            <Text style={styles.noMedia}>
              {language === 'fr' ? 'Aucun set audio disponible' : 'No audio sets available'}
            </Text>
          )}
        </View>
      )}

      {activeTab === 'video' && (
        <View style={styles.mediaContent}>
          {media.videos && media.videos.length > 0 ? (
            <View style={styles.videoGrid}>
              {media.videos
                .filter(video => {
                  // Filtrer les vidéos invalides
                  const videoUrl = video?.url || (typeof video === 'string' ? video : null);
                  return videoUrl && typeof videoUrl === 'string';
                })
                .map((video, index) => {
                const videoUrl = video?.url || (typeof video === 'string' ? video : null);
                const videoTitle = video?.title || `${language === 'fr' ? 'Vidéo' : 'Video'} ${index + 1}`;
                
                // Double vérification (déjà filtré mais sécurité supplémentaire)
                if (!videoUrl || typeof videoUrl !== 'string') {
                  return null;
                }
                
                const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                
                // Détecter si c'est un fichier local (par titre, URL ou préfixe "local:")
                const isLocalFile = videoUrl.startsWith('local:') ||
                  (videoTitle && typeof videoTitle === 'string' && (
                    videoTitle.toLowerCase().includes('tracer') || 
                    videoTitle.toLowerCase().includes('gogg')
                  )) ||
                  (!videoUrl.startsWith('http') && !videoUrl.startsWith('file://'));
                
                // Pour les fichiers locaux, utiliser require pour charger depuis assets
                let finalVideoUrl = videoUrl;
                if (isLocalFile) {
                  try {
                    // Si l'URL contient "gogg" ou "tracer", ou si le titre le contient, charger le fichier local
                    if (videoUrl.includes('gogg') || videoUrl.includes('tracer') || 
                        (videoTitle && typeof videoTitle === 'string' && videoTitle.toLowerCase().includes('tracer'))) {
                      finalVideoUrl = require('../assets/videos/gogg-tracer.mp4');
                    } else {
                      finalVideoUrl = videoUrl;
                    }
                  } catch (e) {
                    console.error('Erreur chargement vidéo locale:', e);
                    finalVideoUrl = videoUrl;
                  }
                }
                
                // Extraire l'ID YouTube pour la miniature
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
                    key={video?.id || index}
                    style={styles.videoItem}
                    onPress={async () => {
                      if (!videoUrl) {
                        Alert.alert(
                          language === 'fr' ? 'Erreur' : 'Error',
                          language === 'fr' 
                            ? 'URL vidéo invalide.' 
                            : 'Invalid video URL.'
                        );
                        return;
                      }
                      
                      // Ouvrir toutes les vidéos dans le lecteur intégré
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
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {videoTitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.noMedia}>
              {language === 'fr' ? 'Aucune vidéo disponible' : 'No videos available'}
            </Text>
          )}
        </View>
      )}

      {activeTab === 'photo' && (
        <View style={styles.mediaContent}>
          {media.photos && media.photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {media.photos
                .filter(photo => {
                  // Filtrer les photos invalides
                  const photoUrl = photo?.url || (typeof photo === 'string' ? photo : null);
                  return photoUrl && typeof photoUrl === 'string';
                })
                .map((photo, index) => {
                  // Gérer les deux formats : objet { url } ou string
                  const photoUrl = photo?.url || (typeof photo === 'string' ? photo : null);
                  
                  if (!photoUrl || typeof photoUrl !== 'string') {
                    return null;
                  }
                  
                  return (
                    <Image
                      key={photo?.id || index}
                      source={{ uri: photoUrl }}
                      style={styles.photoItem}
                      resizeMode="cover"
                    />
                  );
                })}
            </View>
          ) : (
            <Text style={styles.noMedia}>
              {language === 'fr' ? 'Aucune photo disponible' : 'No photos available'}
            </Text>
          )}
        </View>
      )}

      {/* Section Avis et Matériel */}
      <View style={styles.bottomSection}>
        <View style={styles.reviewsColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Avis au DJ' : 'DJ Reviews'}
          </Text>
          {ratings.allRatings && ratings.allRatings.length > 0 ? (
            ratings.allRatings.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewIcon}>💬</Text>
                  <Text style={styles.reviewerName}>
                    {review.raterType === 'COMMUNITY'
                      ? language === 'fr' ? 'Communauté' : 'Community'
                      : review.raterType === 'BOOKER'
                      ? 'Booker'
                      : language === 'fr' ? 'Lieu' : 'Venue'}
                  </Text>
                </View>
                <StarRating rating={review.rating} size={16} showStars={false} />
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>
              {language === 'fr' ? 'Aucun avis pour le moment' : 'No reviews yet'}
            </Text>
          )}
        </View>

        <View style={styles.equipmentColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Matériel' : 'Equipment'}
          </Text>
          <View style={styles.equipmentList}>
            <Text style={styles.equipmentItem}>• CDJ-3000</Text>
            <Text style={styles.equipmentItem}>• DJM-900NX32</Text>
            <Text style={styles.equipmentItem}>• Moniteurs Pioneer</Text>
          </View>
        </View>
      </View>

      {/* Calendrier */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity>
            <Text style={styles.calendarArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {language === 'fr' ? 'Calendrier' : 'Calendar'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.calendarArrow}>→</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.eventBox}>
          <Text style={styles.eventDate}>27 AVR 2024</Text>
          <Text style={styles.eventName}>REFLEX</Text>
        </View>
        <Text style={styles.pastEventsTitle}>
          {language === 'fr' ? 'ÉVÈNEMENTS PASSÉS' : 'PAST EVENTS'}
        </Text>
        <View style={styles.pastEventBox}>
          <Text style={styles.pastEventDate}>02 MAR 2024</Text>
        </View>
      </View>

      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Text style={styles.backButtonText}>
          ← {language === 'fr' ? 'Retour' : 'Back'}
        </Text>
      </TouchableOpacity>

      {/* Lecteur vidéo modal */}
      {selectedVideo && (
        <VideoPlayer
          videoUrl={selectedVideo.url}
          thumbnailUrl={selectedVideo.thumbnail}
          title={selectedVideo.title}
          isYouTube={selectedVideo.isYouTube || false}
          visible={videoPlayerVisible}
          onClose={() => {
            setVideoPlayerVisible(false);
            setSelectedVideo(null);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  header: {
    height: 300,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImageContent: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  profileSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#ff7a1a',
    overflow: 'hidden',
    marginBottom: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  djName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  djLocation: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  bookButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ff7a1a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  bookButtonText: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#1a1a1f',
  },
  infoColumn: {
    flex: 1,
    paddingRight: 10,
  },
  bioColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,122,26,0.3)',
    marginHorizontal: 10,
  },
  sectionTitle: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  socialSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.5)',
    backgroundColor: 'rgba(255,122,26,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabActive: {
    borderBottomColor: '#ff7a1a',
    backgroundColor: 'rgba(255,122,26,0.1)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ff7a1a',
  },
  audioPlayer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 16,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff7a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#0b0b0e',
    fontSize: 16,
    marginLeft: 2,
  },
  playIconWhite: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 3,
    fontWeight: 'bold',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff7a1a',
  },
  duration: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  photoThumbnails: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  mediaContent: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  noMedia: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  videoItem: {
    width: (width - 60) / 2,
    marginBottom: 12,
  },
  videoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#1a1a1f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 122, 26, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    position: 'absolute',
  },
  videoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
  playButtonOverlay: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 23, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 8,
    backgroundColor: '#1a1a1f',
  },
  bottomSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  reviewsColumn: {
    flex: 1,
    paddingRight: 10,
  },
  equipmentColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.2)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  reviewerName: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewComment: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  noReviews: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  equipmentList: {
    gap: 8,
  },
  equipmentItem: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  calendarSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  calendarArrow: {
    color: '#ff7a1a',
    fontSize: 20,
    fontWeight: '700',
  },
  eventBox: {
    backgroundColor: 'rgba(255,122,26,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  eventDate: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  pastEventsTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  pastEventBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
  },
  pastEventDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  backButton: {
    padding: 20,
    alignItems: 'flex-start',
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});

