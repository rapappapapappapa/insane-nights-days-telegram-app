import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';

const { width } = Dimensions.get('window');

export default function VenueProfilePage() {
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { venueId, selectionMode, selectedVenueId, returnTo } = routeParams || {};
  
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    if (venueId) {
      fetchVenueProfile();
    }
  }, [venueId]);

  const fetchVenueProfile = async () => {
    setLoading(true);
    try {
      // Récupérer les lieux disponibles et trouver celui qui correspond
      const response = await api.getVenues(user.token);
      if (response && response.success && Array.isArray(response.venues)) {
        const foundVenue = response.venues.find(v => v.id === venueId);
        if (foundVenue) {
          setVenue(foundVenue);
        }
      }
      // Charger les médias du lieu
      const mediaRes = await api.getVenueMedia(venueId);
      if (mediaRes?.success && Array.isArray(mediaRes.media)) {
        const normalized = mediaRes.media.map((m) => ({ ...m, url: normalizeMediaUrl(m.url) }));
        setPhotos(normalized.filter((m) => m.type === 'photo'));
        setVideos(normalized.filter((m) => m.type === 'video'));
      }
    } catch (error) {
      console.error('Erreur récupération profil lieu:', error);
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

  if (!venue) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {language === 'fr' ? 'Lieu non trouvé' : 'Venue not found'}
          </Text>
        </View>
      </View>
    );
  }

  const isSelected = selectedVenueId === venue.id;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar style="light" />
      
      {/* Header avec image de background */}
      <View style={styles.header}>
        {/* Bouton retour */}
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </Text>
        </TouchableOpacity>
        <View style={styles.backgroundImage}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop' }}
            style={styles.backgroundImageContent}
            blurRadius={3}
          />
        </View>
        <View style={styles.profileSection}>
          <View style={styles.venueIconContainer}>
            <Text style={styles.venueIconText}>🏢</Text>
          </View>
          <Text style={styles.venueName}>{venue.venueName}</Text>
          <Text style={styles.venueLocation}>📍 {venue.address}</Text>
          {selectionMode ? (
            <TouchableOpacity 
              style={[styles.selectButton, isSelected && styles.selectButtonSelected]}
              onPress={() => {
                // Retourner à la page d'origine avec la sélection (bookerEventDashboard si création event, sinon bookerDashboard)
                navigate(returnTo || 'bookerDashboard', {
                  selectedVenueId: venue.id,
                  selectedVenueName: venue.venueName,
                  action: isSelected ? 'remove' : 'select',
                });
              }}
            >
              <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextSelected]}>
                {isSelected
                  ? (language === 'fr' ? '✓ DÉSÉLECTIONNER' : '✓ DESELECT')
                  : (language === 'fr' ? 'SÉLECTIONNER' : 'SELECT')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Section Infos */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>
          {language === 'fr' ? 'Informations' : 'Information'}
        </Text>
        
        {venue.averageRatingGlobal > 0 && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingLabel}>
              {language === 'fr' ? 'Note moyenne:' : 'Average rating:'}
            </Text>
            <View style={styles.ratingRow}>
              <StarRating rating={venue.averageRatingGlobal} size={24} showStars={false} />
              <Text style={styles.ratingValue}>
                {venue.averageRatingGlobal.toFixed(1)} / 5.0
              </Text>
            </View>
          </View>
        )}

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>
            {language === 'fr' ? 'Adresse:' : 'Address:'}
          </Text>
          <Text style={styles.addressValue}>{venue.address}</Text>
        </View>
      </View>

      {/* Médias */}
      <View style={styles.mediaSection}>
        <Text style={styles.sectionTitle}>
          {language === 'fr' ? 'Médias' : 'Media'}
        </Text>

        <Text style={styles.mediaSubtitle}>{language === 'fr' ? 'Photos' : 'Photos'}</Text>
        {photos.length > 0 ? (
          <View style={styles.photoGrid}>
            {photos.map((p) => (
              <Image
                key={p.id}
                source={{ uri: p.url }}
                style={styles.photoItem}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <Text style={styles.emptyMediaText}>
            {language === 'fr' ? 'Aucune photo' : 'No photos yet'}
          </Text>
        )}

        <Text style={styles.mediaSubtitle}>{language === 'fr' ? 'Vidéos' : 'Videos'}</Text>
        {videos.length > 0 ? (
          <View style={styles.videoList}>
            {videos.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.videoItem}
                onPress={() => {
                  setSelectedVideo(v);
                  setVideoModalVisible(true);
                }}
              >
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.playIcon}>▶</Text>
                </View>
                {v.title ? <Text style={styles.videoTitle}>{v.title}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyMediaText}>
            {language === 'fr' ? 'Aucune vidéo' : 'No videos yet'}
          </Text>
        )}
      </View>

      {/* Modal vidéo */}
      <VideoPlayer
        videoUrl={selectedVideo?.url}
        title={selectedVideo?.title}
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
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
  header: {
    position: 'relative',
    height: 300,
    marginBottom: 20,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  backgroundImageContent: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  venueIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#0b0b0e',
  },
  venueIconText: {
    fontSize: 48,
  },
  venueName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  venueLocation: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  selectButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FF1744',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    minWidth: 200,
  },
  selectButtonSelected: {
    backgroundColor: '#FF1744',
  },
  selectButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  selectButtonTextSelected: {
    color: '#0b0b0e',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    color: '#FF1744',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textTransform: 'uppercase',
  },
  ratingContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  ratingLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  mediaSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  mediaSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  photoItem: {
    width: (width - 60) / 2,
    height: 150,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  videoList: {
    gap: 12,
    marginBottom: 12,
  },
  videoItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
    padding: 8,
  },
  videoPlaceholder: {
    height: 180,
    borderRadius: 8,
    backgroundColor: '#0d0d11',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#FF1744',
    fontSize: 32,
    fontWeight: '800',
  },
  videoTitle: {
    color: '#fff',
    padding: 8,
    fontWeight: '600',
  },
  emptyMediaText: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  addressContainer: {
    padding: 16,
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  addressLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  addressValue: {
    color: '#fff',
    fontSize: 16,
  },
});

