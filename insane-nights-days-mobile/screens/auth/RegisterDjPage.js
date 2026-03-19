import React, { useState, useEffect, useRef } from 'react';
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
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import CityAutocomplete from '../../components/CityAutocomplete';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

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
      setTimeout(() => navigate('welcome'), 1500);
    } catch (error) {
      console.error('Erreur création profil DJ:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
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
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'fr' ? 'Compte DJ' : 'DJ Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {language === 'fr' ? 'Nom d\'artiste' : 'Artist name'}
            {formData.artistName && (
              <Text style={styles.autoFillHint}> ({language === 'fr' ? 'pré-rempli depuis votre profil DJ existant' : 'pre-filled from your existing DJ profile'})</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ton nom d\'artiste' : 'Your artist name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.artistName}
            onChangeText={(value) => handleChange('artistName', value)}
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
            {language === 'fr' ? 'Email pro' : 'Professional email'}
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
            {language === 'fr' ? 'Ville' : 'City'}
            {formData.city && (
              <Text style={styles.autoFillHint}> ({language === 'fr' ? 'pré-rempli' : 'pre-filled'})</Text>
            )}
          </Text>
          <CityAutocomplete
            value={formData.city}
            onChangeText={(value) => handleChange('city', value)}
            placeholder={language === 'fr' ? 'Tapez le nom de votre ville...' : 'Type your city name...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
            editable={!loadingProfiles}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Téléphone' : 'Phone'}
            {formData.phone && (
              <Text style={styles.autoFillHint}> ({language === 'fr' ? 'pré-rempli' : 'pre-filled'})</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '06 12 34 56 78' : '+33 6 12 34 56 78'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(value) => handleChange('phone', value)}
            editable={!loadingProfiles}
            onFocus={() => {
              if (Platform.OS === 'android') {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }
            }}
          />

          <Text style={styles.label}>
            {language === 'fr' ? 'Date de naissance' : 'Date of birth'}
            {formData.dateNaissance && (
              <Text style={styles.autoFillHint}> ({language === 'fr' ? 'pré-rempli' : 'pre-filled'})</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'jj/mm/aaaa' : 'dd/mm/yyyy'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="numeric"
            maxLength={10}
            value={formData.dateNaissance}
            onChangeText={(value) => handleChange('dateNaissance', value)}
            editable={!loadingProfiles}
            onFocus={() => {
              if (Platform.OS === 'android') {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }
            }}
          />

          <Text style={[styles.label, styles.legalSectionTitle]}>
            {language === 'fr' ? 'Infos légales (optionnel, pour les contrats)' : 'Legal info (optional, for contracts)'}
          </Text>
          <Text style={styles.legalHint}>
            {language === 'fr' ? 'Complétez ces champs pour pré-remplir vos contrats.' : 'Fill these fields to pre-fill your contracts.'}
          </Text>
          <Text style={styles.label}>{language === 'fr' ? 'Nom légal' : 'Legal name'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Nom civil complet' : 'Full legal name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.legalName}
            onChangeText={(value) => handleChange('legalName', value)}
          />
          <Text style={styles.label}>{language === 'fr' ? 'Adresse' : 'Address'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Adresse complète' : 'Full address'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.address}
            onChangeText={(value) => handleChange('address', value)}
          />
          <Text style={styles.label}>{language === 'fr' ? 'Code postal' : 'Postal code'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '75001' : '75001'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="numeric"
            value={formData.postalCode}
            onChangeText={(value) => handleChange('postalCode', value)}
          />
          <Text style={styles.label}>{language === 'fr' ? 'Pays' : 'Country'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'France' : 'France'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.country}
            onChangeText={(value) => handleChange('country', value)}
          />
          <Text style={styles.label}>{language === 'fr' ? 'SIRET' : 'SIRET'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? '123 456 789 00012' : '123 456 789 00012'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="numeric"
            value={formData.siret}
            onChangeText={(value) => handleChange('siret', value)}
          />
          <Text style={styles.label}>{language === 'fr' ? 'N° TVA' : 'VAT number'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'FR12345678901' : 'FR12345678901'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.vatNumber}
            onChangeText={(value) => handleChange('vatNumber', value)}
          />
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
              {language === 'fr' ? 'Créer mon compte DJ' : 'Create my DJ account'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
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
    color: '#FF1744',
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
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#FF1744',
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
    color: 'rgba(255,23,68,0.6)',
    fontSize: 11,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  legalSectionTitle: {
    marginTop: 20,
  },
  legalHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 12,
  },
});

