import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Colors from '../constants/colors';
import { Layout, Radius, Spacing } from '../constants/theme';
import { FontFamily } from '../constants/typography';

const CityAutocomplete = ({ value, onChangeText, placeholder, style, placeholderTextColor, label }) => {
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
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={style || styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || Colors.textMuted}
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
          <ActivityIndicator size="small" color={Colors.primary} />
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
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    minHeight: Layout.inputHeight,
    backgroundColor: Colors.backgroundInput,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: Radius.input,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 15,
    fontFamily: FontFamily.regular,
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
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderTopWidth: 0,
    borderBottomLeftRadius: Radius.input,
    borderBottomRightRadius: Radius.input,
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
    borderBottomColor: Colors.borderSubtle,
  },
  suggestionText: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: FontFamily.regular,
  },
});

export default CityAutocomplete;

