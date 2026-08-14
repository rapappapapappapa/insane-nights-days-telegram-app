import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';

export function useBookerEvents({
  user,
  language,
  showError,
  showSuccess,
  showConfirm,
  routeParams,
  setActiveSection,
}) {
    const [myEvents, setMyEvents] = useState([]);
    const [loadingEvents, setLoadingEvents] = useState(false);
    const [refreshingEvents, setRefreshingEvents] = useState(false);
    const [pulseEventId, setPulseEventId] = useState(null);
  
    const [deletingEventId, setDeletingEventId] = useState(null);
    const [publishingEventId, setPublishingEventId] = useState(null);
    const [markingPaymentEventDjId, setMarkingPaymentEventDjId] = useState(null);
    const [markingPaymentEventVenueId, setMarkingPaymentEventVenueId] = useState(null);
    const [markingPaymentEventPrestataireId, setMarkingPaymentEventPrestataireId] = useState(null);
  
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
  
    /** Marque un booking (DJ, lieu ou prestataire) comme payé et rafraîchit la liste. */
    const markAsPaid = async (bookingId, call, setPending) => {
      if (!user?.token || !bookingId) return;
      setPending(bookingId);
      try {
        const res = await call(user.token, bookingId, { status: 'PAID' });
        if (res?.success) {
          await fetchMyEvents();
          showSuccess(language === 'fr' ? 'Paiement marqué comme payé.' : 'Payment marked as paid.');
        } else {
          showError(res?.message || (language === 'fr' ? 'Impossible de mettre à jour le paiement.' : 'Unable to update payment.'));
        }
      } catch (e) {
        console.error('[BookerDashboard] markAsPaid error:', e);
        showError(language === 'fr' ? 'Erreur paiement.' : 'Payment error.');
      } finally {
        setPending(null);
      }
    };

    const markBookingAsPaid = (eventDjId) =>
      markAsPaid(eventDjId, api.updateBookingPayment, setMarkingPaymentEventDjId);

    const markVenueBookingAsPaid = (eventVenueId) =>
      markAsPaid(eventVenueId, api.updateVenueBookingPayment, setMarkingPaymentEventVenueId);

    const markPrestataireBookingAsPaid = (eventPrestataireId) =>
      markAsPaid(
        eventPrestataireId,
        api.updatePrestataireBookingPayment,
        setMarkingPaymentEventPrestataireId
      );
  
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

  return {
    myEvents,
    loadingEvents,
    refreshingEvents,
    pulseEventId,
    deletingEventId,
    publishingEventId,
    markingPaymentEventDjId,
    markingPaymentEventVenueId,
    markingPaymentEventPrestataireId,
    editEventVisible,
    setEditEventVisible,
    editEventDraft,
    setEditEventDraft,
    editEventSaving,
    editEventUploading,
    fetchMyEvents,
    onRefreshEventsList,
    markBookingAsPaid,
    markVenueBookingAsPaid,
    markPrestataireBookingAsPaid,
    handlePublishToFeed,
    handleDeleteEvent,
    openEditEvent,
    pickEditEventImage,
    saveEditEvent,
  };
}
