import React, { useState, useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import CityAutocomplete from '../../components/CityAutocomplete';
import { NoxInput, NoxText } from '../../components/nox';
import { useToast } from '../../hooks/useToast';
import { getPostAuthScreen } from '../../utils/noxRoleNavigation';
import { formatBirthDateFr, getRegisterRoleCopy } from '../../utils/registerFlow';
import RegisterRoleFormShell from './RegisterRoleFormShell';
import { registerRoleStyles as styles } from './RegisterRoleForm.styles';

export default function RegisterDjPage() {
  const { language, t } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const roleCopy = getRegisterRoleCopy('registerDj', language);
  const accountPseudo = (user?.username || '').trim();
  const accountEmail = (user?.email || '').trim();
  const accountBirth = formatBirthDateFr(user?.birthDate);

  const [formData, setFormData] = useState({
    artistName: '',
    city: '',
    phone: '',
    legalName: '',
    address: '',
    postalCode: '',
    country: '',
    siret: '',
    vatNumber: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const scrollViewRef = useRef(null);

  // Charger les profils existants pour pré-remplir les données
  useEffect(() => {
    const loadExistingProfiles = async () => {
      if (!user?.token) {
        setLoadingProfiles(false);
        return;
      }

      try {
        const profilesResponse = await api.getUserProfiles(user.token);
        if (profilesResponse && profilesResponse.success && profilesResponse.profiles) {
          // Récupérer les données depuis un profil DJ existant s'il existe
          if (profilesResponse.profiles.dj && profilesResponse.profiles.dj.length > 0) {
            const djProfile = profilesResponse.profiles.dj[0];
            // Récupérer les détails complets du profil DJ
            try {
              const djDetailsResponse = await api.getDjProfile(user.token);
              if (djDetailsResponse && djDetailsResponse.success && djDetailsResponse.dj) {
                const dj = djDetailsResponse.dj;
                setFormData(prev => ({
                  ...prev,
                  artistName: dj.artistName || prev.artistName,
                  city: dj.city || prev.city,
                  phone: dj.phone || prev.phone,
                }));
              }
            } catch (djError) {
              console.error('Erreur récupération détails DJ:', djError);
              // Si on ne peut pas récupérer les détails, utiliser au moins les données de base
              setFormData(prev => ({
                ...prev,
                artistName: djProfile.artistName || prev.artistName,
                city: djProfile.city || prev.city,
              }));
            }
          }
        }
      } catch (error) {
        console.error('Erreur chargement profils existants:', error);
        // On continue même en cas d'erreur
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadExistingProfiles();
  }, [user?.token]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (loading) return;

    const pseudo = accountPseudo;
    const email = accountEmail;
    const dateNaissance = accountBirth;

    if (!pseudo || !email || !dateNaissance) {
      showError(
        language === 'fr'
          ? 'Compte incomplet. Reviens à l’inscription ou reconnecte-toi.'
          : 'Incomplete account. Go back to sign-up or log in again.',
      );
      return;
    }

    if (!formData.artistName || !formData.city || !formData.phone) {
      showError(language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        showError(language === 'fr'
          ? 'Vous devez être connecté pour créer un profil.'
          : 'You must be logged in to create a profile.');
        setLoading(false);
        return;
      }

      if (!user?.token) {
        showError(language === 'fr'
          ? 'Token d\'authentification manquant. Veuillez vous reconnecter.'
          : 'Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await api.createDjProfile({
        token: user.token,
        pseudo,
        artistName: formData.artistName,
        email,
        city: formData.city,
        phone: formData.phone,
        birthDate: dateNaissance,
        legalName: formData.legalName?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        postalCode: formData.postalCode?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        siret: formData.siret?.trim() || undefined,
        vatNumber: formData.vatNumber?.trim() || undefined,
      });

      if (!response) {
        showError(language === 'fr'
          ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
          : 'Unable to reach server. Check your connection.');
        setLoading(false);
        return;
      }

      if (!response.success) {
        showError(response.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
        setLoading(false);
        return;
      }

      // Basculer automatiquement vers le profil DJ créé
      try {
        const switchResponse = await api.switchProfile(user.token, 'DJ');
        if (switchResponse && switchResponse.success) {
          updateUser({ activeProfileType: 'DJ' });
        }
      } catch (switchError) {
        console.error('Erreur bascule profil:', switchError);
        // On continue quand même, le profil est créé
      }

      // Succès !
      showSuccess(language === 'fr'
        ? 'Profil DJ créé avec succès !'
        : 'DJ profile created successfully!');
      setTimeout(() => navigate(getPostAuthScreen('DJ')), 1500);
    } catch (error) {
      console.error('Erreur création profil DJ:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
    } finally {
      setLoading(false);
    }
  };

  const fr = language === 'fr';
  const title = roleCopy?.profileTitle || (fr ? 'Profil artiste' : 'Artist profile');

  return (
    <RegisterRoleFormShell
      title={title}
      stepLabel={fr ? 'Étape 2 sur 2 — Profil' : 'Step 2 of 2 — Profile'}
      subtitle={
        fr
          ? 'Ton compte est prêt. Ajoute les infos artiste pour activer ton espace DJ.'
          : 'Your account is ready. Add artist details to activate your DJ space.'
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
      submitLabel={fr ? 'Activer mon profil artiste' : 'Activate my artist profile'}
      onSubmit={handleSubmit}
      loading={loading}
      scrollRef={scrollViewRef}
      toast={toast}
      hideToast={hideToast}
    >
      <NoxInput
        label={fr ? 'Nom d’artiste' : 'Artist name'}
        placeholder={fr ? 'Ton nom d’artiste' : 'Your artist name'}
        autoCapitalize="words"
        value={formData.artistName}
        onChangeText={(value) => handleChange('artistName', value)}
        editable={!loadingProfiles}
        icon={<Ionicons name="musical-notes-outline" size={20} color={Colors.textTertiary} />}
      />
      <CityAutocomplete
        label={fr ? 'Ville' : 'City'}
        value={formData.city}
        onChangeText={(value) => handleChange('city', value)}
        placeholder={fr ? 'Tape le nom de ta ville…' : 'Type your city name…'}
      />
      <NoxInput
        label={fr ? 'Téléphone' : 'Phone'}
        placeholder={fr ? '06 12 34 56 78' : '+33 6 12 34 56 78'}
        keyboardType="phone-pad"
        value={formData.phone}
        onChangeText={(value) => handleChange('phone', value)}
        editable={!loadingProfiles}
        icon={<Ionicons name="call-outline" size={20} color={Colors.textTertiary} />}
        onFocus={() => {
          if (Platform.OS === 'android') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
      />

      <View style={styles.legalBlock}>
        <NoxText variant="form" style={styles.legalTitle}>
          {fr ? 'Infos légales (optionnel)' : 'Legal info (optional)'}
        </NoxText>
        <NoxText variant="secondary" style={styles.hint}>
          {fr ? 'Pour pré-remplir tes contrats.' : 'Used to pre-fill your contracts.'}
        </NoxText>
      </View>
      <NoxInput
        label={fr ? 'Nom légal' : 'Legal name'}
        placeholder={fr ? 'Nom civil complet' : 'Full legal name'}
        value={formData.legalName}
        onChangeText={(value) => handleChange('legalName', value)}
      />
      <NoxInput
        label={fr ? 'Adresse' : 'Address'}
        placeholder={fr ? 'Adresse complète' : 'Full address'}
        value={formData.address}
        onChangeText={(value) => handleChange('address', value)}
      />
      <NoxInput
        label={fr ? 'Code postal' : 'Postal code'}
        placeholder="75001"
        keyboardType="numeric"
        value={formData.postalCode}
        onChangeText={(value) => handleChange('postalCode', value)}
      />
      <NoxInput
        label={fr ? 'Pays' : 'Country'}
        placeholder="France"
        value={formData.country}
        onChangeText={(value) => handleChange('country', value)}
      />
      <NoxInput
        label="SIRET"
        placeholder="123 456 789 00012"
        keyboardType="numeric"
        value={formData.siret}
        onChangeText={(value) => handleChange('siret', value)}
      />
      <NoxInput
        label={fr ? 'N° TVA' : 'VAT number'}
        placeholder="FR12345678901"
        value={formData.vatNumber}
        onChangeText={(value) => handleChange('vatNumber', value)}
      />
    </RegisterRoleFormShell>
  );
}

