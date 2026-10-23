import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import NoxText from '../nox/NoxText';
import { publicProfileStyles as styles } from './publicProfileStyles';

export const PUBLIC_PROFILE_TABS = [
  { id: 'about', labelFr: 'À propos', labelEn: 'About' },
  { id: 'feed', labelFr: 'Feed', labelEn: 'Feed' },
  { id: 'events', labelFr: 'Événements', labelEn: 'Events' },
  { id: 'media', labelFr: 'Médias', labelEn: 'Media' },
  { id: 'reviews', labelFr: 'Avis', labelEn: 'Reviews' },
];

/**
 * Onglets profil public Figma.
 */
export default function PublicProfileTabs({
  language = 'fr',
  activeTab,
  onChange,
  tabs = PUBLIC_PROFILE_TABS,
}) {
  const fr = language === 'fr';
  return (
    <View style={styles.tabsWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => onChange?.(tab.id)}
              activeOpacity={0.85}
            >
              <NoxText style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {fr ? tab.labelFr : tab.labelEn}
              </NoxText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
