import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import NotificationBadge from '../../components/NotificationBadge';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

export default function BookerDashboardPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { unreadCount, refreshUnreadCount, markAllAsRead } = useNotifications();
  const { formData, setFormData, eventDateTime, setEventDateTime, resetForm, addDj, removeDj, setVenue } = useEventForm();

  // Drawer global géré dans App.js
  const [loading, setLoading] = useState(false);
  const [availableDjs, setAvailableDjs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [creating, setCreating] = useState(false);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  // Ouvrir la section événements si demandé via routeParams (pour les notifications)
  const shouldOpenBookings =
    !!routeParams?.openBookings || !!routeParams?.openChatEventDjId || !!routeParams?.openChatEventId;
  
  // ✅ MODIFICATION: Ajouter une section "Profil" avec activeSection (profil, events)
  const [activeSection, setActiveSection] = useState(shouldOpenBookings ? 'events' : 'profil');
  
  // ✅ AJOUT: États pour la gestion du profil booker
  const [bookerProfile, setBookerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    nom: '',
    prenom: '',
    phonePro: '',
    bookerType: 'INDEPENDENT',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [markingPaymentEventDjId, setMarkingPaymentEventDjId] = useState(null);

  // ✅ Édition événement (champs limités)
  const [editEventVisible, setEditEventVisible] = useState(false);
  const [editEventSaving, setEditEventSaving] = useState(false);
  const [editEventUploading, setEditEventUploading] = useState(false);
  const [editEventId, setEditEventId] = useState(null);
  const [editEventDraft, setEditEventDraft] = useState({
    title: '',
    description: '',
    genre: '',
    location: '',
    time: '',
    image: null,
  });
  
  // Slots DJ pour la création d'événement
  const [djSlots, setDjSlots] = useState([null]); // Array de djIds ou null

  // Chat
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatEventDjId, setSelectedChatEventDjId] = useState(null);
  const [selectedChatEventId, setSelectedChatEventId] = useState(null); // Pour les chats de groupe
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [loadingChatMessages, setLoadingChatMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [newMessageText, setNewMessageText] = useState('');
  const chatScrollViewRef = useRef(null);

  // ✅ Contrat (MVP) - intégré au chat privé Booker <-> DJ
  const [contractLoading, setContractLoading] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [contractBooking, setContractBooking] = useState(null);
  const [contractEditorVisible, setContractEditorVisible] = useState(false);
  const [contractDraft, setContractDraft] = useState({
    priceEur: '',
    depositEur: '',
    paymentTerms: '',
    cancellation: '',
    notes: '',
  });

  // Date & heure avec sélecteurs stylés
  const [tempDate, setTempDate] = useState(eventDateTime);
  const [tempTime, setTempTime] = useState(eventDateTime);
  // Ouvrir le sélecteur de date (native sur Android, modal sur iOS)
  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDateTime || new Date(),
        mode: 'date',
        onChange: (_, selectedDate) => {
          if (selectedDate) {
            setEventDateTime((prev) => {
              const base = prev ? new Date(prev) : new Date();
              const merged = new Date(selectedDate);
              merged.setHours(base.getHours());
              merged.setMinutes(base.getMinutes());
              return merged;
            });
            handleChange('date', selectedDate.toISOString());
          }
        },
      });
      return;
    }
    setTempDate(eventDateTime || new Date());
    setShowDatePicker(true);
  };

  // Ouvrir le sélecteur d'heure (native sur Android, modal sur iOS)
  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDateTime || new Date(),
        mode: 'time',
        is24Hour: true,
        onChange: (_, selectedTime) => {
          if (selectedTime) {
            setEventDateTime((prev) => {
              const base = prev ? new Date(prev) : new Date();
              const merged = new Date(base);
              merged.setHours(selectedTime.getHours());
              merged.setMinutes(selectedTime.getMinutes());
              return merged;
            });
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            handleChange('time', `${hours}:${minutes}`);
          }
        },
      });
      return;
    }
    setTempTime(eventDateTime || new Date());
    setShowTimePicker(true);
  };

  // ✅ SUPPRIMÉ: Variables liées au formulaire de création d'événement (déplacées vers BookerEventDashboardPage)
  
  React.useEffect(() => {
    // Pour les mises à jour de slots (création d'événement), toujours permettre la mise à jour
    const isSlotUpdate = currentSlotIndex !== undefined && currentSlotIndex !== null && !currentEventId;
    
    // Pour les autres cas, vérifier si on a déjà traité ces paramètres
    if (!isSlotUpdate) {
      const paramsKey = `${currentDjId}-${currentVenueId}-${currentAction}-${currentEventId}-${currentSlotIndex}`;
      const lastParamsKey = `${lastProcessedParams.current.selectedDjId}-${lastProcessedParams.current.selectedVenueId}-${lastProcessedParams.current.action}-${lastProcessedParams.current.eventId}-${lastProcessedParams.current.slotIndex}`;
      
      if (paramsKey === lastParamsKey && paramsKey !== 'null-null-null-null-null') {
        return; // Déjà traité, ne rien faire
      }
    }
    
    // Mettre à jour la référence
    lastProcessedParams.current = {
      selectedDjId: currentDjId,
      selectedVenueId: currentVenueId,
      action: currentAction,
      eventId: currentEventId,
      slotIndex: currentSlotIndex,
    };
    
    // Sélection de DJ
    if (currentDjId && currentAction === 'add') {
      if (currentEventId) {
        // Ajouter un DJ à un événement existant
        (async () => {
          try {
            if (!user?.token) return;
            const response = await api.addDjToEvent(user.token, currentEventId, currentDjId);
            if (response && response.success) {
              fetchMyEvents();
            } else {
              showError(response?.message || (language === 'fr'
                ? 'Impossible d\'ajouter ce DJ à l\'événement.'
                : 'Unable to add this DJ to the event.'));
            }
          } catch (error) {
            console.error('Erreur ajout DJ à un événement existant:', error);
            showError(language === 'fr'
              ? 'Erreur lors de l\'ajout du DJ à l\'événement.'
              : 'Error while adding DJ to event.');
          }
        })();
      } else {
        // Flux normal de création d'événement avec slots
        if (currentSlotIndex !== undefined && currentSlotIndex !== null) {
          // Mode slot : mettre à jour le slot spécifique
          console.log('[BookerDashboard] Mise à jour slot:', { 
            currentSlotIndex, 
            currentDjId, 
            prevSlotsLength: djSlots.length,
            prevSlots: djSlots 
          });
          setDjSlots(prev => {
            console.log('[BookerDashboard] setDjSlots appelé:', { 
              prev,
              djSlots,
              currentSlotIndex, 
              currentDjId,
              formDataDjIds: formData.djIds
            });
            
            // Utiliser l'état précédent comme base, en préservant tous les slots existants
            // Si prev est vide ou invalide, restaurer depuis formData.djIds ou utiliser djSlots actuel
            let currentSlots = prev && prev.length > 0 ? [...prev] : null;
            
            // Si prev est vide mais que formData.djIds contient des DJs, restaurer depuis formData
            if (!currentSlots || currentSlots.length === 0 || currentSlots.every(id => id === null)) {
              if (formData.djIds.length > 0) {
                // Restaurer depuis formData.djIds en préservant la structure des slots
                // Si djSlots a une structure (plusieurs slots), la préserver
                if (djSlots.length > formData.djIds.length) {
                  // Préserver la structure existante et remplir les slots vides avec les DJs de formData
                  currentSlots = [...djSlots];
                  formData.djIds.forEach(djId => {
                    const existingIndex = currentSlots.findIndex(id => id === djId);
                    if (existingIndex === -1) {
                      const firstEmptyIndex = currentSlots.findIndex(id => id === null);
                      if (firstEmptyIndex !== -1) {
                        currentSlots[firstEmptyIndex] = djId;
                      } else {
                        currentSlots.push(djId);
                      }
                    }
                  });
                } else {
                  // Créer des slots pour chaque DJ + un slot vide
                  // Mais préserver la structure si djSlots a plus de slots
                  const maxLength = Math.max(formData.djIds.length + 1, djSlots.length);
                  currentSlots = [...formData.djIds];
                  while (currentSlots.length < maxLength) {
                    currentSlots.push(null);
                  }
                }
              } else {
                // Utiliser djSlots actuel ou créer un slot vide
                currentSlots = djSlots.length > 0 ? [...djSlots] : [null];
              }
            } else if (djSlots.length > currentSlots.length) {
              // Si djSlots a plus de slots que currentSlots, préserver la structure de djSlots
              currentSlots = [...djSlots];
            }
            
            // S'assurer que tous les DJs de formData sont dans les slots
            if (formData.djIds.length > 0) {
              const currentDjIds = currentSlots.filter(id => id !== null);
              const missingDjIds = formData.djIds.filter(id => !currentDjIds.includes(id));
              
              // Ajouter les DJs manquants dans les slots vides
              missingDjIds.forEach(djId => {
                const firstEmptyIndex = currentSlots.findIndex(id => id === null);
                if (firstEmptyIndex !== -1) {
                  currentSlots[firstEmptyIndex] = djId;
                } else {
                  currentSlots.push(djId);
                }
              });
            }
            
            // S'assurer que le tableau est assez grand pour l'index
            while (currentSlots.length <= currentSlotIndex) {
              currentSlots.push(null);
            }
            
            // Créer une copie pour la mise à jour
            const newSlots = [...currentSlots];
            
            console.log('[BookerDashboard] Avant mise à jour:', { 
              prev,
              djSlots,
              currentSlots, 
              newSlots: [...newSlots], 
              currentSlotIndex, 
              currentDjId,
              formDataDjIds: formData.djIds
            });
            
            // Mettre à jour uniquement le slot spécifié
            newSlots[currentSlotIndex] = currentDjId;
            
            console.log('[BookerDashboard] Après mise à jour:', { newSlots: [...newSlots] });
            
            // Mettre à jour formData.djIds avec tous les slots remplis
            const newDjIds = newSlots.filter(id => id !== null);
            setFormData(prevForm => ({ ...prevForm, djIds: newDjIds }));
            
            return newSlots;
          });
          // Restaurer l'étape 3 après la sélection et empêcher la réinitialisation
          hasInitializedSlots.current = true;
          // Ne pas changer l'étape si on est déjà à l'étape 3 pour éviter de déclencher le useEffect
          if (currentStep !== 3) {
            setCurrentStep(3);
          }
        } else {
          // Si on est déjà à l'étape 3 ou plus, rester à l'étape 3 après sélection
          // Sinon, utiliser l'ancien flux (pour compatibilité)
          if (currentStep >= 3) {
            // On est dans le processus de création, utiliser le système de slots
            // Mettre à jour les slots si nécessaire
            setDjSlots(prev => {
              const newSlots = [...prev];
              // Trouver le premier slot vide ou ajouter un nouveau slot
              const emptyIndex = newSlots.findIndex(id => id === null);
              if (emptyIndex !== -1) {
                newSlots[emptyIndex] = currentDjId;
              } else {
                newSlots.push(currentDjId);
              }
              // Mettre à jour formData.djIds avec tous les slots remplis
              const newDjIds = newSlots.filter(id => id !== null);
              setFormData(prevForm => ({ ...prevForm, djIds: newDjIds }));
              return newSlots;
            });
            setCurrentStep(3);
          } else {
            // Ancien flux (pour compatibilité)
            addDj(currentDjId);
            setCurrentStep(4);
          }
        }
      }
    } else if (currentDjId && currentAction === 'remove') {
      if (currentSlotIndex !== undefined && currentSlotIndex !== null) {
        // Mode slot : retirer le slot spécifique
        setDjSlots(prev => {
          const newSlots = [...prev];
          newSlots[currentSlotIndex] = null;
          // Mettre à jour formData.djIds avec tous les slots remplis
          const newDjIds = newSlots.filter(id => id !== null);
          setFormData(prevForm => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        setCurrentStep(3);
      } else {
        removeDj(currentDjId);
      }
    }
    
    // Sélection de lieu
    if (currentVenueId && currentAction === 'select') {
      setVenue(currentVenueId);
      setCurrentStep(3);
    } else if (currentVenueId && currentAction === 'remove') {
      setVenue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDjId, currentVenueId, currentAction, currentSlotIndex, currentEventId]); // Inclure currentEventId dans les dépendances

  // ✅ AJOUT: Charger le profil booker
  const loadBookerProfile = async () => {
    if (!user?.token) return;
    setLoadingProfile(true);
    try {
      const response = await api.getBookerProfile(user.token);
      if (response?.success && response?.profile) {
        setBookerProfile(response.profile);
        setProfileForm({
          nom: response.profile.nom || '',
          prenom: response.profile.prenom || '',
          phonePro: response.profile.phonePro || '',
          bookerType: response.profile.bookerType || 'INDEPENDENT',
        });
        setProfileImage(response.profile.profileImage || null);
      }
    } catch (error) {
      console.error('Erreur chargement profil booker:', error);
      showError(language === 'fr' ? 'Impossible de charger le profil.' : 'Unable to load profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // ✅ AJOUT: Sauvegarder le profil booker
  const saveBookerProfile = async () => {
    if (!user?.token || savingProfile) return;
    if (!profileForm.nom || !profileForm.prenom || !profileForm.phonePro || !profileForm.bookerType) {
      showError(language === 'fr' ? 'Tous les champs sont requis.' : 'All fields are required.');
      return;
    }
    setSavingProfile(true);
    try {
      const response = await api.updateBookerProfile(
        user.token,
        profileForm.nom,
        profileForm.prenom,
        profileForm.phonePro,
        profileForm.bookerType
      );
      if (response?.success) {
        showSuccess(language === 'fr' ? 'Profil mis à jour avec succès.' : 'Profile updated successfully.');
        await loadBookerProfile();
      } else {
        showError(response?.message || (language === 'fr' ? 'Erreur lors de la mise à jour.' : 'Update failed.'));
      }
    } catch (error) {
      console.error('Erreur sauvegarde profil booker:', error);
      showError(language === 'fr' ? 'Erreur lors de la sauvegarde.' : 'Save failed.');
    } finally {
      setSavingProfile(false);
    }
  };

  // ✅ AJOUT: Uploader la photo de profil
  const pickProfileImage = async () => {
    if (!user?.token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setUploadingProfileImage(true);
      try {
        const response = await api.uploadBookerProfileImage(user.token, uri);
        if (response?.success) {
          setProfileImage(response.profileImage);
          showSuccess(language === 'fr' ? 'Photo de profil mise à jour' : 'Profile picture updated');
        } else {
          showError(response?.message || (language === 'fr' ? 'Erreur lors de l\'upload.' : 'Upload failed.'));
        }
      } catch (error) {
        console.error('Erreur upload photo de profil:', error);
        showError(language === 'fr' ? 'Erreur lors de l\'upload.' : 'Upload failed.');
      } finally {
        setUploadingProfileImage(false);
      }
    }
  };

  useEffect(() => {
    if (user?.token) {
      fetchVenues();
      fetchMyEvents();
      loadBookerProfile(); // ✅ AJOUT: Charger le profil booker
      // Ne pas charger les DJs ici, on les chargera quand la date sera sélectionnée
    }
  }, [user?.token]);

  // Rafraîchir la liste des DJs quand la date change
  useEffect(() => {
    if (user?.token && formData.date && currentStep >= 3) {
      // Charger les DJs disponibles seulement si on a une date et qu'on est à l'étape 3 ou plus
      fetchAvailableDjs();
    }
  }, [formData.date, currentStep, user?.token]);

  // Initialiser les slots seulement la première fois qu'on arrive à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && !hasInitializedSlots.current) {
      // Si on a déjà des DJs sélectionnés, créer des slots pour eux + un slot vide
      if (formData.djIds.length > 0) {
        setDjSlots([...formData.djIds, null]);
      } else if (djSlots.length === 0) {
        // Si on n'a pas de slots du tout, créer un slot vide
        setDjSlots([null]);
      }
      hasInitializedSlots.current = true;
      console.log('[BookerDashboard] Initialisation slots étape 3:', { 
        formDataDjIds: formData.djIds, 
        djSlots: djSlots.length > 0 ? djSlots : (formData.djIds.length > 0 ? [...formData.djIds, null] : [null])
      });
    } else if (currentStep !== 3) {
      // Réinitialiser le flag quand on quitte l'étape 3
      hasInitializedSlots.current = false;
    }
    // Ne pas se déclencher si les slots sont déjà initialisés et qu'on est toujours à l'étape 3
  }, [currentStep]); // Seulement dépendre de currentStep pour éviter les conflits

  const fetchMyEvents = async () => {
    if (!user?.token || loadingEvents) return;
    setLoadingEvents(true);
    try {
      const response = await api.getBookerEvents(user.token);
      if (response && response.success) {
        setMyEvents(response.events || []);
      }
    } catch (error) {
      console.error('Erreur récupération mes événements:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const markBookingAsPaid = async (eventDjId) => {
    if (!user?.token || !eventDjId) return;
    setMarkingPaymentEventDjId(eventDjId);
    try {
      const res = await api.updateBookingPayment(user.token, eventDjId, { status: 'PAID' });
      if (res?.success) {
        await fetchMyEvents();
        showSuccess(language === 'fr' ? 'Paiement marqué comme payé.' : 'Payment marked as paid.');
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible de mettre à jour le paiement.' : 'Unable to update payment.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] markBookingAsPaid error:', e);
      showError(language === 'fr' ? 'Erreur paiement.' : 'Payment error.');
    } finally {
      setMarkingPaymentEventDjId(null);
    }
  };

  // Fonctions de chat
  const openChat = async (eventDjId) => {
    setSelectedChatEventDjId(eventDjId);
    setSelectedChatEventId(null);
    setIsGroupChat(false);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventDjId, false);
    // ✅ Quand on ouvre les messages, on marque comme lu (remet le compteur à 0)
    await markAllAsRead();
    // ✅ Charger le contrat (chat privé)
    await loadContract(eventDjId);
  };

  const openGroupChat = async (eventId) => {
    setSelectedChatEventDjId(null);
    setSelectedChatEventId(eventId);
    setIsGroupChat(true);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventId, true);
    // ✅ Quand on ouvre les messages, on marque comme lu (remet le compteur à 0)
    await markAllAsRead();
  };

  const loadContract = async (eventDjId) => {
    if (!user?.token || !eventDjId) return;
    setContractLoading(true);
    try {
      const res = await api.getBookingContract(user.token, eventDjId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        const p = res.contract?.payload || {};
        setContractDraft({
          priceEur: p?.priceEur != null ? String(p.priceEur) : '',
          depositEur: p?.depositEur != null ? String(p.depositEur) : '',
          paymentTerms: p?.paymentTerms ? String(p.paymentTerms) : '',
          cancellation: p?.cancellation ? String(p.cancellation) : '',
          notes: p?.notes ? String(p.notes) : '',
        });
      }
    } catch (e) {
      console.error('[BookerDashboard] loadContract error:', e);
    } finally {
      setContractLoading(false);
    }
  };

  const saveContractDraft = async () => {
    if (!user?.token || !selectedChatEventDjId) return;
    try {
      const payload = {
        priceEur: contractDraft.priceEur ? Number(String(contractDraft.priceEur).replace(',', '.')) : null,
        depositEur: contractDraft.depositEur ? Number(String(contractDraft.depositEur).replace(',', '.')) : null,
        paymentTerms: contractDraft.paymentTerms?.trim() || null,
        cancellation: contractDraft.cancellation?.trim() || null,
        notes: contractDraft.notes?.trim() || null,
      };
      const res = await api.saveBookingContractDraft(user.token, selectedChatEventDjId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat sauvegardé.' : 'Contract saved.');
        setContractEditorVisible(false);
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible de sauvegarder.' : 'Unable to save.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] saveContractDraft error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const sendContract = async () => {
    if (!user?.token || !selectedChatEventDjId) return;
    try {
      const res = await api.sendBookingContract(user.token, selectedChatEventDjId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat envoyé au DJ.' : 'Contract sent to DJ.');
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] sendContract error:', e);
      showError(language === 'fr' ? 'Erreur envoi contrat.' : 'Contract send error.');
    }
  };

  const acceptContract = async () => {
    if (!user?.token || !selectedChatEventDjId) return;
    try {
      const res = await api.acceptBookingContract(user.token, selectedChatEventDjId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.');
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] acceptContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const counterContract = async () => {
    if (!user?.token || !selectedChatEventDjId) return;
    try {
      const payload = {
        priceEur: contractDraft.priceEur ? Number(String(contractDraft.priceEur).replace(',', '.')) : null,
        depositEur: contractDraft.depositEur ? Number(String(contractDraft.depositEur).replace(',', '.')) : null,
        paymentTerms: contractDraft.paymentTerms?.trim() || null,
        cancellation: contractDraft.cancellation?.trim() || null,
        notes: contractDraft.notes?.trim() || null,
      };
      const res = await api.counterBookingContract(user.token, selectedChatEventDjId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
        setContractEditorVisible(false);
        await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] counterContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  // ✅ Ouvrir automatiquement la conversation depuis une notification (BOOKER)
  useEffect(() => {
    if (!user?.token) return;
    const type = routeParams?.openChatType;
    const eventDjId = routeParams?.openChatEventDjId;
    const eventId = routeParams?.openChatEventId;

    if (shouldOpenBookings) {
      setShowMyEvents(true);
    }

    if (type === 'PRIVATE' && eventDjId) {
      openChat(eventDjId);
    } else if (type === 'GROUP' && eventId) {
      openGroupChat(eventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatType, routeParams?.openChatEventDjId, routeParams?.openChatEventId]);

  const loadChatMessages = async (id, isGroup = false) => {
    if (!user?.token || !id) return;
    
    setLoadingChatMessages(true);
    try {
      const response = isGroup 
        ? await api.getGroupMessages(user.token, id)
        : await api.getMessages(user.token, id);
      if (response && response.success && response.messages) {
        setChatMessages(response.messages);
        setTimeout(() => {
          if (chatScrollViewRef.current) {
            chatScrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error);
      showError(language === 'fr' ? 'Impossible de charger les messages.' : 'Unable to load messages.');
    } finally {
      setLoadingChatMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!user?.token || !newMessageText.trim() || sendingMessage) return;
    if (!isGroupChat && !selectedChatEventDjId) return;
    if (isGroupChat && !selectedChatEventId) return;
    
    const messageText = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    
    try {
      const response = isGroupChat
        ? await api.sendGroupMessage(user.token, selectedChatEventId, messageText)
        : await api.sendMessage(user.token, selectedChatEventDjId, messageText);
      if (response && response.success) {
        await loadChatMessages(isGroupChat ? selectedChatEventId : selectedChatEventDjId, isGroupChat);
      } else {
        showError(response?.message || (language === 'fr' ? 'Impossible d\'envoyer le message.' : 'Unable to send message.'));
        setNewMessageText(messageText);
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
      showError(language === 'fr' ? 'Impossible d\'envoyer le message.' : 'Unable to send message.');
      setNewMessageText(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!user?.token || !messageId) return;
    try {
      await api.deleteMessage(user.token, messageId);
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, deleted: true, content: 'message supprimé' } : m
        )
      );
    } catch (error) {
      console.error('Erreur suppression message:', error);
      showError(language === 'fr' ? 'Impossible de supprimer le message.' : 'Unable to delete message.');
    }
  };

  const fetchAvailableDjs = async () => {
    if (!user?.token || loadingDjs) return;
    setLoadingDjs(true);
    try {
      // Envoyer la date si elle est disponible
      const dateToSend = formData.date || (eventDateTime ? eventDateTime.toISOString() : null);
      const response = await api.getAvailableDjs(user.token, dateToSend);
      if (response && response.success) {
        setAvailableDjs(response.djs || []);
      }
    } catch (error) {
      console.error('Erreur récupération DJs disponibles:', error);
      showError(language === 'fr' ? 'Impossible de charger les DJs disponibles.' : 'Unable to load available DJs.');
    } finally {
      setLoadingDjs(false);
    }
  };

  const fetchVenues = async () => {
    if (!user?.token || loadingVenues) return;
    setLoadingVenues(true);
    try {
      const response = await api.getVenues(user.token);
      if (response && response.success) {
        setVenues(response.venues || []);
      }
    } catch (error) {
      console.error('Erreur récupération lieux:', error);
      showError(language === 'fr' ? 'Impossible de charger les lieux.' : 'Unable to load venues.');
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    Alert.alert(
      language === 'fr' ? 'Supprimer l\'événement' : 'Delete event',
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.'
        : 'Are you sure you want to delete this event? This action is irreversible.',
      [
        {
          text: language === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.token) return;
            setDeletingEventId(eventId);
            try {
              const response = await api.deleteEvent(user.token, eventId);
              if (response && response.success) {
                showSuccess(language === 'fr' ? 'L\'événement a été supprimé avec succès.' : 'The event has been deleted successfully.');
                fetchMyEvents(); // Rafraîchir la liste
              } else {
                showError(response?.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting event.'));
              }
            } catch (error) {
              console.error('Erreur suppression événement:', error);
              showError(error.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting event.'));
            } finally {
              setDeletingEventId(null);
            }
          },
        },
      ]
    );
  };

  const openEditEvent = (event) => {
    setEditEventId(event?.id || null);
    setEditEventDraft({
      title: event?.title || '',
      description: event?.description || '',
      genre: event?.genre || '',
      location: event?.location || '',
      time: event?.time || '',
      image: event?.image || null,
    });
    setEditEventVisible(true);
  };

  const pickEditEventImage = async () => {
    if (!user?.token || !editEventId) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'fr' ? 'Permission requise' : 'Permission required',
          language === 'fr'
            ? 'Autorise l’accès aux photos pour choisir une image.'
            : 'Please allow photo access to pick an image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri;
      if (!uri) return;

      setEditEventUploading(true);
      const uploaded = await api.uploadEventImage(user.token, editEventId, uri);
      setEditEventDraft((prev) => ({ ...prev, image: uploaded?.imageUrl || prev.image }));
      showSuccess(language === 'fr' ? 'Photo ajoutée.' : 'Photo added.');
    } catch (e) {
      console.error('Erreur upload image event:', e);
      showError(language === 'fr' ? 'Impossible d’uploader la photo.' : 'Unable to upload image.');
    } finally {
      setEditEventUploading(false);
    }
  };

  const saveEditEvent = async () => {
    if (!user?.token || !editEventId || editEventSaving) return;
    if (!editEventDraft.title?.trim()) {
      showError(language === 'fr' ? 'Titre requis.' : 'Title is required.');
      return;
    }
    setEditEventSaving(true);
    try {
      const updates = {
        title: editEventDraft.title,
        description: editEventDraft.description,
        genre: editEventDraft.genre,
        location: editEventDraft.location,
        time: editEventDraft.time,
        image: editEventDraft.image,
      };
      const res = await api.updateEvent(user.token, editEventId, updates);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Événement modifié.' : 'Event updated.');
        setEditEventVisible(false);
        await fetchMyEvents();
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible de modifier.' : 'Unable to update.'));
      }
    } catch (e) {
      console.error('Erreur update event:', e);
      showError(language === 'fr' ? 'Erreur modification événement.' : 'Event update error.');
    } finally {
      setEditEventSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  const handleCreateEvent = async () => {
    if (creating) return;

    // Validation
    if (!formData.title || !formData.date || !formData.time || !formData.venueId || formData.djIds.length === 0) {
      showError(language === 'fr' ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).' : 'Please fill in all required fields (title, date, time, venue, DJ).');
      return;
    }

    // Vérifier que la date n'est pas passée (côté app, pour UX)
    try {
      const eventDateObj = eventDateTime || (formData.date ? new Date(formData.date) : null);
      if (eventDateObj && !isNaN(eventDateObj.getTime())) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDay = new Date(
          eventDateObj.getFullYear(),
          eventDateObj.getMonth(),
          eventDateObj.getDate()
        );

        if (eventDay < today) {
          showError(language === 'fr'
            ? 'Vous ne pouvez pas créer un événement à une date déjà passée.'
            : 'You cannot create an event on a past date.');
          return;
        }
      }
    } catch (e) {
      // En cas d'erreur de parsing, on laisse aussi le backend valider
      console.warn('Erreur vérification date passée côté app:', e);
    }

    setCreating(true);
    try {
      // Formater la date correctement pour le backend (ISO string)
      let formattedDate = formData.date;
      if (eventDateTime && !formData.date) {
        // Si on a eventDateTime mais pas formData.date, utiliser eventDateTime
        formattedDate = eventDateTime.toISOString();
      } else if (formData.date && typeof formData.date === 'string') {
        // Si c'est déjà une string, vérifier le format
        try {
          const dateObj = new Date(formData.date);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString();
          }
        } catch (e) {
          // Si la conversion échoue, utiliser la date telle quelle
        }
      } else if (eventDateTime) {
        formattedDate = eventDateTime.toISOString();
      }

      const eventData = {
        title: formData.title.trim(),
        date: formattedDate,
        time: formData.time.trim(),
        venueId: formData.venueId,
        djIds: formData.djIds,
        price: formData.price ? parseFloat(formData.price) : 0,
        // La durée sert uniquement au calcul du prix pour l'instant
        durationHours: formData.durationHours ? parseFloat(formData.durationHours) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : 100,
        genre: formData.genre ? formData.genre.trim() : 'Mixed',
        description: formData.description ? formData.description.trim() : null,
      };

      const response = await api.createEvent(user.token, eventData);

      if (!response) {
        showError(language === 'fr' ? 'Impossible de joindre le serveur. Vérifie ta connexion.' : 'Unable to reach server. Check your connection.');
        return;
      }

      if (!response.success) {
        // Gérer les conflits spécifiques
        if (response.status === 409 || (response.message && (response.message.includes('déjà') || response.message.includes('existe déjà')))) {
          let conflictMessage = response.message || (language === 'fr' ? 'Conflit de réservation' : 'Booking conflict');
          
          // Ajouter des détails sur l'événement en conflit si disponibles
          if (response.conflictingEvent) {
            const conflictDate = new Date(response.conflictingEvent.date).toLocaleDateString(
              language === 'fr' ? 'fr-FR' : 'en-US',
              { day: '2-digit', month: '2-digit', year: 'numeric' }
            );
            conflictMessage += `\n\n${language === 'fr' ? 'Événement en conflit' : 'Conflicting event'}: ${response.conflictingEvent.title} (${conflictDate}${response.conflictingEvent.time ? ' à ' + response.conflictingEvent.time : ''})`;
          }
          
          showError(conflictMessage);
        } else {
          showError(response.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.'));
        }
        return;
      }

      // Succès
      showSuccess(language === 'fr'
        ? 'L\'événement a été créé avec succès.'
        : 'The event has been created successfully.');
      // Réinitialiser le formulaire et rafraîchir la liste
      setTimeout(() => {
        resetForm();
        fetchMyEvents();
        setShowMyEvents(true);
      }, 2000);
    } catch (error) {
      console.error('Erreur création événement:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.'));
    } finally {
      setCreating(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === formData.venueId);
  const selectedDjs = availableDjs.filter((dj) => formData.djIds.includes(dj.userId));

  // ✅ Le prix DJ n'est plus auto-calculé: il sera défini via contrat Booker ↔ DJ.

  return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{language === 'fr' ? 'Dashboard Booker' : 'Booker Dashboard'}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.messagesButton}
              onPress={() => {
                setShowMyEvents(true);
                refreshUnreadCount();
              }}
            >
              <Ionicons name="chatbubbles" size={24} color="#fff" />
              <NotificationBadge count={unreadCount} onPress={markAllAsRead} />
            </TouchableOpacity>
            <View style={{ width: 44 }} />
          </View>
        </View>

      {/* Boutons de navigation */}
      <View style={styles.tabButtons}>
        <TouchableOpacity
          style={[styles.tabButton, activeSection === 'profil' && styles.tabButtonActive]}
          onPress={() => setActiveSection('profil')}
        >
          <Text style={[styles.tabButtonText, activeSection === 'profil' && styles.tabButtonTextActive]}>
            {language === 'fr' ? 'Profil' : 'Profile'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeSection === 'events' && styles.tabButtonActive]}
          onPress={() => {
            setActiveSection('events');
            fetchMyEvents();
            // Marquer les messages comme lus quand on ouvre la section événements
            markAllAsRead();
          }}
        >
          <View style={styles.tabButtonContent}>
            <Text style={[styles.tabButtonText, activeSection === 'events' && styles.tabButtonTextActive]}>
              {language === 'fr' ? 'Mes événements' : 'My Events'}
            </Text>
            <NotificationBadge count={unreadCount} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ✅ AJOUT: Bouton Dashboard Événement */}
      {activeSection === 'profil' && (
        <TouchableOpacity
          style={styles.eventDashboardButton}
          onPress={() => navigate('bookerEventDashboard', {})}
        >
          <Ionicons name="calendar" size={24} color="#0b0b0e" />
          <Text style={styles.eventDashboardButtonText}>
            {language === 'fr' ? 'Dashboard Événement' : 'Event Dashboard'}
          </Text>
        </TouchableOpacity>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {activeSection === 'profil' ? (
          // ✅ AJOUT: Section "Profil"
          <View style={styles.profileSection}>
            {loadingProfile ? (
              <ActivityIndicator size="large" color="#FF1744" style={styles.loader} />
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  {language === 'fr' ? 'Mon Profil' : 'My Profile'}
                </Text>
                
                {/* Photo de profil */}
                <View style={styles.profileImageContainer}>
                  {profileImage ? (
                    <Image
                      source={{ uri: normalizeMediaUrl(profileImage) }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons name="person" size={60} color="rgba(255,255,255,0.5)" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={pickProfileImage}
                    disabled={uploadingProfileImage}
                  >
                    {uploadingProfileImage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Formulaire */}
                <View style={styles.profileForm}>
                  <Text style={styles.inputLabel}>{language === 'fr' ? 'Nom' : 'Last Name'}</Text>
                  <TextInput
                    style={styles.input}
                    value={profileForm.nom}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, nom: v }))}
                    placeholder={language === 'fr' ? 'Nom' : 'Last Name'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />

                  <Text style={styles.inputLabel}>{language === 'fr' ? 'Prénom' : 'First Name'}</Text>
                  <TextInput
                    style={styles.input}
                    value={profileForm.prenom}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, prenom: v }))}
                    placeholder={language === 'fr' ? 'Prénom' : 'First Name'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />

                  <Text style={styles.inputLabel}>{language === 'fr' ? 'Téléphone professionnel' : 'Professional Phone'}</Text>
                  <TextInput
                    style={styles.input}
                    value={profileForm.phonePro}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, phonePro: v }))}
                    placeholder={language === 'fr' ? 'Téléphone professionnel' : 'Professional Phone'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="phone-pad"
                  />

                  <Text style={styles.inputLabel}>{language === 'fr' ? 'Type de booker' : 'Booker Type'}</Text>
                  <View style={styles.bookerTypeContainer}>
                    {['INDEPENDENT', 'AGENCY', 'VENUE'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.bookerTypeButton,
                          profileForm.bookerType === type && styles.bookerTypeButtonActive,
                        ]}
                        onPress={() => setProfileForm((p) => ({ ...p, bookerType: type }))}
                      >
                        <Text
                          style={[
                            styles.bookerTypeButtonText,
                            profileForm.bookerType === type && styles.bookerTypeButtonTextActive,
                          ]}
                        >
                          {type === 'INDEPENDENT'
                            ? language === 'fr'
                              ? 'Indépendant'
                              : 'Independent'
                            : type === 'AGENCY'
                            ? language === 'fr'
                              ? 'Agence'
                              : 'Agency'
                            : language === 'fr'
                            ? 'Lieu'
                            : 'Venue'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
                    onPress={saveBookerProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <ActivityIndicator size="small" color="#0b0b0e" />
                    ) : (
                      <Text style={styles.saveButtonText}>
                        {language === 'fr' ? 'Enregistrer' : 'Save'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ) : activeSection === 'events' ? (
          // Section "Mes événements"
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'Mes événements' : 'My Events'} ({myEvents.length})
            </Text>
            {loadingEvents ? (
              <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />
            ) : myEvents.length === 0 ? (
              <Text style={styles.emptyText}>
                {language === 'fr' ? 'Aucun événement créé pour le moment.' : 'No events created yet.'}
              </Text>
            ) : (
              myEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventInfo}>
                    📅 {new Date(event.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.eventInfo}>⏰ {event.time}</Text>
                  {event.venue && (
                    <Text style={styles.eventInfo}>📍 {event.venue.venueName}</Text>
                  )}
                  {/* Bouton chat de groupe - placé en premier pour être plus visible */}
                  <TouchableOpacity
                    style={[styles.chatButton, { marginTop: 10, marginBottom: 10 }]}
                    onPress={() => openGroupChat(event.id)}
                  >
                    <Text style={styles.chatButtonText}>
                      💬 {language === 'fr' ? 'Chat de groupe' : 'Group chat'}
                    </Text>
                  </TouchableOpacity>
                  
                  {event.djs && event.djs.length > 0 && (
                    <View style={styles.djsList}>
                      <Text style={styles.eventInfoLabel}>
                        🎧 {language === 'fr' ? 'DJs' : 'DJs'}:
                    </Text>
                      <TouchableOpacity
                        style={styles.addDjButton}
                        onPress={() => {
                          // Aller sur la sélection de DJ pour ajouter un nouveau DJ à cet événement
                          navigate('selectDj', {
                            selectedDjIds: event.djIds || [],
                            eventId: event.id,
                          });
                        }}
                      >
                        <Text style={styles.addDjButtonText}>
                          {language === 'fr' ? '+ Ajouter un DJ' : '+ Add DJ'}
                        </Text>
                      </TouchableOpacity>
                      {event.djs.map((dj) => {
                        const statusColors = {
                          PENDING: '#FFA500',
                          ACCEPTED: '#4CAF50',
                          REJECTED: '#F44336',
                        };
                        const statusLabels = {
                          PENDING: language === 'fr' ? 'En attente' : 'Pending',
                          ACCEPTED: language === 'fr' ? 'Accepté' : 'Accepted',
                          REJECTED: language === 'fr' ? 'Refusé' : 'Rejected',
                        };
                        const status = dj.invitationStatus || 'PENDING';
                        const payStatus = dj?.payment?.paymentStatus || 'UPCOMING';
                        const payColors = {
                          UPCOMING: 'rgba(255,255,255,0.55)',
                          PENDING: '#FFA500',
                          PAID: '#4CAF50',
                        };
                        const payLabels = {
                          UPCOMING: language === 'fr' ? 'Paiement à venir' : 'Payment upcoming',
                          PENDING: language === 'fr' ? 'Paiement en attente' : 'Payment pending',
                          PAID: language === 'fr' ? 'Payé' : 'Paid',
                        };
                        return (
                          <View key={dj.userId} style={styles.djItem}>
                            <Text style={styles.djName}>{dj.artistName}</Text>
                            <View style={styles.djItemActions}>
                              {dj.eventDjId && (
                                <TouchableOpacity
                                  style={styles.chatButtonSmall}
                                  onPress={() => openChat(dj.eventDjId)}
                                >
                                  <Text style={styles.chatButtonSmallText}>💬</Text>
                                </TouchableOpacity>
                              )}
                              <View style={[styles.djStatusBadge, { backgroundColor: statusColors[status] + '20' }]}>
                                <Text style={[styles.djStatusText, { color: statusColors[status] }]}>
                                  {statusLabels[status]}
                                </Text>
                              </View>
                              <View style={[styles.djStatusBadge, { backgroundColor: payColors[payStatus] + '20' }]}>
                                <Text style={[styles.djStatusText, { color: payColors[payStatus] }]}>
                                  {payLabels[payStatus] || payStatus}
                                </Text>
                              </View>

                              {status === 'ACCEPTED' && dj.eventDjId && payStatus !== 'PAID' ? (
                                <TouchableOpacity
                                  style={styles.chatButtonSmall}
                                  onPress={() => markBookingAsPaid(dj.eventDjId)}
                                  disabled={markingPaymentEventDjId === dj.eventDjId}
                                >
                                  {markingPaymentEventDjId === dj.eventDjId ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.chatButtonSmallText}>✅</Text>
                                  )}
                                </TouchableOpacity>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  <Text style={styles.eventInfo}>💰 {event.price} €</Text>
                  <Text style={styles.eventInfo}>
                    {language === 'fr' ? 'Statut' : 'Status'}: {event.status}
                  </Text>
                  <Text style={styles.eventInfo}>
                    {event.sold} / {event.capacity} {language === 'fr' ? 'places vendues' : 'tickets sold'}
                  </Text>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditEvent(event)}
                  >
                    <Text style={styles.editButtonText}>
                      {language === 'fr' ? '✏️ Modifier' : '✏️ Edit'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteButton, deletingEventId === event.id && styles.deleteButtonDisabled]}
                    onPress={() => handleDeleteEvent(event.id)}
                    disabled={deletingEventId === event.id}
                  >
                    {deletingEventId === event.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.deleteButtonText}>
                        {language === 'fr' ? '🗑️ Supprimer' : '🗑️ Delete'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Modal pour le sélecteur de date */}
      {Platform.OS === 'ios' && (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerModalContent}
          >
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
              </Text>
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="light"
                textColor={Platform.OS === 'android' ? '#000000' : undefined}
                onChange={(_, selectedDate) => {
                  // On met juste à jour la date temporaire sans fermer
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelButtonText}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  setEventDateTime((prev) => {
                    const newDate = new Date(tempDate);
                    newDate.setHours(prev.getHours());
                    newDate.setMinutes(prev.getMinutes());
                    return newDate;
                  });
                  handleChange('date', tempDate.toISOString());
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmButtonText}>
                  {language === 'fr' ? 'Valider' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      )}

      {/* Modal pour le sélecteur d'heure */}
      {Platform.OS === 'ios' && (
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerModalContent}
          >
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {language === 'fr' ? 'Sélectionner une heure' : 'Select a time'}
              </Text>
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.datePickerCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="light"
                textColor={Platform.OS === 'android' ? '#000000' : undefined}
                onChange={(_, selectedTime) => {
                  // On met juste à jour l'heure temporaire sans fermer
                  if (selectedTime) {
                    setTempTime(selectedTime);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.datePickerCancelButtonText}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  setEventDateTime((prev) => {
                    const newDate = new Date(prev);
                    newDate.setHours(tempTime.getHours());
                    newDate.setMinutes(tempTime.getMinutes());
                    return newDate;
                  });
                  const hours = tempTime.getHours().toString().padStart(2, '0');
                  const minutes = tempTime.getMinutes().toString().padStart(2, '0');
                  handleChange('time', `${hours}:${minutes}`);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmButtonText}>
                  {language === 'fr' ? 'Valider' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      )}

      {/* Modal de chat */}
      <Modal
        visible={chatModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setChatModalVisible(false);
          setSelectedChatEventDjId(null);
          setSelectedChatEventId(null);
          setIsGroupChat(false);
          setChatMessages([]);
          setNewMessageText('');
          // Rafraîchir le compteur après fermeture
          refreshUnreadCount();
        }}
      >
        <View style={styles.chatModalContainer}>
          <KeyboardAvoidingView
            style={styles.chatModalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            {/* Header du chat */}
            <View style={styles.chatHeaderContainer}>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => {
                  setChatModalVisible(false);
                  setSelectedChatEventDjId(null);
                  setSelectedChatEventId(null);
                  setIsGroupChat(false);
                  setChatMessages([]);
                  setNewMessageText('');
                  // Rafraîchir le compteur après fermeture
                  refreshUnreadCount();
                }}
                style={styles.chatCloseButton}
              >
                <Text style={styles.chatCloseButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.chatHeaderTitle}>
                {isGroupChat 
                  ? (language === 'fr' ? 'Chat de groupe' : 'Group chat')
                  : (language === 'fr' ? 'Chat' : 'Chat')
                }
              </Text>
              <View style={{ width: 40 }} />
            </View>
            </View>

            {/* ✅ Contrat (uniquement chat privé) */}
            {!isGroupChat && selectedChatEventDjId ? (
              <View style={styles.contractCard}>
                <View style={styles.contractTopRow}>
                  <Text style={styles.contractTitle}>
                    🧾 {language === 'fr' ? 'Contrat de booking' : 'Booking contract'}
                  </Text>
                  {contractLoading ? (
                    <ActivityIndicator size="small" color="#FF1744" />
                  ) : (
                    <Text style={styles.contractStatus}>
                      {contractData?.status === 'SIGNED'
                        ? (language === 'fr' ? 'Signé' : 'Signed')
                        : contractData?.status === 'SENT'
                          ? (language === 'fr' ? 'Envoyé' : 'Sent')
                          : (language === 'fr' ? 'Brouillon' : 'Draft')}
                    </Text>
                  )}
                </View>

                {contractBooking?.eventTitle ? (
                  <Text style={styles.contractMeta} numberOfLines={2}>
                    🎵 {contractBooking.eventTitle}
                  </Text>
                ) : null}

                <Text style={styles.contractLine}>
                  💰 {language === 'fr' ? 'Prix' : 'Price'}:{' '}
                  <Text style={styles.contractLineStrong}>
                    {contractData?.payload?.priceEur != null ? `${contractData.payload.priceEur} €` : (language === 'fr' ? 'À définir' : 'To define')}
                  </Text>
                  {contractData?.payload?.depositEur != null ? ` • ${language === 'fr' ? 'Acompte' : 'Deposit'}: ${contractData.payload.depositEur} €` : ''}
                </Text>

                {contractData?.payload?.paymentTerms ? (
                  <Text style={styles.contractSmall} numberOfLines={2}>
                    💳 {cleanText(contractData.payload.paymentTerms)}
                  </Text>
                ) : null}
                {contractData?.payload?.cancellation ? (
                  <Text style={styles.contractSmall} numberOfLines={2}>
                    🧯 {cleanText(contractData.payload.cancellation)}
                  </Text>
                ) : null}

                <View style={styles.contractActionsRow}>
                  {contractData?.status === 'DRAFT' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.contractButton, styles.contractButtonSecondary]}
                        onPress={() => setContractEditorVisible(true)}
                      >
                        <Text style={styles.contractButtonText}>
                          {language === 'fr' ? 'Modifier' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.contractButton, styles.contractButtonPrimary]}
                        onPress={sendContract}
                      >
                        <Text style={styles.contractButtonTextDark}>
                          {language === 'fr' ? 'Envoyer au DJ' : 'Send to DJ'}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : contractData?.status === 'SENT' ? (
                    contractData?.sentBy === 'DJ' ? (
                      <>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonSecondary]}
                          onPress={() => setContractEditorVisible(true)}
                        >
                          <Text style={styles.contractButtonText}>
                            {language === 'fr' ? 'Contre-proposer' : 'Counter'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonPrimary]}
                          onPress={acceptContract}
                        >
                          <Text style={styles.contractButtonTextDark}>
                            {language === 'fr' ? 'Accepter' : 'Accept'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.contractHint}>
                        {language === 'fr'
                          ? 'En attente de l’acceptation du DJ.'
                          : 'Waiting for DJ acceptance.'}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.contractHint}>
                      {language === 'fr' ? '✅ Contrat signé.' : '✅ Contract signed.'}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Messages */}
            {loadingChatMessages ? (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="large" color="#FF1744" />
              </View>
            ) : (
              <ScrollView
                ref={chatScrollViewRef}
                style={styles.chatMessagesContainer}
                contentContainerStyle={styles.chatMessagesContent}
                onContentSizeChange={() => {
                  if (chatScrollViewRef.current) {
                    chatScrollViewRef.current.scrollToEnd({ animated: true });
                  }
                }}
              >
                {chatMessages.length === 0 ? (
                  <View style={styles.chatEmptyState}>
                    <Text style={styles.chatEmptyStateText}>
                      {language === 'fr' 
                        ? 'Aucun message pour le moment. Commencez la conversation !' 
                        : 'No messages yet. Start the conversation!'}
                    </Text>
                  </View>
                ) : (
                  chatMessages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatMessage,
                        msg.isOwn ? styles.chatMessageOwn : styles.chatMessageOther,
                      ]}
                    >
                      {!msg.isOwn && msg.senderInfo && (
                        <TouchableOpacity
                          style={styles.chatMessageSender}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (msg.senderInfo.type === 'DJ') {
                              navigate('djProfile', { djId: msg.senderId });
                            }
                          }}
                        >
                          {msg.senderInfo.image ? (
                            <Image
                              source={{ uri: normalizeMediaUrl(msg.senderInfo.image) }}
                              style={styles.chatMessageAvatar}
                            />
                          ) : (
                            <View style={[styles.chatMessageAvatar, styles.chatMessageAvatarPlaceholder]}>
                              <Text style={styles.chatMessageAvatarText}>
                                {msg.senderInfo.name ? msg.senderInfo.name.charAt(0).toUpperCase() : '?'}
                              </Text>
                            </View>
                          )}
                          <Text style={styles.chatMessageSenderName}>
                            {msg.senderInfo.name || (msg.senderInfo.type === 'BOOKER' ? 'Booker' : 'DJ')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onLongPress={() => {
                          if (!msg.isOwn || msg.deleted) return;
                          Alert.alert(
                            language === 'fr' ? 'Supprimer le message' : 'Delete message',
                            language === 'fr'
                              ? 'Voulez-vous supprimer ce message ? Il sera remplacé par \"message supprimé\".'
                              : 'Do you want to delete this message? It will be replaced by \"message deleted\".',
                            [
                              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                              {
                                text: language === 'fr' ? 'Supprimer' : 'Delete',
                                style: 'destructive',
                                onPress: () => handleDeleteMessage(msg.id),
                              },
                            ]
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.chatMessageBubble,
                            msg.isOwn ? styles.chatMessageBubbleOwn : styles.chatMessageBubbleOther,
                            msg.deleted && styles.chatMessageBubbleDeleted,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chatMessageText,
                              msg.isOwn ? styles.chatMessageTextOwn : styles.chatMessageTextOther,
                              msg.deleted && styles.chatMessageTextDeleted,
                            ]}
                          >
                            {msg.deleted
                              ? language === 'fr'
                                ? 'message supprimé'
                                : 'message deleted'
                              : msg.content}
                          </Text>
                          <Text
                            style={[
                              styles.chatMessageTime,
                              msg.isOwn ? styles.chatMessageTimeOwn : styles.chatMessageTimeOther,
                            ]}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            {/* Input pour envoyer un message */}
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={newMessageText}
                onChangeText={setNewMessageText}
                placeholder={language === 'fr' ? 'Tapez votre message...' : 'Type your message...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.chatSendButton, sendingMessage && styles.chatSendButtonDisabled]}
                onPress={sendMessage}
                disabled={!newMessageText.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.chatSendButtonText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* ✅ Modal édition contrat */}
            <Modal
              visible={contractEditorVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setContractEditorVisible(false)}
            >
              <View style={styles.contractModalOverlay}>
                <View style={styles.contractModalCard}>
                  <Text style={styles.contractModalTitle}>
                    {language === 'fr' ? 'Contrat (brouillon)' : 'Contract (draft)'}
                  </Text>

                  <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Prix (€)' : 'Price (€)'}</Text>
                  <TextInput
                    style={styles.contractModalInput}
                    value={contractDraft.priceEur}
                    onChangeText={(v) => setContractDraft((p) => ({ ...p, priceEur: v }))}
                    placeholder="500"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                  />

                  <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Acompte (€) (optionnel)' : 'Deposit (€) (optional)'}</Text>
                  <TextInput
                    style={styles.contractModalInput}
                    value={contractDraft.depositEur}
                    onChangeText={(v) => setContractDraft((p) => ({ ...p, depositEur: v }))}
                    placeholder="100"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="numeric"
                  />

                  <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Modalités de paiement' : 'Payment terms'}</Text>
                  <TextInput
                    style={[styles.contractModalInput, { height: 60 }]}
                    value={contractDraft.paymentTerms}
                    onChangeText={(v) => setContractDraft((p) => ({ ...p, paymentTerms: v }))}
                    placeholder={language === 'fr' ? 'Ex: solde à la fin du set' : 'Ex: balance after performance'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                  />

                  <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Annulation' : 'Cancellation'}</Text>
                  <TextInput
                    style={[styles.contractModalInput, { height: 60 }]}
                    value={contractDraft.cancellation}
                    onChangeText={(v) => setContractDraft((p) => ({ ...p, cancellation: v }))}
                    placeholder={language === 'fr' ? 'Ex: J-7: 50% dû' : 'Ex: D-7: 50% due'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                  />

                  <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Notes (optionnel)' : 'Notes (optional)'}</Text>
                  <TextInput
                    style={[styles.contractModalInput, { height: 60 }]}
                    value={contractDraft.notes}
                    onChangeText={(v) => setContractDraft((p) => ({ ...p, notes: v }))}
                    placeholder={language === 'fr' ? 'Ex: arrivée 20h, set 22h-00h' : 'Ex: arrival 8pm, set 10pm-12am'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                  />

                  <View style={styles.contractModalActions}>
                    <TouchableOpacity
                      style={[styles.contractButton, styles.contractButtonSecondary]}
                      onPress={() => setContractEditorVisible(false)}
                    >
                      <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.contractButton, styles.contractButtonPrimary]}
                      onPress={contractData?.status === 'DRAFT' ? saveContractDraft : counterContract}
                    >
                      <Text style={styles.contractButtonTextDark}>
                        {contractData?.status === 'DRAFT'
                          ? (language === 'fr' ? 'Sauvegarder' : 'Save')
                          : (language === 'fr' ? 'Envoyer' : 'Send')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      
      {/* ✅ Modal édition événement */}
      <Modal
        visible={editEventVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditEventVisible(false)}
      >
        <View style={styles.editEventOverlay}>
          <KeyboardAvoidingView
            style={styles.editEventCard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={styles.editEventContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <Text style={styles.editEventTitle}>
                {language === 'fr' ? 'Modifier l’événement' : 'Edit event'}
              </Text>

              <Text style={styles.editEventLabel}>{language === 'fr' ? 'Titre' : 'Title'}</Text>
              <TextInput
                style={styles.editEventInput}
                value={editEventDraft.title}
                onChangeText={(v) => setEditEventDraft((p) => ({ ...p, title: v }))}
                placeholder={language === 'fr' ? 'Nom de l’événement' : 'Event name'}
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <Text style={styles.editEventLabel}>{language === 'fr' ? 'Description' : 'Description'}</Text>
              <TextInput
                style={[styles.editEventInput, { height: 90 }]}
                value={editEventDraft.description}
                onChangeText={(v) => setEditEventDraft((p) => ({ ...p, description: v }))}
                placeholder={language === 'fr' ? 'Description (optionnel)' : 'Description (optional)'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
              />

              <View style={styles.editEventRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.editEventLabel}>{language === 'fr' ? 'Genre' : 'Genre'}</Text>
                  <TextInput
                    style={styles.editEventInput}
                    value={editEventDraft.genre}
                    onChangeText={(v) => setEditEventDraft((p) => ({ ...p, genre: v }))}
                    placeholder="Techno"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.editEventLabel}>{language === 'fr' ? 'Heure' : 'Time'}</Text>
                  <TextInput
                    style={styles.editEventInput}
                    value={editEventDraft.time}
                    onChangeText={(v) => setEditEventDraft((p) => ({ ...p, time: v }))}
                    placeholder="21:00"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
                </View>
              </View>

              <Text style={styles.editEventLabel}>{language === 'fr' ? 'Adresse (affichage)' : 'Display address'}</Text>
              <TextInput
                style={styles.editEventInput}
                value={editEventDraft.location}
                onChangeText={(v) => setEditEventDraft((p) => ({ ...p, location: v }))}
                placeholder={language === 'fr' ? 'Adresse affichée' : 'Displayed address'}
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <Text style={styles.editEventLabel}>{language === 'fr' ? 'Photo' : 'Photo'}</Text>
              {editEventDraft.image ? (
                <Image
                  source={{ uri: normalizeMediaUrl(editEventDraft.image) }}
                  style={styles.editEventImage}
                />
              ) : (
                <Text style={styles.editEventHint}>
                  {language === 'fr' ? 'Aucune photo' : 'No photo'}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.editEventImageButton, editEventUploading && styles.editEventImageButtonDisabled]}
                onPress={pickEditEventImage}
                disabled={editEventUploading}
              >
                {editEventUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.editEventImageButtonText}>
                    {language === 'fr' ? '🖼️ Choisir une photo' : '🖼️ Pick a photo'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={styles.editEventActions}>
                <TouchableOpacity
                  style={[styles.editEventAction, styles.editEventCancel]}
                  onPress={() => setEditEventVisible(false)}
                  disabled={editEventSaving || editEventUploading}
                >
                  <Text style={styles.editEventCancelText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editEventAction, styles.editEventSave, (editEventSaving || editEventUploading) && styles.editEventSaveDisabled]}
                  onPress={saveEditEvent}
                  disabled={editEventSaving || editEventUploading}
                >
                  {editEventSaving ? (
                    <ActivityIndicator size="small" color="#0b0b0e" />
                  ) : (
                    <Text style={styles.editEventSaveText}>{language === 'fr' ? 'Enregistrer' : 'Save'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 0,
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  messagesButton: {
    position: 'relative',
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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

  // ✅ Contrat (chat privé)
  contractCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.28)',
    backgroundColor: 'rgba(255,23,68,0.06)',
  },
  contractTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  contractTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  contractStatus: {
    color: '#FF1744',
    fontSize: 12,
    fontWeight: '800',
  },
  contractMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  contractLine: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
  },
  contractLineStrong: {
    color: '#fff',
    fontWeight: '900',
  },
  contractSmall: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  contractActionsRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  contractHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
  },
  contractButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractButtonPrimary: {
    backgroundColor: '#FF1744',
  },
  contractButtonSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  contractButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  contractButtonTextDark: {
    color: '#0b0b0e',
    fontSize: 12,
    fontWeight: '900',
  },
  contractModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  contractModalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    backgroundColor: '#0b0b0e',
  },
  contractModalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  contractModalLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  contractModalInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.04)',
    fontSize: 13,
  },
  contractModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  form: {
    marginTop: 20,
    gap: 18,
  },
  sectionTitle: {
    color: '#FF1744',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
  },
  chevron: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: '#FF1744',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  step: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    opacity: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,23,68,0.2)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
  },
  stepNumberActive: {
    backgroundColor: '#FF1744',
    color: '#0b0b0e',
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#FF1744',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,23,68,0.2)',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: '#FF1744',
  },
  stepDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  selectedInfo: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: '#FF1744',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  selectedInfoText: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 12,
  },
  backButtonStep: {
    flex: 1,
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: '#FF1744',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonStepText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#FF1744',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    borderTopWidth: 2,
    borderTopColor: '#FF1744',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.3)',
  },
  modalTitle: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,23,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#FF1744',
    fontSize: 24,
    fontWeight: '300',
  },
  modalOptions: {
    padding: 10,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderColor: '#FF1744',
  },
  modalOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#FF1744',
    fontWeight: '700',
  },
  modalOptionCheck: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: '700',
  },
  djOptionContent: {
    flex: 1,
  },
  djOptionSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  venueOptionContent: {
    flex: 1,
  },
  venueOptionSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  loadingIndicator: {
    marginVertical: 40,
  },
  noOptionsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 40,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 2,
    borderTopColor: '#FF1744',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  datePickerTitle: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  datePickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCloseButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  datePickerContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  datePicker: {
    width: '100%',
    backgroundColor: '#ffffff',
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  tabButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FF1744',
  },
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  // ✅ AJOUT: Styles pour la section profil
  profileSection: {
    padding: 20,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#111',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#FF1744',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0b0b0e',
  },
  profileForm: {
    gap: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  bookerTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  bookerTypeButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  bookerTypeButtonActive: {
    borderColor: '#FF1744',
    backgroundColor: 'rgba(255,23,68,0.2)',
  },
  bookerTypeButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  bookerTypeButtonTextActive: {
    color: '#FF1744',
    fontWeight: '800',
  },
  saveButton: {
    backgroundColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '800',
  },
  eventDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF1744',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  eventDashboardButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  eventsSection: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventInfo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 6,
  },
  eventInfoLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '600',
  },
  djsList: {
    marginBottom: 8,
  },
  djItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 4,
  },
  djName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    flex: 1,
  },
  djStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  djStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  loader: {
    marginTop: 40,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summarySubValue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  costBreakdown: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,23,68,0.5)',
  },
  costTitle: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  costLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
  },
  costValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,23,68,0.5)',
  },
  costTotalLabel: {
    color: '#FF1744',
    fontSize: 20,
    fontWeight: 'bold',
  },
  costTotalValue: {
    color: '#FF1744',
    fontSize: 24,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.30)',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  warningText: {
    color: '#FFC107',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.5)',
  },
  infoText: {
    color: '#2196F3',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  djItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatButtonSmallText: {
    fontSize: 16,
  },
  chatButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Chat Modal
  chatModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  chatModalContent: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    marginTop: Platform.OS === 'ios' ? 50 : 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    justifyContent: 'flex-end',
  },
  chatHeaderContainer: {
    zIndex: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  chatCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCloseButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  chatHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  chatLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  chatMessagesContainer: {
    flex: 1,
    flexGrow: 1,
  },
  chatMessagesContent: {
    padding: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  chatEmptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  chatEmptyStateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  chatMessage: {
    marginBottom: 16,
  },
  chatMessageOwn: {
    alignItems: 'flex-end',
  },
  chatMessageOther: {
    alignItems: 'flex-start',
  },
  chatMessageSender: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatMessageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  chatMessageAvatarPlaceholder: {
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatMessageAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  chatMessageSenderName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  chatMessageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  chatMessageBubbleOwn: {
    backgroundColor: '#FF1744',
    borderBottomRightRadius: 4,
  },
  chatMessageBubbleOther: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  chatMessageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatMessageTextOwn: {
    color: '#fff',
  },
  chatMessageTextOther: {
    color: '#fff',
  },
  chatMessageTime: {
    fontSize: 10,
    marginTop: 4,
  },
  chatMessageTimeOwn: {
    color: 'rgba(255,255,255,0.7)',
  },
  chatMessageTimeOther: {
    color: 'rgba(255,255,255,0.6)',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'android' ? 20 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,23,68,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 60,
    zIndex: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 12 : 10,
    maxHeight: 100,
    minHeight: Platform.OS === 'android' ? 44 : 40,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    textAlignVertical: 'center',
  },
  chatSendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF1744',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  chatSendButtonDisabled: {
    opacity: 0.5,
  },
  chatSendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  // ✅ Edit event modal
  editEventOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  editEventCard: {
    backgroundColor: '#12121a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
    overflow: 'hidden',
    maxHeight: '85%',
  },
  editEventContent: {
    padding: 16,
  },
  editEventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  editEventLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginBottom: 6,
    marginTop: 10,
  },
  editEventInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  editEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editEventHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginBottom: 8,
  },
  editEventImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  editEventImageButton: {
    backgroundColor: 'rgba(255,23,68,0.20)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
  },
  editEventImageButtonDisabled: {
    opacity: 0.6,
  },
  editEventImageButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  editEventActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  editEventAction: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editEventCancel: {
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  editEventCancelText: {
    color: '#fff',
    fontWeight: '700',
  },
  editEventSave: {
    backgroundColor: '#FF1744',
  },
  editEventSaveDisabled: {
    opacity: 0.7,
  },
  editEventSaveText: {
    color: '#0b0b0e',
    fontWeight: '900',
  },
  // Styles pour les slots DJ
  djSlotContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
  },
  djSlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  djSlotLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeSlotButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,23,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSlotButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '700',
  },
  addSlotButton: {
    marginTop: 8,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255,23,68,0.1)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF1744',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
});
