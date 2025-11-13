import React, { useState /*, useEffect*/ } from 'react';
import { StyleSheet, Text, View, TouchableOpacity /*, ActivityIndicator, ScrollView, TextInput, Image*/ } from 'react-native';
import { StatusBar } from 'expo-status-bar';
// TODO: importer l'API une fois prête (./api/config)

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  // TODO: implémenter fetch des événements (useEffect + API)
  // const [events, setEvents] = useState([]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Insane Nights & Days</Text>

      {/* TODO: ajouter la navigation Home/Menu/Events/Profile/Tickets */}
      <TouchableOpacity style={styles.button} onPress={() => setCurrentPage('menu')}>
        <Text style={styles.buttonText}>Aller au Menu</Text>
      </TouchableOpacity>

      {/* TODO: afficher différentes pages selon currentPage */}
      <Text style={styles.subtitle}>
        Implémentez les écrans :
        {'\n'}- Home (connexion wallet)
        {'\n'}- Menu (navigation)
        {'\n'}- Events (liste + filtres)
        {'\n'}- Profile (édition)
        {'\n'}- Tickets
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 24,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  buttonText: {
    color: '#0b0b0e',
    fontWeight: '700',
  },
});



