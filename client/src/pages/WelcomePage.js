/**
 * WelcomePage - Version Web (inspirée de l'app mobile)
 * Header + grille d'actions + feed avec onglets Pour tous / Abonnements
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import { API_BASE_URL } from '../api/config';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [feedTab, setFeedTab] = useState('all');
  const [likedPosts, setLikedPosts] = useState({});
  const [postLikesCount, setPostLikesCount] = useState({});

  useEffect(() => {
    loadFeed();
  }, [feedTab, user?.token]);

  useEffect(() => {
    if (user?.token && feed.length > 0) {
      checkLikes();
    }
  }, [feed, user?.token]);

  const loadFeed = async () => {
    setLoadingFeed(true);
    try {
      let res;
      if (feedTab === 'following' && user?.token) {
        res = await api.getFeedFollowing(user.token, 50, 0);
      } else {
        res = await api.getFeed(50, 0);
      }
      if (res?.success && Array.isArray(res.feed)) {
        setFeed(res.feed);
        const counts = {};
        res.feed.forEach((item) => {
          if (item.type === 'post') counts[item.id] = item.likes ?? 0;
        });
        setPostLikesCount(counts);
      } else {
        setFeed([]);
      }
    } catch {
      setFeed([]);
    } finally {
      setLoadingFeed(false);
    }
  };

  const checkLikes = async () => {
    if (!user?.token) return;
    const postIds = feed.filter((i) => i.type === 'post').map((i) => i.id);
    const liked = {};
    for (const postId of postIds) {
      try {
        const res = await api.checkPostLiked(user.token, postId);
        if (res?.success) liked[postId] = res.liked;
      } catch {}
    }
    setLikedPosts(liked);
  };

  const handleToggleLike = async (postId) => {
    if (!user?.token) return;
    try {
      const res = await api.toggleLikePost(user.token, postId);
      if (res?.success) {
        setLikedPosts((prev) => ({ ...prev, [postId]: res.liked }));
        setPostLikesCount((prev) => ({ ...prev, [postId]: res.likesCount ?? 0 }));
      }
    } catch {}
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const normalizeUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE_URL}${url}`;
    return url;
  };

  if (!user?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0b0e] flex items-center justify-center">
        <p className="text-white/70">Connecte-toi pour accéder à cette page.</p>
        <Link to="/login" className="text-[#FF6B35] ml-2">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0e] text-white">
      {/* Header */}
      <div className="pt-8 pb-6 px-4 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 bg-[#FF6B35] rounded-2xl flex items-center justify-center">
            <span className="text-[#0b0b0e] font-black text-3xl">I</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">Bienvenue</h1>
        <p className="text-[#FF6B35] font-semibold text-lg">{user?.username || 'Utilisateur'}</p>
      </div>

      {/* Grille d'actions */}
      <div className="px-4 mb-6">
        <p className="text-white/70 text-sm text-center mb-4">Que souhaitez-vous faire ?</p>
        <div className="grid grid-cols-2 gap-3 max-w-xl mx-auto">
          <Link
            to="/events"
            className="flex flex-col items-center justify-center min-h-[100px] bg-[#1a1a1f] border border-[#FF6B35]/30 rounded-2xl p-4 hover:border-[#FF6B35]/60 transition"
          >
            <span className="text-3xl mb-2">🎵</span>
            <span className="text-white font-semibold text-sm">Événements</span>
          </Link>
          {user?.activeProfileType === 'COMMUNITY' && (
            <Link
              to="/tickets"
              className="flex flex-col items-center justify-center min-h-[100px] bg-[#1a1a1f] border border-[#FF6B35]/30 rounded-2xl p-4 hover:border-[#FF6B35]/60 transition"
            >
              <span className="text-3xl mb-2">🎟️</span>
              <span className="text-white font-semibold text-sm">Mes Tickets</span>
            </Link>
          )}
          {(user?.activeProfileType === 'DJ' || user?.activeProfileType === 'VENUE' || user?.activeProfileType === 'BOOKER') && (
            <Link
              to="/profile"
              className="flex flex-col items-center justify-center min-h-[100px] bg-[#1a1a1f] border border-[#FF6B35]/30 rounded-2xl p-4 hover:border-[#FF6B35]/60 transition"
            >
              <span className="text-3xl mb-2">👤</span>
              <span className="text-white font-semibold text-sm">Mon Profil</span>
            </Link>
          )}
          <Link
            to="/profile"
            className="flex flex-col items-center justify-center min-h-[100px] bg-[#1a1a1f] border border-[#FF6B35]/30 rounded-2xl p-4 hover:border-[#FF6B35]/60 transition"
          >
            <span className="text-3xl mb-2">👤</span>
            <span className="text-white font-semibold text-sm">Mon Profil</span>
          </Link>
        </div>
      </div>

      {/* Feed */}
      <div className="border-t border-white/10">
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setFeedTab('all')}
            className={`flex-1 py-4 text-sm font-semibold ${feedTab === 'all' ? 'text-white border-b-2 border-[#FF6B35]' : 'text-white/50'}`}
          >
            Pour tous
          </button>
          <button
            onClick={() => setFeedTab('following')}
            className={`flex-1 py-4 text-sm font-semibold ${feedTab === 'following' ? 'text-white border-b-2 border-[#FF6B35]' : 'text-white/50'}`}
          >
            Abonnements
          </button>
        </div>

        {loadingFeed ? (
          <div className="flex justify-center py-16">
            <div className="text-white/70">Chargement du feed...</div>
          </div>
        ) : feed.length === 0 ? (
          <div className="text-center py-16 text-white/60">
            <p className="mb-2">
              {feedTab === 'following' && !user?.token
                ? 'Connecte-toi pour voir les posts des profils que tu suis'
                : feedTab === 'following'
                ? 'Suis des DJs ou des organisateurs pour voir leurs posts ici'
                : 'Le feed est vide pour le moment'}
            </p>
            <Link to="/events" className="text-[#FF6B35] hover:underline">Voir les événements →</Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {feed.map((item) => {
              if (item.type === 'event') {
                return (
                  <Link key={item.id} to={`/event/${item.id}`} className="block p-4 hover:bg-white/5 transition">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#FF6B35] text-xs font-bold uppercase">Événement</span>
                    </div>
                    {item.image && (
                      <img src={normalizeUrl(item.image)} alt="" className="w-full h-48 object-cover rounded-xl mb-3" />
                    )}
                    <h3 className="font-bold text-white mb-1">{item.title}</h3>
                    {item.description && <p className="text-white/70 text-sm line-clamp-2 mb-2">{item.description}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-white/60">
                      <span>📅 {item.date ? new Date(item.date).toLocaleDateString('fr-FR') : ''}</span>
                      <span>📍 {item.location || ''}</span>
                      <span>💰 {item.price ?? 0}€</span>
                    </div>
                  </Link>
                );
              }
              const isDj = item.profileType === 'DJ';
              const profileName = isDj ? item.dj?.artistName : (item.booker?.name || item.author?.username);
              const profileImage = isDj ? item.dj?.profileImage : item.booker?.profileImage;
              return (
                <div key={item.id} className="p-4 border-b border-white/5">
                  <div className="flex items-start gap-3 mb-2">
                    {profileImage ? (
                      <img src={normalizeUrl(profileImage)} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${isDj ? 'bg-[#FF6B35]/30' : 'bg-green-500/30'}`}>
                        {profileName?.charAt(0) || (isDj ? 'D' : 'B')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{profileName || 'Anonyme'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isDj ? 'bg-[#FF6B35]/20 text-[#FF6B35]' : 'bg-green-500/20 text-green-400'}`}>
                          {isDj ? 'DJ' : 'Organisateur'}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs">{formatDate(item.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-white/90 text-sm ml-[52px] whitespace-pre-wrap">{item.content}</p>
                  {item.imageUrl && (
                    <img src={normalizeUrl(item.imageUrl)} alt="" className="mt-3 ml-[52px] rounded-xl max-h-64 w-full object-cover" />
                  )}
                  <div className="flex gap-6 mt-2 ml-[52px]">
                    <button
                      type="button"
                      onClick={() => handleToggleLike(item.id)}
                      className="flex items-center gap-1.5 text-sm hover:opacity-80 transition"
                    >
                      <span className={likedPosts[item.id] ? 'text-[#FF6B35]' : 'text-white/50'}>
                        {likedPosts[item.id] ? '❤️' : '🤍'}
                      </span>
                      <span className={likedPosts[item.id] ? 'text-[#FF6B35]' : 'text-white/60'}>
                        {postLikesCount[item.id] ?? item.likes ?? 0}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomePage;
