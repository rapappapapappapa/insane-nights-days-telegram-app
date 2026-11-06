/**
 * Page d'édition du profil Lieu (Venue)
 * Photo, bannière, nom, adresse
 */

import React, { useState, useEffect } from 'react';
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

export default function VenueProfileEditPage() {
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
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [legalRepresentative, setLegalRepresentative] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [siret, setSiret] = useState('');
  const [maxCapacityStr, setMaxCapacityStr] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await api.getVenueProfile(user.token);
      if (res?.success && res.profile) {
        setProfile(res.profile);
        setVenueName(res.profile.venueName || '');
        setAddress(res.profile.address || '');
        setCompanyName(res.profile.companyName || '');
        setLegalRepresentative(res.profile.legalRepresentative || '');
        setPostalCode(res.profile.postalCode || '');
        setCity(res.profile.city || '');
        setCountry(res.profile.country || '');
        setSiret(res.profile.siret || '');
        setMaxCapacityStr(
          res.profile.maxCapacity != null && res.profile.maxCapacity !== ''
            ? String(res.profile.maxCapacity)
            : ''
        );
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
        const res = await api.uploadVenueProfileImage(user.token, uri, 'banner');
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
        const res = await api.uploadVenueProfileImage(user.token, uri, 'profile');
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
      const payload = { venueName, address };
      if (maxCapacityStr.trim() === '') {
        payload.maxCapacity = null;
      } else {
        const n = parseInt(maxCapacityStr.replace(/\s/g, ''), 10);
        if (!Number.isFinite(n) || n < 1) {
          showError(fr ? 'Capacité max : nombre entier ≥ 1 ou vide.' : 'Max capacity: integer ≥ 1 or leave empty.');
          setSaving(false);
          return;
        }
        payload.maxCapacity = n;
      }
      const legalEditable = !(profile?.companyName || profile?.legalRepresentative || profile?.postalCode || profile?.city || profile?.country || profile?.siret);
      if (legalEditable) {
        payload.companyName = companyName?.trim() || null;
        payload.legalRepresentative = legalRepresentative?.trim() || null;
        payload.postalCode = postalCode?.trim() || null;
        payload.city = city?.trim() || null;
        payload.country = country?.trim() || null;
        payload.siret = siret?.trim() || null;
      }
      await api.updateVenueProfile(user.token, payload);
      showSuccess(fr ? 'Profil enregistré' : 'Profile saved');
      await fetchProfile();
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const legalEditable = !(
    profile?.companyName ||
    profile?.legalRepresentative ||
    profile?.postalCode ||
    profile?.city ||
    profile?.country ||
    profile?.siret
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="light" />
        <NoxScreenHeader title={fr ? 'Profil Lieu' : 'Venue Profile'} onBack={goBack} />
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
        <NoxScreenHeader title={fr ? 'Profil Lieu' : 'Venue Profile'} onBack={goBack} />
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
        title={fr ? 'Profil Lieu' : 'Venue Profile'}
        subtitle={fr ? 'Photo, adresse et infos légales' : 'Photo, address & legal info'}
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
                <Ionicons name="business" size={44} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.form}>
          {legalEditable ? (
            <View style={styles.legalBanner}>
              <NoxText variant="form" style={styles.legalBannerText}>
                {fr
                  ? 'Complétez vos infos légales (société, SIRET, représentant) pour les contrats.'
                  : 'Complete your legal info (company, SIRET, representative) for contracts.'}
              </NoxText>
            </View>
          ) : null}

          <NoxInput
            label={fr ? 'Nom du lieu' : 'Venue name'}
            value={venueName}
            onChangeText={setVenueName}
            placeholder={fr ? 'Ex: Club Nox' : 'e.g. Club Nox'}
          />

          <NoxInput
            label={fr ? 'Adresse' : 'Address'}
            value={address}
            onChangeText={setAddress}
            placeholder={fr ? 'Ex: 123 Rue de la Nuit, Paris' : 'e.g. 123 Rue de la Nuit, Paris'}
          />

          <NoxInput
            label={fr ? 'Capacité max. (places)' : 'Max capacity (guests)'}
            value={maxCapacityStr}
            onChangeText={setMaxCapacityStr}
            placeholder={fr ? 'Ex: 350' : 'e.g. 350'}
            keyboardType="numeric"
          />
          <NoxText variant="secondary" style={styles.hint}>
            {fr
              ? 'Optionnel — plafond pour la création d’événements à ce lieu. Laisse vide pour ne pas limiter.'
              : 'Optional — caps event ticket capacity here. Leave empty for no ceiling.'}
          </NoxText>

          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            {fr ? 'Infos légales (pour les contrats)' : 'Legal info (for contracts)'}
          </NoxText>

          {legalEditable ? (
            <>
              <NoxText variant="secondary" style={styles.hint}>
                {fr
                  ? 'Complétez une seule fois. Ces champs ne pourront plus être modifiés après enregistrement.'
                  : 'Fill once. These fields cannot be edited after saving.'}
              </NoxText>
              <NoxInput
                label={fr ? 'Société' : 'Company'}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={fr ? 'Raison sociale' : 'Company name'}
              />
              <NoxInput
                label={fr ? 'Représentant légal' : 'Legal representative'}
                value={legalRepresentative}
                onChangeText={setLegalRepresentative}
                placeholder={fr ? 'Nom du représentant' : 'Representative name'}
              />
              <NoxInput
                label={fr ? 'Code postal' : 'Postal code'}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="75001"
                keyboardType="numeric"
              />
              <NoxInput
                label={fr ? 'Ville' : 'City'}
                value={city}
                onChangeText={setCity}
                placeholder="Paris"
              />
              <NoxInput
                label={fr ? 'Pays' : 'Country'}
                value={country}
                onChangeText={setCountry}
                placeholder="France"
              />
              <NoxInput
                label="SIRET"
                value={siret}
                onChangeText={setSiret}
                placeholder="123 456 789 00012"
                keyboardType="numeric"
              />
            </>
          ) : (
            <View style={styles.readOnlyLegal}>
              {companyName ? (
                <NoxText variant="form">
                  {fr ? 'Société' : 'Company'}: {companyName}
                </NoxText>
              ) : null}
              {legalRepresentative ? (
                <NoxText variant="form">
                  {fr ? 'Représentant' : 'Representative'}: {legalRepresentative}
                </NoxText>
              ) : null}
              {postalCode || city ? (
                <NoxText variant="form">
                  {postalCode} {city}
                </NoxText>
              ) : null}
              {country ? (
                <NoxText variant="form">
                  {fr ? 'Pays' : 'Country'}: {country}
                </NoxText>
              ) : null}
              {siret ? <NoxText variant="form">SIRET: {siret}</NoxText> : null}
              <NoxText variant="secondary" style={styles.readOnlyHint}>
                {fr ? 'Ces informations ne peuvent plus être modifiées.' : 'These details cannot be modified.'}
              </NoxText>
            </View>
          )}

          <NoxButton
            label={fr ? 'Enregistrer' : 'Save'}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
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
  form: {},
  legalBanner: {
    backgroundColor: primaryAlpha(0.12),
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: primaryAlpha(0.3),
  },
  legalBannerText: { lineHeight: 20 },
  hint: {
    fontSize: 12,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  sectionTitle: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  readOnlyLegal: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  readOnlyHint: {
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    fontSize: 12,
  },
  saveBtn: { marginTop: Spacing.md },
});
