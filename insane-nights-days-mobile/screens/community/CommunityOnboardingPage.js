import React, { useState } from 'react';
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
import { GENRES, CITIES, ARTISTS, VENUES, EVENT_TYPES } from './mockData';

const STEPS = ['name', 'photo', 'genres', 'cities', 'artists', 'venues', 'events', 'welcome'];

function useToggleSet() {
  const [set, setSet] = useState([]);
  const toggle = (v) =>
    setSet((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  return [set, toggle];
}

function SelectableCard({ label, selected, onPress, width }) {
  return (
    <TouchableOpacity
      style={[styles.card, { width }, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardImage}>
        <Ionicons name="musical-notes-outline" size={22} color={primaryAlpha(0.5)} />
        {selected ? (
          <View style={styles.cardCheck}>
            <Ionicons name="checkmark" size={14} color="#000" />
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
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
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
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

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

  const saveProfile = async () => {
    if (!user?.token || saving) return false;
    setSaving(true);
    try {
      const genreParts = [...genres, ...eventTypes].filter(Boolean);
      const preferenceNote = [
        cities.length ? `Villes: ${cities.join(', ')}` : null,
        artists.length ? `Artistes: ${artists.join(', ')}` : null,
        venues.length ? `Lieux: ${venues.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const genresPayload = [genreParts.join(', '), preferenceNote].filter(Boolean).join(' · ');

      await api.updateCommunityProfile(user.token, {
        pseudo: name.trim(),
        genres: genresPayload || null,
      });
      return true;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (isLast) {
      const ok = await saveProfile();
      if (ok) navigate('communityHome');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const renderStep = () => {
    switch (current) {
      case 'name':
        return (
          <View style={styles.center}>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Quel est ton nom ?' : 'What is your name?'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr ? 'Ce nom est visible sur ton profil.' : 'This name is visible on your profile.'}
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
            <NoxText variant="secondary" style={styles.sub}>
              {fr
                ? 'Ajoute une photo de profil et une cover pour personnaliser ton espace.'
                : 'Add a profile photo and cover to personalize your space.'}
            </NoxText>
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
              {fr ? 'Quelles scènes t\'inspirent ?' : 'Which scenes inspire you?'}
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
              {fr ? 'Nous personnaliserons ton fil.' : 'We will personalize your feed.'}
            </NoxText>
            <View style={styles.grid}>
              {ARTISTS.map((a) => (
                <SelectableCard
                  key={a}
                  label={a}
                  width={cardWidth}
                  selected={artists.includes(a)}
                  onPress={() => toggleArtist(a)}
                />
              ))}
            </View>
          </>
        );

      case 'venues':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Suis des lieux et collectifs' : 'Follow venues and collectives'}
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              {fr ? 'Retrouve leurs événements sur ton fil.' : 'Find their events on your feed.'}
            </NoxText>
            <View style={styles.grid}>
              {VENUES.map((v) => (
                <SelectableCard
                  key={v}
                  label={v}
                  width={cardWidth}
                  selected={venues.includes(v)}
                  onPress={() => toggleVenue(v)}
                />
              ))}
            </View>
          </>
        );

      case 'events':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              {fr ? 'Qu\'est-ce qui te fait sortir ?' : 'What gets you going out?'}
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

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={back} hitSlop={12} style={styles.backBtn} disabled={step === 0}>
          {step > 0 ? <Ionicons name="chevron-back" size={24} color={Colors.text} /> : null}
        </TouchableOpacity>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
          ))}
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {current === 'events' ? (
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
  },
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
