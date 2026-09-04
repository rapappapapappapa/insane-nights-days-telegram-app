/**
 * Page Feed - Fil d'actualité (posts + événements)
 * 
 * FONCTIONNALITÉS DÉJÀ IMPLÉMENTÉES:
 * - Affichage du feed (posts + événements) via api.getFeed()
 * - Liens vers les événements
 * 
 * TODO - FONCTIONNALITÉS À AJOUTER (demande-moi le code en commentaire):
 * 
 * 1. CRÉER UN POST (pour les DJs)
 *    - Bouton "Créer un post" visible si user.activeProfileType === 'DJ'
 *    - Modal ou page avec textarea + option image
 *    - Appel api.createFeedPost(token, content, imageUrl)
 *    - Pour l'image: api.uploadFeedPostImage(token, file) - adapter pour le web (input type="file")
 * 
 * 2. LIKER UN POST
 *    - Bouton cœur sur chaque post
 *    - Appel api.toggleLikePost(token, postId)
 *    - Mettre à jour l'affichage (liked, likesCount)
 * 
 * 3. COMMENTAIRES
 *    - Afficher les commentaires sous chaque post (api.getPostComments(postId))
 *    - Formulaire pour ajouter un commentaire (api.createComment(token, postId, content))
 * 
 * 4. PAGINATION / INFINITE SCROLL
 *    - Charger plus de posts au scroll (api.getFeed(20, offset))
 *    - Utiliser IntersectionObserver ou un bouton "Voir plus"
 * 
 * 5. FEED "FOLLOWING" (optionnel)
 *    - Onglet "Pour toi" vs "Abonnements"
 *    - api.getFeedFollowing(token) pour les posts des DJs/Organisateurs suivis
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import { API_BASE_URL } from '../api/config';

const FeedPage = () => {
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getFeed(20, 0);
      if (res?.success && Array.isArray(res.feed)) {
        setFeed(res.feed);
      } else {
        setFeed([]);
      }
    } catch (err) {
      setError(err?.message || 'Erreur chargement du feed');
      setFeed([]);
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
      <div className="min-h-screen bg-nox-black flex items-center justify-center">
        <div className="text-nox-white">Chargement du feed...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nox-black py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-nox-white mb-6">Fil d'actualité</h1>

        {error && (
          <div className="bg-red-900/30 text-red-400 rounded-lg p-4 mb-6">{error}</div>
        )}

        {feed.length === 0 && !error && (
          <div className="text-center py-12 text-nox-white/70">
            <p>Aucun post pour le moment.</p>
            <p className="text-sm mt-2">Les événements à venir s'afficheront ici.</p>
            <Link to="/events" className="text-nox-primary mt-4 inline-block">
              Voir les événements →
            </Link>
          </div>
        )}

        <div className="space-y-6">
          {feed.map((item) => {
            if (item.type === 'event') {
              const ev = item;
              return (
                <Link
                  key={ev.id}
                  to={`/event/${ev.id}`}
                  className="block bg-nox-gray border border-nox-primary/30 rounded-xl p-4 hover:border-nox-primary/60 transition"
                >
                  <div className="flex gap-4">
                    {ev.image && (
                      <img
                        src={normalizeUrl(ev.image)}
                        alt={ev.title}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-nox-primary">Événement</span>
                      <h3 className="font-bold text-nox-white truncate">{ev.title}</h3>
                      <p className="text-sm text-nox-white/70 truncate">{ev.location}</p>
                      <p className="text-xs text-nox-white/50">
                        {ev.date ? new Date(ev.date).toLocaleDateString('fr-FR') : ''}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            }
            // Post (item.type === 'post')
            const post = item;
            return (
              <div
                key={post.id}
                className="bg-nox-gray border border-nox-primary/30 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-nox-primary font-medium">
                    {post.author?.username || post.dj?.artistName || post.booker?.name || 'Anonyme'}
                  </span>
                  <span className="text-xs text-nox-white/50">
                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString('fr-FR') : ''}
                  </span>
                </div>
                <p className="text-nox-white/90 whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                  <img
                    src={normalizeUrl(post.imageUrl)}
                    alt=""
                    className="mt-3 rounded-lg max-h-64 object-cover w-full"
                  />
                )}
                {/* TODO: Ajouter bouton like + compteur */}
                {/* TODO: Ajouter section commentaires */}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
