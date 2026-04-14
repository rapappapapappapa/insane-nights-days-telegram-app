import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
  RefreshControl,
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
import { useConfirm } from '../../contexts/ConfirmContext';
import NotificationBadge from '../../components/NotificationBadge';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  draftFromPayload,
  buildVenueContractPayload,
  buildDjContractPayload,
  dealTypeLabel,
  contractAcceptAckLabel,
  contractReadBeforeSendLabel,
  cancellationPolicyLabel,
  buildEventEndTimeOptions,
  formatEventWindowHint,
} from '../../constants/contractPayload';
import ContractDraftEditorFields from '../../components/ContractDraftEditorFields';
import DealTypePickerModal from '../../components/DealTypePickerModal';
import CancellationPolicyPickerModal from '../../components/CancellationPolicyPickerModal';
import EventEndTimePickerModal from '../../components/EventEndTimePickerModal';
import ContractPdfPreviewModal from '../../components/ContractPdfPreviewModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BookerTicketHoldersSection from '../../components/BookerTicketHoldersSection';
import Colors from '../../constants/colors';

const BOOKER_EVENTS_REFRESH_FLAG = '@nox_refresh_booker_events';

function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

export default function BookerDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
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
  const [refreshingEvents, setRefreshingEvents] = useState(false);
  // Ouvrir la section événements si demandé via routeParams (pour les notifications)
  const shouldOpenBookings =
    !!routeParams?.openBookings ||
    !!routeParams?.openChatEventDjId ||
    !!routeParams?.openChatEventId ||
    !!routeParams?.openChatEventVenueId ||
    !!routeParams?.highlightEventId;
  const shouldOpenProfil = routeParams?.openSection === 'profil';
  
  // ✅ MODIFICATION: Ajouter une section "Profil" avec activeSection (profil, events)
  const [activeSection, setActiveSection] = useState(
    shouldOpenProfil ? 'profil' : shouldOpenBookings ? 'events' : 'profil'
  );
  /** Mise en évidence courte d’un événement (ex. après création). */
  const [pulseEventId, setPulseEventId] = useState(null);
  
  // ✅ AJOUT: États pour la gestion du profil booker
  const [bookerProfile, setBookerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    pseudo: '',
    nom: '',
    prenom: '',
    phonePro: '',
    bookerType: 'INDEPENDENT',
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    siret: '',
  });
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const [publishingEventId, setPublishingEventId] = useState(null);
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
  
  // Slots DJ pour la création d'événement (utilisés quand retour depuis SelectDj)
  const [djSlots, setDjSlots] = useState([null]); // Array de djIds ou null
  const [currentStep, setCurrentStep] = useState(1);
  const hasInitializedSlots = useRef(false);

  // Chat
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [selectedChatEventDjId, setSelectedChatEventDjId] = useState(null);
  const [selectedChatEventVenueId, setSelectedChatEventVenueId] = useState(null);
  const [selectedChatEventId, setSelectedChatEventId] = useState(null); // Pour les chats de groupe
  const [isGroupChat, setIsGroupChat] = useState(false);
  const [isVenueChat, setIsVenueChat] = useState(false);
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
  const [contractDraft, setContractDraft] = useState(() => draftFromPayload({}, 'dj'));
  const [venueContractGate, setVenueContractGate] = useState(null);
  const [contractAcceptAck, setContractAcceptAck] = useState(false);
  /** Brouillon : lecture du PDF avant envoi au DJ / lieu. */
  const [contractDraftReadAck, setContractDraftReadAck] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [showEventEndModal, setShowEventEndModal] = useState(false);
  const [showDealTypeModal, setShowDealTypeModal] = useState(false);
  const [contractPdfPreview, setContractPdfPreview] = useState({
    visible: false,
    loading: false,
    pdfBase64: null,
    error: null,
    pendingAction: null,
  });
  /** iOS : évite deux Modal overFullScreen empilés (touches mortes sur l’éditeur). */
  const reopenChatAfterContractRef = useRef(false);
  /** iOS : ouvrir l’éditeur seulement après fermeture du chat (onDismiss + repli timeout). */
  const pendingOpenContractEditorRef = useRef(false);
  const openContractEditorFallbackTimerRef = useRef(null);
  /** Évite deux Modal visibles (éditeur + PDF) sur iOS ; réouverture si annulation PDF. */
  const contractEditorWasVisibleForPdfRef = useRef(false);
  /** Évite éditeur + modal de liste (paiement, etc.) en même temps sur iOS. */
  const contractEditorWasHiddenForChildModalRef = useRef(false);
  const iosPickerOpeningRef = useRef(false);

  const flushPendingContractEditor = () => {
    pendingOpenContractEditorRef.current = false;
    if (openContractEditorFallbackTimerRef.current) {
      clearTimeout(openContractEditorFallbackTimerRef.current);
      openContractEditorFallbackTimerRef.current = null;
    }
  };

  const closeContractEditorSession = () => {
    contractEditorWasHiddenForChildModalRef.current = false;
    iosPickerOpeningRef.current = false;
    setContractEditorVisible(false);
    setShowPaymentTermsModal(false);
    setShowDealTypeModal(false);
    setShowCancellationModal(false);
    setShowEventEndModal(false);
    if (reopenChatAfterContractRef.current) {
      reopenChatAfterContractRef.current = false;
      setChatModalVisible(true);
    }
  };

  const openContractEditorFromChat = () => {
    if (Platform.OS === 'ios' && chatModalVisible) {
      reopenChatAfterContractRef.current = true;
      pendingOpenContractEditorRef.current = true;
      if (openContractEditorFallbackTimerRef.current) {
        clearTimeout(openContractEditorFallbackTimerRef.current);
      }
      setChatModalVisible(false);
      openContractEditorFallbackTimerRef.current = setTimeout(() => {
        openContractEditorFallbackTimerRef.current = null;
        if (!pendingOpenContractEditorRef.current) return;
        pendingOpenContractEditorRef.current = false;
        setContractEditorVisible(true);
      }, 520);
    } else {
      setContractEditorVisible(true);
    }
  };

  const liftContractEditorForIosPicker = (openPicker) => {
    if (Platform.OS === 'ios' && contractEditorVisible) {
      contractEditorWasHiddenForChildModalRef.current = true;
      iosPickerOpeningRef.current = true;
      setContractEditorVisible(false);
      setTimeout(() => {
        openPicker();
        iosPickerOpeningRef.current = false;
      }, 320);
    } else {
      openPicker();
    }
  };

  const setShowPaymentTermsModalForContract = (v) => {
    if (!v) return setShowPaymentTermsModal(false);
    liftContractEditorForIosPicker(() => setShowPaymentTermsModal(true));
  };
  const setShowDealTypeModalForContract = (v) => {
    if (!v) return setShowDealTypeModal(false);
    liftContractEditorForIosPicker(() => setShowDealTypeModal(true));
  };
  const setShowCancellationModalForContract = (v) => {
    if (!v) return setShowCancellationModal(false);
    liftContractEditorForIosPicker(() => setShowCancellationModal(true));
  };
  const setShowEventEndModalForContract = (v) => {
    if (!v) return setShowEventEndModal(false);
    liftContractEditorForIosPicker(() => setShowEventEndModal(true));
  };

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (iosPickerOpeningRef.current) return;
    const anyOpen =
      showPaymentTermsModal || showDealTypeModal || showCancellationModal || showEventEndModal;
    if (anyOpen) return;
    if (!contractEditorWasHiddenForChildModalRef.current) return;
    contractEditorWasHiddenForChildModalRef.current = false;
    const tid = setTimeout(() => setContractEditorVisible(true), 80);
    return () => clearTimeout(tid);
  }, [showPaymentTermsModal, showDealTypeModal, showCancellationModal, showEventEndModal]);

  const PAYMENT_TERMS_OPTIONS = [
    { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
    { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
    { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
    { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
    { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
  ];

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

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Gérer les sélections depuis routeParams (ex: ajout DJ à un événement existant)
  const lastProcessedParams = useRef({ selectedDjId: null, selectedVenueId: null, action: null, eventId: null, slotIndex: null });
  const currentDjId = routeParams?.selectedDjId;
  const currentVenueId = routeParams?.selectedVenueId;
  const currentAction = routeParams?.action;
  const currentEventId = routeParams?.eventId || null;
  const currentSlotIndex = routeParams?.slotIndex;
  
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
    } else if (currentVenueId && currentAction === 'replaceVenue' && currentEventId) {
      (async () => {
        try {
          if (!user?.token) return;
          const response = await api.addVenueToEvent(user.token, currentEventId, currentVenueId);
          if (response?.success) {
            fetchMyEvents();
            showSuccess(language === 'fr' ? 'Lieu ajouté à l\'événement.' : 'Venue added to event.');
          } else {
            showError(response?.message || (language === 'fr' ? 'Impossible d\'ajouter ce lieu.' : 'Unable to add this venue.'));
          }
        } catch (error) {
          console.error('Erreur ajout lieu à un événement:', error);
          showError(language === 'fr' ? 'Erreur lors de l\'ajout du lieu.' : 'Error while adding venue.');
        }
      })();
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
          pseudo: response.profile.pseudo || '',
          nom: response.profile.nom || '',
          prenom: response.profile.prenom || '',
          phonePro: response.profile.phonePro || '',
          bookerType: response.profile.bookerType || 'INDEPENDENT',
          companyName: response.profile.companyName || '',
          address: response.profile.address || '',
          postalCode: response.profile.postalCode || '',
          city: response.profile.city || '',
          country: response.profile.country || '',
          siret: response.profile.siret || '',
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
      const legalFields = {};
      const legalEditable = !(bookerProfile?.companyName || bookerProfile?.address || bookerProfile?.postalCode || bookerProfile?.city || bookerProfile?.country || bookerProfile?.siret);
      if (legalEditable) {
        legalFields.companyName = profileForm.companyName?.trim() || null;
        legalFields.address = profileForm.address?.trim() || null;
        legalFields.postalCode = profileForm.postalCode?.trim() || null;
        legalFields.city = profileForm.city?.trim() || null;
        legalFields.country = profileForm.country?.trim() || null;
        legalFields.siret = profileForm.siret?.trim() || null;
      }
      const response = await api.updateBookerProfile(
        user.token,
        profileForm.nom,
        profileForm.prenom,
        profileForm.phonePro,
        profileForm.bookerType,
        profileForm.pseudo || null,
        legalFields
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
    if (!user?.token) return;
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(BOOKER_EVENTS_REFRESH_FLAG);
        if (flag === '1') await AsyncStorage.removeItem(BOOKER_EVENTS_REFRESH_FLAG);
      } catch (_) {}
      fetchVenues();
      fetchMyEvents();
      loadBookerProfile();
    })();
  }, [user?.token]);

  // Note: fetchAvailableDjs et initialisation des slots sont dans BookerEventDashboardPage

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

  const onRefreshEventsList = useCallback(async () => {
    if (!user?.token) return;
    setRefreshingEvents(true);
    try {
      const response = await api.getBookerEvents(user.token);
      if (response?.success) setMyEvents(response.events || []);
    } catch (e) {
      console.error('[BookerDashboard] refresh events', e);
    } finally {
      setRefreshingEvents(false);
    }
  }, [user?.token]);

  useEffect(() => {
    const hid = routeParams?.highlightEventId;
    if (!hid || !user?.token) return;
    setActiveSection('events');
    setPulseEventId(hid);
    (async () => {
      try {
        const response = await api.getBookerEvents(user.token);
        if (response?.success) setMyEvents(response.events || []);
      } catch (e) {
        console.error('[BookerDashboard] refresh after highlight', e);
      }
    })();
    const t = setTimeout(() => setPulseEventId(null), 12000);
    return () => clearTimeout(t);
  }, [routeParams?.highlightEventId, user?.token]);

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
    setSelectedChatEventVenueId(null);
    setSelectedChatEventId(eventId);
    setIsGroupChat(true);
    setIsVenueChat(false);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventId, true);
    await markAllAsRead();
  };

  const openVenueChat = async (eventVenueId) => {
    setSelectedChatEventDjId(null);
    setSelectedChatEventId(null);
    setSelectedChatEventVenueId(eventVenueId);
    setIsGroupChat(false);
    setIsVenueChat(true);
    setChatModalVisible(true);
    setChatMessages([]);
    await loadChatMessages(eventVenueId, false, true);
    await markAllAsRead();
    await loadVenueContract(eventVenueId);
  };

  const loadContract = async (eventDjId) => {
    if (!user?.token || !eventDjId) return;
    setContractLoading(true);
    setVenueContractGate(null);
    try {
      const res = await api.getBookingContract(user.token, eventDjId);
      if (res?.success) {
        setContractData(res.contract || null);
        setContractBooking(res.booking || null);
        setVenueContractGate(res.venueContractGate ?? null);
        const p = res.contract?.payload || {};
        setContractDraft(draftFromPayload(p, 'dj'));
      }
    } catch (e) {
      console.error('[BookerDashboard] loadContract error:', e);
    } finally {
      setContractLoading(false);
    }
  };

  const saveContractDraft = async () => {
    if (!user?.token) return false;
    const id = isVenueChat ? selectedChatEventVenueId : selectedChatEventDjId;
    if (!id) return false;
    try {
      const payload = isVenueChat ? buildVenueContractPayload(contractDraft) : buildDjContractPayload(contractDraft);
      const res = isVenueChat
        ? await api.saveVenueContractDraft(user.token, selectedChatEventVenueId, payload)
        : await api.saveBookingContractDraft(user.token, selectedChatEventDjId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat sauvegardé.' : 'Contract saved.');
        closeContractEditorSession();
        if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
        else await loadContract(selectedChatEventDjId);
        return true;
      }
      showError(res?.message || (language === 'fr' ? 'Impossible de sauvegarder.' : 'Unable to save.'));
      return false;
    } catch (e) {
      console.error('[BookerDashboard] saveContractDraft error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
      return false;
    }
  };

  const sendContract = async () => {
    if (!user?.token) return;
    const id = isVenueChat ? selectedChatEventVenueId : selectedChatEventDjId;
    if (!id) return;
    try {
      const res = isVenueChat
        ? await api.sendVenueContract(user.token, selectedChatEventVenueId)
        : await api.sendBookingContract(user.token, selectedChatEventDjId);
      if (res?.success) {
        showSuccess(isVenueChat ? (language === 'fr' ? 'Contrat envoyé au lieu.' : 'Contract sent to venue.') : (language === 'fr' ? 'Contrat envoyé au DJ.' : 'Contract sent to DJ.'));
        if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
        else await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] sendContract error:', e);
      showError(language === 'fr' ? 'Erreur envoi contrat.' : 'Contract send error.');
    }
  };

  const acceptContract = async () => {
    if (!user?.token) return;
    const id = isVenueChat ? selectedChatEventVenueId : selectedChatEventDjId;
    if (!id) return;
    try {
      const res = isVenueChat
        ? await api.acceptVenueContract(user.token, selectedChatEventVenueId)
        : await api.acceptBookingContract(user.token, selectedChatEventDjId);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contrat accepté.' : 'Contract accepted.');
        if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
        else await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’accepter.' : 'Unable to accept.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] acceptContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const counterContract = async () => {
    if (!user?.token) return;
    const id = isVenueChat ? selectedChatEventVenueId : selectedChatEventDjId;
    if (!id) return;
    try {
      const payload = isVenueChat ? buildVenueContractPayload(contractDraft) : buildDjContractPayload(contractDraft);
      const res = isVenueChat
        ? await api.counterVenueContract(user.token, selectedChatEventVenueId, payload)
        : await api.counterBookingContract(user.token, selectedChatEventDjId, payload);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Contre-proposition envoyée.' : 'Counter-proposal sent.');
        closeContractEditorSession();
        if (isVenueChat) await loadVenueContract(selectedChatEventVenueId);
        else await loadContract(selectedChatEventDjId);
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('[BookerDashboard] counterContract error:', e);
      showError(language === 'fr' ? 'Erreur contrat.' : 'Contract error.');
    }
  };

  const closeContractPdfPreview = () => {
    const reopenEditor = contractEditorWasVisibleForPdfRef.current;
    contractEditorWasVisibleForPdfRef.current = false;
    setContractPdfPreview({
      visible: false,
      loading: false,
      pdfBase64: null,
      error: null,
      pendingAction: null,
    });
    if (reopenEditor) {
      if (Platform.OS === 'ios') {
        setTimeout(() => setContractEditorVisible(true), 350);
      } else {
        setContractEditorVisible(true);
      }
    } else if (reopenChatAfterContractRef.current) {
      reopenChatAfterContractRef.current = false;
      setChatModalVisible(true);
    }
  };

  const openContractPdfPreview = async ({ previewPayload, pendingAction }) => {
    const id = isVenueChat ? selectedChatEventVenueId : selectedChatEventDjId;
    if (!user?.token || !id) return;
    contractEditorWasVisibleForPdfRef.current = contractEditorVisible;
    setContractEditorVisible(false);

    const runPreview = async () => {
      setContractPdfPreview({
        visible: true,
        loading: true,
        pdfBase64: null,
        error: null,
        pendingAction,
      });
      try {
        const res = isVenueChat
          ? await api.previewVenueContractPdf(user.token, id, previewPayload)
          : await api.previewBookingContractPdf(user.token, id, previewPayload);
        if (res?.success && res.pdfBase64) {
          setContractPdfPreview((p) => ({ ...p, loading: false, pdfBase64: res.pdfBase64 }));
        } else {
          setContractPdfPreview((p) => ({
            ...p,
            loading: false,
            error: res?.message || (language === 'fr' ? 'Impossible de générer le PDF.' : 'Could not generate PDF.'),
          }));
        }
      } catch (e) {
        setContractPdfPreview((p) => ({
          ...p,
          loading: false,
          error: e.message || (language === 'fr' ? 'Erreur réseau.' : 'Network error.'),
        }));
      }
    };

    /** iOS : chat + PDF en deux Modal overFullScreen = touches mortes / couche fantôme — fermer le chat d’abord. */
    if (Platform.OS === 'ios' && chatModalVisible) {
      reopenChatAfterContractRef.current = true;
      setChatModalVisible(false);
      setTimeout(() => {
        runPreview();
      }, 480);
    } else {
      await runPreview();
    }
  };

  const confirmContractPdfPreview = async () => {
    contractEditorWasVisibleForPdfRef.current = false;
    const action = contractPdfPreview.pendingAction;
    setContractPdfPreview({
      visible: false,
      loading: false,
      pdfBase64: null,
      error: null,
      pendingAction: null,
    });
    try {
      if (action === 'send') {
        const ok = await saveContractDraft();
        if (ok) await sendContract();
      } else if (action === 'accept') {
        await acceptContract();
      } else if (action === 'counter') {
        await counterContract();
        return;
      }
    } finally {
      if (reopenChatAfterContractRef.current) {
        reopenChatAfterContractRef.current = false;
        setChatModalVisible(true);
      }
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
        setContractDraft(draftFromPayload(p, 'venue'));
        setVenueContractGate(null);
      }
    } catch (e) {
      console.error('[BookerDashboard] loadVenueContract error:', e);
    } finally {
      setContractLoading(false);
    }
  };

  useEffect(() => {
    setContractAcceptAck(false);
    setContractDraftReadAck(false);
  }, [
    selectedChatEventDjId,
    selectedChatEventVenueId,
    isVenueChat,
    contractData?.id,
    contractData?.status,
    contractData?.sentBy,
  ]);

  // ✅ Ouvrir automatiquement la conversation depuis une notification (BOOKER)
  useEffect(() => {
    if (!user?.token) return;
    const type = routeParams?.openChatType;
    const eventDjId = routeParams?.openChatEventDjId;
    const eventVenueId = routeParams?.openChatEventVenueId;
    const eventId = routeParams?.openChatEventId;

    if (shouldOpenBookings) {
      setActiveSection('events');
    }

    if (type === 'PRIVATE' && eventDjId) {
      openChat(eventDjId);
    } else if (type === 'PRIVATE' && eventVenueId) {
      openVenueChat(eventVenueId);
    } else if (type === 'GROUP' && eventId) {
      openGroupChat(eventId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token, routeParams?.openChatType, routeParams?.openChatEventDjId, routeParams?.openChatEventVenueId, routeParams?.openChatEventId]);

  const loadChatMessages = async (id, isGroup = false, isVenue = false) => {
    if (!user?.token || !id) return;
    
    setLoadingChatMessages(true);
    try {
      let response;
      if (isGroup) {
        response = await api.getGroupMessages(user.token, id);
      } else if (isVenue) {
        response = await api.getVenueMessages(user.token, id);
      } else {
        response = await api.getMessages(user.token, id);
      }
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
    if (!isGroupChat && !selectedChatEventDjId && !selectedChatEventVenueId) return;
    if (isGroupChat && !selectedChatEventId) return;
    
    const messageText = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);
    
    try {
      let response;
      if (isGroupChat) {
        response = await api.sendGroupMessage(user.token, selectedChatEventId, messageText);
      } else if (isVenueChat) {
        response = await api.sendVenueMessage(user.token, selectedChatEventVenueId, messageText);
      } else {
        response = await api.sendMessage(user.token, selectedChatEventDjId, messageText);
      }
      if (response && response.success) {
        const id = isGroupChat ? selectedChatEventId : (isVenueChat ? selectedChatEventVenueId : selectedChatEventDjId);
        await loadChatMessages(id, isGroupChat, isVenueChat);
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

  const handlePublishToFeed = async (eventId) => {
    showConfirm(
      language === 'fr' ? 'Publier sur le feed' : 'Publish to feed',
      language === 'fr'
        ? 'L\'événement sera visible par tous sur le feed. Continuer ?'
        : 'The event will be visible to everyone on the feed. Continue?',
      [
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: language === 'fr' ? 'Publier' : 'Publish',
          onPress: async () => {
            if (!user?.token) return;
            setPublishingEventId(eventId);
            try {
              const response = await api.publishEventToFeed(user.token, eventId);
              if (response?.success) {
                showSuccess(language === 'fr' ? 'Événement publié sur le feed.' : 'Event published to feed.');
                fetchMyEvents();
              } else {
                showError(response?.message || (language === 'fr' ? 'Erreur lors de la publication.' : 'Error publishing.'));
              }
            } catch (error) {
              console.error('Erreur publication feed:', error);
              showError(error.message || (language === 'fr' ? 'Erreur lors de la publication.' : 'Error publishing.'));
            } finally {
              setPublishingEventId(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteEvent = async (eventId) => {
    showConfirm(
      language === 'fr' ? 'Supprimer l\'événement' : 'Delete event',
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.'
        : 'Are you sure you want to delete this event? This action is irreversible.',
      [
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
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
                fetchMyEvents();
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
        showError(language === 'fr' ? "Autorise l’accès aux photos pour choisir une image." : 'Please allow photo access to pick an image.');
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
        setActiveSection('events');
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

  const contractEventEndOptions = useMemo(
    () => buildEventEndTimeOptions(contractBooking?.eventTime, contractBooking?.durationHours, 30),
    [contractBooking?.eventTime, contractBooking?.durationHours]
  );
  const contractEventWindowHint = useMemo(
    () => formatEventWindowHint(contractBooking?.eventTime, contractBooking?.durationHours, language),
    [contractBooking?.eventTime, contractBooking?.durationHours, language]
  );

  const djVenueGateBlocks =
    !isVenueChat &&
    venueContractGate?.hasVenueOnEvent === true &&
    venueContractGate?.canFinalizeDjContract === false;

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
          <Text
            style={styles.title}
            numberOfLines={2}
            adjustsFontSizeToFit={Platform.OS === 'ios'}
            minimumFontScale={0.85}
          >
            {language === 'fr' ? 'Dashboard Organisateur' : 'Organizer Dashboard'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.messagesButton}
              onPress={() => {
                setActiveSection('events');
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

      {/* ✅ AJOUT: Boutons Profil (voir public + dashboard événement) */}
      {activeSection === 'profil' && (
        <View style={styles.profilActionsRow}>
          {bookerProfile?.id && (
            <TouchableOpacity
              style={styles.viewPublicProfileButton}
              onPress={() => navigate('bookerProfile', { bookerId: bookerProfile.id })}
            >
              <Ionicons name="eye-outline" size={20} color={Colors.primary} />
              <Text style={styles.viewPublicProfileButtonText}>
                {language === 'fr' ? 'Voir mon profil public' : 'View my public profile'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.eventDashboardButton}
            onPress={() => navigate('bookerEventDashboard', {})}
          >
            <Ionicons name="calendar" size={24} color={Colors.background} />
            <Text style={styles.eventDashboardButtonText}>
              {language === 'fr' ? 'Dashboard Événement' : 'Event Dashboard'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          activeSection === 'events' ? (
            <RefreshControl
              refreshing={refreshingEvents}
              onRefresh={onRefreshEventsList}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          ) : undefined
        }
      >
        {activeSection === 'profil' ? (
          // ✅ AJOUT: Section "Profil"
          <View style={styles.profileSection}>
            {loadingProfile ? (
              <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  {language === 'fr' ? 'Mon Profil' : 'My Profile'}
                </Text>

                {/* Bannière infos légales vides */}
                {!(bookerProfile?.companyName || bookerProfile?.address || bookerProfile?.postalCode || bookerProfile?.city || bookerProfile?.country || bookerProfile?.siret) && (
                  <View style={styles.legalBanner}>
                    <Text style={styles.legalBannerText}>
                      📋 {language === 'fr' ? 'Complétez vos infos légales (société, SIRET, adresse) pour les contrats. Faites défiler vers le bas.' : 'Complete your legal info (company, SIRET, address) for contracts. Scroll down.'}
                    </Text>
                  </View>
                )}
                
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
                  <Text style={styles.inputLabel}>
                    {language === 'fr' ? 'Pseudo (affiché sur le feed)' : 'Nickname (displayed on feed)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={profileForm.pseudo}
                    onChangeText={(v) => setProfileForm((p) => ({ ...p, pseudo: v }))}
                    placeholder={language === 'fr' ? 'Ex: parano69100' : 'e.g. parano69100'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />

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

                  {(() => {
                    const legalEditable = !(bookerProfile?.companyName || bookerProfile?.address || bookerProfile?.postalCode || bookerProfile?.city || bookerProfile?.country || bookerProfile?.siret);
                    return (
                      <>
                        <Text style={[styles.inputLabel, styles.legalSectionTitle]}>
                          {language === 'fr' ? 'Infos légales (pour les contrats)' : 'Legal info (for contracts)'}
                        </Text>
                        {legalEditable ? (
                          <>
                            <Text style={styles.legalHint}>
                              {language === 'fr' ? 'Complétez une seule fois. Ces champs ne pourront plus être modifiés après enregistrement.' : 'Fill once. These fields cannot be edited after saving.'}
                            </Text>
                            <Text style={styles.inputLabel}>{language === 'fr' ? 'Société' : 'Company'}</Text>
                            <TextInput style={styles.input} value={profileForm.companyName} onChangeText={(v) => setProfileForm((p) => ({ ...p, companyName: v }))} placeholder={language === 'fr' ? 'Raison sociale' : 'Company name'} placeholderTextColor="rgba(255,255,255,0.4)" />
                            <Text style={styles.inputLabel}>{language === 'fr' ? 'Adresse' : 'Address'}</Text>
                            <TextInput style={styles.input} value={profileForm.address} onChangeText={(v) => setProfileForm((p) => ({ ...p, address: v }))} placeholder={language === 'fr' ? 'Adresse complète' : 'Full address'} placeholderTextColor="rgba(255,255,255,0.4)" />
                            <Text style={styles.inputLabel}>{language === 'fr' ? 'Code postal' : 'Postal code'}</Text>
                            <TextInput style={styles.input} value={profileForm.postalCode} onChangeText={(v) => setProfileForm((p) => ({ ...p, postalCode: v }))} placeholder="75001" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                            <Text style={styles.inputLabel}>{language === 'fr' ? 'Ville' : 'City'}</Text>
                            <TextInput style={styles.input} value={profileForm.city} onChangeText={(v) => setProfileForm((p) => ({ ...p, city: v }))} placeholder="Paris" placeholderTextColor="rgba(255,255,255,0.4)" />
                            <Text style={styles.inputLabel}>{language === 'fr' ? 'Pays' : 'Country'}</Text>
                            <TextInput style={styles.input} value={profileForm.country} onChangeText={(v) => setProfileForm((p) => ({ ...p, country: v }))} placeholder="France" placeholderTextColor="rgba(255,255,255,0.4)" />
                            <Text style={styles.inputLabel}>SIRET</Text>
                            <TextInput style={styles.input} value={profileForm.siret} onChangeText={(v) => setProfileForm((p) => ({ ...p, siret: v }))} placeholder="123 456 789 00012" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                          </>
                        ) : (
                          <View style={styles.readOnlyLegalWrap}>
                            {profileForm.companyName ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Société' : 'Company'}: {profileForm.companyName}</Text> : null}
                            {profileForm.address ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Adresse' : 'Address'}: {profileForm.address}</Text> : null}
                            {(profileForm.postalCode || profileForm.city) ? <Text style={styles.readOnlyLegalText}>{profileForm.postalCode} {profileForm.city}</Text> : null}
                            {profileForm.country ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Pays' : 'Country'}: {profileForm.country}</Text> : null}
                            {profileForm.siret ? <Text style={styles.readOnlyLegalText}>SIRET: {profileForm.siret}</Text> : null}
                            <Text style={styles.readOnlyLegalHint}>{language === 'fr' ? 'Ces informations ne peuvent plus être modifiées.' : 'These details cannot be modified.'}</Text>
                          </View>
                        )}
                      </>
                    );
                  })()}

                  <Text style={styles.inputLabel}>{language === 'fr' ? 'Type d\'organisateur' : 'Organizer Type'}</Text>
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
                      <ActivityIndicator size="small" color={Colors.background} />
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
              <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
            ) : myEvents.length === 0 ? (
              <Text style={styles.emptyText}>
                {language === 'fr' ? 'Aucun événement créé pour le moment.' : 'No events created yet.'}
              </Text>
            ) : (
              myEvents.map((event) => (
                <View
                  key={event.id}
                  style={[styles.eventCard, pulseEventId === event.id && styles.eventCardHighlighted]}
                >
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventInfo}>
                    📅 {new Date(event.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.eventInfo}>⏰ {event.time}</Text>
                  {(event.venue || event.venueNeedsReplacement) && (
                    <View style={styles.venueRow}>
                      {event.venue ? (
                        <>
                          <Text style={styles.eventInfo}>📍 {event.venue.venueName}</Text>
                          {event.venue.eventVenueId && (
                            <TouchableOpacity
                              style={styles.chatButtonSmall}
                              onPress={() => openVenueChat(event.venue.eventVenueId)}
                            >
                              <Text style={styles.chatButtonSmallText}>💬</Text>
                            </TouchableOpacity>
                          )}
                        </>
                      ) : event.venueNeedsReplacement ? (
                        <TouchableOpacity
                          style={styles.replaceVenueButton}
                          onPress={() => navigate('selectVenue', { eventId: event.id, replaceMode: true, returnTo: 'bookerDashboard' })}
                        >
                          <Text style={styles.replaceVenueButtonText}>
                            {language === 'fr' ? '🔄 Remplacer le lieu' : '🔄 Replace venue'}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
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

                  {/* Staff + Scan billets */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity
                      style={[styles.chatButton, { flex: 1 }]}
                      onPress={() => navigate('eventStaff', { eventId: event.id, eventTitle: event.title })}
                    >
                      <Text style={styles.chatButtonText}>
                        👥 {language === 'fr' ? 'Staff' : 'Staff'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.chatButton, { flex: 1 }]}
                      onPress={() => navigate('scanTicket', { eventId: event.id, eventTitle: event.title })}
                    >
                      <Text style={styles.chatButtonText}>
                        📱 {language === 'fr' ? 'Scanner billets' : 'Scan tickets'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <BookerTicketHoldersSection
                    language={language}
                    ticketHolders={event.ticketHolders}
                    styles={styles}
                  />
                  
                  <View style={styles.djsList}>
                    <Text style={styles.eventInfoLabel}>
                      🎧 {language === 'fr' ? 'DJs' : 'DJs'}:
                    </Text>
                    <TouchableOpacity
                      style={styles.addDjButton}
                      onPress={() => {
                        navigate('selectDj', {
                          selectedDjIds: event.djIds || [],
                          eventId: event.id,
                        });
                      }}
                    >
                      <Text style={styles.addDjButtonText}>
                        {language === 'fr' ? '+ Ajouter / Remplacer un DJ' : '+ Add / Replace DJ'}
                      </Text>
                    </TouchableOpacity>
                    {(event.djs || []).map((dj) => {
                        const statusColors = {
                          PENDING: '#FFA500',
                          ACCEPTED: '#4CAF50',
                          REJECTED: '#F44336',
                          CANCELLED: '#9E9E9E',
                        };
                        const statusLabels = {
                          PENDING: language === 'fr' ? 'En attente' : 'Pending',
                          ACCEPTED: language === 'fr' ? 'Accepté' : 'Accepted',
                          REJECTED: language === 'fr' ? 'Refusé' : 'Rejected',
                          CANCELLED: language === 'fr' ? 'Annulé' : 'Cancelled',
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
                            <View style={styles.djItemTop}>
                              <Text style={styles.djName} numberOfLines={2}>
                                {dj.artistName || '—'}
                              </Text>
                              {dj.eventDjId ? (
                                <TouchableOpacity
                                  style={styles.chatButtonSmall}
                                  onPress={() => openChat(dj.eventDjId)}
                                >
                                  <Text style={styles.chatButtonSmallText}>💬</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>
                            <View style={styles.djItemActions}>
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
                  {event.canPublishToFeed && (
                    <TouchableOpacity
                      style={[styles.publishFeedButton, publishingEventId === event.id && styles.publishFeedButtonDisabled]}
                      onPress={() => handlePublishToFeed(event.id)}
                      disabled={publishingEventId === event.id}
                    >
                      {publishingEventId === event.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.publishFeedButtonText}>
                          📢 {language === 'fr' ? 'Publier sur le feed' : 'Publish to feed'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {event.publishedOnFeed && (
                    <View style={styles.publishedBadge}>
                      <Text style={styles.publishedBadgeText}>
                        ✓ {language === 'fr' ? 'Publié sur le feed' : 'Published on feed'}
                      </Text>
                    </View>
                  )}
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
        presentationStyle="overFullScreen"
        onDismiss={() => {
          if (!pendingOpenContractEditorRef.current) return;
          pendingOpenContractEditorRef.current = false;
          if (openContractEditorFallbackTimerRef.current) {
            clearTimeout(openContractEditorFallbackTimerRef.current);
            openContractEditorFallbackTimerRef.current = null;
          }
          setContractEditorVisible(true);
        }}
        onRequestClose={() => {
          reopenChatAfterContractRef.current = false;
          flushPendingContractEditor();
          setChatModalVisible(false);
          setSelectedChatEventDjId(null);
          setSelectedChatEventVenueId(null);
          setSelectedChatEventId(null);
          setIsGroupChat(false);
          setIsVenueChat(false);
          setChatMessages([]);
          setNewMessageText('');
          setContractEditorVisible(false);
          setShowPaymentTermsModal(false);
          setShowDealTypeModal(false);
          setShowCancellationModal(false);
          setShowEventEndModal(false);
          // Rafraîchir le compteur après fermeture
          refreshUnreadCount();
        }}
      >
        <View style={styles.chatModalContainer}>
          <KeyboardAvoidingView
            style={styles.chatModalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <ScrollView
              ref={chatScrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={true}
              onContentSizeChange={() => {
                if (chatScrollViewRef.current) {
                  chatScrollViewRef.current.scrollToEnd({ animated: true });
                }
              }}
            >
            {/* Header du chat */}
            <View style={styles.chatHeaderContainer}>
            <View style={styles.chatHeader}>
              <TouchableOpacity
                onPress={() => {
                  reopenChatAfterContractRef.current = false;
                  flushPendingContractEditor();
                  setChatModalVisible(false);
                  setSelectedChatEventDjId(null);
                  setSelectedChatEventVenueId(null);
                  setSelectedChatEventId(null);
                  setIsGroupChat(false);
                  setIsVenueChat(false);
                  setChatMessages([]);
                  setNewMessageText('');
                  setContractEditorVisible(false);
                  setShowPaymentTermsModal(false);
                  setShowDealTypeModal(false);
                  setShowCancellationModal(false);
                  setShowEventEndModal(false);
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

            {/* ✅ Contrat (chat privé DJ ou Lieu) */}
            {!isGroupChat && (selectedChatEventDjId || selectedChatEventVenueId) ? (
              <View style={styles.contractCard}>
              {/* iOS : pas de Pressable parent sur les boutons — évite les touches « fantômes » (animation sans action) */}
              <TouchableOpacity
                activeOpacity={0.92}
                disabled={contractLoading || !contractData}
                onPress={() => {
                  if (contractLoading || !contractData) return;
                  if (contractData.status === 'DRAFT') openContractEditorFromChat();
                  else if (
                    contractData.status === 'SENT' &&
                    (isVenueChat ? contractData.sentBy === 'VENUE' : contractData.sentBy === 'DJ')
                  ) {
                    openContractEditorFromChat();
                  }
                }}
              >
                <View>
                <View style={styles.contractTopRow}>
                  <Text style={styles.contractTitle}>
                    🧾 {isVenueChat
                      ? (language === 'fr' ? 'Contrat lieu' : 'Venue contract')
                      : (language === 'fr' ? 'Contrat de booking' : 'Booking contract')}
                  </Text>
                  {contractLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.contractStatus}>
                      {contractData?.status === 'SIGNED'
                        ? (language === 'fr' ? 'Accepté' : 'Accepted')
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
                  {contractData?.payload?.depositPercent != null ? ` • ${language === 'fr' ? 'Acompte' : 'Deposit'}: ${contractData.payload.depositPercent} %` : ''}
                </Text>

                {contractData?.payload?.paymentTerms ? (
                  <Text style={styles.contractSmall} numberOfLines={2}>
                    💳 {PAYMENT_TERMS_OPTIONS.find(o => o.value === contractData.payload.paymentTerms)?.[language === 'fr' ? 'labelFr' : 'labelEn'] || cleanText(contractData.payload.paymentTerms)}
                  </Text>
                ) : null}
                {isVenueChat && contractData?.payload?.dealType ? (
                  <Text style={styles.contractSmall} numberOfLines={2}>
                    📋 {dealTypeLabel(contractData.payload.dealType, language)}
                  </Text>
                ) : null}
                {contractData?.payload?.eventEnd ? (
                  <Text style={styles.contractSmall} numberOfLines={1}>
                    🕐 {language === 'fr' ? 'Fin' : 'End'}: {cleanText(String(contractData.payload.eventEnd))}
                  </Text>
                ) : null}
                {contractData?.payload?.cancellation ? (
                  <Text style={styles.contractSmall} numberOfLines={4}>
                    🧯 {cleanText(cancellationPolicyLabel(contractData.payload.cancellation, language))}
                  </Text>
                ) : null}

                {djVenueGateBlocks ? (
                  <Text style={styles.contractHint}>
                    {language === 'fr'
                      ? 'Le contrat avec le lieu doit être accepté avant de finaliser le contrat DJ.'
                      : 'The venue contract must be accepted before the DJ contract can be finalized.'}
                  </Text>
                ) : null}
                </View>
              </TouchableOpacity>

                {contractData?.status === 'DRAFT' ? (
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                    onPress={() =>
                      openContractPdfPreview({
                        previewPayload: isVenueChat
                          ? buildVenueContractPayload(contractDraft)
                          : buildDjContractPayload(contractDraft),
                        pendingAction: 'preview',
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.contractButtonText}>
                      {language === 'fr' ? 'Voir le contrat (PDF)' : 'View contract (PDF)'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {contractData?.status === 'DRAFT' ? (
                  <View style={styles.contractAckRow}>
                    <TouchableOpacity
                      style={[
                        styles.contractAckCheckbox,
                        contractDraftReadAck && styles.contractAckCheckboxChecked,
                      ]}
                      onPress={() => setContractDraftReadAck(!contractDraftReadAck)}
                      activeOpacity={0.7}
                    >
                      {contractDraftReadAck ? (
                        <Text style={styles.contractAckCheckmark}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                    <Text style={styles.contractAckText}>{contractReadBeforeSendLabel(language)}</Text>
                  </View>
                ) : null}

                {contractData?.status === 'SENT' &&
                (isVenueChat ? contractData?.sentBy === 'VENUE' : contractData?.sentBy === 'DJ') ? (
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary, styles.contractPdfPreviewBtn]}
                    onPress={() =>
                      openContractPdfPreview({
                        previewPayload: isVenueChat
                          ? buildVenueContractPayload(contractDraft)
                          : buildDjContractPayload(contractDraft),
                        pendingAction: 'preview',
                      })
                    }
                    activeOpacity={0.85}
                  >
                    <Text style={styles.contractButtonText}>
                      {language === 'fr' ? 'Voir le contrat (PDF)' : 'View contract (PDF)'}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {contractData?.status === 'SENT' &&
                (isVenueChat ? contractData?.sentBy === 'VENUE' : contractData?.sentBy === 'DJ') ? (
                  <View style={styles.contractAckRow}>
                    <TouchableOpacity
                      style={[
                        styles.contractAckCheckbox,
                        contractAcceptAck && styles.contractAckCheckboxChecked,
                      ]}
                      onPress={() => setContractAcceptAck(!contractAcceptAck)}
                      activeOpacity={0.7}
                    >
                      {contractAcceptAck ? (
                        <Text style={styles.contractAckCheckmark}>✓</Text>
                      ) : null}
                    </TouchableOpacity>
                    <Text style={styles.contractAckText}>{contractAcceptAckLabel(language)}</Text>
                  </View>
                ) : null}

                <View style={styles.contractActionsRow}>
                  {contractData?.status === 'DRAFT' ? (
                    <>
                      <TouchableOpacity
                        style={[styles.contractButton, styles.contractButtonSecondary]}
                        onPress={openContractEditorFromChat}
                      >
                        <Text style={styles.contractButtonText}>
                          {language === 'fr' ? 'Modifier' : 'Edit'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.contractButton,
                          styles.contractButtonPrimary,
                          !contractDraftReadAck && { opacity: 0.45 },
                        ]}
                        onPress={() =>
                          openContractPdfPreview({
                            previewPayload: isVenueChat
                              ? buildVenueContractPayload(contractDraft)
                              : buildDjContractPayload(contractDraft),
                            pendingAction: 'send',
                          })
                        }
                        disabled={!contractDraftReadAck}
                      >
                        <Text style={styles.contractButtonTextDark}>
                          {isVenueChat
                            ? (language === 'fr' ? 'Envoyer au lieu' : 'Send to venue')
                            : (language === 'fr' ? 'Envoyer au DJ' : 'Send to DJ')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : contractData?.status === 'SENT' ? (
                    (isVenueChat ? contractData?.sentBy === 'VENUE' : contractData?.sentBy === 'DJ') ? (
                      <>
                        <TouchableOpacity
                          style={[styles.contractButton, styles.contractButtonSecondary]}
                          onPress={openContractEditorFromChat}
                        >
                          <Text style={styles.contractButtonText}>
                            {language === 'fr' ? 'Contre-proposer' : 'Counter'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.contractButton,
                            styles.contractButtonPrimary,
                            (djVenueGateBlocks || !contractAcceptAck) && { opacity: 0.45 },
                          ]}
                          onPress={() =>
                            openContractPdfPreview({
                              previewPayload: isVenueChat
                                ? buildVenueContractPayload(contractDraft)
                                : buildDjContractPayload(contractDraft),
                              pendingAction: 'accept',
                            })
                          }
                          disabled={djVenueGateBlocks || !contractAcceptAck}
                        >
                          <Text style={styles.contractButtonTextDark}>
                            {language === 'fr' ? 'Accepter' : 'Accept'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={styles.contractHint}>
                        {isVenueChat
                          ? (language === 'fr' ? "En attente de l’acceptation du lieu." : 'Waiting for venue acceptance.')
                          : (language === 'fr' ? "En attente de l’acceptation du DJ." : 'Waiting for DJ acceptance.')}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.contractHint}>
                      {language === 'fr' ? '✅ Contrat accepté.' : '✅ Contract accepted.'}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Messages */}
            {loadingChatMessages ? (
              <View style={styles.chatLoadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.chatMessagesContainer}>
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
                            {msg.senderInfo.name || (msg.senderInfo.type === 'BOOKER' ? 'Organisateur' : 'DJ')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onLongPress={() => {
                          if (!msg.isOwn || msg.deleted) return;
                          showConfirm(
                            language === 'fr' ? 'Supprimer le message' : 'Delete message',
                            language === 'fr'
                              ? 'Voulez-vous supprimer ce message ? Il sera remplacé par "message supprimé".'
                              : 'Do you want to delete this message? It will be replaced by "message deleted".',
                            [
                              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                              { text: language === 'fr' ? 'Supprimer' : 'Delete', style: 'destructive', onPress: () => handleDeleteMessage(msg.id) },
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
              </View>
            )}

            </ScrollView>

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
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modals contrat — hors du modal chat (évite modaux imbriqués sur iOS) */}
      <Modal
        visible={contractEditorVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={closeContractEditorSession}
      >
        {Platform.OS === 'ios' ? (
          <View style={styles.contractModalOverlay}>
            <View
              style={[
                styles.contractModalCard,
                { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' },
              ]}
              collapsable={false}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator
                nestedScrollEnabled
                removeClippedSubviews={false}
              >
                <Text style={styles.contractModalTitle}>
                  {language === 'fr' ? 'Contrat (brouillon)' : 'Contract (draft)'}
                </Text>

                <ContractDraftEditorFields
                  mode={isVenueChat ? 'venue' : 'dj'}
                  draft={contractDraft}
                  setDraft={setContractDraft}
                  language={language}
                  styles={styles}
                  PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                setShowDealTypeModal={setShowDealTypeModalForContract}
                setShowCancellationModal={setShowCancellationModalForContract}
                eventEndOptions={contractEventEndOptions}
                eventWindowHint={contractEventWindowHint}
                setShowEventEndModal={setShowEventEndModalForContract}
              />

                <View style={styles.contractModalActions}>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary]}
                    onPress={closeContractEditorSession}
                  >
                    <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonPrimary]}
                    onPress={
                      contractData?.status === 'DRAFT'
                        ? saveContractDraft
                        : () =>
                            openContractPdfPreview({
                              previewPayload: isVenueChat
                                ? buildVenueContractPayload(contractDraft)
                                : buildDjContractPayload(contractDraft),
                              pendingAction: 'counter',
                            })
                    }
                  >
                    <Text style={styles.contractButtonTextDark}>
                      {contractData?.status === 'DRAFT'
                        ? (language === 'fr' ? 'Sauvegarder' : 'Save')
                        : (language === 'fr' ? 'Envoyer' : 'Send')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            enabled
            style={styles.contractModalOverlay}
            behavior="height"
          >
            <View
              style={[
                styles.contractModalCard,
                { height: contractEditorModalCardHeight, maxWidth: 520, alignSelf: 'center' },
              ]}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 24 }}
                keyboardShouldPersistTaps="always"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.contractModalTitle}>
                  {language === 'fr' ? 'Contrat (brouillon)' : 'Contract (draft)'}
                </Text>

                <ContractDraftEditorFields
                  mode={isVenueChat ? 'venue' : 'dj'}
                  draft={contractDraft}
                  setDraft={setContractDraft}
                  language={language}
                  styles={styles}
                  PAYMENT_TERMS_OPTIONS={PAYMENT_TERMS_OPTIONS}
                setShowPaymentTermsModal={setShowPaymentTermsModalForContract}
                setShowDealTypeModal={setShowDealTypeModalForContract}
                setShowCancellationModal={setShowCancellationModalForContract}
                eventEndOptions={contractEventEndOptions}
                eventWindowHint={contractEventWindowHint}
                setShowEventEndModal={setShowEventEndModalForContract}
              />

                <View style={styles.contractModalActions}>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonSecondary]}
                    onPress={closeContractEditorSession}
                  >
                    <Text style={styles.contractButtonText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.contractButton, styles.contractButtonPrimary]}
                    onPress={
                      contractData?.status === 'DRAFT'
                        ? saveContractDraft
                        : () =>
                            openContractPdfPreview({
                              previewPayload: isVenueChat
                                ? buildVenueContractPayload(contractDraft)
                                : buildDjContractPayload(contractDraft),
                              pendingAction: 'counter',
                            })
                    }
                  >
                    <Text style={styles.contractButtonTextDark}>
                      {contractData?.status === 'DRAFT'
                        ? (language === 'fr' ? 'Sauvegarder' : 'Save')
                        : (language === 'fr' ? 'Envoyer' : 'Send')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>

      <Modal
        visible={showPaymentTermsModal}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowPaymentTermsModal(false)}
      >
        <View style={styles.paymentTermsOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPaymentTermsModal(false)}
          />
          <View style={styles.paymentTermsModalContent}>
            <Text style={styles.contractModalTitle}>
              {language === 'fr' ? 'Modalités de paiement' : 'Payment terms'}
            </Text>
            {PAYMENT_TERMS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.paymentTermsOption, contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionSelected]}
                onPress={() => {
                  setContractDraft((p) => ({ ...p, paymentTerms: opt.value }));
                  setShowPaymentTermsModal(false);
                }}
              >
                <Text style={[styles.paymentTermsOptionText, contractDraft.paymentTerms === opt.value && styles.paymentTermsOptionTextSelected]}>
                  {language === 'fr' ? opt.labelFr : opt.labelEn}
                </Text>
                {contractDraft.paymentTerms === opt.value && <Text style={styles.paymentTermsCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.paymentTermsClose}
              onPress={() => setShowPaymentTermsModal(false)}
            >
              <Text style={styles.contractButtonText}>{language === 'fr' ? 'Fermer' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DealTypePickerModal
        visible={showDealTypeModal && !!isVenueChat}
        onClose={() => setShowDealTypeModal(false)}
        value={contractDraft.dealType}
        onSelect={(v) => setContractDraft((p) => ({ ...p, dealType: v }))}
        language={language}
        styles={styles}
      />

      <CancellationPolicyPickerModal
        visible={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        value={contractDraft.cancellation}
        onSelect={(v) => setContractDraft((p) => ({ ...p, cancellation: v }))}
        language={language}
        styles={styles}
      />

      <EventEndTimePickerModal
        visible={showEventEndModal}
        onClose={() => setShowEventEndModal(false)}
        value={contractDraft.eventEnd}
        onSelect={(v) => setContractDraft((p) => ({ ...p, eventEnd: v }))}
        language={language}
        styles={styles}
        options={contractEventEndOptions}
      />

      <ContractPdfPreviewModal
        visible={contractPdfPreview.visible}
        onClose={closeContractPdfPreview}
        onConfirm={confirmContractPdfPreview}
        previewOnly={contractPdfPreview.pendingAction === 'preview'}
        doneReadingLabel={
          language === 'fr' ? 'Fermer après lecture' : 'Close after reading'
        }
        title={language === 'fr' ? 'Aperçu du contrat (PDF)' : 'Contract preview (PDF)'}
        cancelLabel={language === 'fr' ? 'Annuler' : 'Cancel'}
        confirmLabel={
          contractPdfPreview.pendingAction === 'accept'
            ? language === 'fr'
              ? "J'ai lu et j'accepte"
              : 'I have read and accept'
            : contractPdfPreview.pendingAction === 'counter'
              ? language === 'fr'
                ? 'Confirmer la contre-proposition'
                : 'Confirm counter-proposal'
              : language === 'fr'
                ? "Confirmer l'envoi"
                : 'Confirm send'
        }
        pdfBase64={contractPdfPreview.pdfBase64}
        loading={contractPdfPreview.loading}
        errorText={contractPdfPreview.error}
        language={language}
      />

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
                    <ActivityIndicator size="small" color={Colors.background} />
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
    backgroundColor: Colors.background,
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
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 6,
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
    color: Colors.primary,
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
  contractPdfPreviewBtn: {
    alignSelf: 'stretch',
    marginTop: 8,
    marginBottom: 2,
  },
  contractHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
  },
  contractAckRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 4,
    paddingRight: 4,
  },
  contractAckCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,23,68,0.6)',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractAckCheckboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  contractAckCheckmark: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  contractAckText: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
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
    backgroundColor: Colors.primary,
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
    color: Colors.background,
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
    backgroundColor: Colors.background,
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
  contractModalDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contractModalInputText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  contractModalChevron: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginLeft: 8,
  },
  paymentTermsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  paymentTermsModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  paymentTermsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  paymentTermsOptionSelected: {
    borderColor: 'rgba(255,23,68,0.5)',
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  paymentTermsOptionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  paymentTermsOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '800',
  },
  paymentTermsCheck: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  paymentTermsClose: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
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
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: Colors.background,
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
    backgroundColor: Colors.primary,
    color: Colors.background,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: Colors.primary,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,23,68,0.2)',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
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
    borderColor: Colors.primary,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  selectedInfoText: {
    color: Colors.primary,
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
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonStepText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.background,
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
    borderTopColor: Colors.primary,
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
    color: Colors.primary,
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
    color: Colors.primary,
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
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderColor: Colors.primary,
  },
  modalOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalOptionCheck: {
    color: Colors.primary,
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
    borderTopColor: Colors.primary,
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
    color: Colors.background,
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  datePickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
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
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,23,68,0.2)',
  },
  bookerTypeButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  bookerTypeButtonTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  legalBanner: {
    backgroundColor: 'rgba(255,23,68,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  legalBannerText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  legalSectionTitle: {
    marginTop: 20,
  },
  legalHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 12,
  },
  readOnlyLegalWrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  readOnlyLegalText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  readOnlyLegalHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
  profilActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  viewPublicProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    minWidth: 140,
  },
  viewPublicProfileButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  eventDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
    flex: 1,
    minWidth: 140,
  },
  eventDashboardButtonText: {
    color: Colors.background,
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
  eventCardHighlighted: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: 'rgba(255,23,68,0.12)',
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
  ticketHoldersBlock: {
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ticketHolderLine: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
    paddingLeft: 2,
  },
  ticketHolderEntered: {
    color: '#7bed9f',
  },
  djsList: {
    marginBottom: 8,
  },
  djItem: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  djItemTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  djName: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
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
    color: Colors.primary,
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
    color: Colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  costTotalValue: {
    color: Colors.primary,
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
  publishFeedButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishFeedButtonDisabled: {
    opacity: 0.6,
  },
  publishFeedButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  publishedBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    alignItems: 'center',
  },
  publishedBadgeText: {
    color: '#4CAF50',
    fontSize: 13,
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
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  replaceVenueButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,165,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,165,0,0.6)',
  },
  replaceVenueButtonText: {
    color: '#FFA500',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
  },
  editEventSaveDisabled: {
    opacity: 0.7,
  },
  editEventSaveText: {
    color: Colors.background,
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
    color: Colors.primary,
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
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlotButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
