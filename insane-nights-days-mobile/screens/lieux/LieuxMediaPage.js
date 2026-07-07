import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { NoxText, NoxTabs, NoxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

const TABS = [
  { id: 'photos', label: 'Photos' },
  { id: 'videos', label: 'Vidéos' },
  { id: 'sets', label: 'Sets' },
  { id: 'links', label: 'Liens' },
];

export default function LieuxMediaPage() {
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('photos');

  const tileWidth = (width - Spacing.xl * 2 - Spacing.md) / 2;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top + Spacing.md }}>
        <NoxText variant="title" style={styles.title}>
          Media
        </NoxText>
        <NoxText variant="secondary" style={styles.subtitle}>
          Centralise tes événements.
        </NoxText>
        <NoxTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.tile, { width: tileWidth, height: tileWidth * 0.72 }]}>
              <Ionicons
                name={activeTab === 'videos' || activeTab === 'sets' ? 'play-circle-outline' : 'image-outline'}
                size={26}
                color={primaryAlpha(0.5)}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      <NoxBottomNav
        active="home"
        onHome={() => navigate('lieuxDashboard')}
        onProfile={() => navigate('lieuxProfil')}
        onCreate={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', marginTop: 4, marginBottom: Spacing.lg },
  tabs: { justifyContent: 'center', gap: Spacing.xl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  tile: {
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
