/**
 * Page Mes tickets
 *
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Récupération des tickets via api.getMyTickets(token)
 * - Affichage liste (événement, date, statut)
 *
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 *
 * 1. QR CODE POUR CHAQUE TICKET
 *    - api.getTicketQR(ticketId) retourne une URL ou des données pour le QR
 *    - Afficher le QR avec une librairie (qrcode.react ou similar)
 *
 * 2. TÉLÉCHARGER / PARTAGER LE TICKET
 *    - Bouton pour afficher le QR en grand
 *    - Option "Ajouter au portefeuille" (Wallet pass)
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [user?.isAuthenticated, user?.token]);

  const loadTickets = async () => {
    try {
      const res = await api.getMyTickets(user.token);
      if (res?.success && Array.isArray(res.tickets)) {
        setTickets(res.tickets);
      } else {
        setTickets([]);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-insane-white/70 mb-4">Connecte-toi pour voir tes tickets.</p>
          <Link to="/login" className="text-insane-orange hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center">
        <div className="text-insane-white">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-insane-black py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-insane-white mb-6">Mes tickets</h1>

        {tickets.length === 0 ? (
          <div className="text-center py-12 text-insane-white/70">
            <p>Aucun ticket pour le moment.</p>
            <Link to="/events" className="text-insane-orange mt-4 inline-block">
              Voir les événements →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/event/${ticket.eventId}`}
                className="block bg-insane-gray border border-insane-orange/30 rounded-xl p-4 hover:border-insane-orange/60 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-insane-white">
                      {ticket.eventTitle || 'Événement'}
                    </h3>
                    <p className="text-sm text-insane-white/70">
                      {ticket.eventDate
                        ? new Date(ticket.eventDate).toLocaleDateString('fr-FR')
                        : ''}{' '}
                      • {ticket.eventLocation || ''}
                    </p>
                  </div>
                  <span className="text-xs bg-insane-orange/30 text-insane-orange px-2 py-1 rounded">
                    {ticket.status || 'Valide'}
                  </span>
                </div>
                {/* TODO: Afficher QR code */}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;
