import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/config';
import * as Stripe from '../utils/stripe';
import { APP_URL_SCHEME, STRIPE_RETURN_URL } from '../constants/stripeRedirect';
import { isTicketTierSelectable } from '../utils/eventDetailPageUtils';

/**
 * Paliers billetterie + achat Stripe (page détail événement).
 * Payant → PaymentSheet natif (clés sk_test_ / pk_test_ OK).
 * Gratuit (0 €) → POST /api/tickets/buy.
 */
export function useEventDetailPurchase({
  event,
  eventId,
  language,
  user,
  navigate,
  showError,
  showSuccess,
  showConfirm: _showConfirm,
  fetchEvent,
}) {
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [acceptedCgv, setAcceptedCgv] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(null);

  const ticketTiersForPurchase = useMemo(() => {
    const t = event?.ticketTiers;
    return Array.isArray(t) && t.length > 0 ? t : null;
  }, [event?.ticketTiers]);

  const hasMultipleTicketTiers = !!(ticketTiersForPurchase && ticketTiersForPurchase.length > 1);

  useEffect(() => {
    if (!ticketTiersForPurchase?.length) {
      setSelectedTierId(null);
      return;
    }
    setSelectedTierId((prev) => {
      const prevStillOk = ticketTiersForPurchase.some((x) => x.id === prev && isTicketTierSelectable(x));
      if (prevStillOk) return prev;
      const firstOk = ticketTiersForPurchase.find((x) => isTicketTierSelectable(x));
      return (firstOk || ticketTiersForPurchase[0])?.id ?? null;
    });
  }, [event?.id, ticketTiersForPurchase]);

  const selectedTier =
    ticketTiersForPurchase && selectedTierId
      ? ticketTiersForPurchase.find((x) => x.id === selectedTierId)
      : null;

  const tierIdForApi = useMemo(() => {
    if (!ticketTiersForPurchase?.length) return null;
    if (ticketTiersForPurchase.length === 1) return ticketTiersForPurchase[0].id;
    return selectedTierId;
  }, [ticketTiersForPurchase, selectedTierId]);

  const unitPriceForPurchase = useMemo(() => {
    if (selectedTier != null && Number.isFinite(Number(selectedTier.price))) {
      return Number(selectedTier.price);
    }
    const p = Number(event?.price);
    return Number.isFinite(p) ? p : 0;
  }, [selectedTier, event?.price]);

  const canProceedPurchaseTier = useMemo(() => {
    if (!ticketTiersForPurchase?.length) return true;
    if (ticketTiersForPurchase.length === 1) {
      return isTicketTierSelectable(ticketTiersForPurchase[0]);
    }
    return selectedTier != null && isTicketTierSelectable(selectedTier);
  }, [ticketTiersForPurchase, selectedTier]);

  const priceBadgeLabel = useMemo(() => {
    const p = event?.price;
    if (p == null || p === '') return '—';
    if (event?.hasMultipleTicketPrices || hasMultipleTicketTiers) {
      return language === 'fr' ? `dès ${p} €` : `from ${p} €`;
    }
    return `${p}€`;
  }, [event?.price, event?.hasMultipleTicketPrices, hasMultipleTicketTiers, language]);

  const goPurchaseSuccess = (amount) => {
    setTimeout(() => {
      navigate('purchaseSuccess', {
        eventId,
        eventTitle: event?.title,
        quantity: 1,
        amount,
      });
    }, 600);
  };

  const handleBuyTicket = async () => {
    if (!user?.isAuthenticated) {
      showError(language === 'fr' ? 'Vous devez être connecté pour acheter un ticket.' : 'You must be logged in to buy a ticket.');
      return;
    }
    if (!acceptedCgv) {
      showError(language === 'fr' ? "Vous devez accepter les CGV avant d'acheter." : 'You must accept the Terms of Sale before purchasing.');
      return;
    }

    if (!user?.token) {
      showError(language === 'fr' ? "Token d'authentification manquant." : 'Authentication token missing.');
      return;
    }

    setBuyingTicket(true);
    try {
      const isFree = Number(unitPriceForPurchase) === 0;

      // Billet gratuit : pas de Stripe
      if (isFree) {
        const response = await api.buyTicket(user.token, eventId, 1, tierIdForApi);
        if (response && response.success) {
          showSuccess(
            response.message || (language === 'fr' ? 'Ticket gratuit délivré.' : 'Free ticket issued.')
          );
          fetchEvent();
          goPurchaseSuccess(0);
        } else {
          showError(response?.message || (language === 'fr' ? "Erreur lors de l'achat." : 'Error purchasing ticket.'));
        }
        return;
      }

      // Payant : Stripe natif uniquement (clés test OK en démo)
      if (!Stripe?.isStripeSupported || Platform.OS === 'web') {
        showError(
          language === 'fr'
            ? 'Le paiement Stripe est disponible sur l’app iOS / Android (carte de test en mode démo). Ouvre Nox sur ton téléphone.'
            : 'Stripe payments work on the iOS / Android app (test cards in demo mode). Open Nox on your phone.'
        );
        return;
      }

      const intentRes = await api.createTicketPaymentIntent(user.token, eventId, 1, tierIdForApi);
      if (!intentRes?.success || !intentRes?.paymentIntentClientSecret || !intentRes?.paymentIntentId) {
        showError(intentRes?.message || (language === 'fr' ? 'Impossible de démarrer le paiement.' : 'Unable to start payment.'));
        return;
      }

      try {
        await Stripe.initStripe({
          publishableKey: intentRes.publishableKey,
          urlScheme: APP_URL_SCHEME,
        });
      } catch (e) {
        showError(
          e?.message ||
            (language === 'fr' ? 'Erreur initialisation Stripe.' : 'Stripe initialization error.')
        );
        return;
      }

      const init = await Stripe.initPaymentSheet({
        merchantDisplayName: 'Nox',
        paymentIntentClientSecret: intentRes.paymentIntentClientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: STRIPE_RETURN_URL,
      });
      if (init?.error) {
        showError(init.error.message || (language === 'fr' ? 'Erreur initialisation paiement.' : 'Payment init error.'));
        return;
      }

      const presented = await Stripe.presentPaymentSheet();
      if (presented?.error) {
        showError(presented.error.message || (language === 'fr' ? 'Paiement annulé.' : 'Payment cancelled.'));
        return;
      }

      const confirmRes = await api.confirmTicketPurchase(user.token, intentRes.paymentIntentId);
      if (confirmRes?.success) {
        showSuccess(confirmRes.message || (language === 'fr' ? 'Paiement validé, ticket créé !' : 'Payment succeeded, ticket created!'));
        fetchEvent();
        goPurchaseSuccess(unitPriceForPurchase);
      } else {
        showError(
          confirmRes?.message ||
            (language === 'fr'
              ? 'Paiement validé, mais erreur lors de la délivrance du ticket.'
              : 'Payment succeeded but ticket delivery failed.')
        );
      }
    } catch (error) {
      console.error('Erreur paiement ticket:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors du paiement.' : 'Payment error.'));
    } finally {
      setBuyingTicket(false);
    }
  };

  return {
    buyingTicket,
    acceptedCgv,
    setAcceptedCgv,
    selectedTierId,
    setSelectedTierId,
    ticketTiersForPurchase,
    hasMultipleTicketTiers,
    canProceedPurchaseTier,
    unitPriceForPurchase,
    priceBadgeLabel,
    handleBuyTicket,
  };
}
