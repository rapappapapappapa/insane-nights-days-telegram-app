import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { normalizeMediaUrl } from '../../api/config';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxText, NoxTabs, NoxLieuxBottomNav } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

const TABS = [
  { id: 'photos', label: 'Photos' },
  { id: 'videos', label: 'Vidéos' },
  { id: 'sets', label: 'Sets' },
  { id: 'links', label: 'Liens' },
];

const TAB_TYPE_MAP = {
  photos: 'PHOTO',
  videos: 'VIDEO',
  sets: 'SET',
  links: 'LINK',
};

export default function LieuxMediaPage() {
  const { goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('photos');
  const [brokenImages, setBrokenImages] = useState({});
  const fr = language === 'fr';

  const { loading, refreshing, media, refresh } = useLieuxData(user?.token, language);

  const tileWidth = (width - Spacing.xl * 2 - Spacing.md) / 2;
  const filteredMedia = useMemo(() => {
    const type = TAB_TYPE_MAP[activeTab];
    return (media || []).filter((m) => !type || String(m.type || '').toUpperCase() === type);
  }, [media, activeTab]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top + Spacing.md }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <NoxText variant="title" style={styles.title}>
              Media
            </NoxText>
            <NoxText variant="secondary" style={styles.subtitle}>
              {fr ? 'Centralise les médias de ton lieu.' : 'Centralize your venue media.'}
            </NoxText>
          </View>
        </View>
        <NoxTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />
        }
      >
        {filteredMedia.length === 0 ? (
          <NoxText variant="secondary" style={styles.empty}>
            {fr ? 'Aucun média pour cette catégorie.' : 'No media in this category.'}
          </NoxText>
        ) : (
          <View style={styles.grid}>
            {filteredMedia.map((item) => {
              const uri = normalizeMediaUrl(item.url || item.thumbnail);
              const key = item.id || uri;
              return (
                <View key={key} style={[styles.tile, { width: tileWidth, height: tileWidth * 0.72 }]}>
                  {uri && !brokenImages[key] ? (
                    <Image
                      source={{ uri }}
                      style={styles.tileImage}
                      onError={() => setBrokenImages((p) => ({ ...p, [key]: true }))}
                    />
                  ) : (
                    <Ionicons
                      name={
                        activeTab === 'videos' || activeTab === 'sets'
                          ? 'play-circle-outline'
                          : 'image-outline'
                      }
                      size={26}
                      color={primaryAlpha(0.5)}
                    />
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <NoxLieuxBottomNav active={null} navigate={navigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  title: { paddingHorizontal: 0 },
  subtitle: { marginTop: Spacing.xs, marginBottom: Spacing.md, paddingHorizontal: 0 },
  tabs: { marginBottom: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: {
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tileImage: { width: '100%', height: '100%' },
  empty: { textAlign: 'center', marginTop: Spacing.xxl },
});
