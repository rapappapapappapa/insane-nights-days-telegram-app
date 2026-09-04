import React, { useState, useEffect, useRef } from 'react';
import { Modal, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { NoxInput, NoxText } from '../../components/nox';
import { useToast } from '../../hooks/useToast';
import { getPostAuthScreen } from '../../utils/noxRoleNavigation';
import RegisterRoleFormShell from './RegisterRoleFormShell';
import { registerRoleStyles as styles } from './RegisterRoleForm.styles';

export default function RegisterBookerPage() {
  const { language, t } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    nom: '',
    prenom: '',
    email: user?.email || '',
    phonePro: '',
    bookerType: '',
    companyName: '',
    address: '',
    postalCode: '',
    city: '',
    country: '',
    siret: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showBookerTypeModal, setShowBookerTypeModal] = useState(false);
  const scrollViewRef = useRef(null);

  // Types d'organisateurs disponibles
  const bookerTypes = [
    { value: 'Indépendant', label: language === 'fr' ? 'Indépendant' : 'Independent' },
    { value: 'Agence', label: language === 'fr' ? 'Agence' : 'Agency' },
    { value: 'Collectif', label: language === 'fr' ? 'Collectif' : 'Collective' },
    { value: 'Label', label: language === 'fr' ? 'Label' : 'Label' },
    { value: 'Promoteur', label: language === 'fr' ? 'Promoteur' : 'Promoter' },
    { value: 'Autre', label: language === 'fr' ? 'Autre' : 'Other' },
  ];

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
          // Récupérer le nom et prénom depuis le profil Community s'il existe
          if (profilesResponse.profiles.community && profilesResponse.profiles.community.length > 0) {
            const communityProfile = profilesResponse.profiles.community[0];
            setFormData(prev => ({
              ...prev,
              nom: communityProfile.nom || prev.nom,
              prenom: communityProfile.prenom || prev.prenom,
            }));
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

    // Validation
    if (!formData.pseudo || !formData.nom || !formData.prenom || !formData.email || !formData.phonePro || !formData.bookerType) {
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

      const response = await api.createBookerProfile({
        token: user.token,
        pseudo: formData.pseudo,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        phonePro: formData.phonePro,
        bookerType: formData.bookerType,
        companyName: formData.companyName?.trim() || undefined,
        address: formData.address?.trim() || undefined,
        postalCode: formData.postalCode?.trim() || undefined,
        city: formData.city?.trim() || undefined,
        country: formData.country?.trim() || undefined,
        siret: formData.siret?.trim() || undefined,
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

      // Basculer automatiquement vers le profil BOOKER créé
      try {
        const switchResponse = await api.switchProfile(user.token, 'BOOKER');
        if (switchResponse && switchResponse.success) {
          // Mettre à jour le contexte utilisateur
          updateUser({ activeProfileType: 'BOOKER' });
        } else {
          // Si le switch échoue, forcer la mise à jour quand même
          updateUser({ activeProfileType: 'BOOKER' });
        }
      } catch (switchError) {
        console.error('Erreur bascule profil:', switchError);
        // Forcer la mise à jour du contexte même en cas d'erreur
        updateUser({ activeProfileType: 'BOOKER' });
      }

      // Recharger les données utilisateur pour s'assurer que tout est à jour
      try {
        const userResponse = await api.getCurrentUser(user.token);
        if (userResponse && userResponse.success && userResponse.user) {
          updateUser({
            activeProfileType: userResponse.user.activeProfileType || 'BOOKER',
            score: userResponse.user.score,
            level: userResponse.user.level,
          });
        }
      } catch (userError) {
        console.error('Erreur rechargement données utilisateur:', userError);
      }

      // Succès !
      showSuccess(language === 'fr'
        ? 'Profil Organisateur créé avec succès !'
        : 'Organizer profile created successfully!');
      setTimeout(() => navigate(getPostAuthScreen('BOOKER')), 1500);
    } catch (error) {
      console.error('Erreur création profil Organisateur:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
    } finally {
      setLoading(false);
    }
  };

  const fr = language === 'fr';
  const title = fr ? 'Compte Organisateur' : 'Organizer Account';

  return (
    <RegisterRoleFormShell
      title={title}
      subtitle={fr ? 'Crée ton profil orga pour lancer tes events.' : 'Create your organizer profile to run events.'}
      onBack={goBack}
      submitLabel={fr ? 'Créer mon compte' : 'Create my account'}
      onSubmit={handleSubmit}
      loading={loading}
      scrollRef={scrollViewRef}
      toast={toast}
      hideToast={hideToast}
      extra={
        <Modal
          visible={showBookerTypeModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBookerTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <NoxText variant="titleSecondary">
                  {fr ? 'Type d’organisateur' : 'Organizer type'}
                </NoxText>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setShowBookerTypeModal(false)}
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={18} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalOptions}>
                {bookerTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.modalOption,
                      formData.bookerType === type.value && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      handleChange('bookerType', type.value);
                      setShowBookerTypeModal(false);
                    }}
                  >
                    <NoxText variant="form">{type.label}</NoxText>
                    {formData.bookerType === type.value ? (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      }
    >
      <NoxInput
        label={fr ? 'Nom' : 'Last name'}
        placeholder={fr ? 'Ton nom' : 'Your last name'}
        autoCapitalize="words"
        value={formData.nom}
        onChangeText={(value) => handleChange('nom', value)}
        editable={!loadingProfiles}
        icon={<Ionicons name="person-outline" size={20} color={Colors.textTertiary} />}
      />
      <NoxInput
        label={fr ? 'Prénom' : 'First name'}
        placeholder={fr ? 'Ton prénom' : 'Your first name'}
        autoCapitalize="words"
        value={formData.prenom}
        onChangeText={(value) => handleChange('prenom', value)}
        editable={!loadingProfiles}
      />
      <NoxInput
        label={fr ? 'Pseudo' : 'Username'}
        placeholder={fr ? 'Ton pseudo' : 'Your username'}
        autoCapitalize="none"
        value={formData.pseudo}
        onChangeText={(value) => handleChange('pseudo', value)}
      />
      <NoxInput
        label="Email"
        placeholder={fr ? 'ton.email@example.com' : 'your.email@example.com'}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={formData.email}
        onChangeText={(value) => handleChange('email', value)}
        icon={<Ionicons name="mail-outline" size={20} color={Colors.textTertiary} />}
      />
      <NoxInput
        label={fr ? 'Téléphone pro' : 'Professional phone'}
        placeholder={fr ? '06 12 34 56 78' : '+33 6 12 34 56 78'}
        keyboardType="phone-pad"
        value={formData.phonePro}
        onChangeText={(value) => handleChange('phonePro', value)}
        icon={<Ionicons name="call-outline" size={20} color={Colors.textTertiary} />}
        onFocus={() => {
          if (Platform.OS === 'android') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
      />

      <NoxText variant="secondary" style={{ marginBottom: 8 }}>
        {fr ? 'Type d’organisateur' : 'Organizer type'}
      </NoxText>
      <TouchableOpacity
        style={styles.selectField}
        onPress={() => setShowBookerTypeModal(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
      >
        <NoxText
          variant="form"
          style={[styles.selectValue, !formData.bookerType && styles.selectPlaceholder]}
        >
          {formData.bookerType
            ? bookerTypes.find((bt) => bt.value === formData.bookerType)?.label || formData.bookerType
            : fr
              ? 'Sélectionner un type'
              : 'Select a type'}
        </NoxText>
        <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
      </TouchableOpacity>

      <View style={styles.legalBlock}>
        <NoxText variant="form" style={styles.legalTitle}>
          {fr ? 'Infos légales (optionnel)' : 'Legal info (optional)'}
        </NoxText>
        <NoxText variant="secondary" style={styles.hint}>
          {fr ? 'Pour pré-remplir tes contrats.' : 'Used to pre-fill your contracts.'}
        </NoxText>
      </View>
      <NoxInput
        label={fr ? 'Société / Raison sociale' : 'Company name'}
        placeholder={fr ? 'Ex: Ma société SARL' : 'e.g. My Company Ltd'}
        value={formData.companyName}
        onChangeText={(value) => handleChange('companyName', value)}
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
        label={fr ? 'Ville' : 'City'}
        placeholder="Paris"
        value={formData.city}
        onChangeText={(value) => handleChange('city', value)}
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
    </RegisterRoleFormShell>
  );
}
