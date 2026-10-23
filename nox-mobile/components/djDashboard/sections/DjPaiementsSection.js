import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

const PAYMENT_COLORS = {
  UPCOMING: 'rgba(255,255,255,0.55)',
  PENDING: '#FFA500',
  PAID: '#4CAF50',
};

const paymentLabel = (status, fr) => {
  const labels = {
    UPCOMING: fr ? 'À venir' : 'Upcoming',
    PENDING: fr ? 'En attente' : 'Pending',
    PAID: fr ? 'Payé' : 'Paid',
  };
  return labels[status] || status;
};

/** Cachets en centimes → « 1 250,00 € ». */
const formatAmount = (cents, currency, fr) => {
  if (cents == null) return fr ? 'Montant non renseigné' : 'Amount not set';
  return new Intl.NumberFormat(fr ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: (currency || 'eur').toUpperCase(),
  }).format(cents / 100);
};

/** Onglet Paiements du dashboard DJ : cachets par booking accepté. */
export default function DjPaiementsSection(props) {
  const { language, styles, navigate, Colors, bookings, loadingBookings } = props;
  const fr = language === 'fr';

  const accepted = (bookings || []).filter((b) => b.invitationStatus === 'ACCEPTED');

  const totals = accepted.reduce(
    (acc, b) => {
      const status = b.paymentStatus || 'UPCOMING';
      acc[status] = (acc[status] || 0) + (b.paymentAmount || 0);
      return acc;
    },
    { PAID: 0, PENDING: 0, UPCOMING: 0 }
  );

  const summary = [
    { key: 'PAID', label: fr ? 'Encaissé' : 'Received' },
    { key: 'PENDING', label: fr ? 'En attente' : 'Pending' },
    { key: 'UPCOMING', label: fr ? 'À venir' : 'Upcoming' },
  ];

  return (
    <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.sectionTitle}>{fr ? 'PAIEMENTS' : 'PAYMENTS'}</Text>

      {loadingBookings ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {summary.map((item) => (
              <View
                key={item.key}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: PAYMENT_COLORS[item.key] + '18',
                }}
              >
                <Text style={{ color: PAYMENT_COLORS[item.key], fontSize: 12, marginBottom: 4 }}>
                  {item.label}
                </Text>
                <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '700' }}>
                  {formatAmount(totals[item.key], 'eur', fr)}
                </Text>
              </View>
            ))}
          </View>

          {accepted.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>💶</Text>
              <Text style={styles.emptyStateText}>
                {fr ? 'Aucun cachet pour le moment' : 'No fees yet'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {fr
                  ? 'Tes cachets apparaîtront ici dès qu’un booking sera accepté.'
                  : 'Your fees will appear here once a booking is accepted.'}
              </Text>
            </View>
          ) : (
            accepted.map((booking) => {
              const status = booking.paymentStatus || 'UPCOMING';
              const eventDate = booking.eventDate ? new Date(booking.eventDate) : null;
              const formattedDate = eventDate
                ? eventDate.toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—';

              return (
                <View key={booking.id} style={styles.bookingCard}>
                  <View style={styles.bookingHeader}>
                    <Text style={styles.bookingTitle}>{booking.eventTitle}</Text>
                    <View
                      style={[styles.bookingStatus, { backgroundColor: PAYMENT_COLORS[status] + '20' }]}
                    >
                      <Text style={[styles.bookingStatusText, { color: PAYMENT_COLORS[status] }]}>
                        {paymentLabel(status, fr)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingInfoLabel}>💶 {fr ? 'Cachet' : 'Fee'}</Text>
                    <Text style={styles.bookingInfoValue}>
                      {formatAmount(booking.paymentAmount, booking.paymentCurrency, fr)}
                    </Text>
                  </View>

                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingInfoLabel}>📅 {fr ? 'Date' : 'Date'}</Text>
                    <Text style={styles.bookingInfoValue}>{formattedDate}</Text>
                  </View>

                  {booking.invoiceNumber ? (
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingInfoLabel}>🧾 {fr ? 'Facture' : 'Invoice'}</Text>
                      <Text style={styles.bookingInfoValue}>{booking.invoiceNumber}</Text>
                    </View>
                  ) : null}

                  {booking.paidAt ? (
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingInfoLabel}>✅ {fr ? 'Payé le' : 'Paid on'}</Text>
                      <Text style={styles.bookingInfoValue}>
                        {new Date(booking.paidAt).toLocaleDateString(fr ? 'fr-FR' : 'en-US')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}

          <TouchableOpacity style={styles.saveButton} onPress={() => navigate('purchases')}>
            <Text style={styles.saveButtonText}>
              {fr ? 'Voir mes achats de billets' : 'View my ticket purchases'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
