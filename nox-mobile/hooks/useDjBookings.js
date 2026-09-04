import { useState, useEffect } from 'react';
import { api } from '../api/config';

/**
 * Invitations / bookings DJ (dashboard DJ).
 */
export function useDjBookings({ user, language, showError, showSuccess, activeSection }) {
    // Bookings
    const [bookings, setBookings] = useState([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [processingInvitation, setProcessingInvitation] = useState(null);
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectModalInvitationId, setRejectModalInvitationId] = useState(null);
    const [rejectModalAction, setRejectModalAction] = useState('reject'); // 'reject' | 'cancel'
  
  
    const fetchBookings = async () => {
      if (!user?.token || loadingBookings) return;
      
      setLoadingBookings(true);
      try {
        const response = await api.getDjBookings(user.token);
        if (response && response.success) {
          setBookings(response.bookings || []);
        }
      } catch (error) {
        console.error('Erreur récupération bookings:', error);
      } finally {
        setLoadingBookings(false);
      }
    };
  
    const handleAcceptInvitation = async (invitationId) => {
      if (!user?.token || processingInvitation) return;
      
      setProcessingInvitation(invitationId);
      try {
        const response = await api.acceptInvitation(user.token, invitationId);
        if (response && response.success) {
          // Recharger les bookings pour mettre à jour l'affichage
          await fetchBookings();
          showSuccess(language === 'fr' 
            ? 'Vous avez accepté l\'invitation à cet événement.'
            : 'You have accepted the invitation to this event.');
        } else {
          showError(response?.message || (language === 'fr' ? 'Impossible d\'accepter l\'invitation.' : 'Unable to accept invitation.'));
        }
      } catch (error) {
        console.error('Erreur acceptation invitation:', error);
        showError(language === 'fr' ? 'Impossible d\'accepter l\'invitation.' : 'Unable to accept invitation.');
      } finally {
        setProcessingInvitation(null);
      }
    };
  
    const handleRejectInvitation = (invitationId) => {
      if (!user?.token || processingInvitation) return;
      setRejectModalAction('reject');
      setRejectModalInvitationId(invitationId);
      setRejectModalVisible(true);
    };
  
    const handleCancelBooking = (invitationId) => {
      if (!user?.token || processingInvitation) return;
      setRejectModalAction('cancel');
      setRejectModalInvitationId(invitationId);
      setRejectModalVisible(true);
    };
  
    const handleRejectConfirm = async (reason) => {
      if (!user?.token || !rejectModalInvitationId) return;
      setProcessingInvitation(rejectModalInvitationId);
      const isCancel = rejectModalAction === 'cancel';
      try {
        const response = isCancel
          ? await api.cancelDjBooking(user.token, rejectModalInvitationId, reason)
          : await api.rejectInvitation(user.token, rejectModalInvitationId, reason);
        setRejectModalVisible(false);
        setRejectModalInvitationId(null);
        if (response && response.success) {
          await fetchBookings();
          showSuccess(
            isCancel
              ? (language === 'fr' ? 'Booking annulé.' : 'Booking cancelled.')
              : (language === 'fr' ? 'Vous avez refusé l\'invitation à cet événement.' : 'You have rejected the invitation to this event.')
          );
        } else {
          showError(response?.message || (language === 'fr' ? (isCancel ? 'Impossible d\'annuler.' : 'Impossible de refuser l\'invitation.') : (isCancel ? 'Unable to cancel.' : 'Unable to reject invitation.')));
        }
      } catch (error) {
        setRejectModalVisible(false);
        setRejectModalInvitationId(null);
        console.error(isCancel ? 'Erreur annulation:' : 'Erreur refus invitation:', error);
        showError(language === 'fr' ? (isCancel ? 'Impossible d\'annuler.' : 'Impossible de refuser l\'invitation.') : (isCancel ? 'Unable to cancel.' : 'Unable to reject invitation.'));
      } finally {
        setProcessingInvitation(null);
      }
    };
  

  useEffect(() => {
    if (activeSection === 'bookings' && user?.token && !loadingBookings) {
      fetchBookings();
    }
  }, [activeSection, user?.token]);

  return {
    bookings,
    loadingBookings,
    processingInvitation,
    rejectModalVisible,
    setRejectModalVisible,
    rejectModalInvitationId,
    setRejectModalInvitationId,
    rejectModalAction,
    fetchBookings,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    handleRejectConfirm,
  };
}
