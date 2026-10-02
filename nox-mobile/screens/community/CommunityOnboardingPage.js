import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { NoxText, NoxInput, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { GENRES, CITIES, EVENT_TYPES } from './mockData';

const BASE_STEPS = ['photo', 'genres', 'cities', 'artists', 'venues', 'events', 'welcome'];
const SUGGEST_LIMIT = 18;

function useToggleSet() {
  const [set, setSet] = useState([]);
  const toggle = (v) =>
    setSet((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  return [set, toggle];
}

function SelectableCard({ label, selected, onPress, width, imageUri }) {
  return (
    <TouchableOpacity
      style={[styles.card, { width }, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImageFill} />
        ) : (
          <Ionicons name="musical-notes-outline" size={22} color={primaryAlpha(0.5)} />
        )}
        {selected ? (
          <View style={styles.cardCheck}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : null}
      </View>
      <NoxText variant="secondary" style={styles.cardLabel} numberOfLines={1}>
        {label}
      </NoxText>
    </TouchableOpacity>
  );
}

function SelectableRow({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <NoxText variant="form">{label}</NoxText>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityOnboardingPage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [profilePseudo, setProfilePseudo] = useState(
    (user?.pseudo || user?.username || '').trim(),
  );
  const [needsNameStep, setNeedsNameStep] = useState(!(user?.pseudo || user?.username));
  const [bootLoading, setBootLoading] = useState(true);
  const [suggestLoading, setSuggestLoading] = useState(true);
  const [djSuggestions, setDjSuggestions] = useState([]);
  const [venueSuggestions, setVenueSuggestions] = useState([]);

  const [step, setStep] = useState(0);
  const [name, setName] = useState((user?.pseudo || user?.username || '').trim());
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [genres, toggleGenre] = useToggleSet();
  const [cities, toggleCity] = useToggleSet();
  const [artists, toggleArtist] = useToggleSet();
  const [venues, toggleVenue] = useToggleSet();
  const [eventTypes, toggleEventType] = useToggleSet();

  const fr = language === 'fr';
  const cardWidth = (width - Spacing.xl * 2 - Spacing.md * 2) / 3;

  const steps = useMemo(
    () => (needsNameStep ? ['name', ...BASE_STEPS] : BASE_STEPS),
    [needsNameStep],
  );
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.token) {
        setBootLoading(false);
        return;
      }
      try {
        const res = await api.getCommunityProfile(user.token);
        if (cancelled) return;
        const pseudo = (res?.profile?.pseudo || user?.pseudo || user?.username || '').trim();
        if (pseudo) {
          setProfilePseudo(pseudo);
          setName(pseudo);
          setNeedsNameStep(false);
          setStep(0);
        } else {
          setNeedsNameStep(true);
        }
        if (res?.profile?.profileImage) setProfileImage(res.profile.profileImage);
        if (res?.profile?.bannerImage) setBannerImage(res.profile.bannerImage);
      } catch {
        const fallback = (user?.pseudo || user?.username || '').trim();
        if (fallback) {
          setProfilePseudo(fallback);
          setName(fallback);
          setNeedsNameStep(false);
        }
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, user?.pseudo, user?.username]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSuggestLoading(true);
      try {
        const [djsRes, venuesRes] = await Promise.all([
          api.getDjs(),
          user?.token ? api.getVenues(user.token).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;

        const djs = Array.isArray(djsRes?.djs) ? djsRes.djs : [];
        setDjSuggestions(
          djs
            .filter((d) => d?.id && (d.artistName || d.name))
            .slice(0, SUGGEST_LIMIT)
            .map((d) => ({
              id: String(d.id),
              label: d.artistName || d.name,
              imageUri: d.profileImage ? normalizeMediaUrl(d.profileImage) : null,
            })),
        );

        const venuesList = Array.isArray(venuesRes?.venues) ? venuesRes.venues : [];
        setVenueSuggestions(
          venuesList
            .filter((v) => v?.id && (v.venueName || v.name))
            .slice(0, SUGGEST_LIMIT)
            .map((v) => ({
              id: String(v.id),
              label: v.venueName || v.name,
              imageUri: v.profileImage ? normalizeMediaUrl(v.profileImage) : null,
            })),
        );
      } catch {
        if (!cancelled) {
          setDjSuggestions([]);
          setVenueSuggestions([]);
        }
      } finally {
        if (!cancelled) setSuggestLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  const pickImage = async (type) => {
    if (!user?.token) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'banner' ? [3, 1] : [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploadingPhoto(true);
    try {
      const res = await api.uploadCommunityProfileImage(user.token, result.assets[0].uri, type);
      if (type === 'banner') setBannerImage(res.bannerImage);
      else setProfileImage(res.profileImage);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const selectedArtistLabels = useMemo(
    () =>
      artists
        .map((id) => djSuggestions.find((d) => d.id === id)?.label)
        .filter(Boolean),
    [artists, djSuggestions],
  );

  const selectedVenueLabels = useMemo(
    () =>
      venues
        .map((id) => venueSuggestions.find((v) => v.id === id)?.label)
        .filter(Boolean),
    [venues, venueSuggestions],
  );

  const saveProfile = useCallback(async () => {
    if (!user?.token || saving) return false;
    setSaving(true);
    try {
      const genreParts = [...genres, ...eventTypes].filter(Boolean);
      const preferenceNote = [
        cities.length ? `Villes: ${cities.join(', ')}` : null,
        selectedArtistLabels.length ? `Artistes: ${selectedArtistLabels.join(', ')}` : null,
        selectedVenueLabels.length ? `Lieux: ${selectedVenueLabels.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const genresPayload = [genreParts.join(', '), preferenceNote].filter(Boolean).join(' · ');
      const pseudoToSave = (name.trim() || profilePseudo || user?.username || '').trim();

      await api.updateCommunityProfile(user.token, {
        pseudo: pseudoToSave || null,
        genres: genresPayload || null,
      });

      await Promise.allSettled([
        ...artists.map((djId) => api.followDj(user.token, djId).catch(() => null)),
        ...venues.map((venueId) => api.followVenue(user.token, venueId).catch(() => null)),
      ]);

      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    user?.token,
    user?.username,
    saving,
    genres,
    eventTypes,
    cities,
    selectedArtistLabels,
    selectedVenueLabels,
    name,
    profilePseudo,
    artists,
    venues,
  ]);

  const next = async () => {
    if (isLast) {
      const ok = await saveProfile();
      if (ok) navigate('communityHome');
      return;
    }
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const canSkip =
    current === 'artists' ||
    current === 'venues' ||
    current === 'events' ||
    current === 'photo' ||
    current === 'cities';

  const renderStep = () => {
    switch (current) {
      case 'name':
        return (
          <View style={styles.center}>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Quel est ton pseudo ?' : 'What is your username?'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr
                ? 'Uniquement si tu n’en as pas encore défini à l’inscription.'
                : 'Only if you haven’t set one at signup yet.'}
            </NoxText>
            <NoxInput
              placeholder="Ex : NOXKID"
              value={name}
              onChangeText={setName}
              containerStyle={{ marginTop: Spacing.xl, width: '100%' }}
            />
          </View>
        );

      case 'photo':
        return (
          <View style={styles.center}>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Construis ton identité.' : 'Build your identity.'}
            </NoxText>
            {profilePseudo ? (
              <NoxText variant="secondary" style={styles.sub}>
                {fr ? `Salut ${profilePseudo} — ajoute une photo.` : `Hey ${profilePseudo} — add a photo.`}
              </NoxText>
            ) : (
              <NoxText variant="secondary" style={styles.sub}>
                {fr
                  ? 'Ajoute une photo de profil et une cover pour personnaliser ton espace.'
                  : 'Add a profile photo and cover to personalize your space.'}
              </NoxText>
            )}
            <TouchableOpacity
              style={styles.avatarUpload}
              activeOpacity={0.85}
              onPress={() => pickImage('profile')}
              disabled={uploadingPhoto}
            >
              {profileImage ? (
                <Image source={{ uri: normalizeMediaUrl(profileImage) }} style={styles.avatarImage} />
              ) : uploadingPhoto ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Ionicons name="add" size={34} color={Colors.primary} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.coverUpload}
              activeOpacity={0.85}
              onPress={() => pickImage('banner')}
              disabled={uploadingPhoto}
            >
              {bannerImage ? (
                <Image source={{ uri: normalizeMediaUrl(bannerImage) }} style={styles.coverImage} />
              ) : (
                <>
                  <Ionicons name="image-outline" size={26} color={primaryAlpha(0.6)} />
                  <NoxText variant="secondary" style={{ marginTop: Spacing.sm }}>
                    {fr ? 'Ajouter une cover' : 'Add a cover'}
                  </NoxText>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'genres':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Quels styles écoutes-tu ?' : 'What styles do you listen to?'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr ? 'Choisis tes genres préférés.' : 'Choose your favorite genres.'}
            </NoxText>
            <View style={styles.grid}>
              {GENRES.map((g) => (
                <SelectableCard
                  key={g}
                  label={g}
                  width={cardWidth}
                  selected={genres.includes(g)}
                  onPress={() => toggleGenre(g)}
                />
              ))}
            </View>
          </>
        );

      case 'cities':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? "Quelles scènes t'inspirent ?" : 'Which scenes inspire you?'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr ? 'Sélectionne les villes que tu suis.' : 'Select cities you follow.'}
            </NoxText>
            <View style={styles.list}>
              {CITIES.map((c) => (
                <SelectableRow
                  key={c}
                  label={c}
                  selected={cities.includes(c)}
                  onPress={() => toggleCity(c)}
                />
              ))}
            </View>
          </>
        );

      case 'artists':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Suis quelques artistes' : 'Follow some artists'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr
                ? 'Artistes réellement présents sur NOX.'
                : 'Artists actually on NOX.'}
            </NoxText>
            {suggestLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : djSuggestions.length === 0 ? (
              <NoxText variant="secondary" style={[styles.sub, { marginTop: Spacing.xl }]}>
                {fr
                  ? 'Aucun artiste à suggérer pour le moment — tu pourras en suivre plus tard.'
                  : 'No artists to suggest yet — you can follow some later.'}
              </NoxText>
            ) : (
              <View style={styles.grid}>
                {djSuggestions.map((a) => (
                  <SelectableCard
                    key={a.id}
                    label={a.label}
                    imageUri={a.imageUri}
                    width={cardWidth}
                    selected={artists.includes(a.id)}
                    onPress={() => toggleArtist(a.id)}
                  />
                ))}
              </View>
            )}
          </>
        );

      case 'venues':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Suis des lieux' : 'Follow venues'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr
                ? 'Lieux inscrits sur la plateforme.'
                : 'Venues registered on the platform.'}
            </NoxText>
            {suggestLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.xl }} />
            ) : venueSuggestions.length === 0 ? (
              <NoxText variant="secondary" style={[styles.sub, { marginTop: Spacing.xl }]}>
                {fr
                  ? 'Aucun lieu à suggérer pour le moment — passe cette étape.'
                  : 'No venues to suggest yet — you can skip this step.'}
              </NoxText>
            ) : (
              <View style={styles.grid}>
                {venueSuggestions.map((v) => (
                  <SelectableCard
                    key={v.id}
                    label={v.label}
                    imageUri={v.imageUri}
                    width={cardWidth}
                    selected={venues.includes(v.id)}
                    onPress={() => toggleVenue(v.id)}
                  />
                ))}
              </View>
            )}
          </>
        );

      case 'events':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? "Qu'est-ce qui te fait sortir ?" : 'What gets you going out?'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr ? 'Choisis les événements qui te ressemblent.' : 'Pick events that match you.'}
            </NoxText>
            <View style={styles.list}>
              {EVENT_TYPES.map((e) => (
                <SelectableRow
                  key={e}
                  label={e}
                  selected={eventTypes.includes(e)}
                  onPress={() => toggleEventType(e)}
                />
              ))}
            </View>
          </>
        );

      case 'welcome':
      default:
        return (
          <View style={styles.center}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="checkmark-circle" size={64} color={Colors.primary} />
            </View>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Bienvenue dans NOX' : 'Welcome to NOX'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr ? 'Ton profil est prêt.' : 'Your profile is ready.'}
            </NoxText>
            <NoxText variant="description" style={styles.welcomeText}>
              {fr
                ? 'Découvre les artistes, collectifs et événements sélectionnés pour toi.'
                : 'Discover artists, collectives and events picked for you.'}
            </NoxText>
          </View>
        );
    }
  };

  if (bootLoading) {
    return (
      <View style={[styles.container, styles.centeredBoot]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={back} hitSlop={12} style={styles.backBtn} disabled={step === 0}>
          {step > 0 ? <Ionicons name="chevron-back" size={24} color={Colors.text} /> : null}
        </TouchableOpacity>
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {canSkip ? (
          <TouchableOpacity onPress={next} style={styles.skip}>
            <NoxText variant="secondary" style={styles.skipText}>
              {fr ? 'Passer' : 'Skip'}
            </NoxText>
          </TouchableOpacity>
        ) : null}
        <NoxButton
          label={isLast ? (fr ? 'Entrer dans NOX' : 'Enter NOX') : fr ? 'Continuer' : 'Continue'}
          onPress={next}
          disabled={(current === 'name' && !name.trim()) || saving}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centeredBoot: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.borderSubtle,
  },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    flexGrow: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { textAlign: 'center' },
  sub: { textAlign: 'center', marginTop: Spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  card: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  cardSelected: { borderColor: Colors.primary },
  cardImage: {
    height: 76,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardImageFill: { width: '100%', height: '100%' },
  cardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { textAlign: 'center', paddingVertical: Spacing.sm, paddingHorizontal: 4 },
  list: { marginTop: Spacing.xl, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  avatarUpload: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: primaryAlpha(0.4),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxxl,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  coverUpload: {
    width: '100%',
    height: 110,
    borderRadius: Radius.card,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  welcomeIcon: { marginBottom: Spacing.lg },
  welcomeText: { textAlign: 'center', marginTop: Spacing.lg },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  skip: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { color: Colors.textTertiary },
});
