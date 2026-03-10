import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
  Platform,
  Linking,
  Modal,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Colors from '../../constants/colors';
import VideoPlayer from '../../components/VideoPlayer';
import StarRating from '../../components/StarRating';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';

function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

const { width } = Dimensions.get('window');

const PAYMENT_TERMS_OPTIONS = [
  { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
  { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
  { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
  { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
  { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
];

export default function VenueDashboardPage() {
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { user } = useAuth();
  const { refreshUnreadCount, markAllAsRead } = useNotifications();

  // Drawer global géré dans App.js
  const [loading, setLoading] = useState(true);
  const [savingMedia, setSavingMedia] = useState(false);
  const [venue, setVenue] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [deletingMediaId, setDeletingMediaId] = useState(null);
  const shouldOpenBookings = !!routeParams?.openBookings || !!routeParams?.openChatEventVenueId;
  const [activeTab, setActiveTab] = useState(shouldOpenBookings ? 'bookings' : 'infos'); // infos | medias | avis | bookings

  // Bookings
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState(null);

  // Chat
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatEventVenueId, setSelectedChatEventVenueId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollViewRef = useRef(null);

  // Contrat
  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractEditorVisible, setContractEditorVisible] = useState(false);
  const [contractDraft, setContractDraft] = useState({
    priceEur: '',
    depositPercent: '',
    paymentTerms: '',
    cancellation: '',
    notes: '',
  });
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);

  const loadVenue = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      // Si un venueId est passé via la navigation, on l'utilise en priorité
      const targetVenueId = routeParams?.venueId;

      if (targetVenueId) {
        const ratingsRes = await api.getVenueRatings(targetVenueId);
        if (ratingsRes?.success) {
          setRatings(ratingsRes.ratings);
        }
        // Récupérer le profil via getVenues (accessible aux bookers) sinon via getUserProfiles
        const profiles = await api.getUserProfiles(user.token);
        const venueFromProfiles = profiles?.profiles?.venue?.find((v) => v.id === targetVenueId);
        if (venueFromProfiles) {
          setVenue(venueFromProfiles);
        }
        await loadVenueMedia(targetVenueId);
      } else {
        const profiles = await api.getUserProfiles(user.token);
        const firstVenue = profiles?.profiles?.venue?.[0];
        if (firstVenue) {
          setVenue(firstVenue);
          const ratingsRes = await api.getVenueRatings(firstVenue.id);
          if (ratingsRes?.success) {
            setRatings(ratingsRes.ratings);
          }
          await loadVenueMedia(firstVenue.id);
        }
      }
    } catch (error) {
      console.error('Erreur chargement venue dashboard:', error);
      showError(language === 'fr' ? 'Impossible de charger le lieu.' : 'Unable to load venue.');
    } finally {
      setLoading(false);
    }
  };

  const loadVenueMedia = async (venueId) => {
    if (!venueId) return;
    try {
      const mediaRes = await api.getVenueMedia(venueId);
      if (mediaRes?.success && Array.isArray(mediaRes.media)) {
        const allMedia = mediaRes.media.map((m) => ({ ...m, url: normalizeMediaUrl(m.url) }));
        setPhotos(allMedia.filter((m) => m.type === 'photo'));
        setVideos(allMedia.filter((m) => m.type === 'video'));
      }
    } catch (error) {
      console.error('Erreur récupération médias lieu:', error);
    }
  };

  useEffect(() => {
    loadVenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.venueId]);

  const fetchBookings = async () => {
    if (!user?.token) return;
    setLoadingBookings(true);
    try {
      const response = await api.getVenueBookings(user.token);
      if (response?.success) {
        setBookings(response.bookings || []);
      }
    } catch (error) {
      console.error('Erreur récupération bookings lieu:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'bookings' && user?.token) {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.token]);

  const openVenueChat = async (eventVenueId) => {
    setSelectedChatEventVenueId(eventVenueId);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventVenueId);
    await markAllAsRead();
    await loadVenueContract(eventVenueId);
  };

  const loadChatMessages = async (eventVenueId) => {
    if (!user?.token || !eventVenueId) return;
    setLoadingChatMessages(true);
    try {
      const response = await api.getVenueMessages(user.token, eventVenueId);
      if (response?.success && Array.isArray(response.messages)) {
        setChatMessages(response.messages);
      }
    } catch (e) {
      console.error('[VenueDashboard] loadChatMessages error:', e);
    } finally {
      setLoadingChatMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!user?.token || !newMessageText.trim() || sendingMessage || !selectedChatEventVenueId) return;
    const messageText = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    try {
      const response = await api.sendVenueMessage(user.token, selectedChatEventVenueId, messageText);
      if (response?.success) {
        await loadChatMessages(selectedChatEventVenueId);
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] sendMessage error:', e);
      showError(language === 'fr' ? 'Erreur envoi message.' : 'Message send error.');
    } finally {
      setSendingMessage(false);
    }
  };

  const loadVenueContract = async (eventVenueId) => {
    if (!user?.token || !eventVenueId) return;
    setContractLoading(true);
    try {
      const res = await api.getVenueContract(user.token, eventVenueId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        const p = res.contract?.payload || {};
        setContractDraft({
          priceEur: p?.priceEur != null ? String(p.priceEur) : '',
          depositPercent: p?.depositPercent != null ? String(p.depositPercent) : '',
          paymentTerms: p?.paymentTerms ? String(p.paymentTerms) : '',
          cancellation: p?.cancellation ? String(p.cancellation) : '',
          notes: p?.notes ? String(p.notes) : '',
        });
      }
    } catch (e) {
      console.error('[VenueDashboard] loadVenueContract error:', e);
    } finally {
      setContractLoading(false);
    }
  };

  const saveContractDraft = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const payload = {
        priceEur: contractDraft.priceEur ? Number(String(contractDraft.priceEur).replace(',', '.')) : null,
        depositPercent: contractDraft.depositPercent ? Number(String(contractDraft.depositPercent).replace(',', '.')) : null,
        paymentTerms: contractDraft.paymentTerms?.trim() || null,
        cancellation: contractDraft.cancellation?.trim() || null,
        notes: contractDraft.notes?.trim() || null,
      };
      const res = await api.saveVenueContractDraft(user.token, selectedChatEventVenueId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat sauvegardé.' : 'Contract saved.');
        setContractEditorVisible(false);
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible de sauvegarder.' : 'Unable to save.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] saveContractDraft error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const sendContract = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const res = await api.sendVenueContract(user.token, selectedChatEventVenueId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat envoyé au lieu.' : 'Contract sent to venue.');
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] sendContract error:', e);
      showError(language === 'fr' ? 'Erreur envoi contrat.' : 'Contract send error.');
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const res = await api.acceptVenueContract(user.token, selectedChatEventVenueId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.');
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] acceptContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const counterContract = async () => {
    if (!user?.token || !selectedChatEventVenueId) return;
    try {
      const payload = {
        priceEur: contractDraft.priceEur ? Number(String(contractDraft.priceEur).replace(',', '.')) : null,
        depositPercent: contractDraft.depositPercent ? Number(String(contractDraft.depositPercent).replace(',', '.')) : null,
        paymentTerms: contractDraft.paymentTerms?.trim() || null,
        cancellation: contractDraft.cancellation?.trim() || null,
        notes: contractDraft.notes?.trim() || null,
      };
      const res = await api.counterVenueContract(user.token, selectedChatEventVenueId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
        setContractEditorVisible(false);
        await loadVenueContract(selectedChatEventVenueId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[VenueDashboard] counterContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  useEffect(() => {
    if (!user?.token) return;
    const eventVenueId = routeParams?.openChatEventVenueId;
    if (eventVenueId) {
      setActiveTab('bookings');
      openVenueChat(eventVenueId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatEventVenueId]);

  const pickMedia = async (mediaType) => {
    if (!venue) return;
    if (savingMedia) return;
    
    try {
      // Sur iOS, vérifier et demander les permissions spécifiquement pour les vidéos
      if (Platform.OS === 'ios' && mediaType === 'video') {
        // Vérifier d'abord l'état actuel
        const { status: existingStatus, canAskAgain, accessPrivileges } = await ImagePicker.getMediaLibraryPermissionsAsync();
        console.log('[pickMedia] État permissions iOS:', { existingStatus, canAskAgain, accessPrivileges });
        
        let finalStatus = existingStatus;
        let finalAccessPrivileges = accessPrivileges;

        // Si les permissions ne sont pas accordées et qu'on peut encore demander
        if (existingStatus !== 'granted' && canAskAgain) {
          const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
          finalStatus = response.status;
          finalAccessPrivileges = response.accessPrivileges;
          console.log('[pickMedia] Nouveau statut après demande:', { status: finalStatus, accessPrivileges: finalAccessPrivileges });
        }

        // Vérifier si l'accès est limité (seulement photos sélectionnées)
        // Sur iOS, même si le statut est "granted", l'accès peut être limité
        if (finalStatus === 'granted' && (finalAccessPrivileges === 'limited' || finalAccessPrivileges === 'addOnly')) {
          Alert.alert(
            language === 'fr' ? 'Accès limité détecté' : 'Limited Access Detected',
            language === 'fr' 
              ? 'L\'accès à la galerie semble limité. Pour sélectionner des vidéos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres iOS de l\'app (Réglages > [Nom de l\'app] > Photos > Toutes les photos).' 
              : 'Gallery access appears limited. To select videos, you must grant full access to all photos in iOS app settings (Settings > [App Name] > Photos > All Photos).',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              {
                text: language === 'fr' ? 'Paramètres' : 'Settings', 
                onPress: () => {
                  Linking.openURL('app-settings:');
                }
              },
              {
                text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
                onPress: async () => {
                  // Fallback vers DocumentPicker
                  try {
                    const docResult = await DocumentPicker.getDocumentAsync({
                      type: 'video/*',
                      copyToCacheDirectory: true,
                      multiple: false,
                    });

                    if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                      const videoUri = docResult.assets[0].uri;
                      setSavingMedia(true);
                      await api.uploadVenueMediaFile(user.token, venue.id, videoUri, mediaType);
                      await loadVenueMedia(venue.id);
                      showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
                    }
                  } catch (docError) {
                    console.error('[pickMedia] Erreur DocumentPicker:', docError);
                    showError(language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video');
                  } finally {
                    setSavingMedia(false);
                  }
                }
              }
            ]
          );
          return;
        }
        
        if (finalStatus !== 'granted') {
          Alert.alert(
            language === 'fr' ? 'Permission requise' : 'Permission required',
            language === 'fr' 
              ? 'L\'accès à la galerie Photos est nécessaire pour sélectionner des vidéos. Veuillez l\'autoriser dans les paramètres de l\'app.' 
              : 'Photo library access is required to select videos. Please enable it in app settings.',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              { 
                text: language === 'fr' ? 'Paramètres' : 'Settings', 
                onPress: () => {
                  Linking.openURL('app-settings:');
                }
              }
            ]
          );
          return;
        }
      } else if (Platform.OS === 'android') {
        // Sur Android, demander directement
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError(language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required');
          return;
        }
      }

      // Options pour ImagePicker
      const pickerOptions = {
        mediaTypes: mediaType === 'photo' 
          ? ImagePicker.MediaTypeOptions.Images 
          : ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        allowsEditing: false,
      };

      // Ne pas utiliser quality pour les vidéos sur iOS (peut causer l'erreur 3164)
      if (mediaType === 'photo') {
        pickerOptions.quality = 0.8;
      }

      let result;
      try {
        result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
      } catch (pickerError) {
        // Attraper l'erreur directement depuis launchImageLibraryAsync
        const errorMessage = pickerError.message || pickerError.toString() || '';
        console.error('[pickMedia] Erreur ImagePicker:', pickerError);
        
        if (errorMessage.includes('3164') || errorMessage.includes('PHPhotosErrorDomain')) {
          Alert.alert(
            language === 'fr' ? 'Accès à la galerie requis' : 'Gallery Access Required',
            language === 'fr' 
              ? 'Pour sélectionner des vidéos depuis la galerie Photos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres de l\'app (pas seulement les photos sélectionnées).' 
              : 'To select videos from Photo Library, you must grant full access to all photos in app settings (not just selected photos).',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              { 
                text: language === 'fr' ? 'Paramètres' : 'Settings', 
                onPress: () => {
                  Linking.openURL('app-settings:');
                }
              },
              {
                text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
                onPress: async () => {
                  // Fallback vers DocumentPicker
                  try {
                    const docResult = await DocumentPicker.getDocumentAsync({
                      type: mediaType === 'video' ? 'video/*' : 'image/*',
                      copyToCacheDirectory: true,
                      multiple: false,
                    });

                    if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                      const fileUri = docResult.assets[0].uri;
                      setSavingMedia(true);
                      await api.uploadVenueMediaFile(user.token, venue.id, fileUri, mediaType);
                      await loadVenueMedia(venue.id);
                      showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
                    }
                  } catch (docError) {
                    console.error('[pickMedia] Erreur DocumentPicker:', docError);
                    showError(language === 'fr' ? 'Impossible de sélectionner le média' : 'Unable to select media');
                  } finally {
                    setSavingMedia(false);
                  }
                }
              }
            ]
          );
          return;
        }
        // Si ce n'est pas l'erreur 3164, relancer l'erreur pour qu'elle soit gérée par le catch externe
        throw pickerError;
      }

      if (result.canceled) {
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        return;
      }

      setSavingMedia(true);
      await api.uploadVenueMediaFile(user.token, venue.id, asset.uri, mediaType);
      await loadVenueMedia(venue.id);
      showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
    } catch (error) {
      console.error('Erreur upload média lieu:', error);
      
      // Gérer spécifiquement l'erreur 3164 iOS
      const errorMessage = error.message || error.toString() || '';
      if (errorMessage.includes('3164') || errorMessage.includes('PHPhotosErrorDomain')) {
        Alert.alert(
          language === 'fr' ? 'Accès à la galerie requis' : 'Gallery Access Required',
          language === 'fr' 
            ? 'Pour sélectionner des vidéos depuis la galerie Photos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres de l\'app (pas seulement les photos sélectionnées).' 
            : 'To select videos from Photo Library, you must grant full access to all photos in app settings (not just selected photos).',
          [
            { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
            { 
              text: language === 'fr' ? 'Paramètres' : 'Settings', 
              onPress: () => {
                Linking.openURL('app-settings:');
              }
            },
            {
              text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
              onPress: async () => {
                // Fallback vers DocumentPicker
                try {
                  const docResult = await DocumentPicker.getDocumentAsync({
                    type: 'video/*',
                    copyToCacheDirectory: true,
                    multiple: false,
                  });

                  if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                    const videoUri = docResult.assets[0].uri;
                    setSavingMedia(true);
                    await api.uploadVenueMediaFile(user.token, venue.id, videoUri, mediaType);
                    await loadVenueMedia(venue.id);
                    showSuccess(language === 'fr' ? 'Média ajouté au lieu.' : 'Media added to venue.');
                  }
                } catch (docError) {
                  console.error('[pickMedia] Erreur DocumentPicker:', docError);
                  showError(language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video');
                } finally {
                  setSavingMedia(false);
                }
              }
            }
          ]
        );
      } else {
        showError(language === 'fr' ? 'Impossible d\'ajouter le média.' : 'Unable to add media.');
      }
    } finally {
      setSavingMedia(false);
    }
  };

  const handleDeleteMedia = async (media) => {
    if (!user?.token || !venue) return;
    Alert.alert(
      language === 'fr' ? 'Supprimer le média' : 'Delete media',
      language === 'fr'
        ? 'Confirmer la suppression de ce média ?'
        : 'Confirm deletion of this media?',
      [
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingMediaId(media.id);
              const resp = await api.deleteVenueMedia(user.token, venue.id, media.id);
              if (resp?.success) {
                setPhotos((p) => p.filter((m) => m.id !== media.id));
                setVideos((v) => v.filter((m) => m.id !== media.id));
                showSuccess(language === 'fr' ? 'Média supprimé.' : 'Media deleted.');
              } else {
                showError(resp?.message || (language === 'fr' ? 'Suppression impossible' : 'Delete failed'));
              }
            } catch (err) {
              console.error('Erreur suppression média:', err);
              showError(language === 'fr' ? 'Suppression impossible.' : 'Delete failed.');
            } finally {
              setDeletingMediaId(null);
            }
          },
        },
      ]
    );
  };

  const renderRatings = () => {
    if (!ratings) {
      return (
        <Text style={styles.comingSoon}>
          {language === 'fr' ? 'Aucune note pour le moment.' : 'No ratings yet.'}
        </Text>
      );
    }

    return (
      <View style={styles.ratingCard}>
        <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Moyennes' : 'Averages'}</Text>
        <View style={styles.ratingRow}>
          <StarRating rating={ratings.averageRatingGlobal ?? 0} size={20} showStars={false} />
          <Text style={styles.ratingValue}>{(ratings.averageRatingGlobal ?? 0).toFixed(1)} / 5</Text>
        </View>
        <Text style={styles.ratingDetail}>
          {language === 'fr' ? 'Communauté' : 'Community'}: {(ratings.averageRatingCommunity ?? 0).toFixed(1)} · {language === 'fr' ? 'Organisateurs' : 'Organizers'}: {(ratings.averageRatingBooker ?? 0).toFixed(1)} · DJs: {(ratings.averageRatingDj ?? 0).toFixed(1)}
        </Text>

        {ratings.allRatings?.length ? (
          <View style={styles.reviewsList}>
            {ratings.allRatings.map((r) => (
              <View key={r.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewRating}>★ {r.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewMeta}>
                    {r.eventTitle ? `${r.eventTitle} · ` : ''}{new Date(r.eventDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                  </Text>
                </View>
                {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.comingSoon}>
            {language === 'fr' ? 'Pas encore d\'avis détaillés.' : 'No detailed reviews yet.'}
          </Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.loaderScreen}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>
          {language === 'fr'
            ? 'Aucun lieu associé à ce compte. Créez-en un depuis la page d’inscription lieu.'
            : 'No venue linked to this account. Please create one from venue registration.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{language === 'fr' ? 'Dashboard Lieu' : 'Venue Dashboard'}</Text>
          <View style={{ width: 44 }} />
        </View>

      <View style={styles.tabs}>
        {[
          { id: 'infos', label: language === 'fr' ? 'Infos' : 'Info' },
          { id: 'medias', label: language === 'fr' ? 'Médias' : 'Media' },
          { id: 'avis', label: language === 'fr' ? 'Avis & Notes' : 'Reviews' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, activeTab === tab.id && styles.tabItemActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {activeTab === 'infos' && (
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
        )}

        {activeTab === 'medias' && (
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
        )}

        {activeTab === 'avis' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{language === 'fr' ? 'Avis & Notes' : 'Reviews & Ratings'}</Text>
            {renderRatings()}
          </View>
        )}
      </ScrollView>
      <VideoPlayer
        videoUrl={selectedVideo?.url}
        title={selectedVideo?.title}
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
      />
      
      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  menuButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
    backgroundColor: 'rgba(11,11,14,0.65)',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: 'rgba(255,23,68,0.12)',
    borderRadius: 10,
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  venueName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  venueAddress: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ratingValue: {
    color: '#fff',
    fontWeight: '700',
  },
  profileButton: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
  mediaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  mediaHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addFileButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addFileButtonSecondary: {
    backgroundColor: '#444',
  },
  addFileButtonText: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoWrapper: {
    position: 'relative',
  },
  photoItem: {
    width: (width - 60) / 2,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  videoItem: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
    padding: 8,
  },
  videoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 6,
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
    color: Colors.primary,
    fontSize: 32,
    fontWeight: '800',
  },
  videoTitle: {
    color: '#fff',
    padding: 8,
    fontWeight: '600',
  },
  deleteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteBadgeSmall: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  deleteBadgeText: {
    color: '#fff',
    fontWeight: '800',
  },
  noMedia: {
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
  },
  comingSoon: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  ratingCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  ratingDetail: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  reviewsList: {
    marginTop: 10,
    gap: 10,
  },
  reviewItem: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 10,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewRating: {
    color: Colors.primary,
    fontWeight: '800',
  },
  reviewMeta: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  reviewComment: {
    color: '#fff',
  },
  loaderScreen: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    textAlign: 'center',
  },
});
