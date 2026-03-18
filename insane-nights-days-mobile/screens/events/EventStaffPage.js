/**
 * Page Staff événement - Liste du staff, ajout (parmi les amis), lien vers scan
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

export default function EventStaffPage() {
  const insets = useSafeAreaInsets();
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#FF1744" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{fr ? 'Staff' : 'Staff'}</Text>
        <View style={styles.headerRight} />
      </View>
      {eventTitle ? <Text style={styles.eventTitle}>{eventTitle}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.scanBtn} onPress={() => navigate('scanTicket', { eventId, eventTitle })}>
          <Ionicons name="qr-code" size={22} color="#0b0b0e" />
          <Text style={styles.scanBtnText}>{fr ? 'Scanner billets' : 'Scan tickets'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Ionicons name="person-add" size={20} color="#FF1744" />
          <Text style={styles.addBtnText}>{fr ? 'Ajouter staff' : 'Add staff'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF1744" />}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#FF1744" style={styles.loader} />
        ) : staff.length === 0 ? (
          <Text style={styles.emptyText}>{fr ? 'Aucun staff. Ajoute des amis pour qu\'ils puissent scanner les billets.' : 'No staff. Add friends so they can scan tickets.'}</Text>
        ) : (
          staff.map((s) => (
            <View key={s.communityId} style={styles.staffRow}>
              <Image source={{ uri: normalizeMediaUrl(s.profileImage) || 'https://via.placeholder.com/48' }} style={styles.avatar} />
              <Text style={styles.pseudo}>{s.pseudo}</Text>
              <Text style={styles.roleBadge}>QR</Text>
              <TouchableOpacity
                style={[styles.removeBtn, removingStaff === s.communityId && styles.btnDisabled]}
                onPress={() => handleRemoveStaff(s.communityId)}
                disabled={removingStaff === s.communityId}
              >
                {removingStaff === s.communityId ? <ActivityIndicator size="small" color="#FF1744" /> : <Ionicons name="close" size={20} color="#FF1744" />}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={addModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{fr ? 'Ajouter un staff' : 'Add staff'}</Text>
            <Text style={styles.modalHint}>{fr ? 'Seuls tes amis peuvent être staff.' : 'Only your friends can be staff.'}</Text>
            {availableFriends.length === 0 ? (
              <Text style={styles.emptyText}>{fr ? 'Aucun ami disponible. Va dans Mes amis pour en ajouter.' : 'No friends available. Go to My friends to add some.'}</Text>
            ) : (
              availableFriends.map((f) => (
                <TouchableOpacity
                  key={f.communityId}
                  style={styles.friendRow}
                  onPress={() => handleAddStaff(f.communityId)}
                  disabled={addingStaff === f.communityId}
                >
                  <Image source={{ uri: normalizeMediaUrl(f.profileImage) || 'https://via.placeholder.com/40' }} style={styles.avatarSmall} />
                  <Text style={styles.friendPseudo}>{f.pseudo}</Text>
                  {addingStaff === f.communityId ? <ActivityIndicator size="small" color="#FF1744" /> : <Ionicons name="add" size={22} color="#FF1744" />}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.modalClose} onPress={() => setAddModalVisible(false)}>
              <Text style={styles.modalCloseText}>{fr ? 'Fermer' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0e' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 8 },
  title: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  headerRight: { width: 40 },
  eventTitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, paddingHorizontal: 20, marginBottom: 16 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
  scanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF1744', paddingVertical: 14, borderRadius: 12 },
  scanBtnText: { color: '#0b0b0e', fontSize: 16, fontWeight: '700' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#FF1744' },
  addBtnText: { color: '#FF1744', fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  loader: { marginTop: 40 },
  staffRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 14 },
  pseudo: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  roleBadge: { backgroundColor: 'rgba(255,23,68,0.2)', color: '#FF1744', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 },
  removeBtn: { padding: 8 },
  btnDisabled: { opacity: 0.5 },
  emptyText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, paddingHorizontal: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#141419', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,23,68,0.3)' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  avatarSmall: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  friendPseudo: { flex: 1, color: '#fff', fontSize: 16 },
  modalClose: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { color: '#FF1744', fontSize: 16, fontWeight: '600' },
});
