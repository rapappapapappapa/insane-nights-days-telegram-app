import React from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useNotifications } from '../../hooks/useNotifications';
import Toast from '../../components/Toast';
import VideoPlayer from '../../components/VideoPlayer';
import RejectReasonModal from '../../components/RejectReasonModal';
import { useVenueDashboard } from '../../hooks/useVenueDashboard';
import { styles } from './VenueDashboardPage.styles';
import Colors from '../../constants/colors';
import VenueInfosTab from '../../components/venueDashboard/sections/VenueInfosTab';
import VenueMediasTab from '../../components/venueDashboard/sections/VenueMediasTab';
import VenueAvisTab from '../../components/venueDashboard/sections/VenueAvisTab';
import VenueBookingsTab from '../../components/venueDashboard/sections/VenueBookingsTab';
import VenueChatModal from '../../components/venueDashboard/VenueChatModal';
import VenueContractModals from '../../components/venueDashboard/VenueContractModals';
import { isHomeScreenForProfile } from '../../utils/noxRoleNavigation';

export default function VenueDashboardPage() {
  const { height: contractModalWindowH } = useWindowDimensions();
  const contractEditorModalCardHeight = Math.round(contractModalWindowH * 0.88);
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { showConfirm } = useConfirm();
  const { user } = useAuth();
  const isHome = isHomeScreenForProfile(user?.activeProfileType, 'venueDashboard');
  const { refreshUnreadCount, markAllAsRead } = useNotifications();

  const v = useVenueDashboard({
    user,
    language,
    routeParams,
    navigate,
    goBack,
    showError,
    showSuccess,
    showConfirm,
    refreshUnreadCount,
    markAllAsRead,
  });

  const shared = { language, styles, ...v, navigate, user, showConfirm };

  if (v.loading) {
    return (
      <View style={styles.loaderScreen}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
      </View>
    );
  }

  if (!v.venue) {
    return (
      <View style={styles.loaderScreen}>
        <StatusBar style="light" />
        <Text style={styles.loadingText}>
          {language === 'fr'
            ? 'Aucun lieu associé à ce compte. Créez-en un depuis la page d’inscription lieu.'
            : 'No venue linked to this account. Please create one from venue registration.'}
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tabs = [
    { id: 'infos', label: language === 'fr' ? 'Infos' : 'Info' },
    { id: 'medias', label: language === 'fr' ? 'Médias' : 'Media' },
    { id: 'avis', label: language === 'fr' ? 'Avis & Notes' : 'Reviews' },
    { id: 'bookings', label: language === 'fr' ? 'Réservations' : 'Bookings' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        {!isHome ? (
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
        <Text style={styles.headerTitle} numberOfLines={2}>
          {language === 'fr' ? 'Dashboard Lieu' : 'Venue Dashboard'}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabItem, v.activeTab === tab.id && styles.tabItemActive]}
            onPress={() => v.setActiveTab(tab.id)}
          >
            <Text
              style={[styles.tabText, v.activeTab === tab.id && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {v.activeTab === 'infos' && <VenueInfosTab {...shared} />}
        {v.activeTab === 'medias' && <VenueMediasTab {...shared} />}
        {v.activeTab === 'avis' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'Avis & Notes' : 'Reviews & Ratings'}
            </Text>
            <VenueAvisTab language={language} styles={styles} ratings={v.ratings} />
          </View>
        )}
        {v.activeTab === 'bookings' && <VenueBookingsTab {...shared} />}
      </ScrollView>

      <VideoPlayer
        videoUrl={v.selectedVideo?.url}
        title={v.selectedVideo?.title}
        visible={v.videoModalVisible}
        onClose={() => v.setVideoModalVisible(false)}
      />

      <VenueChatModal {...shared} contractEditorModalCardHeight={contractEditorModalCardHeight} />

      <VenueContractModals
        {...shared}
        contractEditorModalCardHeight={contractEditorModalCardHeight}
      />

      <RejectReasonModal
        visible={v.rejectModalVisible}
        onClose={() => {
          v.setRejectModalVisible(false);
          v.setRejectModalEventVenueId(null);
        }}
        onConfirm={v.handleRejectVenueConfirm}
        title={
          v.rejectModalAction === 'cancel'
            ? language === 'fr'
              ? 'Annuler le booking'
              : 'Cancel booking'
            : language === 'fr'
              ? "Refuser l'invitation"
              : 'Reject invitation'
        }
        confirmLabel={
          v.rejectModalAction === 'cancel'
            ? language === 'fr'
              ? 'Annuler'
              : 'Cancel'
            : language === 'fr'
              ? 'Refuser'
              : 'Reject'
        }
        language={language}
        loading={v.processingInvitation === v.rejectModalEventVenueId}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}
