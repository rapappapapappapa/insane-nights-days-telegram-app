import React, { useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import PrestataireGenreAndAvailabilityFields, {
  DEFAULT_AVAILABLE_DAYS,
} from '../../components/PrestataireGenreAndAvailabilityFields';
import { NoxInput } from '../../components/nox';
import { useToast } from '../../hooks/useToast';
import { getPostAuthScreen } from '../../utils/noxRoleNavigation';
import { formatBirthDateFr, getRegisterRoleCopy } from '../../utils/registerFlow';
import RegisterRoleFormShell from './RegisterRoleFormShell';

export default function RegisterPrestatairePage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const roleCopy = getRegisterRoleCopy('registerPrestataire', language);
  const fr = language === 'fr';
  const title = roleCopy?.profileTitle || (fr ? 'Profil prestataire' : 'Provider profile');

  const accountPseudo = (user?.username || '').trim();
  const accountEmail = (user?.email || '').trim();
  const accountBirth = formatBirthDateFr(user?.birthDate);

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
  const scrollViewRef = useRef(null);

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
        fr
          ? 'Nom d’activité et téléphone pro sont requis.'
          : 'Business name and professional phone are required.'
      );
      return;
    }
    if (prestationGenres.length === 0) {
      showError(
        fr
          ? 'Ajoutez au moins un genre de prestation (photo, vidéo, VJ…).'
          : 'Add at least one service type (photo, video, VJ…).'
      );
      return;
    }
    if (!user?.token) {
      showError(fr ? 'Token manquant.' : 'Missing token.');
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
        showError(response?.message || (fr ? 'Erreur lors de la création.' : 'Creation failed.'));
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

      showSuccess(fr ? 'Profil Prestataire créé !' : 'Service provider profile created!');
      setTimeout(() => navigate(getPostAuthScreen('PRESTATAIRE')), 1200);
    } catch (error) {
      console.error('[RegisterPrestataire]', error);
      showError(error?.message || (fr ? 'Erreur réseau.' : 'Network error.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterRoleFormShell
      title={title}
      stepLabel={fr ? 'Étape 2 sur 2 — Profil' : 'Step 2 of 2 — Profile'}
      subtitle={
        fr
          ? 'Indique tes spécialités (plusieurs possibles) et tes disponibilités pour activer ton espace.'
          : 'List your specialties (multiple allowed) and availability to activate your space.'
      }
      accountSummary={{
        title: fr ? 'Compte NOX (déjà créé)' : 'NOX account (already created)',
        lines: [
          accountPseudo ? `${fr ? 'Pseudo' : 'Username'} · ${accountPseudo}` : null,
          accountEmail ? `Email · ${accountEmail}` : null,
          accountBirth ? `${fr ? 'Naissance' : 'Birth'} · ${accountBirth}` : null,
        ].filter(Boolean),
      }}
      onBack={goBack}
      submitLabel={fr ? 'Activer mon profil prestataire' : 'Activate my provider profile'}
      onSubmit={handleSubmit}
      loading={loading}
      scrollRef={scrollViewRef}
      toast={toast}
      hideToast={hideToast}
    >
      <NoxInput
        label={fr ? 'Nom d’activité' : 'Business name'}
        placeholder={fr ? 'Ex. Studio Nord' : 'e.g. North Studio'}
        value={businessName}
        onChangeText={setBusinessName}
        icon={<Ionicons name="briefcase-outline" size={20} color={Colors.textTertiary} />}
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

      <NoxInput
        label={fr ? 'Téléphone pro' : 'Business phone'}
        placeholder="+33…"
        keyboardType="phone-pad"
        value={phonePro}
        onChangeText={setPhonePro}
        icon={<Ionicons name="call-outline" size={20} color={Colors.textTertiary} />}
      />
      <NoxInput
        label={fr ? 'Ville (optionnel)' : 'City (optional)'}
        value={city}
        onChangeText={setCity}
        placeholder={fr ? 'Ta ville' : 'Your city'}
      />
      <NoxInput
        label={fr ? 'Pays (optionnel)' : 'Country (optional)'}
        value={country}
        onChangeText={setCountry}
        placeholder="France"
      />
      <NoxInput
        label={fr ? 'Bio (optionnel)' : 'Bio (optional)'}
        value={bio}
        onChangeText={setBio}
        multiline
        inputStyle={{ minHeight: 90, textAlignVertical: 'top' }}
        onFocus={() => {
          if (Platform.OS === 'android') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
      />
    </RegisterRoleFormShell>
  );
}
