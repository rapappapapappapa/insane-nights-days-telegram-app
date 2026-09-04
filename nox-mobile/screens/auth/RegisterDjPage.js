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
import RegisterRoleFormShell from './RegisterRoleFormShell';
import { registerRoleStyles as styles } from './RegisterRoleForm.styles';

export default function RegisterDjPage() {
  const { language, t } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    artistName: '',
    email: user?.email || '',
    city: '',
    phone: '',
    dateNaissance: '',
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
                  dateNaissance: dj.birthDate || prev.dateNaissance,
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
    // Validation spéciale pour la date de naissance
    if (field === 'dateNaissance') {
      // N'autoriser que les chiffres
      const cleaned = value.replace(/[^0-9]/g, '');
      
      // Formater automatiquement avec des slashes
      let formatted = cleaned;
      if (cleaned.length > 2) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
      }
      if (cleaned.length > 4) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
      }
      
      // Limiter à 10 caractères (jj/mm/aaaa)
      const limited = formatted.length > 10 ? formatted.slice(0, 10) : formatted;
      setFormData((prev) => ({ ...prev, [field]: limited }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const validateDate = (dateString) => {
    // Format attendu: jj/mm/aaaa
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateString)) {
      return false;
    }
    
    const [, day, month, year] = dateString.match(dateRegex);
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    
    // Vérifier les limites raisonnables
    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
      return false;
    }
    if (monthNum < 1 || monthNum > 12) {
      return false;
    }
    if (dayNum < 1 || dayNum > 31) {
      return false;
    }
    
    // Vérifier que la date est valide (ex: pas le 31 février)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return false;
    }
    
    // Vérifier que la personne a au moins 13 ans
    const today = new Date();
    const age = today.getFullYear() - yearNum;
    if (age < 13) {
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.pseudo || !formData.artistName || !formData.email || !formData.city || !formData.phone || !formData.dateNaissance) {
      showError(language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }

    // Validation de la date de naissance
    if (!validateDate(formData.dateNaissance)) {
      showError(language === 'fr' 
        ? 'La date de naissance doit être au format jj/mm/aaaa et vous devez avoir au moins 13 ans.'
        : 'Date of birth must be in dd/mm/yyyy format and you must be at least 13 years old.');
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
        pseudo: formData.pseudo,
        artistName: formData.artistName,
        email: formData.email,
        city: formData.city,
        phone: formData.phone,
        birthDate: formData.dateNaissance,
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
  const title = fr ? 'Compte DJ' : 'DJ Account';

  return (
    <RegisterRoleFormShell
      title={title}
      subtitle={fr ? 'Complète ton profil artiste pour rejoindre le réseau.' : 'Complete your artist profile to join the network.'}
      onBack={goBack}
      submitLabel={fr ? 'Créer mon compte DJ' : 'Create my DJ account'}
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
      <NoxInput
        label={fr ? 'Pseudo' : 'Username'}
        placeholder={fr ? 'Ton pseudo' : 'Your username'}
        autoCapitalize="none"
        value={formData.pseudo}
        onChangeText={(value) => handleChange('pseudo', value)}
        icon={<Ionicons name="person-outline" size={20} color={Colors.textTertiary} />}
      />
      <NoxInput
        label={fr ? 'Email pro' : 'Professional email'}
        placeholder={fr ? 'ton.email@example.com' : 'your.email@example.com'}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={formData.email}
        onChangeText={(value) => handleChange('email', value)}
        icon={<Ionicons name="mail-outline" size={20} color={Colors.textTertiary} />}
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
      <NoxInput
        label={fr ? 'Date de naissance' : 'Date of birth'}
        placeholder={fr ? 'jj/mm/aaaa' : 'dd/mm/yyyy'}
        keyboardType="numeric"
        maxLength={10}
        value={formData.dateNaissance}
        onChangeText={(value) => handleChange('dateNaissance', value)}
        editable={!loadingProfiles}
        icon={<Ionicons name="calendar-outline" size={20} color={Colors.textTertiary} />}
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

