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
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useEventForm } from '../contexts/EventFormContext';
import { api, normalizeMediaUrl } from '../api/config';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import NotificationBadge from '../components/NotificationBadge';
import { useNotifications } from '../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';

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
  const [showMyEvents, setShowMyEvents] = useState(shouldOpenBookings || false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  
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
  
  // Étape actuelle du formulaire (1: Date/Durée, 2: Lieu, 3: DJs, 4: Détails, 5: Récapitulatif/Paiement)
  const [currentStep, setCurrentStep] = useState(1);
  
  // Gérer les sélections depuis routeParams - avec comparaison pour éviter les doublons
  const lastProcessedParams = useRef({ selectedDjId: null, selectedVenueId: null, action: null, eventId: null, slotIndex: null });
  const hasInitializedSlots = useRef(false);
  
  // Extraire les valeurs primitives pour éviter les re-renders
  const currentDjId = routeParams?.selectedDjId;
  const currentVenueId = routeParams?.selectedVenueId;
  const currentAction = routeParams?.action;
  const currentEventId = routeParams?.eventId || null;
  const currentSlotIndex = routeParams?.slotIndex;
  
  React.useLayoutEffect(() => {
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

  useEffect(() => {
    if (user?.token) {
      fetchVenues();
      fetchMyEvents();
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
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr'
          ? 'Impossible de supprimer le message.'
          : 'Unable to delete message.'
      );
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
                Alert.alert(
                  language === 'fr' ? 'Événement supprimé' : 'Event deleted',
                  language === 'fr'
                    ? 'L\'événement a été supprimé avec succès.'
                    : 'The event has been deleted successfully.'
                );
                fetchMyEvents(); // Rafraîchir la liste
              } else {
                Alert.alert(
                  language === 'fr' ? 'Erreur' : 'Error',
                  response?.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting event.')
                );
              }
            } catch (error) {
              console.error('Erreur suppression événement:', error);
              Alert.alert(
                language === 'fr' ? 'Erreur' : 'Error',
                error.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting event.')
              );
            } finally {
              setDeletingEventId(null);
            }
          },
        },
      ]
    );
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  const handleCreateEvent = async () => {
    if (creating) return;

    // Validation
    if (!formData.title || !formData.date || !formData.time || !formData.venueId || formData.djIds.length === 0) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' 
          ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).'
          : 'Please fill in all required fields (title, date, time, venue, DJ).'
      );
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
        Alert.alert(
          language === 'fr' ? 'Erreur de connexion' : 'Connection error',
          language === 'fr'
            ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
            : 'Unable to reach server. Check your connection.'
        );
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

  // Calcul automatique du prix - seulement quand nécessaire, sans useEffect
  const calculatePrice = () => {
    const duration = formData.durationHours
      ? parseFloat(formData.durationHours.replace(',', '.'))
      : 0;

    if (!selectedVenue || selectedDjs.length === 0 || !duration || duration <= 0) {
      return '';
    }

    // Base simple pour le lieu
    const venueBase =
      typeof selectedVenue.averageRatingGlobal === 'number'
        ? 50 + selectedVenue.averageRatingGlobal * 10
        : 50;

    // Somme des tarifs horaires / prestation des DJs
    const djsTotal = selectedDjs.reduce((sum, dj) => {
      const rate = dj.hourlyRate ?? dj.performanceRate ?? 0;
      return sum + rate;
    }, 0);

    const total = venueBase + djsTotal * duration;
    return String(Math.max(0, Math.round(total)));
  };

  const autoPrice = calculatePrice();
  
  // Mettre à jour le prix seulement si calculé et différent
  const lastAutoPrice = useRef('');
  React.useLayoutEffect(() => {
    if (autoPrice && autoPrice !== lastAutoPrice.current) {
      lastAutoPrice.current = autoPrice;
      setFormData(prev => {
        // Ne mettre à jour que si différent pour éviter les re-renders
        if (prev.price !== autoPrice) {
          return { ...prev, price: autoPrice };
        }
        return prev;
      });
    }
  }, [autoPrice]); // Seulement autoPrice

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
          style={[styles.tabButton, !showMyEvents && styles.tabButtonActive]}
          onPress={() => setShowMyEvents(false)}
        >
          <Text style={[styles.tabButtonText, !showMyEvents && styles.tabButtonTextActive]}>
            {language === 'fr' ? 'Créer un événement' : 'Create Event'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, showMyEvents && styles.tabButtonActive]}
          onPress={() => {
            setShowMyEvents(true);
            fetchMyEvents();
            // Marquer les messages comme lus quand on ouvre la section événements
            markAllAsRead();
          }}
        >
          <View style={styles.tabButtonContent}>
            <Text style={[styles.tabButtonText, showMyEvents && styles.tabButtonTextActive]}>
              {language === 'fr' ? 'Mes événements' : 'My Events'}
            </Text>
            <NotificationBadge count={unreadCount} />
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
      >
        {showMyEvents ? (
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
        ) : (
          <>
            {/* Indicateur d'étapes */}
            <View style={styles.stepsIndicator}>
              <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
                <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Date' : 'Date'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
                <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Lieu' : 'Venue'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 3 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
                <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'DJs' : 'DJs'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 4 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 4 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 4 && styles.stepNumberActive]}>4</Text>
                <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Détails' : 'Details'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 5 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 5 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 5 && styles.stepNumberActive]}>5</Text>
                <Text style={[styles.stepLabel, currentStep >= 5 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Paiement' : 'Payment'}
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              {/* ÉTAPE 1: Date et Durée */}
              {currentStep === 1 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 1 : Date et durée' : 'Step 1: Date and duration'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Date' : 'Date'} *
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={openDatePicker}
                >
                  <Text style={[styles.selectButtonText, !formData.date && styles.placeholderText]}>
                    {formData.date
                      ? new Date(eventDateTime).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                          { day: '2-digit', month: '2-digit', year: 'numeric' }
                        )
                      : language === 'fr'
                      ? 'Choisir une date'
                      : 'Choose a date'}
                  </Text>
                  <Text style={styles.chevron}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Heure de début' : 'Start time'} *
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={openTimePicker}
                >
                  <Text style={[styles.selectButtonText, !formData.time && styles.placeholderText]}>
                    {formData.time
                      ? formData.time
                      : language === 'fr'
                      ? 'Choisir une heure'
                      : 'Choose a time'}
                  </Text>
                  <Text style={styles.chevron}>⏰</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Durée de la soirée (heures)' : 'Event duration (hours)'} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ex: 4' : 'Ex: 4'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.durationHours}
                  onChangeText={(value) => handleChange('durationHours', value)}
                />
              </View>

              <TouchableOpacity
                style={[styles.nextButton, (!formData.date || !formData.time || !formData.durationHours) && styles.nextButtonDisabled]}
                onPress={() => {
                  if (formData.date && formData.time && formData.durationHours) {
                    setCurrentStep(2);
                  }
                }}
                disabled={!formData.date || !formData.time || !formData.durationHours}
              >
                <Text style={styles.nextButtonText}>
                  {language === 'fr' ? 'Suivant →' : 'Next →'}
                </Text>
              </TouchableOpacity>
            </>
              )}

              {/* ÉTAPE 2: Sélection du lieu */}
              {currentStep === 2 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 2 : Choisir un lieu' : 'Step 2: Choose a venue'}
              </Text>

              <Text style={styles.stepDescription}>
                {language === 'fr' 
                  ? 'Sélectionne un lieu disponible pour cette date et cette durée.'
                  : 'Select a venue available for this date and duration.'}
              </Text>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  navigate('selectVenue', {
                    selectedVenueId: formData.venueId,
                  });
                }}
              >
                <Text style={[styles.selectButtonText, !selectedVenue && styles.placeholderText]}>
                  {selectedVenue
                    ? `${selectedVenue.venueName} - ${selectedVenue.address}`
                    : language === 'fr' ? 'Sélectionner un lieu' : 'Select a venue'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>

              {selectedVenue && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedInfoText}>
                    ✓ {language === 'fr' ? 'Lieu sélectionné' : 'Venue selected'}: {selectedVenue.venueName}
                  </Text>
                </View>
              )}

              <View style={styles.stepButtons}>
                <TouchableOpacity
                  style={styles.backButtonStep}
                  onPress={() => setCurrentStep(1)}
                >
                  <Text style={styles.backButtonStepText}>
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, !selectedVenue && styles.nextButtonDisabled]}
                  onPress={() => {
                    if (selectedVenue) {
                      setCurrentStep(3);
                    }
                  }}
                  disabled={!selectedVenue}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
              )}

              {/* ÉTAPE 3: Sélection des DJs */}
              {currentStep === 3 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 3 : Choisir des DJs' : 'Step 3: Choose DJs'}
              </Text>

              {!formData.date && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    {language === 'fr' 
                      ? '⚠️ Veuillez d\'abord sélectionner une date à l\'étape 1 pour voir les DJs disponibles.'
                      : '⚠️ Please select a date in step 1 first to see available DJs.'}
                  </Text>
                </View>
              )}

              {formData.date && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {language === 'fr' 
                      ? `📅 DJs disponibles le ${new Date(eventDateTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                      : `📅 DJs available on ${new Date(eventDateTime).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                  </Text>
                </View>
              )}

              <Text style={styles.stepDescription}>
                {language === 'fr' 
                  ? 'Ajoutez des slots et sélectionnez un DJ pour chaque slot.'
                  : 'Add slots and select a DJ for each slot.'}
              </Text>

              {/* Liste des slots DJ */}
              {djSlots.map((djId, index) => {
                const selectedDj = djId ? availableDjs.find(dj => dj.userId === djId) : null;
                return (
                  <View key={index} style={styles.djSlotContainer}>
                    <View style={styles.djSlotHeader}>
                      <Text style={styles.djSlotLabel}>
                        {language === 'fr' ? `Slot ${index + 1}` : `Slot ${index + 1}`}
                      </Text>
                      {djSlots.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeSlotButton}
                          onPress={() => {
                            const newSlots = djSlots.filter((_, i) => i !== index);
                            setDjSlots(newSlots);
                            // Mettre à jour formData.djIds
                            const newDjIds = newSlots.filter(id => id !== null);
                            setFormData(prev => ({ ...prev, djIds: newDjIds }));
                          }}
                        >
                          <Text style={styles.removeSlotButtonText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        // Passer tous les DJs déjà sélectionnés dans tous les slots (sauf celui du slot actuel)
                        // Utiliser formData.djIds comme source de vérité pour inclure tous les DJs sélectionnés
                        const currentSlotDjId = djSlots[index];
                        const otherSelectedDjIds = formData.djIds.filter(id => id !== currentSlotDjId);
                        console.log('[BookerDashboard] Navigation vers selectDj:', {
                          slotIndex: index,
                          currentSlotDjId,
                          otherSelectedDjIds,
                          allDjIds: formData.djIds,
                          djSlots
                        });
                        navigate('selectDj', {
                          selectedDjIds: otherSelectedDjIds,
                          slotIndex: index,
                          isSlotMode: true,
                        });
                      }}
                    >
                      <Text style={[styles.selectButtonText, !selectedDj && styles.placeholderText]}>
                        {selectedDj
                          ? `${selectedDj.artistName}${selectedDj.hourlyRate ? ` - ${selectedDj.hourlyRate}€/h` : ''}`
                          : language === 'fr' ? 'Sélectionner un DJ' : 'Select a DJ'}
                      </Text>
                      <Text style={styles.chevron}>▼</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Bouton pour ajouter un slot */}
              <TouchableOpacity
                style={styles.addSlotButton}
                onPress={() => {
                  setDjSlots([...djSlots, null]);
                }}
              >
                <Text style={styles.addSlotButtonText}>
                  + {language === 'fr' ? 'Ajouter un slot DJ' : 'Add DJ slot'}
                </Text>
              </TouchableOpacity>

              {djSlots.filter(id => id !== null).length > 0 && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedInfoText}>
                    ✓ {language === 'fr' ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}: {djSlots.filter(id => id !== null).length}
                  </Text>
                </View>
              )}

              <View style={styles.stepButtons}>
                <TouchableOpacity
                  style={styles.backButtonStep}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={styles.backButtonStepText}>
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, djSlots.filter(id => id !== null).length === 0 && styles.nextButtonDisabled]}
                  onPress={() => {
                    const selectedDjIds = djSlots.filter(id => id !== null);
                    if (selectedDjIds.length > 0) {
                      setFormData(prev => ({ ...prev, djIds: selectedDjIds }));
                      setCurrentStep(4);
                    }
                  }}
                  disabled={djSlots.filter(id => id !== null).length === 0}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
              )}

              {/* ÉTAPE 4: Détails et paiement */}
              {currentStep === 4 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 4 : Détails' : 'Step 4: Details'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Titre de l\'événement' : 'Event title'} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ex: Soirée Techno Underground' : 'Ex: Underground Techno Night'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.title}
                  onChangeText={(value) => handleChange('title', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Prix estimé' : 'Estimated price'} (€) *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.price}
                  onChangeText={(value) => handleChange('price', value)}
                />
                {autoPrice ? (
                  <Text style={styles.helperText}>
                    {language === 'fr'
                      ? `Calculé automatiquement : ~${autoPrice} € (modifiable)`
                      : `Automatically computed: ~${autoPrice} € (editable)`}
                  </Text>
                ) : (
                  <Text style={styles.helperText}>
                    {language === 'fr'
                      ? 'Le prix sera calculé automatiquement selon le lieu, les DJs et la durée.'
                      : 'Price will be automatically computed from venue, DJs and duration.'}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Capacité' : 'Capacity'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="200"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.capacity}
                  onChangeText={(value) => handleChange('capacity', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Genre musical' : 'Music genre'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ex: Techno, House, Electro' : 'Ex: Techno, House, Electro'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.genre}
                  onChangeText={(value) => handleChange('genre', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Description' : 'Description'}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={language === 'fr' ? 'Description de l\'événement...' : 'Event description...'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={4}
                  value={formData.description}
                  onChangeText={(value) => handleChange('description', value)}
                />
              </View>

              <View style={styles.stepButtons}>
                <TouchableOpacity
                  style={styles.backButtonStep}
                  onPress={() => setCurrentStep(3)}
                >
                  <Text style={styles.backButtonStepText}>
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, (!formData.title || !formData.price) && styles.nextButtonDisabled]}
                  onPress={() => {
                    if (formData.title && formData.price) {
                      setCurrentStep(5);
                    }
                  }}
                  disabled={!formData.title || !formData.price}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
              )}

              {/* ÉTAPE 5: Récapitulatif et Paiement */}
              {currentStep === 5 && (
                <>
                  <Text style={styles.sectionTitle}>
                    {language === 'fr' ? 'Étape 5 : Récapitulatif et Paiement' : 'Step 5: Summary and Payment'}
                  </Text>

                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>
                      {language === 'fr' ? 'Récapitulatif de l\'événement' : 'Event Summary'}
                    </Text>

                    {/* Informations de base */}
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Titre' : 'Title'}
                      </Text>
                      <Text style={styles.summaryValue}>{formData.title}</Text>
                    </View>

                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Date et heure' : 'Date and time'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formData.date && new Date(eventDateTime).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                          { day: '2-digit', month: '2-digit', year: 'numeric' }
                        )} {formData.time}
                      </Text>
                    </View>

                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Durée' : 'Duration'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formData.durationHours} {language === 'fr' ? 'heures' : 'hours'}
                      </Text>
                    </View>

                    {selectedVenue && (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'Lieu' : 'Venue'}
                        </Text>
                        <Text style={styles.summaryValue}>{selectedVenue.venueName}</Text>
                        <Text style={styles.summarySubValue}>{selectedVenue.address}</Text>
                      </View>
                    )}

                    {selectedDjs.length > 0 && (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'DJs sélectionnés' : 'Selected DJs'}
                        </Text>
                        {selectedDjs.map((dj) => (
                          <Text key={dj.userId} style={styles.summaryValue}>
                            • {dj.artistName}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Détail des coûts */}
                    <View style={styles.costBreakdown}>
                      <Text style={styles.costTitle}>
                        {language === 'fr' ? 'Détail des coûts' : 'Cost Breakdown'}
                      </Text>

                      {/* Coût du lieu */}
                      {selectedVenue && (
                        <View style={styles.costRow}>
                          <Text style={styles.costLabel}>
                            {language === 'fr' ? 'Lieu' : 'Venue'} ({selectedVenue.venueName})
                          </Text>
                          <Text style={styles.costValue}>
                            {(() => {
                              const venueBase = typeof selectedVenue.averageRatingGlobal === 'number'
                                ? 50 + selectedVenue.averageRatingGlobal * 10
                                : 50;
                              return `${Math.round(venueBase)} €`;
                            })()}
                          </Text>
                        </View>
                      )}

                      {/* Coût des DJs */}
                      {selectedDjs.map((dj) => {
                        const duration = formData.durationHours
                          ? parseFloat(formData.durationHours.replace(',', '.'))
                          : 0;
                        const rate = dj.hourlyRate ?? dj.performanceRate ?? 0;
                        const djCost = rate * duration;
                        return (
                          <View key={dj.userId} style={styles.costRow}>
                            <Text style={styles.costLabel}>
                              {dj.artistName} ({duration}h × {rate}€/h)
                            </Text>
                            <Text style={styles.costValue}>{Math.round(djCost)} €</Text>
                          </View>
                        );
                      })}

                      {/* Total */}
                      <View style={styles.costTotal}>
                        <Text style={styles.costTotalLabel}>
                          {language === 'fr' ? 'Total estimé' : 'Estimated Total'}
                        </Text>
                        <Text style={styles.costTotalValue}>
                          {autoPrice || formData.price} €
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={styles.backButtonStep}
                      onPress={() => setCurrentStep(4)}
                    >
                      <Text style={styles.backButtonStepText}>
                        ← {language === 'fr' ? 'Précédent' : 'Previous'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.createButton, creating && styles.createButtonDisabled]}
                      onPress={handleCreateEvent}
                      disabled={creating || !formData.title || !formData.price}
                    >
                      {creating ? (
                        <ActivityIndicator color="#0b0b0e" />
                      ) : (
                        <Text style={styles.createButtonText}>
                          {language === 'fr' ? 'Confirmer et créer l\'événement' : 'Confirm and create event'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </>
        )}
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
