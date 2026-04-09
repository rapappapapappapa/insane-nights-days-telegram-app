import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
import * as ImagePicker from 'expo-image-picker';

const GENRE_OPTIONS = ['Techno', 'House', 'Deep House', 'Trance', 'Drum & Bass', 'Hip-Hop', 'R&B', 'Pop', 'Electro', 'Minimal', 'Ambient', 'Autre'];

export default function CommunityProfileEditPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [profile, setProfile] = useState(null);
  const [pseudo, setPseudo] = useState('');
  const [genres, setGenres] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [pseudoAvailable, setPseudoAvailable] = useState(null); // null | true | false
  const pseudoCheckRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    const p = pseudo.trim();
    if (p.length < 2) {
      setPseudoAvailable(null);
      return;
    }
    if (pseudoCheckRef.current) clearTimeout(pseudoCheckRef.current);
    pseudoCheckRef.current = setTimeout(async () => {
      try {
        const res = await api.checkCommunityPseudoAvailable(user?.token, p);
        setPseudoAvailable(res?.available ?? false);
      } catch {
        setPseudoAvailable(null);
      }
      pseudoCheckRef.current = null;
    }, 400);
    return () => {
      if (pseudoCheckRef.current) clearTimeout(pseudoCheckRef.current);
    };
  }, [pseudo, user?.token]);

  const fetchProfile = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await api.getCommunityProfile(user.token);
      if (res?.success && res.profile) {
        setProfile(res.profile);
        setPseudo(res.profile.pseudo || '');
        setGenres(res.profile.genres || '');
        setProfileImage(res.profile.profileImage);
        setBannerImage(res.profile.bannerImage);
      } else {
        showError(language === 'fr' ? 'Profil non trouvé' : 'Profile not found');
      }
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Erreur chargement' : 'Load error'));
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(language === 'fr' ? 'Permission refusée' : 'Permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'banner' ? [3, 1] : [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    if (type === 'banner') {
      setUploadingBanner(true);
      try {
        const res = await api.uploadCommunityProfileImage(user.token, uri, 'banner');
        setBannerImage(res.bannerImage);
        showSuccess(language === 'fr' ? 'Bannière mise à jour' : 'Banner updated');
      } catch (e) {
        showError(e?.message || 'Erreur');
      } finally {
        setUploadingBanner(false);
      }
    } else {
      setUploadingProfile(true);
      try {
        const res = await api.uploadCommunityProfileImage(user.token, uri, 'profile');
        setProfileImage(res.profileImage);
        showSuccess(language === 'fr' ? 'Photo mise à jour' : 'Photo updated');
      } catch (e) {
        showError(e?.message || 'Erreur');
      } finally {
        setUploadingProfile(false);
      }
    }
  };

  const handleSave = async () => {
    if (!user?.token || saving) return;
    setSaving(true);
    try {
      await api.updateCommunityProfile(user.token, { pseudo, genres });
      showSuccess(language === 'fr' ? 'Profil enregistré' : 'Profile saved');
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const addGenre = (g) => {
    const list = genres ? genres.split(',').map((s) => s.trim()).filter(Boolean) : [];
    if (list.includes(g)) return;
    setGenres([...list, g].join(', '));
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>{language === 'fr' ? 'Chargement...' : 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
          <Text style={styles.backBtnText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{language === 'fr' ? 'Profil non trouvé' : 'Profile not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <StatusBar style="light" />
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
        <Text style={styles.backBtnText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
      </TouchableOpacity>

      <View style={[styles.header, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.title}>{language === 'fr' ? 'Profil Communauté' : 'Community Profile'}</Text>

        {bannerImage ? (
          <TouchableOpacity
            style={styles.bannerWrap}
            onPress={() => pickImage('banner')}
            disabled={uploadingBanner}
            activeOpacity={0.9}
          >
            <Image source={{ uri: normalizeMediaUrl(bannerImage) }} style={styles.banner} />
            {uploadingBanner && (
              <View style={styles.overlayLoaderWrap}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.bannerPlaceholder}
            onPress={() => pickImage('banner')}
            disabled={uploadingBanner}
            activeOpacity={0.9}
          >
            <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.5)" />
            <Text style={styles.placeholderText}>{language === 'fr' ? 'Ajouter une bannière' : 'Add banner'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.avatarWrap}>
          {profileImage ? (
            <TouchableOpacity
              onPress={() => pickImage('profile')}
              disabled={uploadingProfile}
              activeOpacity={0.9}
              style={styles.avatarTouchWrap}
            >
              <Image source={{ uri: normalizeMediaUrl(profileImage) }} style={styles.avatar} />
              {uploadingProfile && (
                <View style={styles.avatarLoaderWrap}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.avatarPlaceholder}
              onPress={() => pickImage('profile')}
              disabled={uploadingProfile}
              activeOpacity={0.9}
            >
              <Ionicons name="person" size={50} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.form}>
        <View style={styles.pseudoRow}>
          <Text style={styles.label}>{language === 'fr' ? 'Pseudo (unique, pour les amis)' : 'Pseudo (unique, for friends)'}</Text>
          {pseudoAvailable === true && <Text style={styles.pseudoOk}>✓ {language === 'fr' ? 'Disponible' : 'Available'}</Text>}
          {pseudoAvailable === false && <Text style={styles.pseudoTaken}>✗ {language === 'fr' ? 'Déjà pris' : 'Taken'}</Text>}
        </View>
        <TextInput
          style={styles.input}
          value={pseudo}
          onChangeText={setPseudo}
          placeholder={language === 'fr' ? 'Ex: parano69100' : 'e.g. parano69100'}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={styles.label}>{language === 'fr' ? 'Styles écoutés (séparés par des virgules)' : 'Music genres (comma-separated)'}</Text>
        <TextInput
          style={styles.input}
          value={genres}
          onChangeText={setGenres}
          placeholder="Techno, House, Deep House..."
          placeholderTextColor="rgba(255,255,255,0.4)"
        />
        <View style={styles.genreChips}>
          {GENRE_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, genres.includes(g) && styles.chipActive]}
              onPress={() => addGenre(g)}
            >
              <Text style={[styles.chipText, genres.includes(g) && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{language === 'fr' ? 'Enregistrer' : 'Save'}</Text>}
        </TouchableOpacity>
      </View>

      {toast.visible && <Toast message={toast.message} type={toast.type} onHide={hideToast} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', marginTop: 12 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#fff', fontSize: 16 },
  backBtn: { position: 'absolute', left: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 16 },
  header: { alignItems: 'center', paddingBottom: 20 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 16 },
  bannerWrap: { width: '100%', height: 120, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  banner: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: 120, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  placeholderText: { color: 'rgba(255,255,255,0.5)', marginTop: 8 },
  overlayLoaderWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  avatarWrap: { marginBottom: 24, alignItems: 'center' },
  avatarTouchWrap: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,23,68,0.4)',
  },
  avatarLoaderWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 50 },
  form: { paddingHorizontal: 20 },
  pseudoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pseudoOk: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  pseudoTaken: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 16 },
  genreChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,23,68,0.3)' },
  chipActive: { backgroundColor: 'rgba(255,23,68,0.3)', borderColor: Colors.primary },
  chipText: { color: '#fff', fontSize: 13 },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  friendsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,23,68,0.4)', marginBottom: 16 },
  friendsBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  saveBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
