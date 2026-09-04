import React, { useState, useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { NoxInput, NoxText } from '../../components/nox';
import { useToast } from '../../hooks/useToast';
import RegisterRoleFormShell from './RegisterRoleFormShell';
import { registerRoleStyles as styles } from './RegisterRoleForm.styles';

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
    maxCapacity: '',
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
            'User-Agent': 'NoxMobile/1.0',
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

    if (formData.maxCapacity != null && String(formData.maxCapacity).trim() !== '') {
      const mc = parseInt(String(formData.maxCapacity).replace(/\s/g, ''), 10);
      if (!Number.isFinite(mc) || mc < 1) {
        showError(
          language === 'fr'
            ? 'Capacité du lieu : entre un nombre entier positif ou laisse vide.'
            : 'Venue capacity: enter a positive whole number or leave empty.'
        );
        return;
      }
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
        maxCapacity: formData.maxCapacity?.trim() || undefined,
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
      setTimeout(() => navigate('lieuxDashboard'), 1500);
    } catch (error) {
      console.error('Erreur création profil Lieu:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création du profil.' : 'Error creating profile.'));
    } finally {
      setLoading(false);
    }
  };

  const fr = language === 'fr';
  const title = fr ? 'Compte Lieu' : 'Venue Account';

  return (
    <RegisterRoleFormShell
      title={title}
      subtitle={fr ? 'Enregistre ton lieu pour recevoir des demandes d’événements.' : 'Register your venue to receive event requests.'}
      onBack={goBack}
      submitLabel={fr ? 'Créer mon compte' : 'Create my account'}
      onSubmit={handleSubmit}
      loading={loading}
      scrollRef={scrollViewRef}
      toast={toast}
      hideToast={hideToast}
      keyboardDismissMode="none"
    >
      <NoxInput
        label={fr ? 'Nom du lieu' : 'Venue name'}
        placeholder={fr ? 'Nom de ton lieu' : 'Your venue name'}
        autoCapitalize="words"
        value={formData.venueName}
        onChangeText={(value) => handleChange('venueName', value)}
        icon={<Ionicons name="business-outline" size={20} color={Colors.textTertiary} />}
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
        label={fr ? 'Adresse' : 'Address'}
        placeholder={fr ? 'Commence à taper une adresse…' : 'Start typing an address…'}
        value={formData.address}
        onChangeText={(value) => {
          handleChange('address', value);
          if (selectedAddressId && value !== formData.address) {
            setSelectedAddressId(null);
          }
        }}
        icon={<Ionicons name="location-outline" size={20} color={Colors.textTertiary} />}
        rightSlot={searchingAddress ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
        onFocus={() => {
          if (addressSuggestions.length > 0) {
            setShowSuggestions(true);
          }
          if (Platform.OS === 'android') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            if (addressSuggestions.length > 0) {
              setShowSuggestions(false);
            }
          }, 300);
        }}
      />
      {showSuggestions && addressSuggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {addressSuggestions.map((item) => (
            <TouchableOpacity
              key={item.id.toString()}
              style={styles.suggestionItem}
              onPress={() => selectAddress(item)}
            >
              <NoxText variant="secondary" style={styles.suggestionText}>
                {item.displayName}
              </NoxText>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <NoxInput
        label={fr ? 'Capacité max. (optionnel)' : 'Max capacity (optional)'}
        placeholder={fr ? 'Ex: 350' : 'e.g. 350'}
        keyboardType="numeric"
        value={formData.maxCapacity}
        onChangeText={(value) => handleChange('maxCapacity', value)}
        icon={<Ionicons name="people-outline" size={20} color={Colors.textTertiary} />}
      />
      <NoxText variant="secondary" style={styles.hint}>
        {fr
          ? 'Plafonne la capacité des événements chez toi. Modifiable plus tard.'
          : 'Caps event capacity at your venue. You can change it later.'}
      </NoxText>

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
        label={fr ? 'Représentant légal' : 'Legal representative'}
        placeholder={fr ? 'Nom du représentant' : 'Representative name'}
        value={formData.legalRepresentative}
        onChangeText={(value) => handleChange('legalRepresentative', value)}
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
