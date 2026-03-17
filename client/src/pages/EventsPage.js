/**
 * Page Liste des événements
 * 
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Récupération des événements via api.getEvents()
 * - Filtre par genre
 * - Recherche par titre/lieu
 * - Cartes cliquables vers /event/:id
 * 
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 * 
 * 1. FILTRE PAR DATE
 *    - Afficher uniquement les événements à venir (date >= aujourd'hui)
 *    - Ou ajouter un filtre "Passés" / "À venir"
 * 
 * 2. TRI
 *    - Par date, par prix, par popularité (places vendues)
 * 
 * 3. PAGINATION
 *    - Si l'API supporte limit/offset, charger plus au scroll
 * 
 * 4. CARTE ÉVÉNEMENT AMÉLIORÉE
 *    - Afficher les DJs avec leurs photos
 *    - Badge "Complet" si sold >= capacity
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/config';
import { API_BASE_URL } from '../api/config';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await api.getEvents();
      if (res?.success && Array.isArray(res.events)) {
        setEvents(res.events);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erreur récupération événements:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const genres = ['all', ...new Set(events.map((e) => e.genre).filter(Boolean))];
  const filteredEvents = events.filter((event) => {
    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      (event.title || '').toLowerCase().includes(term) ||
      (event.location || '').toLowerCase().includes(term);
    return matchesGenre && matchesSearch;
  });

  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return url;
  };

  const getAvailabilityColor = (sold, capacity) => {
    if (!capacity) return 'text-green-500';
    const pct = (sold / capacity) * 100;
    if (pct >= 90) return 'text-red-500';
    if (pct >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center">
        <div className="text-insane-white">Chargement des événements...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-insane-black py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-insane-white mb-4 text-center">Événements</h1>
        <p className="text-insane-white/70 text-sm text-center mb-8">
          Découvrez tous les événements Insane Nights & Days
        </p>

        {/* Recherche */}
        <div className="max-w-md mx-auto mb-6">
          <input
            type="text"
            placeholder="Rechercher un événement..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-insane-gray border border-insane-orange/50 rounded-lg px-4 py-3 text-insane-white placeholder-insane-white/40 focus:outline-none focus:ring-2 focus:ring-insane-orange"
          />
        </div>

        {/* Filtres genre */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {genres.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-2 rounded-full text-sm font-medium transition ${
                selectedGenre === genre
                  ? 'bg-insane-orange text-insane-black'
                  : 'bg-insane-gray text-insane-white hover:bg-insane-orange/30'
              }`}
            >
              {genre === 'all' ? 'Tous' : genre}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((event) => (
            <Link
              key={event.id}
              to={`/event/${event.id}`}
              className="block bg-insane-gray border border-insane-orange/30 rounded-xl p-4 hover:border-insane-orange/60 transition"
            >
              <div className="relative mb-4 overflow-hidden rounded-lg">
                {event.image ? (
                  <img
                    src={normalizeUrl(event.image)}
                    alt={event.title}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-insane-dark flex items-center justify-center">
                    <span className="text-4xl">🎵</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-insane-orange text-insane-black px-2 py-1 rounded-full text-sm font-bold">
                  {event.price ?? 0}€
                </div>
                {event.genre && (
                  <div className="absolute bottom-2 left-2 bg-insane-black/80 text-insane-white px-2 py-1 rounded-full text-xs">
                    {event.genre}
                  </div>
                )}
              </div>
              <h3 className="font-bold text-insane-white mb-1">{event.title}</h3>
              <p className="text-sm text-insane-white/70 line-clamp-2 mb-2">{event.description}</p>
              <div className="space-y-1 text-xs text-insane-white/80">
                <div>📅 {event.date ? new Date(event.date).toLocaleDateString('fr-FR') : ''} • {event.time || ''}</div>
                <div>📍 {event.location || ''}</div>
                {event.djs?.length > 0 && <div>🎤 {event.djs.map(dj => typeof dj === 'object' && dj?.artistName ? dj.artistName : String(dj)).join(', ')}</div>}
              </div>
              {event.capacity != null && (
                <div className="mt-3 pt-3 border-t border-insane-orange/30">
                  <div className="flex justify-between text-xs">
                    <span className="text-insane-white/70">Places</span>
                    <span className={getAvailabilityColor(event.sold || 0, event.capacity)}>
                      {(event.capacity || 0) - (event.sold || 0)} / {event.capacity}
                    </span>
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-16 text-insane-white/70">
            Aucun événement trouvé. Modifie tes filtres.
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
