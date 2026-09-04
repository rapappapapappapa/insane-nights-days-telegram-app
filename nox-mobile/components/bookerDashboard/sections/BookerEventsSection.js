import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../../constants/colors';
import BookerTicketHoldersSection from '../../BookerTicketHoldersSection';

const PAY_COLORS = {
  UPCOMING: 'rgba(255,255,255,0.55)',
  PENDING: '#FFA500',
  PAID: '#4CAF50',
};

const payLabel = (status, language) => {
  const labels = {
    UPCOMING: language === 'fr' ? 'Paiement à venir' : 'Payment upcoming',
    PENDING: language === 'fr' ? 'Paiement en attente' : 'Payment pending',
    PAID: language === 'fr' ? 'Payé' : 'Paid',
  };
  return labels[status] || status;
};

/** Badge de statut + bouton « marquer payé » d'un booking lieu / prestataire. */
function BookingPaymentControls({
  language,
  styles,
  status,
  invitationStatus,
  bookingId,
  onMarkPaid,
  pendingId,
}) {
  const payStatus = status || 'UPCOMING';
  const busy = pendingId === bookingId;
  const canMarkPaid =
    invitationStatus === 'ACCEPTED' && !!bookingId && payStatus !== 'PAID' && !!onMarkPaid;

  return (
    <>
      <View style={[styles.djStatusBadge, { backgroundColor: PAY_COLORS[payStatus] + '20' }]}>
        <Text style={[styles.djStatusText, { color: PAY_COLORS[payStatus] }]}>
          {payLabel(payStatus, language)}
        </Text>
      </View>
      {canMarkPaid ? (
        <TouchableOpacity
          style={styles.chatButtonSmall}
          onPress={() => onMarkPaid(bookingId)}
          disabled={busy}
          accessibilityLabel={language === 'fr' ? 'Marquer comme payé' : 'Mark as paid'}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.chatButtonSmallText}>✅</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </>
  );
}

/** Liste des événements — dashboard organisateur. */
export default function BookerEventsSection(props) {
  const {
    language,
    styles,
    navigate,
    myEvents,
    loadingEvents,
    pulseEventId,
    openVenueChat,
    openPrestataireChat,
    openGroupChat,
    openChat,
    markBookingAsPaid,
    markingPaymentEventDjId,
    markVenueBookingAsPaid,
    markingPaymentEventVenueId,
    markPrestataireBookingAsPaid,
    markingPaymentEventPrestataireId,
    openEditEvent,
    handlePublishToFeed,
    publishingEventId,
    handleDeleteEvent,
    deletingEventId,
  } = props;

  return (
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
                                <>
                                  <TouchableOpacity
                                    style={styles.chatButtonSmall}
                                    onPress={() => openVenueChat(event.venue.eventVenueId)}
                                  >
                                    <Text style={styles.chatButtonSmallText}>💬</Text>
                                  </TouchableOpacity>
                                  <BookingPaymentControls
                                    language={language}
                                    styles={styles}
                                    status={event.venue.payment?.paymentStatus}
                                    invitationStatus={event.venue.venueInvitationStatus}
                                    bookingId={event.venue.eventVenueId}
                                    onMarkPaid={markVenueBookingAsPaid}
                                    pendingId={markingPaymentEventVenueId}
                                  />
                                </>
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
                      <View style={[styles.venueRow, { marginTop: 6 }]}>
                        <Text style={styles.eventInfo}>
                          🛠️ {language === 'fr' ? 'Prestataire' : 'Provider'}
                        </Text>
                        {event.prestataire?.eventPrestataireId ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <Text style={styles.eventInfo}>
                              {event.prestataire.businessName || '—'}
                            </Text>
                            <TouchableOpacity
                              style={styles.chatButtonSmall}
                              onPress={() => openPrestataireChat(event.prestataire.eventPrestataireId)}
                            >
                              <Text style={styles.chatButtonSmallText}>💬</Text>
                            </TouchableOpacity>
                            <BookingPaymentControls
                              language={language}
                              styles={styles}
                              status={event.prestataire.payment?.paymentStatus}
                              invitationStatus={event.prestataire.prestataireInvitationStatus}
                              bookingId={event.prestataire.eventPrestataireId}
                              onMarkPaid={markPrestataireBookingAsPaid}
                              pendingId={markingPaymentEventPrestataireId}
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addDjButton}
                            onPress={() =>
                              navigate('selectPrestataire', {
                                eventId: event.id,
                                eventDate: event.date,
                                returnTo: 'bookerDashboard',
                              })
                            }
                          >
                            <Text style={styles.addDjButtonText}>
                              {language === 'fr' ? '+ Prestataire (optionnel)' : '+ Provider (optional)'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
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
                                  {dj?.payment?.contractStatus === 'PENDING_PAYMENT' &&
                                  dj?.payment?.paymentStatus !== 'PAID' ? (
                                    <TouchableOpacity
                                      style={styles.contractPayChip}
                                      onPress={() => openChat(dj.eventDjId)}
                                    >
                                      <Text style={styles.contractPayChipText}>
                                        {language === 'fr' ? '💳 Payer (chat)' : '💳 Pay (chat)'}
                                      </Text>
                                    </TouchableOpacity>
                                  ) : null}
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
  );
}
