import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
// Audio migration: expo-av -> expo-audio (no direct replacement for setIsEnabledAsync)
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api, API_CONFIG, normalizeMediaUrl } from '../api/config';
import StarRating from '../components/StarRating';
import VideoPlayer from '../components/VideoPlayer';
import AudioPlayer from '../components/AudioPlayer';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

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
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { djId, djUserId, selectionMode, selectedDjIds = [], returnTo, eventId, slotIndex = null, isSlotMode = false } = routeParams || {};
  
  const [dj, setDj] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audio');
  const [media, setMedia] = useState({ photos: [], videos: [], audio: [] });
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [events, setEvents] = useState({ upcomingEvents: [], pastEvents: [] });
  const previousTabRef = useRef(activeTab);

  useEffect(() => {
    if (djId || djUserId) {
      fetchDjProfile();
    }
  }, [djId, djUserId]);

  // Couper tous les sons quand on QUITTE l'onglet audio (pour éviter les doublons)
  useEffect(() => {
    const previousTab = previousTabRef.current;

    const stopAllAudio = async () => {
      try {
        // Note: expo-audio ne nécessite plus setIsEnabledAsync
      } catch (e) {
        console.error("Erreur lors de l'arrêt de l'audio en changeant d'onglet:", e);
      }
    };

    if (previousTab === 'audio' && activeTab !== 'audio') {
      stopAllAudio();
    }

    previousTabRef.current = activeTab;
  }, [activeTab]);

  // Fonction pour arrêter l'audio et revenir en arrière
  const handleBack = async () => {
    // Note: expo-audio gère automatiquement le nettoyage des players
    // quand les composants sont démontés, pas besoin d'arrêter manuellement
    goBack();
  };

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
            soundcloudUrl: ratingsResponse.dj.soundcloudUrl,
            spotifyUrl: ratingsResponse.dj.spotifyUrl,
            youtubeUrl: ratingsResponse.dj.youtubeUrl,
            instagramUrl: ratingsResponse.dj.instagramUrl,
            tiktokUrl: ratingsResponse.dj.tiktokUrl,
            equipment: ratingsResponse.dj.equipment,
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

      // Récupérer les événements du DJ
      try {
        const identifier = djUserId || djId;
        const eventsResponse = await api.getDjEvents(identifier);
        if (eventsResponse && eventsResponse.success) {
          setEvents({
            upcomingEvents: eventsResponse.upcomingEvents || [],
            pastEvents: eventsResponse.pastEvents || [],
          });
        }
      } catch (eventsError) {
        console.error('Erreur récupération événements DJ:', eventsError);
        // Ne pas bloquer l'affichage si les événements ne peuvent pas être chargés
      }
    } catch (error) {
      console.error('Erreur récupération profil DJ:', error);
      showError(language === 'fr' ? 'Impossible de charger le profil.' : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1744" />
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
      
      {/* Bouton retour */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>
          ← {language === 'fr' ? 'Retour' : 'Back'}
        </Text>
      </TouchableOpacity>
      
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
              source={{ uri: normalizeMediaUrl(profileImage) || getDjImage(dj.artistName) }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.djName}>{dj.artistName}</Text>
          <Text style={styles.djLocation}>📍 {dj.mainCity || dj.city || 'Ville inconnue'}, France</Text>
          {selectionMode ? (
            <TouchableOpacity 
              style={[styles.bookButton, selectedDjIds.includes(dj.userId) && styles.bookButtonSelected]}
              onPress={() => {
                // Retourner au dashboard avec la sélection
                const slotIndexToPass = (slotIndex !== null && slotIndex !== undefined) ? slotIndex : undefined;
                navigate('bookerDashboard', {
                  selectedDjId: dj.userId,
                  selectedDjName: dj.artistName,
                  action: selectedDjIds.includes(dj.userId) ? 'remove' : 'add',
                  eventId: eventId || undefined,
                  slotIndex: slotIndexToPass, // Toujours passer slotIndex s'il est défini
                });
              }}
            >
            <Text style={styles.bookButtonText}>
                {selectedDjIds.includes(dj.userId)
                  ? (language === 'fr' ? '✓ DÉSÉLECTIONNER' : '✓ DESELECT')
                  : (language === 'fr' ? 'SÉLECTIONNER' : 'SELECT')}
            </Text>
          </TouchableOpacity>
          ) : (
            user?.activeProfileType === 'BOOKER' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    dj.availableStatus === false && styles.bookButtonDisabled,
                  ]}
                  disabled={dj.availableStatus === false}
                  onPress={() => {
                    if (dj.availableStatus === false) {
                      showError(language === 'fr'
                        ? 'Ce DJ n\'est pas disponible pour le moment.'
                        : 'This DJ is not available at the moment.');
                      return;
                    }
                    // Ici on pourra brancher le flux de booking direct plus tard
                  }}
                >
                  <Text
                    style={[
                      styles.bookButtonText,
                      dj.availableStatus === false && styles.bookButtonTextDisabled,
                    ]}
                  >
                    {dj.availableStatus === false
                      ? language === 'fr'
                        ? 'INDISPONIBLE'
                        : 'UNAVAILABLE'
                      : language === 'fr'
                        ? 'BOOKER CE DJ'
                        : 'BOOK THIS DJ'}
                  </Text>
                </TouchableOpacity>
                {dj.availableStatus === false && (
                  <Text style={styles.unavailableHint}>
                    {language === 'fr'
                      ? 'Ce DJ est marqué comme indisponible par le DJ.'
                      : 'This DJ has marked themselves as unavailable.'}
                  </Text>
                )}
              </>
            )
          )}
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
        {dj.soundcloudUrl ? (
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => Linking.openURL(dj.soundcloudUrl)}
          >
          <Text style={styles.socialIcon}>🎵</Text>
        </TouchableOpacity>
        ) : null}
        {dj.spotifyUrl ? (
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => Linking.openURL(dj.spotifyUrl)}
          >
          <Text style={styles.socialIcon}>☁️</Text>
        </TouchableOpacity>
        ) : null}
        {dj.youtubeUrl ? (
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => Linking.openURL(dj.youtubeUrl)}
          >
          <Text style={styles.socialIcon}>▶️</Text>
        </TouchableOpacity>
        ) : null}
        {dj.instagramUrl ? (
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => Linking.openURL(dj.instagramUrl)}
          >
          <Text style={styles.socialIcon}>📷</Text>
        </TouchableOpacity>
        ) : null}
        {dj.tiktokUrl ? (
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => Linking.openURL(dj.tiktokUrl)}
          >
            <Text style={styles.socialIcon}>🎬</Text>
          </TouchableOpacity>
        ) : null}
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

                // Détecter si c'est un fichier local (URI locale qui n'existe que sur l'appareil qui l'a uploadé)
                const isLocalFileUri = audioUrl.startsWith('file://') || audioUrl.startsWith('content://') || 
                  audioUrl.startsWith('ph://') || audioUrl.startsWith('assets-library://');
                
                // Détecter si c'est un fichier local spécial (assets de l'app)
                const isLocalAsset = audioUrl.startsWith('local:') ||
                  (audioTitle && typeof audioTitle === 'string' && (
                    audioTitle.toLowerCase().includes('tracer') || 
                    audioTitle.toLowerCase().includes('gogg')
                  ) && !audioUrl.startsWith('http'));

                // Pour les fichiers locaux uniquement, utiliser require pour charger depuis assets
                let finalAudioUrl = audioUrl;
                let isUnavailable = false;
                
                if (isLocalFileUri) {
                  // C'est une URI locale (file://, content://, etc.) - ne fonctionnera pas sur d'autres appareils
                  isUnavailable = true;
                  console.warn('[AUDIO] URI locale détectée - non accessible sur d\'autres appareils:', audioUrl);
                } else if (isLocalAsset) {
                  // Fichier local dans les assets de l'app
                  try {
                    if (audioUrl.includes('gogg') || audioUrl.includes('tracer') || 
                        (audioTitle && typeof audioTitle === 'string' && audioTitle.toLowerCase().includes('tracer'))) {
                      // Pour les assets locaux, on peut essayer de les charger
                      finalAudioUrl = audioUrl;
                    } else {
                      finalAudioUrl = audioUrl;
                    }
                  } catch (e) {
                    console.error('Erreur chargement audio local:', e);
                    finalAudioUrl = audioUrl;
                  }
                } else {
                    // Normaliser l'URL (remplace les anciennes URLs de tunnel et convertit les URLs relatives)
                    finalAudioUrl = normalizeMediaUrl(audioUrl);
                }

                // Si le fichier est indisponible, afficher un message au lieu du lecteur
                if (isUnavailable) {
                  return (
                    <View key={audio?.id || index} style={styles.audioUnavailableContainer}>
                      <Text style={styles.audioUnavailableTitle}>{audioTitle}</Text>
                      <Text style={styles.audioUnavailableText}>
                        {language === 'fr' 
                          ? 'Ce fichier audio a été uploadé depuis un autre appareil et n\'est pas accessible. Veuillez demander au DJ de le re-uploader.' 
                          : 'This audio file was uploaded from another device and is not accessible. Please ask the DJ to re-upload it.'}
                      </Text>
              </View>
                  );
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
                
                // Détecter si c'est un fichier local (URI locale qui n'existe que sur l'appareil qui l'a uploadé)
                const isLocalFileUri = videoUrl.startsWith('file://') || videoUrl.startsWith('content://') || 
                  videoUrl.startsWith('ph://') || videoUrl.startsWith('assets-library://');
                
                // Détecter si c'est un fichier local spécial (assets de l'app)
                const isLocalAsset = videoUrl.startsWith('local:') ||
                  (videoTitle && typeof videoTitle === 'string' && (
                    videoTitle.toLowerCase().includes('tracer') || 
                    videoTitle.toLowerCase().includes('gogg')
                  ) && !videoUrl.startsWith('http'));
                
                // Pour les fichiers locaux uniquement, utiliser require pour charger depuis assets
                let finalVideoUrl = videoUrl;
                let isUnavailable = false;
                
                if (isLocalFileUri) {
                  // C'est une URI locale (file://, content://, etc.) - ne fonctionnera pas sur d'autres appareils
                  isUnavailable = true;
                  console.warn('[VIDEO] URI locale détectée - non accessible sur d\'autres appareils:', videoUrl);
                } else if (isLocalAsset) {
                  // Fichier local dans les assets de l'app
                  try {
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
                } else {
                  // Normaliser l'URL (remplace les anciennes URLs de tunnel et convertit les URLs relatives)
                  finalVideoUrl = normalizeMediaUrl(videoUrl);
                }
                
                console.log('[VIDEO DEBUG]', {
                  originalUrl: videoUrl,
                  finalUrl: finalVideoUrl,
                  isYouTube,
                  isLocalFileUri,
                  isLocalAsset,
                  isUnavailable,
                  title: videoTitle
                });
                
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
                    style={[styles.videoItem, isUnavailable && styles.videoItemUnavailable]}
                    onPress={async () => {
                      if (isUnavailable) {
                        showError(language === 'fr' 
                          ? 'Cette vidéo a été uploadée depuis un autre appareil et n\'est pas accessible. Veuillez demander au DJ de la re-uploader.' 
                          : 'This video was uploaded from another device and is not accessible. Please ask the DJ to re-upload it.');
                        return;
                      }
                      
                      if (!videoUrl || !finalVideoUrl) {
                        console.error('[VIDEO ERROR] URL invalide:', { videoUrl, finalVideoUrl });
                        showError(language === 'fr' 
                          ? 'URL vidéo invalide.' 
                          : 'Invalid video URL.');
                        return;
                      }
                      
                      console.log('[VIDEO PLAY] Ouverture vidéo:', {
                        originalUrl: videoUrl,
                        finalUrl: finalVideoUrl,
                        isYouTube,
                        title: videoTitle
                      });
                      
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
                    disabled={isUnavailable}
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
                      {isUnavailable && (
                        <View style={styles.unavailableOverlay}>
                          <Text style={styles.unavailableText}>
                            {language === 'fr' ? 'Non disponible' : 'Unavailable'}
                          </Text>
                        </View>
                      )}
                      {!isUnavailable && (
                        <View style={styles.playButtonOverlay}>
                          <Text style={styles.playIconWhite}>▶</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.videoTitle, isUnavailable && styles.videoTitleUnavailable]} numberOfLines={2}>
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
                  let photoUrl = photo?.url || (typeof photo === 'string' ? photo : null);
                  
                  if (!photoUrl || typeof photoUrl !== 'string') {
                    return null;
                  }
                  
                  // Normaliser l'URL (remplace les anciennes URLs de tunnel et convertit les URLs relatives)
                  photoUrl = normalizeMediaUrl(photoUrl);
                  
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
          {dj.equipment ? (
            <Text style={styles.equipmentText}>{dj.equipment}</Text>
          ) : (
          <View style={styles.equipmentList}>
            <Text style={styles.equipmentItem}>• CDJ-3000</Text>
            <Text style={styles.equipmentItem}>• DJM-900NX32</Text>
            <Text style={styles.equipmentItem}>• Moniteurs Pioneer</Text>
          </View>
          )}
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
        
        {/* Événements à venir */}
        {events.upcomingEvents && events.upcomingEvents.length > 0 ? (
          events.upcomingEvents.slice(0, 3).map((event) => {
            const eventDate = new Date(event.date);
            const monthNames = language === 'fr' 
              ? ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
              : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')} ${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
            
            return (
              <View key={event.id} style={styles.eventBox}>
                <Text style={styles.eventDate}>{formattedDate}</Text>
                <Text style={styles.eventName}>{event.title}</Text>
                {event.venue && (
                  <Text style={styles.eventVenue}>{event.venue.name}</Text>
                )}
              </View>
            );
          })
        ) : (
        <View style={styles.eventBox}>
            <Text style={styles.eventDate}>
              {language === 'fr' ? 'Aucun événement à venir' : 'No upcoming events'}
            </Text>
        </View>
        )}
        
        {/* Événements passés */}
        {events.pastEvents && events.pastEvents.length > 0 && (
          <>
        <Text style={styles.pastEventsTitle}>
          {language === 'fr' ? 'ÉVÈNEMENTS PASSÉS' : 'PAST EVENTS'}
        </Text>
            {events.pastEvents.slice(0, 5).map((event) => {
              const eventDate = new Date(event.date);
              const monthNames = language === 'fr' 
                ? ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
                : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
              const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')} ${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
              
              return (
                <View key={event.id} style={styles.pastEventBox}>
                  <Text style={styles.pastEventDate}>{formattedDate}</Text>
                  {event.title && (
                    <Text style={styles.pastEventName}>{event.title}</Text>
                  )}
        </View>
              );
            })}
          </>
        )}
      </View>

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

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
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
    borderColor: '#FF1744',
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
    borderColor: '#FF1744',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  bookButtonSelected: {
    backgroundColor: '#FF1744',
  },
  bookButtonText: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bookButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bookButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: 'rgba(255,23,68,0.3)',
    marginHorizontal: 10,
  },
  sectionTitle: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoItem: {
    marginBottom: 12,
  },
  unavailableHint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontStyle: 'italic',
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
    borderColor: 'rgba(255,23,68,0.5)',
    backgroundColor: 'rgba(255,23,68,0.1)',
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
    borderBottomColor: '#FF1744',
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FF1744',
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
    backgroundColor: '#FF1744',
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
    backgroundColor: '#FF1744',
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
  videoTitleUnavailable: {
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
  },
  videoItemUnavailable: {
    opacity: 0.6,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  audioUnavailableContainer: {
    backgroundColor: 'rgba(255, 122, 26, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 26, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  audioUnavailableTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  audioUnavailableText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
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
    borderBottomColor: 'rgba(255,23,68,0.2)',
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
    color: '#FF1744',
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
  equipmentText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
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
    color: '#FF1744',
    fontSize: 20,
    fontWeight: '700',
  },
  eventBox: {
    backgroundColor: 'rgba(255,23,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  eventDate: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  eventVenue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
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
    marginBottom: 12,
  },
  pastEventDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  pastEventName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(11, 11, 14, 0.7)',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
});
