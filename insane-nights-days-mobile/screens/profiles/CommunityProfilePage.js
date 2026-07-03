/**
 * Page de visualisation du profil Communauté d'un ami (lecture seule)
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityProfilePage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, hideToast } = useToast();

  const communityId = routeParams?.communityId;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fr = language === 'fr';

  useEffect(() => {
    if (user?.token && communityId) {
      fetchProfile();
    }
  }, [user?.token, communityId]);

  const fetchProfile = async () => {
    if (!user?.token || !communityId) return;
    setLoading(true);
    try {
      const res = await api.getCommunityProfileById(user.token, communityId);
      if (res?.success && res.profile) {
        setProfile(res.profile);
      } else {
        showError(fr ? 'Profil introuvable' : 'Profile not found');
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur chargement' : 'Load error'));
    } finally {
      setLoading(false);
    }
  };

  if (!communityId) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
          <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>{fr ? 'Profil introuvable.' : 'Profile not found.'}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
          <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
          <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>{fr ? 'Profil introuvable.' : 'Profile not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
        <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + 50 }]}>
        {profile.bannerImage ? (
          <Image source={{ uri: normalizeMediaUrl(profile.bannerImage) }} style={styles.banner} />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.4)" />
          </View>
        )}

        <View style={styles.avatarWrap}>
          {profile.profileImage ? (
            <Image source={{ uri: normalizeMediaUrl(profile.profileImage) }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{profile.pseudo?.charAt(0)?.toUpperCase() || '?'}</Text>
            </View>
          )}
        </View>

        <Text style={styles.pseudo}>{profile.pseudo}</Text>

        {profile.genres && (
          <View style={styles.genresSection}>
            <Text style={styles.genresLabel}>{fr ? 'Styles écoutés' : 'Music genres'}</Text>
            <Text style={styles.genresText}>{profile.genres}</Text>
          </View>
        )}
      </ScrollView>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  backBtn: { position: 'absolute', left: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 16 },
  scroll: { flex: 1 },
  content: { paddingBottom: 40 },
  loader: { marginTop: 80 },
  errorText: { color: '#fff', textAlign: 'center', marginTop: 80, fontSize: 16 },
  banner: { width: '100%', height: 140, backgroundColor: 'rgba(255,255,255,0.05)' },
  bannerPlaceholder: { width: '100%', height: 140, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  avatarWrap: { alignItems: 'center', marginTop: -50, marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: Colors.background },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(77,163,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarInitial: { color: '#fff', fontSize: 40, fontWeight: '700' },
  pseudo: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 24 },
  genresSection: { paddingHorizontal: 20 },
  genresLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  genresText: { color: '#fff', fontSize: 15 },
});
