import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, Linking, TouchableOpacity, Image } from 'react-native';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { NoxText, NoxButton } from '../../components/nox';
import ProfileWallStream from '../../components/community/ProfileWallStream';
import {
  PublicProfileHero,
  PublicProfileTabs,
  PublicProfileEventCarousel,
  PublicProfileFilterChips,
  PublicProfileSignature,
  publicProfileStyles as pp,
} from '../../components/publicProfile';

function bookerTypeLabel(type, fr) {
  const map = {
    INDEPENDENT: fr ? 'Indépendant' : 'Independent',
    Indépendant: fr ? 'Indépendant' : 'Independent',
    Agence: fr ? 'Agence' : 'Agency',
    Collectif: fr ? 'Collectif' : 'Collective',
    Label: 'Label',
    Promoteur: fr ? 'Promoteur' : 'Promoter',
  };
  return map[type] || type || (fr ? 'Organisateur' : 'Organizer');
}

function formatEventBadge(iso, language) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d
      .toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${day} ${month}.`;
  } catch {
    return '';
  }
}

export default function BookerProfilePage() {
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { bookerId, initialTab } = routeParams || {};
  const fr = language === 'fr';
  const allowedTabs = new Set(['about', 'feed', 'events', 'media', 'reviews']);

  const [booker, setBooker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [activeTab, setActiveTab] = useState(
    allowedTabs.has(initialTab) ? initialTab : 'about'
  );
  const [events, setEvents] = useState([]);
  const [eventsFilter, setEventsFilter] = useState('all');

  useEffect(() => {
    if (bookerId) fetchBookerProfile();
  }, [bookerId]);

  useEffect(() => {
    if (!user?.token || !booker?.id || booker.userId === user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.getFollowStatus(user.token, { bookerId: booker.id });
        if (mounted && res?.success) setFollowing(!!res.following);
      } catch {
        if (mounted) setFollowing(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.token, user?.id, booker?.id, booker?.userId]);

  const fetchBookerProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getBookerProfileById(bookerId);
      if (res?.success && res.booker) {
        setBooker(res.booker);
        let list =
          res.booker.upcomingEvents ||
          res.events ||
          res.booker.events ||
          [];
        if (!Array.isArray(list) || list.length === 0) {
          try {
            const eventsRes = await api.getEvents();
            const all = eventsRes?.events || eventsRes?.data || [];
            if (Array.isArray(all)) {
              list = all.filter(
                (e) =>
                  e.bookerId === bookerId ||
                  e.booker?.id === bookerId ||
                  e.organizerId === bookerId,
              );
            }
          } catch {
            list = [];
          }
        }
        setEvents(Array.isArray(list) ? list : []);
      } else {
        setBooker(null);
      }
    } catch (error) {
      console.error('Erreur récupération profil Organisateur:', error);
      showError(fr ? 'Impossible de charger le profil.' : 'Unable to load profile.');
      setBooker(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user?.token || !booker?.id || loadingFollow) return;
    if (booker.userId === user?.id) return;
    setLoadingFollow(true);
    try {
      if (following) {
        await api.unfollowBooker(user.token, booker.id);
        setFollowing(false);
        showSuccess(fr ? 'Abonnement retiré.' : 'Unfollowed.');
      } else {
        await api.followBooker(user.token, booker.id);
        setFollowing(true);
        showSuccess(fr ? 'Vous suivez cet organisateur.' : 'You now follow this organizer.');
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
    } finally {
      setLoadingFollow(false);
    }
  };

  const { upcomingItems, pastItems } = useMemo(() => {
    const now = Date.now();
    const mapped = (events || []).map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.venue?.venueName || event.location || event.city,
      image: event.image || event.coverImage,
      tags: [event.genre].filter(Boolean),
      onPress: () => navigate('eventDetail', { eventId: event.id }),
    }));
    const upcoming = mapped
      .filter((e) => e.date && new Date(e.date).getTime() >= now - 12 * 60 * 60 * 1000)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    const past = mapped
      .filter((e) => e.date && new Date(e.date).getTime() < now - 12 * 60 * 60 * 1000)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return { upcomingItems: upcoming, pastItems: past };
  }, [events, navigate]);

  if (loading) {
    return (
      <View style={pp.container}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary" style={{ marginTop: Spacing.md }}>
            {fr ? 'Chargement...' : 'Loading...'}
          </NoxText>
        </View>
      </View>
    );
  }

  if (!booker) {
    return (
      <View style={pp.container}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
          <NoxText variant="secondary">{fr ? 'Profil non trouvé' : 'Profile not found'}</NoxText>
          <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    );
  }

  const displayName =
    booker.companyName ||
    booker.name ||
    booker.pseudo ||
    `${booker.nom || ''} ${booker.prenom || ''}`.trim() ||
    (fr ? 'Organisateur' : 'Organizer');
  const cityLine = [booker.city, booker.country].filter(Boolean).join(', ');
  const typeLabel = bookerTypeLabel(booker.bookerType, fr);
  const metaLine = [fr ? 'Organisateur' : 'Organizer', typeLabel, booker.city]
    .filter(Boolean)
    .join(' • ');
  const rating =
    booker.averageRatingGlobal != null && Number(booker.averageRatingGlobal) > 0
      ? `${Number(booker.averageRatingGlobal).toFixed(1)} ★`
      : null;

  const stats = [
    { label: fr ? 'Followers' : 'Followers', value: booker.followersCount, force: true },
    { label: fr ? 'Abonnements' : 'Following', value: booker.followingCount, force: true },
    {
      label: fr ? 'Événements' : 'Events',
      value: booker.eventsCount ?? events.length ?? null,
      force: true,
    },
    { label: fr ? 'Note' : 'Rating', value: rating, force: true },
  ];

  const isOwn = !!(user?.id && booker.userId === user.id);
  const showFollow = !!user?.token && !isOwn;
  const quote =
    booker.bio ||
    booker.description ||
    (fr
      ? 'Des lieux, des gens, des sons, une même vision.'
      : 'Places, people, sounds — one vision.');

  const extraActions = isOwn ? (
    <NoxButton
      label={fr ? 'Modifier mon profil' : 'Edit my profile'}
      onPress={() => navigate('bookerDashboard', { openSection: 'profil' })}
    />
  ) : null;

  const renderAbout = () => (
    <View>
      <PublicProfileEventCarousel
        language={language}
        items={upcomingItems}
        onSeeAll={() => setActiveTab('events')}
        emptyText={fr ? 'Aucun événement à afficher.' : 'No events to show.'}
      />

      <View style={[pp.sectionHeader, { marginTop: Spacing.xl }]}>
        <NoxText variant="titleSecondary" style={pp.sectionTitle}>
          {fr ? 'À propos' : 'About'}
        </NoxText>
      </View>
      <View style={pp.aboutGrid}>
        <View style={pp.aboutDetails}>
          <View style={pp.aboutRow}>
            <Ionicons name="briefcase-outline" size={16} color={Colors.primary} />
            <NoxText variant="secondary" style={pp.aboutRowText}>
              {typeLabel}
            </NoxText>
          </View>
          {cityLine ? (
            <View style={pp.aboutRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {fr ? `Basé à ${cityLine}` : `Based in ${cityLine}`}
              </NoxText>
            </View>
          ) : null}
          {booker.website ? (
            <TouchableOpacity style={pp.aboutRow} onPress={() => Linking.openURL(booker.website)}>
              <Ionicons name="globe-outline" size={16} color={Colors.primary} />
              <NoxText style={[pp.aboutRowText, { color: Colors.primary }]}>
                {booker.website.replace(/^https?:\/\//, '')}
              </NoxText>
            </TouchableOpacity>
          ) : null}
          {booker.instagramUrl ? (
            <TouchableOpacity
              style={pp.aboutRow}
              onPress={() => Linking.openURL(booker.instagramUrl)}
            >
              <Ionicons name="logo-instagram" size={16} color={Colors.primary} />
              <NoxText style={[pp.aboutRowText, { color: Colors.primary }]}>Instagram</NoxText>
            </TouchableOpacity>
          ) : null}
        </View>
        {booker.bio || booker.description ? (
          <View style={pp.quoteCard}>
            <NoxText style={pp.quoteMark}>“</NoxText>
            <NoxText variant="secondary" style={pp.quoteText} numberOfLines={6}>
              {booker.bio || booker.description}
            </NoxText>
            <NoxText variant="secondary" style={pp.quoteAttr}>
              — {displayName}
            </NoxText>
          </View>
        ) : null}
      </View>
      <PublicProfileSignature quote={quote} name={displayName} variant="orga" />
    </View>
  );

  const renderEvents = () => {
    const showUpcoming = eventsFilter === 'all' || eventsFilter === 'upcoming';
    const showPast = eventsFilter === 'all' || eventsFilter === 'past';
    return (
      <View>
        <PublicProfileFilterChips
          activeId={eventsFilter}
          onChange={setEventsFilter}
          chips={[
            { id: 'all', label: fr ? 'Tous' : 'All' },
            { id: 'upcoming', label: fr ? 'À venir' : 'Upcoming' },
            { id: 'past', label: fr ? 'Passés' : 'Past' },
          ]}
        />
        {showUpcoming ? (
          <PublicProfileEventCarousel
            language={language}
            title={fr ? 'À venir' : 'Upcoming'}
            items={upcomingItems}
            emptyText={fr ? 'Aucun événement à venir.' : 'No upcoming events.'}
          />
        ) : null}
        {showPast ? (
          <>
            <View style={pp.sectionHeader}>
              <NoxText variant="titleSecondary" style={pp.sectionTitle}>
                {fr ? 'Événements passés' : 'Past events'}
              </NoxText>
            </View>
            {pastItems.length === 0 ? (
              <NoxText variant="secondary" style={pp.emptyHint}>
                {fr ? 'Aucun événement passé.' : 'No past events.'}
              </NoxText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {pastItems.slice(0, 12).map((event) => {
                  const imageUri = event.image ? normalizeMediaUrl(event.image) : null;
                  const badge = formatEventBadge(event.date, language);
                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={pp.pastEventStripCard}
                      onPress={event.onPress}
                    >
                      <View style={pp.pastEventThumb}>
                        {imageUri ? (
                          <Image
                            source={{ uri: imageUri }}
                            style={pp.pastEventThumbImage}
                          />
                        ) : (
                          <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
                        )}
                      </View>
                      {badge ? (
                        <NoxText variant="secondary" style={{ fontSize: 10 }}>
                          {badge}
                        </NoxText>
                      ) : null}
                      <NoxText variant="form" numberOfLines={2} style={{ fontSize: 12 }}>
                        {event.title}
                      </NoxText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </>
        ) : null}
        <PublicProfileSignature quote={quote} name={displayName} variant="orga" />
      </View>
    );
  };

  return (
    <View style={pp.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={pp.scrollContent} showsVerticalScrollIndicator={false}>
        <PublicProfileHero
          language={language}
          onBack={goBack}
          bannerImage={booker.bannerImage || booker.coverImage}
          profileImage={booker.profileImage}
          name={displayName}
          metaLine={metaLine}
          locationLine={cityLine}
          bio={booker.bio || booker.description}
          stats={stats}
          showFollow={showFollow}
          following={following}
          loadingFollow={loadingFollow}
          onFollowPress={handleFollowToggle}
          shareMessage={fr ? `Découvre ${displayName} sur NOX` : `Discover ${displayName} on NOX`}
          extraActions={extraActions}
          fallbackIcon="calendar"
        />

        <PublicProfileTabs language={language} activeTab={activeTab} onChange={setActiveTab} />

        <View style={pp.tabBody}>
          {activeTab === 'about' ? renderAbout() : null}
          {activeTab === 'feed' ? (
            <View>
              <ProfileWallStream
                wallFilter={booker?.id ? { bookerId: booker.id } : null}
                isOwnProfile={isOwn}
                enabled={!!booker?.id}
              />
              <PublicProfileSignature quote={quote} name={displayName} variant="orga" />
            </View>
          ) : null}
          {activeTab === 'events' ? renderEvents() : null}
          {activeTab === 'media' ? (
            <View>
              <View style={pp.emptyStateCard}>
                <Ionicons name="images-outline" size={28} color={Colors.primary} />
                <NoxText variant="form" style={{ textAlign: 'center' }}>
                  {fr ? 'Aucun média' : 'No media'}
                </NoxText>
                <NoxText variant="secondary" style={{ textAlign: 'center' }}>
                  {fr
                    ? 'Les médias organisateur ne sont pas encore exposés sur ce profil.'
                    : 'Organizer media is not available on this profile yet.'}
                </NoxText>
              </View>
              <PublicProfileSignature quote={quote} name={displayName} variant="orga" />
            </View>
          ) : null}
          {activeTab === 'reviews' ? (
            <View>
              <View style={pp.emptyStateCard}>
                <Ionicons name="star-outline" size={28} color={Colors.primary} />
                <NoxText variant="form" style={{ textAlign: 'center' }}>
                  {fr ? 'Aucun avis' : 'No reviews'}
                </NoxText>
                <NoxText variant="secondary" style={{ textAlign: 'center' }}>
                  {fr
                    ? 'Les avis organisateur ne sont pas encore exposés sur ce profil.'
                    : 'Organizer reviews are not available on this profile yet.'}
                </NoxText>
              </View>
              <PublicProfileSignature quote={quote} name={displayName} variant="orga" />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {toast.visible ? (
        <Toast message={toast.message} type={toast.type} onHide={hideToast} />
      ) : null}
    </View>
  );
}
