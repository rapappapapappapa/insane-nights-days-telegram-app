/**
 * Page Détail d'un événement
 * 
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Récupération de l'événement via api.getEventById(id)
 * - Affichage des infos (titre, date, lieu, DJs, prix, description)
 * 
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 * 
 * 1. ACHETER UN TICKET (Stripe)
 *    - Bouton "Acheter un ticket" si connecté
 *    - api.createTicketPaymentIntent(token, eventId, quantity)
 *    - Intégration Stripe Elements pour le paiement
 *    - api.confirmTicketPurchase(token, paymentIntentId)
 * 
 * 2. NOTER L'ÉVÉNEMENT (après y avoir assisté)
 *    - Si l'utilisateur a un ticket pour cet événement et que la date est passée
 *    - Formulaire pour noter le DJ et le lieu (api.rateDj, api.rateVenue)
 * 
 * 3. LIEN VERS PROFIL DJ / LIEU
 *    - Cliquer sur un DJ -> /dj/:id
 *    - Cliquer sur le lieu -> /venue/:id
 * 
 * 4. PARTAGER L'ÉVÉNEMENT
 *    - Bouton partage (Web Share API ou copier le lien)
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/config';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../contexts/AuthContext';

const EventDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) loadEvent();
  }, [id]);

  const loadEvent = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getEventById(id);
      if (res?.success && res?.event) {
        setEvent(res.event);
      } else {
        setError(res?.message || 'Événement non trouvé');
      }
    } catch (err) {
      setError(err?.message || 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  };

  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center">
        <div className="text-insane-white">Chargement...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Événement introuvable'}</p>
          <Link to="/events" className="text-insane-orange hover:underline">
            ← Retour aux événements
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-insane-black py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/events" className="text-insane-orange/80 hover:text-insane-orange text-sm mb-4 inline-block">
          ← Retour aux événements
        </Link>

        {/* Image */}
        <div className="relative rounded-xl overflow-hidden mb-6">
          {event.image ? (
            <img
              src={normalizeUrl(event.image)}
              alt={event.title}
              className="w-full h-56 object-cover"
            />
          ) : (
            <div className="w-full h-56 bg-insane-dark flex items-center justify-center">
              <span className="text-6xl">🎵</span>
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-insane-orange text-insane-black px-3 py-1 rounded-full font-bold">
            {event.price ?? 0}€
          </div>
        </div>

        <h1 className="text-2xl font-bold text-insane-white mb-2">{event.title}</h1>
        {event.genre && (
          <span className="inline-block bg-insane-gray px-2 py-1 rounded text-sm text-insane-orange mb-4">
            {event.genre}
          </span>
        )}

        <div className="space-y-2 text-insane-white/80 mb-6">
          <p>📅 {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : ''} à {event.time || ''}</p>
          <p>📍 {event.location || ''}</p>
          {event.venueName && <p>🏛️ {event.venueName}</p>}
          {event.djs?.length > 0 && <p>🎤 {event.djs.join(', ')}</p>}
        </div>

        {event.description && (
          <p className="text-insane-white/90 mb-6 whitespace-pre-wrap">{event.description}</p>
        )}

        {event.capacity != null && (
          <div className="mb-6">
            <p className="text-sm text-insane-white/70">
              Places : {(event.capacity || 0) - (event.sold || 0)} / {event.capacity} disponibles
            </p>
            <div className="w-full bg-insane-gray rounded-full h-2 mt-1">
              <div
                className="bg-insane-orange h-2 rounded-full"
                style={{ width: `${((event.sold || 0) / (event.capacity || 1)) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* TODO: Bouton acheter ticket si connecté */}
        {user?.isAuthenticated && (
          <button
            className="w-full bg-insane-orange text-insane-black font-bold py-3 rounded-lg hover:bg-orange-500 transition"
            disabled
          >
            Acheter un ticket (à implémenter)
          </button>
        )}
      </div>
    </div>
  );
};

export default EventDetailPage;
