import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import PrestataireGenreAndAvailabilityFields, {
  DEFAULT_AVAILABLE_DAYS,
} from '../../components/PrestataireGenreAndAvailabilityFields';

export default function RegisterPrestatairePage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [phonePro, setPhonePro] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [prestationGenres, setPrestationGenres] = useState([]);
  const [availableDays, setAvailableDays] = useState(() => ({ ...DEFAULT_AVAILABLE_DAYS }));
  const [availableStatus, setAvailableStatus] = useState(true);
  const [customGenreInput, setCustomGenreInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addCustomGenre = () => {
    const t = customGenreInput.trim();
    if (!t) return;
    const low = t.toLowerCase();
    if (prestationGenres.some((g) => String(g).trim().toLowerCase() === low)) {
      setCustomGenreInput('');
      return;
    }
    setPrestationGenres([...prestationGenres, t]);
    setCustomGenreInput('');
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!businessName.trim() || !phonePro.trim()) {
      showError(
        language === 'fr'
          ? 'Nom d’activité et téléphone pro sont requis.'
          : 'Business name and professional phone are required.'
      );
      return;
    }
    if (prestationGenres.length === 0) {
      showError(
        language === 'fr'
          ? 'Ajoutez au moins un genre de prestation (photo, vidéo, VJ…).'
          : 'Add at least one service type (photo, video, VJ…).'
      );
      return;
    }
    if (!user?.token) {
      showError(language === 'fr' ? 'Token manquant.' : 'Missing token.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.createPrestataireProfile({
        token: user.token,
        businessName: businessName.trim(),
        phonePro: phonePro.trim(),
        prestationGenres,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        bio: bio.trim() || undefined,
        availableDays,
        availableStatus,
      });

      if (!response?.success) {
        showError(response?.message || (language === 'fr' ? 'Erreur lors de la création.' : 'Creation failed.'));
        return;
      }

      try {
        await api.switchProfile(user.token, 'PRESTATAIRE');
      } catch (e) {
        console.warn('[RegisterPrestataire] switchProfile:', e?.message ?? e);
      }
      updateUser({ activeProfileType: 'PRESTATAIRE' });

      try {
        const userResponse = await api.getCurrentUser(user.token);
        if (userResponse?.success && userResponse.user) {
          updateUser({
            activeProfileType: userResponse.user.activeProfileType || 'PRESTATAIRE',
            score: userResponse.user.score,
            level: userResponse.user.level,
          });
        }
      } catch (e) {
        console.warn('[RegisterPrestataire] getCurrentUser:', e?.message ?? e);
      }

      showSuccess(
        language === 'fr' ? 'Profil Prestataire créé !' : 'Service provider profile created!'
      );
      setTimeout(() => navigate('welcome'), 1200);
    } catch (error) {
      console.error('[RegisterPrestataire]', error);
      showError(error?.message || (language === 'fr' ? 'Erreur réseau.' : 'Network error.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title}>
          {language === 'fr' ? 'Compte Prestataire' : 'Service provider account'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'fr'
            ? 'Indiquez vos spécialités (plusieurs possibles) et vos disponibilités.'
            : 'List your specialties (multiple allowed) and your availability.'}
        </Text>

        <Text style={styles.label}>{language === 'fr' ? 'Nom d’activité' : 'Business name'}</Text>
        <TextInput
          style={styles.input}
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={language === 'fr' ? 'Ex. Studio Nord' : 'e.g. North Studio'}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <PrestataireGenreAndAvailabilityFields
          language={language}
          prestationGenres={prestationGenres}
          onChangePrestationGenres={setPrestationGenres}
          availableDays={availableDays}
          onChangeAvailableDays={setAvailableDays}
          availableStatus={availableStatus}
          onChangeAvailableStatus={setAvailableStatus}
          customGenreInput={customGenreInput}
          onChangeCustomGenreInput={setCustomGenreInput}
          onAddCustomGenre={addCustomGenre}
        />

        <Text style={styles.label}>{language === 'fr' ? 'Téléphone pro' : 'Business phone'}</Text>
        <TextInput
          style={styles.input}
          value={phonePro}
          onChangeText={setPhonePro}
          keyboardType="phone-pad"
          placeholder="+33…"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={styles.label}>{language === 'fr' ? 'Ville (optionnel)' : 'City (optional)'}</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={styles.label}>{language === 'fr' ? 'Pays (optionnel)' : 'Country (optional)'}</Text>
        <TextInput
          style={styles.input}
          value={country}
          onChangeText={setCountry}
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={styles.label}>{language === 'fr' ? 'Bio (optionnel)' : 'Bio (optional)'}</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          multiline
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {language === 'fr' ? 'Créer mon profil' : 'Create my profile'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: { paddingTop: 50, paddingHorizontal: 16 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8 },
  backButtonText: { color: Colors.primary, fontSize: 16 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  label: { color: Colors.textSecondary, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    color: Colors.text,
    fontSize: 16,
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: {
    marginTop: 28,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
