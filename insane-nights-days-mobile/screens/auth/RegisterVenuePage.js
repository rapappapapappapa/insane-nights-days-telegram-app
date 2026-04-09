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
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RegisterVenuePage() {
  const { language, t } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const [formData, setFormData] = useState({
    pseudo: user?.username || '',
    venueName: '',
    email: user?.email || '',
    address: '',
    companyName: '',
    legalRepresentative: '',
    postalCode: '',
    city: '',
    country: '',
    siret: '',
  });
  const [loading, setLoading] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null); // Pour valider que l'adresse vient des suggestions
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
      const suggestions = data.map((item) => {
        // Formater l'adresse de manière très courte : "Numéro Rue, Code postal Ville"
        let formattedAddress = item.display_name;
        
        if (item.address) {
          const addr = item.address;
          const parts = [];
          
          // Partie 1 : Numéro + Rue (uniquement)
          let streetPart = '';
          if (addr.house_number && addr.road) {
            streetPart = `${addr.house_number} ${addr.road}`;
          } else if (addr.road) {
            streetPart = addr.road;
          } else if (addr.street) {
            streetPart = addr.street;
          } else if (addr.pedestrian) {
            streetPart = addr.pedestrian;
          }
          
          if (streetPart) {
            parts.push(streetPart);
          }
          
          // Partie 2 : Code postal + Ville (uniquement)
          const postcode = addr.postcode || '';
          const city = addr.city || addr.town || addr.municipality || '';
          
          if (postcode && city) {
            parts.push(`${postcode} ${city}`);
          } else if (city) {
            parts.push(city);
          } else if (postcode) {
            parts.push(postcode);
          }
          
          // Utiliser le format court uniquement si on a les deux parties
          if (parts.length >= 2) {
            formattedAddress = parts.join(', ');
          } else if (parts.length === 1) {
            formattedAddress = parts[0];
          } else {
            // Fallback : parser display_name pour extraire l'essentiel
            // Format attendu : "Numéro, Rue, ..., Ville, ..., Code postal, ..."
            const displayParts = item.display_name.split(',').map(p => p.trim());
            if (displayParts.length >= 3) {
              // Prendre la rue (première et deuxième partie si la première est juste un numéro)
              let streetPart = displayParts[0];
              if (displayParts[0].match(/^\d+$/) && displayParts[1]) {
                streetPart = `${displayParts[0]} ${displayParts[1]}`;
              } else if (displayParts[1] && !displayParts[1].match(/^\d{5}/)) {
                // Si la deuxième partie n'est pas un code postal, l'ajouter à la rue
                streetPart = `${displayParts[0]} ${displayParts[1]}`;
              }
              
              // Trouver le code postal (format 5 chiffres)
              const postcodeIndex = displayParts.findIndex(p => /^\d{5}/.test(p));
              const postcode = postcodeIndex >= 0 ? displayParts[postcodeIndex] : '';
              
              // La ville est généralement juste avant le code postal, ou à l'index 2-3
              let city = '';
              if (postcodeIndex > 0) {
                city = displayParts[postcodeIndex - 1];
              } else {
                // Chercher une partie qui ressemble à une ville (pas un numéro, pas trop court)
                city = displayParts.find((p, i) => i >= 2 && i < 5 && !p.match(/^\d+$/) && p.length > 3) || displayParts[2] || '';
              }
              
              if (postcode && city) {
                formattedAddress = `${streetPart}, ${postcode} ${city}`;
              } else if (city) {
                formattedAddress = `${streetPart}, ${city}`;
              } else if (postcode) {
                formattedAddress = `${streetPart}, ${postcode}`;
              } else {
                formattedAddress = streetPart;
              }
            } else if (displayParts.length >= 2) {
              formattedAddress = `${displayParts[0]}, ${displayParts[1]}`;
            } else if (displayParts.length === 1) {
              formattedAddress = displayParts[0];
            }
          }
        }
        
        return {
          id: item.place_id,
          displayName: item.display_name, // Pour l'affichage dans la liste (complet)
          address: formattedAddress, // Format court pour le stockage : "Rue, Code postal Ville"
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        };
      });

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
    setSelectedAddressId(suggestion.id); // Marquer l'adresse comme sélectionnée depuis les suggestions
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (loading) return;

    // Validation
    if (!formData.pseudo || !formData.venueName || !formData.email || !formData.address) {
      showError(language === 'fr' ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }
    
    // Valider que l'adresse a été sélectionnée depuis les suggestions
    if (!selectedAddressId) {
      showError(language === 'fr' 
        ? 'Veuillez sélectionner une adresse depuis la liste de suggestions.' 
        : 'Please select an address from the suggestions list.');
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

      const response = await api.createVenueProfile({
        token: user.token,
        pseudo: formData.pseudo,
        venueName: formData.venueName,
        email: formData.email,
        address: formData.address,
        companyName: formData.companyName?.trim() || undefined,
        legalRepresentative: formData.legalRepresentative?.trim() || undefined,
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
      showSuccess(language === 'fr'
        ? 'Profil Lieu créé avec succès !'
        : 'Venue profile created successfully!');
      setTimeout(() => navigate('welcome'), 1500);
    } catch (error) {
      console.error('Erreur création profil Lieu:', error);
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
        keyboardDismissMode="none"
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
              onChangeText={(value) => {
                handleChange('address', value);
                // Réinitialiser la sélection si l'utilisateur modifie manuellement
                if (selectedAddressId && value !== formData.address) {
                  setSelectedAddressId(null);
                }
              }}
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
                // Délai plus long pour permettre le clic sur une suggestion et le scroll
                // Avec keyboardDismissMode="none", onBlur ne devrait plus être appelé lors du scroll
                setTimeout(() => {
                  // Cacher les suggestions seulement si on a vraiment perdu le focus
                  if (addressSuggestions.length > 0) {
                    setShowSuggestions(false);
                  }
                }, 300);
              }}
            />
            {searchingAddress && (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={styles.addressSearchLoader}
              />
            )}
          </View>
          {showSuggestions && addressSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              {addressSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={styles.suggestionItem}
                  onPress={() => selectAddress(item)}
                >
                  <Text style={styles.suggestionText}>{item.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, styles.legalSectionTitle]}>
            {language === 'fr' ? 'Infos légales (optionnel, pour les contrats)' : 'Legal info (optional, for contracts)'}
          </Text>
          <Text style={styles.legalHint}>
            {language === 'fr' ? 'Complétez ces champs pour pré-remplir vos contrats.' : 'Fill these fields to pre-fill your contracts.'}
          </Text>
          <Text style={styles.label}>{language === 'fr' ? 'Société / Raison sociale' : 'Company name'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Ex: Ma société SARL' : 'e.g. My Company Ltd'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.companyName}
            onChangeText={(value) => handleChange('companyName', value)}
          />
          <Text style={styles.label}>{language === 'fr' ? 'Représentant légal' : 'Legal representative'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Nom du représentant' : 'Representative name'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.legalRepresentative}
            onChangeText={(value) => handleChange('legalRepresentative', value)}
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
          <Text style={styles.label}>{language === 'fr' ? 'Ville' : 'City'}</Text>
          <TextInput
            style={styles.input}
            placeholder={language === 'fr' ? 'Paris' : 'Paris'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={formData.city}
            onChangeText={(value) => handleChange('city', value)}
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
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>
              {language === 'fr' ? 'Créer mon compte' : 'Create my account'}
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
    backgroundColor: Colors.background,
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
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 300,
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
    color: Colors.primary,
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
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 14,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.1)',
  },
  suggestionText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '800',
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
