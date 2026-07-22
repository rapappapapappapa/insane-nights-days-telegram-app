import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { NoxText, NoxInput, NoxButton, NoxLieuxBottomNav } from '../../components/nox';
import { useLieuxEventDrafts } from '../../hooks/useLieuxEventDrafts';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

export default function LieuxCreateEventPage() {
  const { goBack, navigate } = useNavigation();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const fr = language === 'fr';

  const { saveDraft } = useLieuxEventDrafts();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(
        fr ? 'Titre requis' : 'Title required',
        fr ? 'Donne un nom à ton événement.' : 'Give your event a name.',
      );
      return;
    }
    setSaving(true);
    try {
      await saveDraft({ title, date, time, description });
      Alert.alert(
        fr ? 'Brouillon enregistré' : 'Draft saved',
        fr
          ? 'Ton brouillon est disponible dans Événements → Brouillons. La publication complète sera disponible prochainement.'
          : 'Your draft is available under Events → Drafts. Full publishing coming soon.',
        [
          {
            text: fr ? 'Voir les brouillons' : 'View drafts',
            onPress: () => navigate('lieuxEvents', { tab: 'drafts' }),
          },
          { text: 'OK', onPress: goBack },
        ],
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <NoxText variant="titleSecondary">{fr ? 'Créer un événement' : 'Create event'}</NoxText>
        <NoxText variant="secondary">
          {fr ? 'Enregistre un brouillon pour ton lieu.' : 'Save a draft for your venue.'}
        </NoxText>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
          <NoxText variant="secondary" style={styles.infoText}>
            {fr
              ? 'Les événements publiés passent par un organisateur. Ce formulaire enregistre un brouillon local en attendant la publication complète.'
              : 'Published events go through an organizer. This form saves a local draft until full publishing is available.'}
          </NoxText>
        </View>

        <NoxInput
          label={fr ? 'Nom de l’événement' : 'Event name'}
          value={title}
          onChangeText={setTitle}
          placeholder={fr ? 'Ex. Soirée NOX' : 'E.g. NOX Night'}
        />
        <NoxInput
          label={fr ? 'Date' : 'Date'}
          value={date}
          onChangeText={setDate}
          placeholder={fr ? 'JJ/MM/AAAA' : 'DD/MM/YYYY'}
        />
        <NoxInput
          label={fr ? 'Heure' : 'Time'}
          value={time}
          onChangeText={setTime}
          placeholder={fr ? '22:00' : '10:00 PM'}
        />
        <NoxInput
          label={fr ? 'Description' : 'Description'}
          value={description}
          onChangeText={setDescription}
          placeholder={fr ? 'Ambiance, capacité, infos pratiques…' : 'Vibe, capacity, practical info…'}
          multiline
          numberOfLines={4}
          inputStyle={styles.textArea}
        />

        <View style={styles.actions}>
          <NoxButton
            label={fr ? 'Enregistrer le brouillon' : 'Save draft'}
            onPress={handleSave}
            loading={saving}
          />
          <NoxButton label={fr ? 'Annuler' : 'Cancel'} variant="secondary" onPress={goBack} />
        </View>
      </ScrollView>

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 4,
  },
  form: { padding: Spacing.xl, paddingBottom: 160, gap: Spacing.lg },
  infoBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actions: { gap: Spacing.md, marginTop: Spacing.md },
});
