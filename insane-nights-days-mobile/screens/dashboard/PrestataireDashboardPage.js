import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';

/**
 * Tableau de bord Prestataire — placeholder jusqu’au périmètre wizard / événements.
 */
export default function PrestataireDashboardPage() {
  const { language } = useLanguage();
  const { goBack } = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} accessibilityRole="button">
          <Text style={styles.backText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {language === 'fr' ? 'Tableau de bord Prestataire' : 'Service provider dashboard'}
        </Text>
        <Text style={styles.hint}>
          {language === 'fr'
            ? 'Écran en construction : liaison aux événements, devis et profil détaillé arrivent dans les prochaines itérations.'
            : 'Work in progress: event linking, quotes and full profile coming soon.'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: Colors.primary, fontSize: 16, fontWeight: '600' },
  content: { padding: 24 },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    lineHeight: 22,
  },
});
