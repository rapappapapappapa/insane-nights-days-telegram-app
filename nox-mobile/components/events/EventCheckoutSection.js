import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { NoxText, NoxButton } from '../nox';
import { isTicketTierSelectable } from '../../utils/eventDetailPageUtils';
import { tierSaleWindowHint } from '../../utils/ticketPricingUtils';

/**
 * Section achat billet (tiers, CGV, CTA Stripe) — réutilisable en mode checkout.
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

    return (
      <View style={styles.purchaseSection}>
        <NoxText variant="titleSecondary" style={styles.checkoutSectionTitle}>
          {fr ? 'Paiement' : 'Payment'}
        </NoxText>

        {!canProceedPurchaseTier && hasMultipleTicketTiers ? (
          <NoxText variant="secondary" style={styles.helperTextTier}>
            {fr
              ? 'Aucun tarif disponible pour le moment (quotas épuisés ou vente non ouverte).'
              : 'No tiers available right now (sold out or sale not open).'}
          </NoxText>
        ) : null}

        {hasMultipleTicketTiers && ticketTiersForPurchase?.length ? (
          <View style={styles.tierSection}>
            <NoxText variant="form" style={styles.tierSectionLabel}>
              {fr ? 'Choix du tarif' : 'Ticket type'}
            </NoxText>
            {ticketTiersForPurchase.map((t) => {
              const sel = t.id === selectedTierId;
              const ok = isTicketTierSelectable(t);
              const soldHint =
                t.maxSold != null && t.maxSold !== '' && t.remaining != null
                  ? fr
                    ? ` (${t.remaining} restant(s))`
                    : ` (${t.remaining} left)`
                  : '';
              const windowHint = tierSaleWindowHint(t, fr ? 'fr' : 'en');
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tierChip, sel && styles.tierChipSelected, !ok && styles.tierChipDisabled]}
                  onPress={() => ok && setSelectedTierId(t.id)}
                  disabled={!ok}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel, disabled: !ok }}
                >
                  <NoxText
                    variant="form"
                    style={[
                      styles.tierChipLabel,
                      sel && styles.tierChipLabelSelected,
                      !ok && styles.tierChipLabelDisabled,
                    ]}
                  >
                    {t.label} · {t.price}€{soldHint}
                    {windowHint ? ` · ${windowHint}` : ''}
                  </NoxText>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <View style={styles.cgvRow}>
          <TouchableOpacity
            style={[styles.cgvCheckbox, acceptedCgv && styles.cgvCheckboxChecked]}
            onPress={() => setAcceptedCgv(!acceptedCgv)}
            activeOpacity={0.7}
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
          label={fr ? `Payer ${unitPriceForPurchase}€` : `Pay ${unitPriceForPurchase}€`}
          onPress={handleBuyTicket}
          loading={buyingTicket}
          disabled={
            buyingTicket ||
            !acceptedCgv ||
            !canProceedPurchaseTier ||
            (user?.isAuthenticated && !hasActiveCommunityProfile())
          }
          style={styles.buyBtn}
        />
        <NoxText variant="secondary" style={styles.checkoutSecureHint}>
          {fr ? 'Paiement sécurisé via Stripe.' : 'Secure payment via Stripe.'}
        </NoxText>
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
