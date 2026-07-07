import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxInput, NoxButton } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { GENRES, CITIES, ARTISTS, VENUES, EVENT_TYPES } from './mockData';

const STEPS = [
  'name',
  'photo',
  'genres',
  'cities',
  'artists',
  'venues',
  'events',
  'welcome',
];

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
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [genres, toggleGenre] = useToggleSet();
  const [cities, toggleCity] = useToggleSet();
  const [artists, toggleArtist] = useToggleSet();
  const [venues, toggleVenue] = useToggleSet();
  const [eventTypes, toggleEventType] = useToggleSet();

  const cardWidth = (width - Spacing.xl * 2 - Spacing.md * 2) / 3;
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      navigate('communityHome');
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const renderStep = () => {
    switch (current) {
      case 'name':
        return (
          <View style={styles.center}>
            <NoxText variant="title" style={styles.heading}>
              Quel est ton nom ?
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Ce nom est visible sur ton profil.
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
              Construis ton identité.
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Ajoute une photo de profil et une cover pour personnaliser ton espace artiste.
            </NoxText>
            <TouchableOpacity style={styles.avatarUpload} activeOpacity={0.85}>
              <Ionicons name="add" size={34} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.coverUpload} activeOpacity={0.85}>
              <Ionicons name="image-outline" size={26} color={primaryAlpha(0.6)} />
              <NoxText variant="secondary" style={{ marginTop: Spacing.sm }}>
                Ajouter une cover
              </NoxText>
            </TouchableOpacity>
          </View>
        );

      case 'genres':
        return (
          <>
            <NoxText variant="title" style={styles.heading}>
              Quels styles écoutes-tu ?
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Choisis tes genres préférés.
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
              Quelles scènes t'inspirent ?
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Sélectionne les villes que tu suis.
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
              Suis quelques artistes
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Nous personnaliserons ton fil.
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
              Suis des lieux et collectifs
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Retrouve leurs événements sur ton fil.
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
              Qu'est-ce qui te fait sortir ?
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Choisis les événements qui te ressemblent.
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
              Bienvenue dans NOX
            </NoxText>
            <NoxText variant="secondary" style={styles.sub}>
              Ton profil est prêt.
            </NoxText>
            <NoxText variant="description" style={styles.welcomeText}>
              Découvre les artistes, collectifs et événements sélectionnés pour toi.
            </NoxText>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header : retour + progression */}
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

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        {current === 'events' ? (
          <TouchableOpacity onPress={next} style={styles.skip}>
            <NoxText variant="secondary" style={styles.skipText}>
              Passer
            </NoxText>
          </TouchableOpacity>
        ) : null}
        <NoxButton
          label={isLast ? 'Entrer dans NOX' : 'Continuer'}
          onPress={next}
          disabled={current === 'name' && !name.trim()}
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
  },
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
  },
  welcomeIcon: { marginBottom: Spacing.lg },
  welcomeText: { textAlign: 'center', marginTop: Spacing.lg },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  skip: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { color: Colors.textTertiary },
});
