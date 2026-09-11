import React, { useEffect, useMemo, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxLieuxBottomNav } from '../../components/nox';
import LieuxDashboardHomeSection from '../../components/lieux/LieuxDashboardHomeSection';
import Colors from '../../constants/colors';
import { getRealizedEventsCount } from '../../utils/lieuxDashboardUtils';
import { styles } from './LieuxDashboardPage.styles';

export default function LieuxDashboardPage() {
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';

  const {
    loading,
    refreshing,
    venueProfile,
    bookings,
    pendingBookings,
    refresh,
  } = useLieuxData(user?.token, language);

  const realizedCount = useMemo(() => getRealizedEventsCount(bookings), [bookings]);
  const handledDeepLinkRef = useRef(null);

  useEffect(() => {
    const chatId = routeParams?.openChatEventVenueId;
    if (chatId && handledDeepLinkRef.current !== chatId) {
      handledDeepLinkRef.current = chatId;
      navigate('lieuxBookingChat', { eventVenueId: chatId });
      return;
    }
    if (routeParams?.openBookings) {
      navigate('lieuxDemandes', { filter: 'pending' });
    }
  }, [routeParams?.openChatEventVenueId, routeParams?.openBookings, navigate]);

  const menuItems = useMemo(
    () => [
      {
        id: 'create-event',
        label: fr ? 'Créer un événement' : 'Create event',
        hint: fr ? 'Programmation & billetterie' : 'Programming & tickets',
        icon: 'calendar',
        accentColor: '#A78BFA',
        accentBg: 'rgba(167,139,250,0.12)',
      },
      {
        id: 'planning',
        label: 'Planning',
        hint: fr ? 'Mes événements' : 'My events',
        icon: 'calendar-outline',
        accentColor: '#34D399',
        accentBg: 'rgba(52,211,153,0.12)',
      },
      {
        id: 'artistes',
        label: fr ? 'Artistes & demandes' : 'Artists & requests',
        hint: fr ? 'Gérer les propositions' : 'Manage proposals',
        icon: 'people',
        accentColor: '#F472B6',
        accentBg: 'rgba(244,114,182,0.12)',
      },
      {
        id: 'espaces',
        label: fr ? 'Espaces & salles' : 'Spaces & rooms',
        hint: fr ? 'Capacités, plans, équipements' : 'Capacity, plans, gear',
        icon: 'business',
        accentColor: Colors.primaryLight,
        accentBg: 'rgba(40,82,232,0.2)',
      },
      {
        id: 'medias',
        label: fr ? 'Médias' : 'Media',
        hint: fr ? 'Photos, vidéos, visite virtuelle' : 'Photos, videos, VR tour',
        icon: 'images',
        accentColor: '#FB923C',
        accentBg: 'rgba(251,146,60,0.12)',
      },
      {
        id: 'communication',
        label: 'Communication',
        hint: fr ? 'Publier, réseaux, promos' : 'Publish, social, promos',
        icon: 'megaphone',
        accentColor: '#C084FC',
        accentBg: 'rgba(192,132,252,0.12)',
      },
      {
        id: 'finances',
        label: 'Finances',
        hint: fr ? 'Ventes, paiements, rapports' : 'Sales, payouts, reports',
        icon: 'cash',
        accentColor: '#FBBF24',
        accentBg: 'rgba(251,191,36,0.12)',
      },
      {
        id: 'documents',
        label: 'Documents',
        hint: fr ? 'Contrats, assurances, ERP' : 'Contracts, insurance, ERP',
        icon: 'document-text',
        accentColor: '#F87171',
        accentBg: 'rgba(248,113,113,0.12)',
      },
      {
        id: 'avis',
        label: fr ? 'Avis' : 'Reviews',
        hint: fr ? 'Notes des artistes & public' : 'Artist & public ratings',
        icon: 'star',
        accentColor: '#34D399',
        accentBg: 'rgba(52,211,153,0.12)',
      },
      {
        id: 'parametres',
        label: fr ? 'Paramètres' : 'Settings',
        hint: fr ? 'Équipe, accès, préférences' : 'Team, access, prefs',
        icon: 'settings',
        accentColor: '#94A3B8',
        accentBg: 'rgba(148,163,184,0.15)',
      },
    ],
    [fr],
  );

  const openTool = (toolId) => {
    switch (toolId) {
      case 'create-event':
        navigate('lieuxAvailability');
        break;
      case 'planning':
        navigate('lieuxEvents');
        break;
      case 'artistes':
        navigate('lieuxDemandes', { filter: 'pending' });
        break;
      case 'espaces':
      case 'avis':
        navigate('lieuxProfil');
        break;
      case 'medias':
        navigate('lieuxMedia');
        break;
      case 'communication':
        navigate('createFeedPost');
        break;
      case 'finances':
        navigate('lieuxEvents');
        break;
      case 'documents':
        navigate('lieuxDemandes');
        break;
      case 'parametres':
        navigate('lieuxSettings');
        break;
      default:
        break;
    }
  };

  const displayName =
    user?.username?.split('@')?.[0] ||
    venueProfile?.contactName ||
    venueProfile?.venueName ||
    '';

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LieuxDashboardHomeSection
        language={language}
        styles={styles}
        tiles={menuItems}
        pendingCount={pendingBookings.length}
        displayName={displayName}
        venueName={venueProfile?.venueName}
        venueType={venueProfile?.venueType || venueProfile?.type}
        city={venueProfile?.city}
        country={venueProfile?.country}
        bannerImage={venueProfile?.bannerImage}
        profileImage={venueProfile?.profileImage}
        averageRating={venueProfile?.averageRatingGlobal}
        venueId={venueProfile?.id}
        bookings={bookings}
        realizedCount={realizedCount}
        navigate={navigate}
        refreshing={refreshing}
        onRefresh={refresh}
        onSelectTool={openTool}
      />
      <NoxLieuxBottomNav active="home" navigate={navigate} />
    </View>
  );
}
