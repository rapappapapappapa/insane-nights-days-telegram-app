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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import StarRating from '../components/StarRating';

const { width } = Dimensions.get('window');

export default function DjProfilePage() {
  const { language } = useLanguage();
  const { routeParams, goBack } = useNavigation();
  const { user } = useAuth();
  const { djId, djUserId } = routeParams || {};
  
  const [dj, setDj] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audio');

  useEffect(() => {
    if (djId || djUserId) {
      fetchDjProfile();
    }
  }, [djId, djUserId]);

  const fetchDjProfile = async () => {
    setLoading(true);
    try {
      // Récupérer les notes du DJ
      const identifier = djUserId || djId;
      const ratingsResponse = await api.getDjRatings(identifier);
      
      if (ratingsResponse && ratingsResponse.success) {
        setRatings(ratingsResponse.ratings);
        // Créer un objet DJ avec les infos de base
        setDj({
          id: djId,
          userId: djUserId,
          artistName: 'KAYZEN', // À récupérer depuis l'API si disponible
          city: 'Lyon',
          averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
        });
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
            source={{ uri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop' }}
            style={styles.backgroundImageContent}
            blurRadius={3}
          />
        </View>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.djName}>{dj.artistName}</Text>
          <Text style={styles.djLocation}>📍 {dj.city}, France</Text>
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
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              {language === 'fr' ? 'Styles:' : 'Styles:'}
            </Text>
            <Text style={styles.infoValue}>Industrial • Hard Techno</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              {language === 'fr' ? 'Tarif:' : 'Rate:'}
            </Text>
            <Text style={styles.infoValue}>250 € / {language === 'fr' ? 'heure' : 'hour'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              {language === 'fr' ? 'Disponibilité:' : 'Availability:'}
            </Text>
            <Text style={styles.infoValue}>
              {language === 'fr' ? 'Vendredi - Dimanche' : 'Friday - Sunday'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>
              {language === 'fr' ? 'Langues:' : 'Languages:'}
            </Text>
            <Text style={styles.infoValue}>Français • Anglais</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.bioColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Bio du DJ' : 'DJ Bio'}
          </Text>
          <Text style={styles.bioText}>
            {language === 'fr'
              ? 'Producteur et DJ basé à Lyon, KAYZEN est reconnu pour ses sets énergiques et ses sonorités industrielles. Il a joué dans les clubs et festivals à travers l\'Europe.'
              : 'Producer and DJ based in Lyon, KAYZEN is known for his energetic sets and industrial sounds. He has played in clubs and festivals across Europe.'}
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
        <View style={styles.audioPlayer}>
          <View style={styles.audioInfo}>
            <Text style={styles.audioTitle}>Hard Techno Mix</Text>
            <View style={styles.audioControls}>
              <TouchableOpacity style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </TouchableOpacity>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '35%' }]} />
              </View>
              <Text style={styles.duration}>1:02:15</Text>
            </View>
          </View>
          <View style={styles.photoThumbnails}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop' }}
              style={styles.thumbnail}
            />
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=150&h=150&fit=crop' }}
              style={styles.thumbnail}
            />
          </View>
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

