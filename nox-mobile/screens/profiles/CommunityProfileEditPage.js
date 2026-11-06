import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Radius, Spacing } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { NoxText, NoxInput, NoxButton, NoxScreenHeader } from '../../components/nox';

const GENRE_OPTIONS = ['Techno', 'House', 'Deep House', 'Trance', 'Drum & Bass', 'Hip-Hop', 'R&B', 'Pop', 'Electro', 'Minimal', 'Ambient', 'Autre'];

export default function CommunityProfileEditPage() {
  const { language } = useLanguage();
  const { goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const fr = language === 'fr';

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
        showError(fr ? 'Profil non trouvé' : 'Profile not found');
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur chargement' : 'Load error'));
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(fr ? 'Permission refusée' : 'Permission denied');
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
        showSuccess(fr ? 'Bannière mise à jour' : 'Banner updated');
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
        showSuccess(fr ? 'Photo mise à jour' : 'Photo updated');
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
      showSuccess(fr ? 'Profil enregistré' : 'Profile saved');
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <NoxScreenHeader
          title={fr ? 'Profil Communauté' : 'Community Profile'}
          onBack={goBack}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary">{fr ? 'Chargement…' : 'Loading…'}</NoxText>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <NoxScreenHeader
          title={fr ? 'Profil Communauté' : 'Community Profile'}
          onBack={goBack}
        />
        <View style={styles.centered}>
          <NoxText variant="form">{fr ? 'Profil non trouvé' : 'Profile not found'}</NoxText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title={fr ? 'Profil Communauté' : 'Community Profile'}
        subtitle={fr ? 'Photo, pseudo et styles' : 'Photo, pseudo & genres'}
        onBack={goBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mediaBlock}>
          {bannerImage ? (
            <TouchableOpacity
              style={styles.bannerWrap}
              onPress={() => pickImage('banner')}
              disabled={uploadingBanner}
              activeOpacity={0.9}
            >
              <Image source={{ uri: normalizeMediaUrl(bannerImage) }} style={styles.banner} />
              {uploadingBanner ? (
                <View style={styles.overlayLoader}>
                  <ActivityIndicator size="small" color={Colors.text} />
                </View>
              ) : null}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.bannerPlaceholder}
              onPress={() => pickImage('banner')}
              disabled={uploadingBanner}
              activeOpacity={0.9}
            >
              <Ionicons name="image-outline" size={36} color={Colors.textTertiary} />
              <NoxText variant="secondary" style={styles.placeholderText}>
                {fr ? 'Ajouter une bannière' : 'Add banner'}
              </NoxText>
            </TouchableOpacity>
          )}

          <View style={styles.avatarWrap}>
            {profileImage ? (
              <TouchableOpacity
                onPress={() => pickImage('profile')}
                disabled={uploadingProfile}
                activeOpacity={0.9}
                style={styles.avatarTouch}
              >
                <Image source={{ uri: normalizeMediaUrl(profileImage) }} style={styles.avatar} />
                {uploadingProfile ? (
                  <View style={[styles.overlayLoader, styles.avatarOverlay]}>
                    <ActivityIndicator size="small" color={Colors.text} />
                  </View>
                ) : null}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.avatarPlaceholder}
                onPress={() => pickImage('profile')}
                disabled={uploadingProfile}
                activeOpacity={0.9}
              >
                <Ionicons name="person" size={44} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.form}>
          <NoxInput
            label={fr ? 'Pseudo (unique, pour les amis)' : 'Pseudo (unique, for friends)'}
            value={pseudo}
            onChangeText={setPseudo}
            placeholder={fr ? 'Ex: parano69100' : 'e.g. parano69100'}
            autoCapitalize="none"
            autoCorrect={false}
            rightSlot={
              pseudoAvailable === true ? (
                <NoxText style={styles.pseudoOk}>✓ {fr ? 'Dispo' : 'OK'}</NoxText>
              ) : pseudoAvailable === false ? (
                <NoxText style={styles.pseudoTaken}>✗ {fr ? 'Pris' : 'Taken'}</NoxText>
              ) : null
            }
          />

          <NoxInput
            label={fr ? 'Styles écoutés (séparés par des virgules)' : 'Music genres (comma-separated)'}
            value={genres}
            onChangeText={setGenres}
            placeholder="Techno, House, Deep House..."
          />

          <View style={styles.genreChips}>
            {GENRE_OPTIONS.map((g) => {
              const active = genres.includes(g);
              return (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => addGenre(g)}
                  activeOpacity={0.8}
                >
                  <NoxText style={[styles.chipText, active && styles.chipTextActive]}>{g}</NoxText>
                </TouchableOpacity>
              );
            })}
          </View>

          <NoxButton
            label={fr ? 'Enregistrer' : 'Save'}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
          />
        </View>
      </ScrollView>

      {toast.visible ? (
        <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: 100,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mediaBlock: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  bannerWrap: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  banner: { width: '100%', height: '100%' },
  bannerPlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundInput,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  placeholderText: { marginTop: Spacing.xs },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  avatarWrap: { alignItems: 'center', marginTop: -Spacing.xxl },
  avatarTouch: { position: 'relative' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.backgroundElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: primaryAlpha(0.4),
  },
  avatarOverlay: { borderRadius: 50 },
  form: { gap: Spacing.xs },
  pseudoOk: { color: Colors.success, fontSize: 12, fontWeight: '600' },
  pseudoTaken: { color: Colors.error, fontSize: 12, fontWeight: '600' },
  genreChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundInput,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipActive: {
    backgroundColor: primaryAlpha(0.25),
    borderColor: Colors.primary,
  },
  chipText: { color: Colors.text, fontSize: 13 },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
});
