import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

export default function RegisterBookerPage() {
  const { language, t } = useLanguage();
  const { navigate } = useNavigation();
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    nom: '',
    prenom: '',
    email: user?.email || '',
    phonePro: '',
    bookerType: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showBookerTypeModal, setShowBookerTypeModal] = useState(false);

  // Types de bookers disponibles
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
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.',
      );
      return;
    }

    setLoading(true);

    try {
      if (!user?.id) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          language === 'fr'
            ? 'Vous devez être connecté pour créer un profil.'
            : 'You must be logged in to create a profile.',
        );
        setLoading(false);
        return;
      }

      if (!user?.token) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          language === 'fr'
            ? 'Token d\'authentification manquant. Veuillez vous reconnecter.'
            : 'Authentication token missing. Please log in again.',
        );
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
      });

      if (!response) {
        Alert.alert(
          language === 'fr' ? 'Erreur de connexion' : 'Connection error',
          language === 'fr'
            ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
            : 'Unable to reach server. Check your connection.',
        );
        setLoading(false);
        return;
      }

      if (!response.success) {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          response.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'),
        );
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
      Alert.alert(
        language === 'fr' ? 'Profil créé !' : 'Profile created!',
        language === 'fr'
          ? 'Profil Booker créé avec succès !'
          : 'Booker profile created successfully!',
        [
          {
            text: language === 'fr' ? 'Continuer' : 'Continue',
            onPress: () => {
              navigate('welcome');
            },
          },
        ],
      );
    } catch (error) {
      console.error('Erreur création profil Booker:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigate('accountType')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'fr' ? 'Compte Booker' : 'Booker Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {language === 'fr' ? 'Nom' : 'Last name'}
            {formData.nom && (
              <Text style={styles.autoFillHint}> ({language === 'fr' ? 'pré-rempli depuis votre profil Community' : 'pre-filled from your Community profile'})</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton nom' : 'Your last name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.nom}
            onChangeText={(value) => handleChange('nom', value)}
            editable={!loadingProfiles}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Prénom' : 'First name'}
            {formData.prenom && (
              <Text style={styles.autoFillHint}> ({language === 'fr' ? 'pré-rempli depuis votre profil Community' : 'pre-filled from your Community profile'})</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton prénom' : 'Your first name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.prenom}
            onChangeText={(value) => handleChange('prenom', value)}
            editable={!loadingProfiles}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Pseudo' : 'Username'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton pseudo' : 'Your username'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.pseudo}
            onChangeText={(value) => handleChange('pseudo', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Email' : 'Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'ton.email@example.com' : 'your.email@example.com'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Téléphone pro' : 'Professional phone'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '06 12 34 56 78' : '+33 6 12 34 56 78'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="phone-pad"
            value={formData.phonePro}
            onChangeText={(value) => handleChange('phonePro', value)}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Type de booker' : 'Booker type'}
          </Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowBookerTypeModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.inputText, !formData.bookerType && styles.placeholderText]}>
              {formData.bookerType 
                ? bookerTypes.find(bt => bt.value === formData.bookerType)?.label || formData.bookerType
                : (language === 'fr' ? 'Sélectionner un type' : 'Select a type')}
            </Text>
            <Text style={styles.chevron}>▼</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0b0b0e" />
          ) : (
            <Text style={styles.submitButtonText}>
              {language === 'fr' ? 'Créer mon compte' : 'Create my account'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de sélection du type de booker */}
      <Modal
        visible={showBookerTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookerTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {language === 'fr' ? 'Sélectionner un type de booker' : 'Select a booker type'}
              </Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBookerTypeModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalOptions}>
              {bookerTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modalOption,
                    formData.bookerType === type.value && styles.modalOptionSelected
                  ]}
                  onPress={() => {
                    handleChange('bookerType', type.value);
                    setShowBookerTypeModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.bookerType === type.value && styles.modalOptionTextSelected
                  ]}>
                    {type.label}
                  </Text>
                  {formData.bookerType === type.value && (
                    <Text style={styles.modalOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  form: {
    gap: 18,
    marginBottom: 24,
  },
  label: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  autoFillHint: {
    color: 'rgba(255,122,26,0.6)',
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  inputText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
  },
  chevron: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    borderTopWidth: 2,
    borderTopColor: '#ff7a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.3)',
  },
  modalTitle: {
    color: '#ff7a1a',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,122,26,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#ff7a1a',
    fontSize: 24,
    fontWeight: '300',
  },
  modalOptions: {
    padding: 10,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.2)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255,122,26,0.2)',
    borderColor: '#ff7a1a',
  },
  modalOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#ff7a1a',
    fontWeight: '700',
  },
  modalOptionCheck: {
    color: '#ff7a1a',
    fontSize: 18,
    fontWeight: '700',
  },
});

