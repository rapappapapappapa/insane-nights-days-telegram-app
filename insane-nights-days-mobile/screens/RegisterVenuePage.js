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
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

export default function RegisterVenuePage() {
  const { language, t } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    venueName: '',
    email: user?.email || '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const addressSearchTimeoutRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Nettoyer le timeout au démontage du composant
  useEffect(() => {
    return () => {
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Recherche d'adresses pour le champ address
    if (field === 'address' && value.length >= 3) {
      // Annuler la recherche précédente
      if (addressSearchTimeoutRef.current) {
        clearTimeout(addressSearchTimeoutRef.current);
      }
      
      // Délai de 500ms avant de lancer la recherche
      addressSearchTimeoutRef.current = setTimeout(() => {
        searchAddresses(value);
      }, 500);
    } else if (field === 'address' && value.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const searchAddresses = async (query) => {
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingAddress(true);
    try {
      // Utilisation de l'API Nominatim d'OpenStreetMap (gratuite)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=fr,be,ch,lu,mc`,
        {
          headers: {
            'User-Agent': 'InsaneNightsDaysApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Erreur de recherche');
      }

      const data = await response.json();
      const suggestions = data.map((item) => ({
        id: item.place_id,
        displayName: item.display_name,
        address: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
      }));

      setAddressSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('Erreur recherche adresse:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setSearchingAddress(false);
    }
  };

  const selectAddress = (suggestion) => {
    setFormData((prev) => ({ ...prev, address: suggestion.address }));
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.pseudo || !formData.venueName || !formData.email || !formData.address) {
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

      const response = await api.createVenueProfile({
        token: user.token,
        pseudo: formData.pseudo,
        venueName: formData.venueName,
        email: formData.email,
        address: formData.address,
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

      // Basculer automatiquement vers le profil VENUE créé
      try {
        const switchResponse = await api.switchProfile(user.token, 'VENUE');
        if (switchResponse && switchResponse.success) {
          updateUser({ activeProfileType: 'VENUE' });
        }
      } catch (switchError) {
        console.error('Erreur bascule profil:', switchError);
        // On continue quand même, le profil est créé
      }

      // Succès !
      Alert.alert(
        language === 'fr' ? 'Profil créé !' : 'Profile created!',
        language === 'fr'
          ? 'Profil Lieu créé avec succès !'
          : 'Venue profile created successfully!',
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
      console.error('Erreur création profil Lieu:', error);
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
            {language === 'fr' ? 'Compte Lieu' : 'Venue Account'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>
            {language === 'fr' ? 'Nom du lieu' : 'Venue name'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Nom de ton lieu' : 'Your venue name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            autoCapitalize="words"
            value={formData.venueName}
            onChangeText={(value) => handleChange('venueName', value)}
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
            {language === 'fr' ? 'Adresse' : 'Address'}
          </Text>
          <View style={styles.addressInputContainer}>
          <TextInput
            style={styles.input}
              placeholder={language === 'fr' ? 'Commencez à taper une adresse...' : 'Start typing an address...'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.address}
            onChangeText={(value) => handleChange('address', value)}
              onFocus={() => {
                if (addressSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
                if (Platform.OS === 'android') {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }
              }}
              onBlur={() => {
                // Délai pour permettre le clic sur une suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            {searchingAddress && (
              <ActivityIndicator
                size="small"
                color="#ff7a1a"
                style={styles.addressSearchLoader}
              />
            )}
          </View>
          {showSuggestions && addressSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={addressSuggestions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => selectAddress(item)}
                  >
                    <Text style={styles.suggestionText}>{item.displayName}</Text>
                  </TouchableOpacity>
                )}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          )}
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
    flex: 1,
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  addressSearchLoader: {
    position: 'absolute',
    right: 16,
  },
  suggestionsContainer: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 14,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.1)',
  },
  suggestionText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
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
});

