import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/colors';
import StarRating from '../../StarRating';

/** Onglet dashboard DJ. */
export default function DjBookingsSection(props) {
  const {
    language,
    styles,
    navigate,
    showConfirm,
    Colors,
    djProfile,
    bannerImage,
    profileImage,
    uploadingBannerImage,
    uploadingProfileImage,
    pickDjProfileImage,
    artistName,
    pseudo,
    setPseudo,
    realName,
    legalName,
    setLegalName,
    address,
    setAddress,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    siret,
    setSiret,
    vatNumber,
    setVatNumber,
    bio,
    setBio,
    birthDate,
    genre,
    setGenre,
    city,
    mainCity,
    setMainCity,
    languages,
    setLanguages,
    soundcloudUrl,
    setSoundcloudUrl,
    spotifyUrl,
    setSpotifyUrl,
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    tiktokUrl,
    setTiktokUrl,
    handleSave,
    saving,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    equipment,
    setEquipment,
    bookings,
    loadingBookings,
    processingInvitation,
    openChat,
    openGroupChat,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    ratingsData,
    loadingRatings,
    fetchRatings,
    photos,
    setPhotos,
    videos,
    setVideos,
    pickImage,
    pickVideo,
    deleteMedia,
    setSelectedVideo,
    setVideoPlayerVisible,
    setEditingTitle,
    setEditTitleValue,
    normalizeMediaUrl,
  } = props;

  const pendingInvitations = bookings.filter(b => b.invitationStatus === 'PENDING');
  const acceptedBookings = bookings.filter(b => b.invitationStatus === 'ACCEPTED');
  const rejectedInvitations = bookings.filter(b => b.invitationStatus === 'REJECTED');

  return (
    <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'BOOKINGS' : 'BOOKINGS'}
            </Text>
            
            {loadingBookings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>
                  {language === 'fr' ? 'Chargement...' : 'Loading...'}
                </Text>
              </View>
            ) : (
              <>
                {/* Invitations en attente */}
                {pendingInvitations.length > 0 && (
                  <View style={styles.invitationsSection}>
                    <Text style={styles.invitationsSectionTitle}>
                      {language === 'fr' ? '📩 Invitations en attente' : '📩 Pending invitations'}
                    </Text>
              <View style={styles.bookingsList}>
                      {pendingInvitations.map((booking) => {
                        const eventDate = new Date(booking.eventDate);
                        const formattedDate = eventDate.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                        
                        return (
                          <View key={booking.id} style={[styles.bookingCard, styles.pendingInvitationCard]}>
                            <View style={styles.bookingHeader}>
                              <Text style={styles.bookingTitle}>{booking.eventTitle}</Text>
                              <View style={[styles.bookingStatus, { backgroundColor: '#FFA50020' }]}>
                                <Text style={[styles.bookingStatusText, { color: '#FFA500' }]}>
                                  {language === 'fr' ? 'En attente' : 'Pending'}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.bookingInfo}>
                              <Text style={styles.bookingInfoLabel}>
                                📅 {language === 'fr' ? 'Date' : 'Date'}
                              </Text>
                              <Text style={styles.bookingInfoValue}>
                                {formattedDate} {booking.eventTime && `à ${booking.eventTime}`}
                              </Text>
                            </View>
                            
                            {booking.venue && (
                              <View style={styles.bookingInfo}>
                                <Text style={styles.bookingInfoLabel}>
                                  📍 {language === 'fr' ? 'Lieu' : 'Venue'}
                                </Text>
                                <Text style={styles.bookingInfoValue}>
                                  {booking.venue.name}
                                  {booking.venue.address && ` - ${booking.venue.address}`}
                                </Text>
                              </View>
                            )}
                            
                            {booking.booker && (
                              <View style={styles.bookingInfo}>
                                <Text style={styles.bookingInfoLabel}>
                                  👤 {language === 'fr' ? 'Organisateur' : 'Organizer'}
                                </Text>
                                <Text style={styles.bookingInfoValue}>
                                  {booking.booker.name} ({booking.booker.type})
                                </Text>
                              </View>
                            )}
                            
                            <View style={styles.bookingInfo}>
                              <Text style={styles.bookingInfoLabel}>
                                📍 {language === 'fr' ? 'Adresse' : 'Address'}
                              </Text>
                              <Text style={styles.bookingInfoValue}>{booking.eventLocation}</Text>
                            </View>
                            
                            <View style={styles.invitationActions}>
                              {/* Première ligne : Chat et Groupe */}
                              <View style={styles.invitationActionsRow}>
                                <TouchableOpacity
                                  style={[styles.invitationButton, styles.chatButton]}
                                  onPress={() => openChat(booking.id)}
                                >
                                  <Text style={styles.invitationButtonText}>
                                    💬 {language === 'fr' ? 'Chat' : 'Chat'}
                                  </Text>
                                </TouchableOpacity>
                                {/* Bouton chat de groupe pour les invitations acceptées ou si l'invitation est acceptée */}
                                {booking.eventId ? (
                                  <TouchableOpacity
                                    style={[styles.invitationButton, { backgroundColor: '#2196F3' }]}
                                    onPress={() => openGroupChat(booking.eventId)}
                                  >
                                    <Text style={styles.invitationButtonText}>
                                      👥 {language === 'fr' ? 'Groupe' : 'Group'}
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View style={styles.invitationButtonPlaceholder} />
                                )}
                              </View>
                              {/* Deuxième ligne : Refuser et Accepter - bien séparés */}
                              <View style={styles.invitationActionsRowCritical}>
                                <TouchableOpacity
                                  style={[styles.invitationButtonCritical, styles.rejectButton]}
                                  onPress={() => handleRejectInvitation(booking.id)}
                                  disabled={processingInvitation === booking.id}
                                >
                                  {processingInvitation === booking.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.invitationButtonCriticalText}>
                                      ✕ {language === 'fr' ? 'Refuser' : 'Reject'}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.invitationButtonCritical, styles.acceptButton]}
                                  onPress={() => handleAcceptInvitation(booking.id)}
                                  disabled={processingInvitation === booking.id}
                                >
                                  {processingInvitation === booking.id ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                  ) : (
                                    <Text style={styles.invitationButtonCriticalText}>
                                      ✓ {language === 'fr' ? 'Accepter' : 'Accept'}
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
                
                {/* Bookings acceptés */}
                {acceptedBookings.length > 0 && (
                  <View style={styles.invitationsSection}>
                    <Text style={styles.invitationsSectionTitle}>
                      {language === 'fr' ? '✅ Bookings confirmés' : '✅ Confirmed bookings'}
                    </Text>
                    <View style={styles.bookingsList}>
                      {acceptedBookings.map((booking) => {
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
                    <View key={booking.id} style={styles.bookingCard}>
                      <View style={styles.bookingHeader}>
                        <Text style={styles.bookingTitle}>{booking.eventTitle}</Text>
                        <View style={[styles.bookingStatus, { backgroundColor: statusColors[booking.eventStatus] + '20' }]}>
                          <Text style={[styles.bookingStatusText, { color: statusColors[booking.eventStatus] }]}>
                            {statusLabels[booking.eventStatus]}
                          </Text>
                        </View>
                      </View>

                      {/* ✅ Paiement (Booker -> DJ) */}
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingInfoLabel}>💳 {language === 'fr' ? 'Paiement' : 'Payment'}</Text>
                        {(() => {
                          const ps = booking.paymentStatus || 'UPCOMING';
                          const labels = {
                            UPCOMING: language === 'fr' ? 'À venir' : 'Upcoming',
                            PENDING: language === 'fr' ? 'En attente' : 'Pending',
                            PAID: language === 'fr' ? 'Payé' : 'Paid',
                          };
                          return (
                            <Text style={styles.bookingInfoValue}>
                              {labels[ps] || ps}
                              {booking.invoiceNumber ? ` • ${booking.invoiceNumber}` : ''}
                            </Text>
                          );
                        })()}
                      </View>
                      
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingInfoLabel}>
                          📅 {language === 'fr' ? 'Date' : 'Date'}
                        </Text>
                        <Text style={styles.bookingInfoValue}>
                          {formattedDate} {booking.eventTime && `à ${booking.eventTime}`}
                        </Text>
                      </View>
                      
                      {booking.venue && (
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingInfoLabel}>
                            📍 {language === 'fr' ? 'Lieu' : 'Venue'}
                          </Text>
                          <Text style={styles.bookingInfoValue}>
                            {booking.venue.name}
                            {booking.venue.address && ` - ${booking.venue.address}`}
                          </Text>
                        </View>
                      )}
                      
                      {booking.booker && (
                        <View style={styles.bookingInfo}>
                          <Text style={styles.bookingInfoLabel}>
                            👤 {language === 'fr' ? 'Organisateur' : 'Organizer'}
                          </Text>
                          <Text style={styles.bookingInfoValue}>
                            {booking.booker.name} ({booking.booker.type})
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.bookingInfo}>
                        <Text style={styles.bookingInfoLabel}>
                          📍 {language === 'fr' ? 'Adresse' : 'Address'}
                        </Text>
                        <Text style={styles.bookingInfoValue}>{booking.eventLocation}</Text>
                      </View>
                            
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                              <TouchableOpacity
                                style={[styles.invitationButton, styles.chatButton, { flex: 1, minWidth: 100 }]}
                                onPress={() => openChat(booking.id)}
                              >
                                <Text style={styles.invitationButtonText}>
                                  💬 {language === 'fr' ? 'Chat' : 'Chat'}
                                </Text>
                              </TouchableOpacity>
                              {booking.eventId && (
                                <TouchableOpacity
                                  style={[styles.invitationButton, styles.chatButton, { flex: 1, minWidth: 100, backgroundColor: '#2196F3' }]}
                                  onPress={() => openGroupChat(booking.eventId)}
                                >
                                  <Text style={styles.invitationButtonText}>
                                    👥 {language === 'fr' ? 'Groupe' : 'Group'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                style={[styles.invitationButton, { flex: 1, minWidth: 100, backgroundColor: '#EF4444' }]}
                                onPress={() => handleCancelBooking(booking.id)}
                                disabled={processingInvitation === booking.id}
                              >
                                {processingInvitation === booking.id ? (
                                  <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                  <Text style={styles.invitationButtonText}>
                                    ✕ {language === 'fr' ? 'Annuler' : 'Cancel'}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
    </View>
  );
                })}
              </View>
                  </View>
                )}
                
                {/* État vide */}
                {pendingInvitations.length === 0 && acceptedBookings.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>📅</Text>
                <Text style={styles.emptyStateText}>
                  {language === 'fr' 
                    ? 'Aucun booking pour le moment' 
                    : 'No bookings yet'}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {language === 'fr' 
                    ? 'Vos réservations et demandes de booking apparaîtront ici.' 
                    : 'Your bookings and booking requests will appear here.'}
                </Text>
              </View>
                )}
              </>
            )}
          </ScrollView>

  );
}
