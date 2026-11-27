import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxText, NoxButton } from '../nox';
import Colors from '../../constants/colors';
import { isTicketTierSelectable } from '../../utils/eventDetailPageUtils';
import { tierSaleWindowHint } from '../../utils/ticketPricingUtils';

function formatEuros(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
}

/**
 * Section achat billet (tarifs, CGV, paiement Stripe, revente) — réutilisable en mode checkout.
 */
export default function EventCheckoutSection({
  fr = true,
  styles,
  navigate,
  user,
  hasActiveCommunityProfile,
  isEventUpcoming,
  isEventPast,
  event,
  buyingTicket,
  acceptedCgv,
  setAcceptedCgv,
  selectedTierId,
  setSelectedTierId,
  ticketTiersForPurchase,
  hasMultipleTicketTiers,
  canProceedPurchaseTier,
  unitPriceForPurchase,
  handleBuyTicket,
  resaleListings = [],
  buyingResaleId = null,
  handleBuyResale,
}) {
  if (isEventUpcoming()) {
    if (user?.isAuthenticated && !hasActiveCommunityProfile()) {
      return (
        <View style={styles.warningCard}>
          <NoxText variant="secondary" style={styles.warningText}>
            {fr
              ? 'Seuls les profils Communauté peuvent acheter des billets. Bascule sur ton profil Communauté depuis Compte.'
              : 'Only Community profiles can buy tickets. Switch to your Community profile from Account.'}
          </NoxText>
          <NoxButton label={fr ? 'Aller au compte' : 'Go to account'} onPress={() => navigate('profile')} />
        </View>
      );
    }

    const singleTier = ticketTiersForPurchase?.length === 1;
    const canBuy = canProceedPurchaseTier && !(user?.isAuthenticated && !hasActiveCommunityProfile());

    const renderTier = (t) => {
      const ok = isTicketTierSelectable(t);
      const sel = ok && (singleTier || t.id === selectedTierId);
      const soldOut = t.maxSold != null && t.maxSold !== '' && t.remaining != null && Number(t.remaining) <= 0;
      const hints = [
        soldOut
          ? fr
            ? 'Complet'
            : 'Sold out'
          : t.remaining != null && t.maxSold != null && t.maxSold !== ''
            ? fr
              ? `${t.remaining} restant${Number(t.remaining) > 1 ? 's' : ''}`
              : `${t.remaining} left`
            : null,
        tierSaleWindowHint(t, fr ? 'fr' : 'en') || null,
        event?.venues?.length > 1
          ? Array.isArray(t.venueIds) && t.venueIds.length > 0
            ? `${event.venues
                .filter((s) => t.venueIds.includes(s.venueId))
                .map((s) => s.name)
                .join(' + ')} ${fr ? 'uniquement' : 'only'}`
            : fr
              ? 'Tous les lieux'
              : 'All venues'
          : null,
      ].filter(Boolean);

      return (
        <TouchableOpacity
          key={t.id}
          style={[styles.tierRow, sel && styles.tierRowSelected, !ok && styles.tierChipDisabled]}
          onPress={() => ok && setSelectedTierId(t.id)}
          disabled={!ok || singleTier}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: sel, disabled: !ok }}
        >
          <View style={[styles.tierRadio, sel && styles.tierRadioSelected]}>
            {sel ? <View style={styles.tierRadioDot} /> : null}
          </View>
          <View style={styles.tierRowText}>
            <NoxText variant="form" style={[styles.tierChipLabel, !ok && styles.tierChipLabelDisabled]}>
              {t.label}
            </NoxText>
            {hints.length ? (
              <NoxText variant="secondary" style={styles.tierRowHint}>
                {hints.join(' · ')}
              </NoxText>
            ) : null}
          </View>
          <NoxText variant="form" style={[styles.tierPrice, !ok && styles.tierChipLabelDisabled]}>
            {formatEuros(t.price)}
          </NoxText>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.purchaseSection}>
        <NoxText variant="titleSecondary" style={styles.checkoutSectionTitle}>
          {fr ? 'Acheter des billets' : 'Buy tickets'}
        </NoxText>
        <NoxText variant="secondary" style={styles.checkoutIntro}>
          {hasMultipleTicketTiers
            ? fr
              ? 'Choisis ton tarif, accepte les CGV puis paie. Ton billet et son QR code arrivent aussitôt dans Billets.'
              : 'Pick a tier, accept the terms, then pay. Your ticket and QR code land in Tickets right away.'
            : fr
              ? 'Accepte les CGV puis paie. Ton billet et son QR code arrivent aussitôt dans Billets.'
              : 'Accept the terms, then pay. Your ticket and QR code land in Tickets right away.'}
        </NoxText>

        {ticketTiersForPurchase?.length ? (
          <View style={styles.tierSection} accessibilityRole="radiogroup">
            {ticketTiersForPurchase.map(renderTier)}
          </View>
        ) : null}

        {!canProceedPurchaseTier ? (
          <NoxText variant="secondary" style={styles.helperTextTier}>
            {fr
              ? 'Aucun tarif disponible pour le moment (complet ou vente pas encore ouverte).'
              : 'No tiers available right now (sold out or sale not open yet).'}
          </NoxText>
        ) : null}

        <View style={styles.totalRow}>
          <NoxText variant="secondary">{fr ? 'Total · 1 billet' : 'Total · 1 ticket'}</NoxText>
          <NoxText variant="form" style={styles.totalValue}>
            {formatEuros(unitPriceForPurchase)}
          </NoxText>
        </View>

        <View style={styles.cgvRow}>
          <TouchableOpacity
            style={[styles.cgvCheckbox, acceptedCgv && styles.cgvCheckboxChecked]}
            onPress={() => setAcceptedCgv(!acceptedCgv)}
            activeOpacity={0.7}
            hitSlop={10}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedCgv }}
          >
            {acceptedCgv ? <NoxText style={styles.cgvCheckmark}>✓</NoxText> : null}
          </TouchableOpacity>
          <View style={styles.cgvTextWrap}>
            <NoxText variant="secondary">{fr ? "J'accepte les " : 'I accept the '}</NoxText>
            <TouchableOpacity onPress={() => navigate('legal', { type: 'cgv' })}>
              <NoxText variant="secondary" style={styles.cgvLink}>
                {fr ? 'CGV' : 'Terms of Sale'}
              </NoxText>
            </TouchableOpacity>
            <NoxText variant="secondary">{fr ? ' pour cet achat.' : ' for this purchase.'}</NoxText>
          </View>
        </View>

        <NoxButton
          label={fr ? `Payer ${formatEuros(unitPriceForPurchase)}` : `Pay ${formatEuros(unitPriceForPurchase)}`}
          onPress={handleBuyTicket}
          loading={buyingTicket}
          disabled={buyingTicket || !acceptedCgv || !canBuy}
          style={styles.buyBtn}
        />
        <View style={styles.secureRow}>
          <Ionicons name="lock-closed-outline" size={13} color={Colors.textSecondary} />
          <NoxText variant="secondary" style={styles.checkoutSecureHint}>
            {canBuy && !acceptedCgv
              ? fr
                ? 'Coche les CGV pour activer le paiement.'
                : 'Tick the terms to enable payment.'
              : fr
                ? 'Paiement sécurisé via Stripe.'
                : 'Secure payment via Stripe.'}
          </NoxText>
        </View>

        {resaleListings.length > 0 && handleBuyResale ? (
          <View style={styles.resaleSection}>
            <NoxText variant="form" style={styles.tierSectionLabel}>
              {fr ? `Billets en revente (${resaleListings.length})` : `Resale tickets (${resaleListings.length})`}
            </NoxText>
            <NoxText variant="secondary" style={styles.tierRowHint}>
              {fr
                ? 'Revendus par des participants au prix d’achat, via NOX. Le billet t’est transféré avec un nouveau QR code.'
                : 'Resold by attendees at face value through NOX. You get the ticket with a new QR code.'}
            </NoxText>
            {resaleListings.slice(0, 5).map((l) => (
              <View key={l.id} style={styles.tierRow}>
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primaryLight} />
                <View style={styles.tierRowText}>
                  <NoxText variant="form" style={styles.tierChipLabel}>
                    {l.tierLabel || (fr ? 'Billet' : 'Ticket')}
                  </NoxText>
                  <NoxText variant="secondary" style={styles.tierRowHint}>
                    {formatEuros(l.priceCents / 100)}
                  </NoxText>
                </View>
                <NoxButton
                  variant="secondary"
                  label={fr ? 'Acheter' : 'Buy'}
                  onPress={() => handleBuyResale(l)}
                  loading={buyingResaleId === l.id}
                  disabled={!!buyingResaleId || buyingTicket || !acceptedCgv || (user?.isAuthenticated && !hasActiveCommunityProfile())}
                  fullWidth={false}
                  style={styles.resaleBuyBtn}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  if (isEventPast()) {
    return (
      <View style={styles.pastEventSection}>
        <NoxText variant="secondary" style={styles.pastEventText}>
          {fr ? 'Cet événement est terminé' : 'This event has ended'}
        </NoxText>
        <NoxButton
          label={fr ? 'Noter cet événement' : 'Rate this event'}
          variant="ghost"
          onPress={() =>
            navigate('rateEvent', {
              eventId: event.id,
              eventTitle: event.title,
              eventDate: event.date,
              eventStatus: event.status,
              venueId: event.venueId,
              venueName: event.venueName,
              venues: event.venues || [],
              djIds: event.djIds || [],
            })
          }
          style={styles.rateBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.pastEventSection}>
      <NoxText variant="secondary" style={styles.pastEventText}>
        {fr ? 'Cet événement est en cours' : 'This event is ongoing'}
      </NoxText>
    </View>
  );
}
