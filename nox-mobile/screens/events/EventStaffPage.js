/**
 * Page Staff événement - Liste du staff, ajout (parmi les amis), lien vers scan
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius, Layout } from '../../constants/theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { NoxText, NoxButton, NoxCard, NoxScreenHeader } from '../../components/nox';

export default function EventStaffPage() {
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();

  const eventId = routeParams?.eventId;
  const eventTitle = routeParams?.eventTitle || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState([]);
  const [friends, setFriends] = useState([]);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addingStaff, setAddingStaff] = useState(null);
  const [removingStaff, setRemovingStaff] = useState(null);

  const fr = language === 'fr';

  const fetchData = useCallback(async () => {
    if (!user?.token || !eventId) return;
    try {
      const [staffRes, friendsRes] = await Promise.all([
        api.getEventStaff(user.token, eventId),
        api.getBookerFriends(user.token),
      ]);
      if (staffRes?.success && staffRes.staff) setStaff(staffRes.staff);
      if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur chargement' : 'Load error'));
    }
  }, [user?.token, eventId, fr, showError]);

  useEffect(() => {
    if (user?.token && eventId) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [user?.token, eventId, fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAddStaff = async (communityId) => {
    if (!user?.token || addingStaff) return;
    setAddingStaff(communityId);
    try {
      const res = await api.addEventStaff(user.token, eventId, communityId);
      if (res?.success) {
        showSuccess(fr ? 'Staff ajouté.' : 'Staff added.');
        setAddModalVisible(false);
        fetchData();
      } else {
        showError(res?.message || (fr ? 'Erreur' : 'Error'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur' : 'Error'));
    } finally {
      setAddingStaff(null);
    }
  };

  const handleRemoveStaff = async (communityId) => {
    if (!user?.token || removingStaff) return;
    setRemovingStaff(communityId);
    try {
      const res = await api.removeEventStaff(user.token, eventId, communityId);
      if (res?.success) {
        showSuccess(fr ? 'Staff retiré.' : 'Staff removed.');
        fetchData();
      } else {
        showError(res?.message || (fr ? 'Erreur' : 'Error'));
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur' : 'Error'));
    } finally {
      setRemovingStaff(null);
    }
  };

  const availableFriends = friends.filter((f) => !staff.some((s) => s.communityId === f.communityId));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <NoxScreenHeader
        title={fr ? 'Staff' : 'Staff'}
        subtitle={eventTitle || (fr ? 'Équipe & scan billets' : 'Team & ticket scanning')}
        onBack={goBack}
      />

      <View style={styles.actions}>
        <NoxButton
          label={fr ? 'Scanner billets' : 'Scan tickets'}
          onPress={() => navigate('scanTicket', { eventId, eventTitle })}
          iconLeft={<Ionicons name="qr-code-outline" size={18} color={Colors.text} style={{ marginRight: 8 }} />}
          fullWidth={false}
          style={styles.scanBtn}
        />
        <NoxButton
          label={fr ? 'Ajouter staff' : 'Add staff'}
          variant="secondary"
          onPress={() => setAddModalVisible(true)}
          iconLeft={<Ionicons name="person-add-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />}
          fullWidth={false}
          style={styles.addBtn}
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : staff.length === 0 ? (
          <NoxCard style={styles.emptyCard}>
            <Ionicons name="people-outline" size={32} color={Colors.primary} />
            <NoxText variant="secondary" style={styles.emptyText}>
              {fr
                ? "Aucun staff. Ajoute des amis pour qu'ils puissent scanner les billets."
                : 'No staff. Add friends so they can scan tickets.'}
            </NoxText>
          </NoxCard>
        ) : (
          staff.map((s) => (
            <NoxCard key={s.communityId} style={styles.staffRow} padded={false}>
              <Image
                source={{ uri: normalizeMediaUrl(s.profileImage) || 'https://via.placeholder.com/48' }}
                style={styles.avatar}
              />
              <NoxText variant="form" style={styles.pseudo} numberOfLines={1}>
                {s.pseudo}
              </NoxText>
              <View style={styles.roleBadge}>
                <NoxText variant="secondary" style={styles.roleBadgeText}>
                  QR
                </NoxText>
              </View>
              <TouchableOpacity
                style={[styles.removeBtn, removingStaff === s.communityId && styles.btnDisabled]}
                onPress={() => handleRemoveStaff(s.communityId)}
                disabled={removingStaff === s.communityId}
                hitSlop={8}
              >
                {removingStaff === s.communityId ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="close" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            </NoxCard>
          ))
        )}
      </ScrollView>

      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NoxCard style={styles.modalContent}>
            <NoxText variant="titleSecondary" style={styles.modalTitle}>
              {fr ? 'Ajouter un staff' : 'Add staff'}
            </NoxText>
            <NoxText variant="secondary" style={styles.modalHint}>
              {fr ? 'Seuls tes amis peuvent être staff.' : 'Only your friends can be staff.'}
            </NoxText>
            {availableFriends.length === 0 ? (
              <NoxText variant="secondary" style={styles.emptyText}>
                {fr
                  ? 'Aucun ami disponible. Va dans Mes amis pour en ajouter.'
                  : 'No friends available. Go to My friends to add some.'}
              </NoxText>
            ) : (
              availableFriends.map((f) => (
                <TouchableOpacity
                  key={f.communityId}
                  style={styles.friendRow}
                  onPress={() => handleAddStaff(f.communityId)}
                  disabled={addingStaff === f.communityId}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: normalizeMediaUrl(f.profileImage) || 'https://via.placeholder.com/40' }}
                    style={styles.avatarSmall}
                  />
                  <NoxText variant="form" style={styles.friendPseudo} numberOfLines={1}>
                    {f.pseudo}
                  </NoxText>
                  {addingStaff === f.communityId ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons name="add" size={22} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
            <NoxButton
              label={fr ? 'Fermer' : 'Close'}
              variant="ghost"
              onPress={() => setAddModalVisible(false)}
              style={styles.modalClose}
            />
          </NoxCard>
        </View>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPaddingHorizontal,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  scanBtn: { flex: 1 },
  addBtn: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Layout.screenPaddingHorizontal,
    paddingBottom: Spacing.xxxl,
  },
  loaderWrap: { marginTop: Spacing.xxxl, alignItems: 'center' },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  pseudo: { flex: 1, fontWeight: '600' },
  roleBadge: {
    backgroundColor: primaryAlpha(0.2),
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  roleBadgeText: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  removeBtn: { padding: Spacing.sm },
  btnDisabled: { opacity: 0.5 },
  emptyCard: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xxl },
  emptyText: { textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  modalContent: { padding: Spacing.xl },
  modalTitle: { marginBottom: Spacing.xs },
  modalHint: { marginBottom: Spacing.lg },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.md },
  friendPseudo: { flex: 1 },
  modalClose: { marginTop: Spacing.lg },
});
