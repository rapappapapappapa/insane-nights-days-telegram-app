import React from 'react';
import { Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import StarRating from '../../StarRating';
import { normalizeMediaUrl } from '../../../api/config';
import { SCREEN_WIDTH } from '../../../utils/venueDashboardUtils';

export default function VenueBookingsTab(props) {
  const {
    language, styles, venue, ratings, photos, videos, navigate, user,
    savingMedia, pickMedia, handleDeleteMedia, deletingMediaId,
    setSelectedVideo, setVideoModalVisible, bookings, loadingBookings,
    processingInvitation, openVenueChat, handleAcceptVenueInvitation,
    handleRejectVenueInvitation, handleCancelVenueBooking, showConfirm,
    setRejectModalVisible, setRejectModalEventVenueId, setRejectModalAction,
  } = props;
  return (
    <View style={styles.card}>
                <Text style={styles.sectionTitle}>{language === 'fr' ? 'Réservations' : 'Bookings'}</Text>
                {loadingBookings ? (
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <ActivityIndicator color={Colors.primary} />
                    <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
                  </View>
                ) : bookings.length === 0 ? (
                  <Text style={styles.comingSoon}>
                    {language === 'fr' ? 'Aucune réservation pour le moment.' : 'No bookings yet.'}
                  </Text>
                ) : (
                  <>
                    {(() => {
                      const pendingInvitations = bookings.filter((b) => b.invitationStatus === 'PENDING');
                      const acceptedBookings = bookings.filter((b) => b.invitationStatus === 'ACCEPTED');
                      const renderBookingCard = (booking, showAcceptReject = false) => {
                        const eventDate = new Date(booking.eventDate);
                        const formattedDate = eventDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        const statusColors = {
                          UPCOMING: Colors.primary,
                          ONGOING: '#4CAF50',
                          FINISHED: Colors.textSecondary,
                        };
                        const statusLabels = {
                          UPCOMING: language === 'fr' ? 'À venir' : 'Upcoming',
                          ONGOING: language === 'fr' ? 'En cours' : 'Ongoing',
                          FINISHED: language === 'fr' ? 'Terminé' : 'Finished',
                        };
                        return (
                          <View key={booking.id} style={[styles.bookingCard, showAcceptReject && { borderColor: 'rgba(255,165,0,0.4)' }]}>
                            <View style={styles.bookingHeader}>
                              <Text style={styles.bookingTitle} numberOfLines={2}>
                                {booking.eventTitle}
                              </Text>
                              <View style={[styles.bookingStatus, { backgroundColor: (statusColors[booking.eventStatus] || Colors.primary) + '20' }]}>
                                <Text style={[styles.bookingStatusText, { color: statusColors[booking.eventStatus] || Colors.primary }]}>
                                  {showAcceptReject ? (language === 'fr' ? 'En attente' : 'Pending') : (statusLabels[booking.eventStatus] || booking.eventStatus)}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.bookingInfo}>
                              <Text style={styles.bookingInfoLabel}>📅 {language === 'fr' ? 'Date' : 'Date'}</Text>
                              <Text style={styles.bookingInfoValue}>
                                {formattedDate} {booking.eventTime && `à ${booking.eventTime}`}
                              </Text>
                            </View>
                            {booking.booker && (
                              <View style={styles.bookingInfo}>
                                <Text style={styles.bookingInfoLabel}>👤 {language === 'fr' ? 'Organisateur' : 'Organizer'}</Text>
                                <Text style={styles.bookingInfoValue}>
                                  {booking.booker.name} ({booking.booker.type})
                                </Text>
                              </View>
                            )}
                            <View style={styles.bookingInfo}>
                              <Text style={styles.bookingInfoLabel}>📍 {language === 'fr' ? 'Adresse' : 'Address'}</Text>
                              <Text style={styles.bookingInfoValue}>{booking.eventLocation || '-'}</Text>
                            </View>
                            {showAcceptReject ? (
                              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                                <TouchableOpacity
                                  style={[styles.chatButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                  onPress={() => openVenueChat(booking.eventVenueId)}
                                >
                                  <Text style={styles.chatButtonText}>💬 {language === 'fr' ? 'Chat' : 'Chat'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.chatButton, { flex: 1, backgroundColor: '#EF4444' }]}
                                  onPress={() => handleRejectVenueInvitation(booking.eventVenueId)}
                                  disabled={processingInvitation === booking.eventVenueId}
                                >
                                  {processingInvitation === booking.eventVenueId ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.chatButtonText}>✕ {language === 'fr' ? 'Refuser' : 'Reject'}</Text>
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.chatButton, { flex: 1, backgroundColor: '#4CAF50' }]}
                                  onPress={() => handleAcceptVenueInvitation(booking.eventVenueId)}
                                  disabled={processingInvitation === booking.eventVenueId}
                                >
                                  {processingInvitation === booking.eventVenueId ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.chatButtonText}>✓ {language === 'fr' ? 'Accepter' : 'Accept'}</Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View style={styles.bookingActionsRow}>
                                <TouchableOpacity
                                  style={[styles.chatButton, styles.bookingActionPrimary, { flex: 1 }]}
                                  onPress={() => openVenueChat(booking.eventVenueId)}
                                >
                                  <Text style={styles.chatButtonText}>
                                    💬 {language === 'fr' ? 'Chat' : 'Chat'}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.bookingActionDestructive, { flex: 1 }]}
                                  onPress={() => handleCancelVenueBooking(booking.eventVenueId)}
                                  disabled={processingInvitation === booking.eventVenueId}
                                >
                                  {processingInvitation === booking.eventVenueId ? (
                                    <ActivityIndicator size="small" color="#FF5252" />
                                  ) : (
                                    <Text style={styles.bookingActionDestructiveText}>
                                      ✕ {language === 'fr' ? 'Annuler' : 'Cancel'}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      };
                      return (
                        <View style={styles.bookingsList}>
                          {pendingInvitations.length > 0 && (
                            <View style={{ marginBottom: 16 }}>
                              <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 10 }]}>
                                📩 {language === 'fr' ? 'Invitations en attente' : 'Pending invitations'}
                              </Text>
                              {pendingInvitations.map((b) => renderBookingCard(b, true))}
                            </View>
                          )}
                          {acceptedBookings.length > 0 && (
                            <View>
                              <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 10 }]}>
                                ✅ {language === 'fr' ? 'Réservations confirmées' : 'Confirmed bookings'}
                              </Text>
                              {acceptedBookings.map((b) => renderBookingCard(b, false))}
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </>
                )}
              </View>
  );
}
