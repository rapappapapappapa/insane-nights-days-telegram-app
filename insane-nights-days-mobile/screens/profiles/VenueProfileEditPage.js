/**
 * Page d'édition du profil Lieu (Venue)
 * Photo, bannière, nom, adresse
 */

import React, { useState, useEffect } from 'react';
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

export default function VenueProfileEditPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

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
        const res = await api.uploadVenueProfileImage(user.token, uri, 'banner');
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
        const res = await api.uploadVenueProfileImage(user.token, uri, 'profile');
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
      const payload = { venueName, address };
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
      showSuccess(language === 'fr' ? 'Profil enregistré' : 'Profile saved');
      await fetchProfile();
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const fr = language === 'fr';

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1744" />
          <Text style={styles.loadingText}>{fr ? 'Chargement...' : 'Loading...'}</Text>
        </View>
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{fr ? 'Profil non trouvé' : 'Profile not found'}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <StatusBar style="light" />
      <TouchableOpacity style={[styles.backBtn, { top: insets.top + 10 }]} onPress={goBack}>
        <Text style={styles.backBtnText}>← {fr ? 'Retour' : 'Back'}</Text>
      </TouchableOpacity>

      <View style={[styles.header, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.title}>{fr ? 'Profil Lieu' : 'Venue Profile'}</Text>

        {bannerImage ? (
          <TouchableOpacity style={styles.bannerWrap} onPress={() => pickImage('banner')} disabled={uploadingBanner} activeOpacity={0.9}>
            <Image source={{ uri: normalizeMediaUrl(bannerImage) }} style={styles.banner} />
            {uploadingBanner && (
              <View style={styles.overlayLoaderWrap}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.bannerPlaceholder} onPress={() => pickImage('banner')} disabled={uploadingBanner} activeOpacity={0.9}>
            <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.5)" />
            <Text style={styles.placeholderText}>{fr ? 'Ajouter une bannière' : 'Add banner'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.avatarWrap}>
          {profileImage ? (
            <TouchableOpacity onPress={() => pickImage('profile')} disabled={uploadingProfile} activeOpacity={0.9} style={styles.avatarTouchWrap}>
              <Image source={{ uri: normalizeMediaUrl(profileImage) }} style={styles.avatar} />
              {uploadingProfile && (
                <View style={styles.avatarLoaderWrap}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.avatarPlaceholder} onPress={() => pickImage('profile')} disabled={uploadingProfile} activeOpacity={0.9}>
              <Ionicons name="business" size={50} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.form}>
        {!(profile?.companyName || profile?.legalRepresentative || profile?.postalCode || profile?.city || profile?.country || profile?.siret) && (
          <View style={styles.legalBanner}>
            <Text style={styles.legalBannerText}>
              📋 {fr ? 'Complétez vos infos légales (société, SIRET, représentant) pour les contrats.' : 'Complete your legal info (company, SIRET, representative) for contracts.'}
            </Text>
          </View>
        )}
        <Text style={styles.label}>{fr ? 'Nom du lieu' : 'Venue name'}</Text>
        <TextInput
          style={styles.input}
          value={venueName}
          onChangeText={setVenueName}
          placeholder={fr ? 'Ex: Club Insane' : 'e.g. Club Insane'}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={styles.label}>{fr ? 'Adresse' : 'Address'}</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder={fr ? 'Ex: 123 Rue de la Nuit, Paris' : 'e.g. 123 Rue de la Nuit, Paris'}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={[styles.label, styles.legalSectionTitle]}>{fr ? 'Infos légales (pour les contrats)' : 'Legal info (for contracts)'}</Text>
        {!(profile?.companyName || profile?.legalRepresentative || profile?.postalCode || profile?.city || profile?.country || profile?.siret) ? (
          <>
            <Text style={styles.legalHint}>{fr ? 'Complétez une seule fois. Ces champs ne pourront plus être modifiés après enregistrement.' : 'Fill once. These fields cannot be edited after saving.'}</Text>
            <Text style={styles.label}>{fr ? 'Société' : 'Company'}</Text>
            <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder={fr ? 'Raison sociale' : 'Company name'} placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>{fr ? 'Représentant légal' : 'Legal representative'}</Text>
            <TextInput style={styles.input} value={legalRepresentative} onChangeText={setLegalRepresentative} placeholder={fr ? 'Nom du représentant' : 'Representative name'} placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>{fr ? 'Code postal' : 'Postal code'}</Text>
            <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="75001" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
            <Text style={styles.label}>{fr ? 'Ville' : 'City'}</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Paris" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>{fr ? 'Pays' : 'Country'}</Text>
            <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="France" placeholderTextColor="rgba(255,255,255,0.4)" />
            <Text style={styles.label}>SIRET</Text>
            <TextInput style={styles.input} value={siret} onChangeText={setSiret} placeholder="123 456 789 00012" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
          </>
        ) : (
          <View style={styles.readOnlyLegalWrap}>
            {companyName ? <Text style={styles.readOnlyLegalText}>{fr ? 'Société' : 'Company'}: {companyName}</Text> : null}
            {legalRepresentative ? <Text style={styles.readOnlyLegalText}>{fr ? 'Représentant' : 'Representative'}: {legalRepresentative}</Text> : null}
            {(postalCode || city) ? <Text style={styles.readOnlyLegalText}>{postalCode} {city}</Text> : null}
            {country ? <Text style={styles.readOnlyLegalText}>{fr ? 'Pays' : 'Country'}: {country}</Text> : null}
            {siret ? <Text style={styles.readOnlyLegalText}>SIRET: {siret}</Text> : null}
            <Text style={styles.readOnlyLegalHint}>{fr ? 'Ces informations ne peuvent plus être modifiées.' : 'These details cannot be modified.'}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{fr ? 'Enregistrer' : 'Save'}</Text>}
        </TouchableOpacity>
      </View>

      {toast.visible && <Toast message={toast.message} type={toast.type} onHide={hideToast} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
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
  label: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 16 },
  legalBanner: {
    backgroundColor: 'rgba(255,23,68,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  legalBannerText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  legalSectionTitle: { marginTop: 20 },
  legalHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 },
  readOnlyLegalWrap: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 16 },
  readOnlyLegalText: { color: '#fff', fontSize: 14, marginBottom: 4 },
  readOnlyLegalHint: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 8, fontStyle: 'italic' },
  saveBtn: { backgroundColor: '#FF1744', padding: 16, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
