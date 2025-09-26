import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
      console.log('Fetching events...'); // Debug log
      const response = await fetch('http://172.20.10.7:5000/api/events');
      const data = await response.json();
      
      if (data.success) {
        setEvents(data.events);
        console.log('Events loaded:', data.events.length); // TODO: Remove in production
      }
    } catch (error) {
      console.error('Erreur récupération événements:', error);
      // FIXME: Ajouter un message d'erreur pour l'utilisateur
    } finally {
      setLoading(false);
    }
  };

  const genres = ['all', ...new Set(events.map(event => event.genre))];

  const filteredEvents = events.filter(event => {
    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const getAvailabilityColor = (sold, capacity) => {
    const percentage = (sold / capacity) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-insane-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔄</div>
          <p className="text-insane-white/70">Chargement des événements</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-insane-black py-6 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-insane-white mb-4">
            📅 Événements
          </h1>
          <p className="text-insane-white/70 text-sm">
            Découvrez tous les événements Insane Nights & Days
          </p>
          {/* TODO: Corriger la grammaire - "événements" ou "évènements" ? */}
        </div>

        {/* Filtres et Recherche */}
        <div className="mb-8 space-y-4">
          {/* Barre de recherche */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher un événement..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-insane-gray border border-insane-orange text-white rounded-lg px-4 py-3 pl-12 focus:outline-none focus:ring-2 focus:ring-insane-orange"
              />
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-insane-orange">
                🔍
              </div>
            </div>
          </div>

          {/* Filtres par genre */}
          <div className="flex flex-wrap justify-center gap-2">
            {genres.map(genre => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  selectedGenre === genre
                    ? 'bg-insane-orange text-insane-black'
                    : 'bg-insane-gray text-insane-white hover:bg-insane-orange hover:text-insane-black'
                }`}
              >
                {genre === 'all' ? '🎵 Tous' : genre}
              </button>
            ))}
          </div>
        </div>

        {/* Liste des événements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map(event => (
            <div key={event.id} className="bg-insane-gray border border-insane-orange/30 rounded-xl p-4 hover:border-insane-orange/80 transition-all duration-300">
                              {/* Image de l'événement */}
                <div className="relative mb-4 overflow-hidden rounded-lg">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-insane-orange text-insane-black px-2 py-1 rounded-full text-sm font-bold">
                    {event.price}€
                  </div>
                  <div className="absolute bottom-2 left-2 bg-insane-black/80 text-insane-white px-2 py-1 rounded-full text-xs">
                    {event.genre}
                  </div>
                </div>

                {/* Contenu */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-insane-white">
                    {event.title}
                  </h3>
                  
                  <p className="text-insane-white/70 text-sm leading-relaxed">
                    {event.description}
                  </p>

                  {/* Infos rapides */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center text-insane-white/80">
                      <span className="mr-2">📅</span>
                      {event.date} à {event.time}
                    </div>
                    <div className="flex items-center text-insane-white/80">
                      <span className="mr-2">📍</span>
                      {event.location}
                    </div>
                    <div className="flex items-center text-insane-white/80">
                      <span className="mr-2">🎤</span>
                      {event.djs.join(', ')}
                      {/* HACK: Parfois les DJs ne s'affichent pas correctement */}
                    </div>
                  </div>

                  {/* Disponibilité */}
                  <div className="pt-3 border-t border-insane-orange/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-insane-white/70">Places disponibles</span>
                      <span className={`text-xs font-bold ${getAvailabilityColor(event.sold, event.capacity)}`}>
                        {event.capacity - event.sold} / {event.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-insane-black rounded-full h-2">
                      <div 
                        className="bg-insane-orange h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(event.sold / event.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Bouton d'action */}
                  <Link
                    to={`/event/${event.id}`}
                    className="block w-full bg-insane-orange text-insane-black text-center py-3 rounded-lg font-semibold hover:bg-orange-500 transition-colors duration-300 mt-4"
                  >
                    🎟️ Voir les Détails
                  </Link>
                </div>
            </div>
          ))}
        </div>

        {/* Message si aucun événement */}
        {filteredEvents.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-xl font-bold text-insane-white mb-2">Aucun événement trouvé</h3>
            <p className="text-insane-white/70">Essayez de modifier vos filtres ou votre recherche</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
