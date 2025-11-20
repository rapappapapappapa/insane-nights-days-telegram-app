import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const CityAutocomplete = ({ value, onChangeText, placeholder, style, placeholderTextColor }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // API Gouv France - Liste des communes
  const searchCities = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      // API Gouv France - recherche de communes
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&limit=10&fields=nom,code,codesPostaux`
      );
      const data = await response.json();
      
      if (data && Array.isArray(data)) {
        // Formater les résultats : "Nom (Code Postal)" ou juste "Nom"
        const formatted = data.map((city) => {
          const postalCode = city.codesPostaux && city.codesPostaux.length > 0 
            ? city.codesPostaux[0] 
            : null;
          return {
            id: city.code,
            name: city.nom,
            postalCode: postalCode,
            display: postalCode ? `${city.nom} (${postalCode})` : city.nom,
          };
        });
        setSuggestions(formatted);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Erreur recherche villes:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value) {
        searchCities(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // Délai de 300ms pour éviter trop de requêtes

    return () => clearTimeout(timeoutId);
  }, [value]);

  const handleSelectCity = (city) => {
    onChangeText(city.name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={style || styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || 'rgba(255,255,255,0.4)'}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        onBlur={() => {
          // Délai pour permettre le clic sur une suggestion
          setTimeout(() => setShowSuggestions(false), 200);
        }}
      />
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#ff7a1a" />
        </View>
      )}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.suggestionItem}
              onPress={() => handleSelectCity(item)}
            >
              <Text style={styles.suggestionText}>{item.display}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1,
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
  loadingContainer: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderTopWidth: 0,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    maxHeight: 200,
    zIndex: 1000,
    marginTop: -1,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  suggestionText: {
    color: '#ffffff',
    fontSize: 16,
  },
});

export default CityAutocomplete;

