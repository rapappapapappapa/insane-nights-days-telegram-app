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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { useLieuxData } from '../../hooks/useLieuxData';
import { NoxText, NoxTabs, NoxButton, NoxLieuxBottomNav } from '../../components/nox';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
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
  const [uploading, setUploading] = useState(false);
  const [urlModalVisible, setUrlModalVisible] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [titleValue, setTitleValue] = useState('');
  const { toast, showError, showSuccess, hideToast } = useToast();
  const fr = language === 'fr';

  const { loading, refreshing, venueProfile, media, refresh } = useLieuxData(user?.token, language);
  const venueId = venueProfile?.id;

  const tileWidth = (width - Spacing.xl * 2 - Spacing.md) / 2;
  const filteredMedia = useMemo(() => {
    const type = TAB_TYPE_MAP[activeTab];
    return (media || []).filter((m) => !type || String(m.type || '').toUpperCase() === type);
  }, [media, activeTab]);

  const pickAndUploadFile = async () => {
    const isVideo = activeTab === 'videos';
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(
          fr
            ? 'Autorise l’accès à ta galerie pour ajouter un média.'
            : 'Allow gallery access to add media.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: isVideo ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: !isVideo,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;

      setUploading(true);
      const res = await api.uploadVenueMediaFile(
        user.token,
        venueId,
        result.assets[0].uri,
        TAB_TYPE_MAP[activeTab],
      );
      if (res?.success) {
        showSuccess(fr ? 'Média ajouté !' : 'Media added!');
        await refresh();
      } else {
        showError(res?.message || (fr ? 'Upload impossible.' : 'Upload failed.'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur pendant l’upload.' : 'Upload error.'));
    } finally {
      setUploading(false);
    }
  };

  const submitUrl = async () => {
    const url = urlValue.trim();
    if (!/^https?:\/\/.+/.test(url)) {
      showError(fr ? 'Entre une URL valide (https://…).' : 'Enter a valid URL (https://…).');
      return;
    }
    setUploading(true);
    try {
      const res = await api.uploadVenueMedia(
        user.token,
        venueId,
        TAB_TYPE_MAP[activeTab],
        url,
        titleValue.trim() || null,
      );
      if (res?.success) {
        showSuccess(fr ? 'Lien ajouté !' : 'Link added!');
        setUrlModalVisible(false);
        setUrlValue('');
        setTitleValue('');
        await refresh();
      } else {
        showError(res?.message || (fr ? 'Ajout impossible.' : 'Could not add link.'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!venueId || uploading) return;
    if (activeTab === 'photos' || activeTab === 'videos') {
      pickAndUploadFile();
    } else {
      setUrlModalVisible(true);
    }
  };

  const handleDelete = (item) => {
    if (!venueId || !item?.id) return;
    Alert.alert(
      fr ? 'Supprimer ce média ?' : 'Delete this media?',
      fr ? 'Cette action est définitive.' : 'This action is permanent.',
      [
        { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: fr ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.deleteVenueMedia(user.token, venueId, item.id);
              if (res?.success) {
                showSuccess(fr ? 'Média supprimé.' : 'Media deleted.');
                await refresh();
              } else {
                showError(res?.message || (fr ? 'Suppression impossible.' : 'Could not delete.'));
              }
            } catch (e) {
              showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
            }
          },
        },
      ],
    );
  };

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
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAdd}
            disabled={uploading || !venueId}
            hitSlop={8}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons name="add" size={26} color={Colors.text} />
            )}
          </TouchableOpacity>
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
                  {item.title ? (
                    <View style={styles.tileTitleWrap}>
                      <NoxText variant="secondary" style={styles.tileTitle} numberOfLines={1}>
                        {item.title}
                      </NoxText>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(item)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={14} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <NoxLieuxBottomNav active={null} navigate={navigate} />

      <Modal
        visible={urlModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUrlModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <NoxText variant="titleSecondary" style={styles.modalTitle}>
              {activeTab === 'sets'
                ? fr ? 'Ajouter un set (lien)' : 'Add a set (link)'
                : fr ? 'Ajouter un lien' : 'Add a link'}
            </NoxText>
            <TextInput
              style={styles.modalInput}
              value={urlValue}
              onChangeText={setUrlValue}
              placeholder="https://…"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <TextInput
              style={styles.modalInput}
              value={titleValue}
              onChangeText={setTitleValue}
              placeholder={fr ? 'Titre (optionnel)' : 'Title (optional)'}
              placeholderTextColor={Colors.textTertiary}
            />
            <NoxButton
              label={fr ? 'Ajouter' : 'Add'}
              onPress={submitUrl}
              loading={uploading}
              style={{ marginTop: Spacing.md }}
            />
            <NoxButton
              label={fr ? 'Annuler' : 'Cancel'}
              variant="ghost"
              onPress={() => setUrlModalVisible(false)}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={toast.type === 'error' ? 5000 : 3000}
      />
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginTop: 2,
  },
  deleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,9,0.75)',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tileTitleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(10,10,9,0.7)',
  },
  tileTitle: { fontSize: 11 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.borderCard,
    padding: Spacing.xl,
  },
  modalTitle: { marginBottom: Spacing.lg, textAlign: 'center' },
  modalInput: {
    backgroundColor: Colors.backgroundInput,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
