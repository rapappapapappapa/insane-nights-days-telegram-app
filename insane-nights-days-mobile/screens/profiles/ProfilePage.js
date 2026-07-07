/**
 * Page de profil utilisateur
 * 
 * Affiche les informations de l'utilisateur connecté et permet :
 * - L'édition du nom d'utilisateur
 * - Le changement de mot de passe
 * - La visualisation des statistiques (score, niveau, tickets, etc.)
 * - L'accès au changement de profil
 */

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Modal,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Colors from '../../constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { NoxText, NoxButton, NoxCard, NoxScreenHeader, NoxInput } from '../../components/nox';
import { getHomeScreenForProfile } from '../../utils/noxRoleNavigation';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { styles } from './ProfilePage.styles';

/**
 * Composant principal de la page de profil
 * @param {Object} props - Les propriétés du composant
 * @param {Object} props.user - Données utilisateur (optionnel, pour compatibilité)
 * @param {Array} props.tickets - Liste des tickets de l'utilisateur
 * @param {Function} props.onUpdateUser - Callback pour mettre à jour l'utilisateur (optionnel)
 */
export default function ProfilePage({ user, tickets = [], onUpdateUser }) {
  const { user: authUser, updateUser: updateAuthUser, refreshCurrentUser, logout } = useAuth();
  const { navigate, goBack } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  
  // Utiliser authUser du contexte au lieu des props user (source de vérité)
  const username = authUser?.username || user?.username || 'Utilisateur';
  const level = authUser?.level || user?.level || 1;
  const score = authUser?.score || user?.score || 0;
  const sbtActive = authUser?.sbtActive || user?.sbtActive || false;
  const ticketsCount = user?.tickets ?? tickets.length ?? 0;
  const eventsParticipated = user?.eventsParticipated ?? 0;
  const email = authUser?.email || user?.email || '';
  const emailVerified = authUser?.emailVerified ?? user?.emailVerified ?? false;
  const isAuthenticated = authUser?.isAuthenticated ?? false;

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ username });
  const [profiles, setProfiles] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [switchingProfile, setSwitchingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);
  const [emailCodeCooldown, setEmailCodeCooldown] = useState(0); // secondes avant de pouvoir renvoyer
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    setForm({ username });
  }, [username]);

  useEffect(() => {
    if (isAuthenticated && authUser?.token) {
      fetchProfiles();
    }
  }, [isAuthenticated, authUser?.token]);

  /**
   * Récupère tous les profils de l'utilisateur (Community, DJ, Organisateur, Venue)
   */
  const fetchProfiles = async () => {
    if (!authUser?.token) return;
    setLoadingProfiles(true);
    try {
      const response = await api.getUserProfiles(authUser.token);
      if (response && response.success) {
        setProfiles(response);
      }
    } catch (error) {
      console.error('Erreur récupération profils:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  /**
   * Bascule le profil actif de l'utilisateur
   * @param {string} profileType - Type de profil ('COMMUNITY', 'DJ', 'BOOKER', 'VENUE')
   */
  const handleSwitchProfile = async (profileType) => {
    if (!authUser?.token) return;
    setSwitchingProfile(true);
    try {
      const response = await api.switchProfile(authUser.token, profileType);
      if (response && response.success) {
        updateAuthUser({ activeProfileType: profileType });
        await refreshCurrentUser();
        await fetchProfiles();
        showSuccess(`Profil basculé vers ${profileType}`);
        navigate(getHomeScreenForProfile(profileType));
      } else {
        showError(response?.message || 'Impossible de basculer le profil');
      }
    } catch (error) {
      console.error('Erreur bascule profil:', error);
      showError(error?.message || 'Impossible de basculer le profil');
    } finally {
      setSwitchingProfile(false);
    }
  };

  /**
   * Sauvegarde les modifications du nom d'utilisateur
   */
  const handleSave = () => {
    const normalized = form.username.trim();
    if (!normalized) {
      showError('Le nom ne peut pas être vide.');
      return;
    }

    // Mettre à jour le contexte d'authentification
    if (isAuthenticated) {
      updateAuthUser({ username: normalized });
    }
    
    // Mettre à jour via la prop si elle existe (pour compatibilité)
    if (onUpdateUser) {
      onUpdateUser({ username: normalized });
    }
    
    showSuccess('Profil mis à jour !');
    setIsEditing(false);
  };

  /**
   * Gère le changement de mot de passe
   * Valide les champs et appelle l'API pour mettre à jour le mot de passe
   */
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm;
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showError('Tous les champs sont requis.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Le nouveau mot de passe et la confirmation ne correspondent pas.');
      return;
    }

    if (newPassword.length < 6) {
      showError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (!authUser?.token) {
      showError('Vous devez être connecté pour changer votre mot de passe.');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await api.changePassword(
        authUser.token,
        oldPassword,
        newPassword,
        confirmPassword
      );
      
      if (response && response.success) {
        showSuccess('Mot de passe modifié avec succès.');
        setIsChangingPassword(false);
        setPasswordForm({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        showError(response?.message || 'Impossible de modifier le mot de passe.');
      }
    } catch (error) {
      console.error('Erreur changement mot de passe:', error);
      showError(error?.message || 'Impossible de modifier le mot de passe.');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <NoxScreenHeader
        title="Profil"
        subtitle="Gère tes profils et tes préférences"
        onBack={goBack}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View style={styles.header}>
          <View style={styles.avatar}>
            {(() => {
              const activeType = profiles?.activeProfileType || authUser?.activeProfileType;
              let imageUrl = null;
              let initial = username?.charAt(0)?.toUpperCase() || '?';
              if (profiles?.profiles && activeType) {
                if (activeType === 'COMMUNITY' && profiles.profiles.community?.[0]?.profileImage) {
                  imageUrl = profiles.profiles.community[0].profileImage;
                  initial = profiles.profiles.community[0].pseudo?.charAt(0)?.toUpperCase() || initial;
                } else if (activeType === 'DJ' && profiles.profiles.dj?.[0]?.profileImage) {
                  imageUrl = profiles.profiles.dj[0].profileImage;
                  initial = profiles.profiles.dj[0].artistName?.charAt(0)?.toUpperCase() || initial;
                } else if (activeType === 'BOOKER' && profiles.profiles.booker?.[0]?.profileImage) {
                  imageUrl = profiles.profiles.booker[0].profileImage;
                  initial = profiles.profiles.booker[0].pseudo?.charAt(0)?.toUpperCase() || initial;
                } else if (activeType === 'VENUE' && profiles.profiles.venue?.[0]) {
                  imageUrl = profiles.profiles.venue[0].profileImage;
                  initial = profiles.profiles.venue[0].venueName?.charAt(0)?.toUpperCase() || initial;
                } else if (activeType === 'PRESTATAIRE' && profiles.profiles.prestataire?.[0]) {
                  imageUrl = profiles.profiles.prestataire[0].profileImage;
                  initial =
                    profiles.profiles.prestataire[0].businessName?.charAt(0)?.toUpperCase() || initial;
                }
              }
              if (imageUrl) {
                return <Image source={{ uri: normalizeMediaUrl(imageUrl) }} style={styles.avatarImage} />;
              }
              return <NoxText style={styles.avatarText}>{initial}</NoxText>;
            })()}
          </View>
          <NoxText variant="titleSecondary" style={styles.title}>
            Mes profils
          </NoxText>
          <NoxText variant="secondary" style={styles.subtitle}>
            Gère tes profils et bascule entre eux
          </NoxText>
        </View>

        <NoxCard style={styles.card}>
          <View style={styles.cardHeader}>
            <NoxText variant="titleSecondary" style={styles.cardTitle}>
              Informations
            </NoxText>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <NoxText style={styles.editLink}>Modifier</NoxText>
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditing ? (
            <View>
              <NoxInput
                label="Nom d'utilisateur"
                value={form.username}
                onChangeText={(text) => setForm({ username: text })}
                placeholder="Nom d'utilisateur"
                containerStyle={styles.codeInputWrap}
              />
              <View style={styles.editActions}>
                <NoxButton
                  label="Annuler"
                  variant="secondary"
                  onPress={() => setIsEditing(false)}
                  style={styles.editActionBtn}
                />
                <NoxButton label="Enregistrer" onPress={handleSave} style={styles.editActionBtn} />
              </View>
            </View>
          ) : (
            <View style={styles.info}>
              <View style={styles.infoRow}>
                <NoxText variant="secondary">Nom d'utilisateur</NoxText>
                <NoxText variant="form" style={styles.infoValue}>
                  {username}
                </NoxText>
              </View>
              {isAuthenticated ? (
                <>
                  <View style={styles.infoRow}>
                    <NoxText variant="secondary">Email</NoxText>
                    <NoxText variant="form" style={styles.infoValue}>{email}</NoxText>
                  </View>

                  <View style={styles.infoRow}>
                    <NoxText variant="secondary">Statut</NoxText>
                    <NoxText variant="form" style={[styles.infoValue, emailVerified ? styles.success : styles.warning]}>
                      {emailVerified ? 'Vérifié' : 'Non vérifié'}
                    </NoxText>
                  </View>

                  {!emailVerified ? (
                    <View style={styles.emailVerifyBox}>
                      <NoxButton
                        label={sendingEmailCode ? '…' : 'Envoyer un code'}
                        variant="secondary"
                        onPress={async () => {
                          if (!authUser?.token || sendingEmailCode || emailCodeCooldown > 0) return;
                          setSendingEmailCode(true);
                          try {
                            const res = await api.sendEmailVerificationCode(authUser.token);
                            if (res?.success) showSuccess('Code envoyé.');
                            else showError(res?.message || 'Impossible d’envoyer le code.');
                          } catch (e) {
                            showError(e?.message || 'Impossible d’envoyer le code.');
                          } finally {
                            setSendingEmailCode(false);
                          }
                        }}
                        disabled={sendingEmailCode || emailCodeCooldown > 0}
                      />
                      <NoxInput
                        value={emailCode}
                        onChangeText={setEmailCode}
                        placeholder="Code (6 chiffres)"
                        keyboardType="number-pad"
                        maxLength={6}
                        containerStyle={styles.codeInputWrap}
                      />
                      <NoxButton
                        label={verifyingEmailCode ? '…' : 'Vérifier'}
                        onPress={async () => {
                          if (!authUser?.token || verifyingEmailCode) return;
                          if (!emailCode || emailCode.trim().length !== 6) {
                            showError('Code invalide.');
                            return;
                          }
                          setVerifyingEmailCode(true);
                          try {
                            const res = await api.confirmEmailVerificationCode(authUser.token, emailCode);
                            if (res?.success) {
                              showSuccess('Email vérifié.');
                              setEmailCode('');
                              await refreshCurrentUser();
                            } else {
                              showError(res?.message || 'Code incorrect.');
                            }
                          } catch (e) {
                            showError(e?.message || 'Code incorrect.');
                          } finally {
                            setVerifyingEmailCode(false);
                          }
                        }}
                        loading={verifyingEmailCode}
                        disabled={verifyingEmailCode}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
              <View style={styles.infoRow}>
                <NoxText variant="secondary">Niveau</NoxText>
                <NoxText variant="form" style={styles.infoValue}>{level}</NoxText>
              </View>
              <View style={styles.infoRow}>
                <NoxText variant="secondary">Score</NoxText>
                <NoxText variant="form" style={[styles.infoValue, { color: Colors.primary }]}>{score}</NoxText>
              </View>
              <View style={styles.infoRow}>
                <NoxText variant="secondary">SBT</NoxText>
                <NoxText variant="form" style={[styles.infoValue, sbtActive ? styles.success : styles.warning]}>
                  {sbtActive ? 'Actif' : 'Inactif'}
                </NoxText>
              </View>
            </View>
          )}
        </NoxCard>

        {isAuthenticated && (
          <NoxCard style={styles.card}>
            <View style={styles.cardHeader}>
              <NoxText variant="titleSecondary" style={styles.cardTitle}>Sécurité</NoxText>
              {!isChangingPassword ? (
                <TouchableOpacity onPress={() => setIsChangingPassword(true)}>
                  <NoxText style={styles.editLink}>Modifier</NoxText>
                </TouchableOpacity>
              ) : null}
            </View>

            {isChangingPassword ? (
              <View>
                <NoxInput
                  label="Ancien mot de passe"
                  value={passwordForm.oldPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, oldPassword: text })}
                  secureTextEntry
                />
                <NoxInput
                  label="Nouveau mot de passe"
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                  secureTextEntry
                />
                <NoxInput
                  label="Confirmer le nouveau mot de passe"
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  secureTextEntry
                />
                <View style={styles.editActions}>
                  <NoxButton
                    label="Annuler"
                    variant="secondary"
                    onPress={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    disabled={changingPassword}
                    style={styles.editActionBtn}
                  />
                  <NoxButton
                    label="Enregistrer"
                    onPress={handleChangePassword}
                    loading={changingPassword}
                    style={styles.editActionBtn}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.infoRow}>
                <NoxText variant="secondary">Mot de passe</NoxText>
                <NoxText variant="form" style={styles.infoValue}>••••••••</NoxText>
              </View>
            )}
          </NoxCard>
        )}

        {isAuthenticated && (
          <NoxCard style={styles.card}>
            <NoxText variant="titleSecondary" style={styles.cardTitle}>
              Données et confidentialité
            </NoxText>
            <NoxText variant="secondary" style={styles.rgpdDescription}>
              Exporte tes données ou supprime ton compte (RGPD).
            </NoxText>
            <View style={styles.rgpdButtons}>
              <NoxButton
                label="Exporter mes données"
                variant="secondary"
                loading={exportingData}
                onPress={async () => {
                  if (!authUser?.token || exportingData) return;
                  setExportingData(true);
                  try {
                    const data = await api.exportUserData(authUser.token);
                    await Share.share({
                      message: JSON.stringify(data, null, 2),
                      title: 'Mes données NOX',
                    });
                    showSuccess('Données exportées.');
                  } catch (e) {
                    showError(e?.message || 'Erreur lors de l\'export.');
                  } finally {
                    setExportingData(false);
                  }
                }}
                style={styles.rgpdBtn}
              />
              <NoxButton
                label="Supprimer mon compte"
                variant="ghost"
                onPress={() => setDeleteModalVisible(true)}
                style={styles.rgpdBtn}
                textStyle={{ color: Colors.error }}
              />
            </View>
          </NoxCard>
        )}

        <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <NoxCard style={styles.modalCard}>
              <NoxText variant="titleSecondary">Supprimer mon compte</NoxText>
              <NoxText variant="secondary">
                Action irréversible. Entre ton mot de passe pour confirmer.
              </NoxText>
              <NoxInput
                placeholder="Mot de passe"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
              <View style={styles.modalActions}>
                <NoxButton
                  label="Annuler"
                  variant="secondary"
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setDeletePassword('');
                  }}
                  disabled={deletingAccount}
                  style={styles.modalActionBtn}
                />
                <NoxButton
                  label="Supprimer"
                  onPress={async () => {
                    if (!authUser?.token || !deletePassword || deletingAccount) return;
                    setDeletingAccount(true);
                    try {
                      await api.deleteAccount(authUser.token, deletePassword);
                      setDeleteModalVisible(false);
                      setDeletePassword('');
                      showSuccess('Compte supprimé.');
                      await logout();
                      navigate('home');
                    } catch (e) {
                      showError(e?.message || 'Mot de passe incorrect ou erreur.');
                    } finally {
                      setDeletingAccount(false);
                    }
                  }}
                  loading={deletingAccount}
                  disabled={!deletePassword || deletingAccount}
                  style={styles.modalActionBtn}
                />
              </View>
            </NoxCard>
          </View>
        </Modal>

        {isAuthenticated && (
          <NoxCard style={styles.card}>
            <View style={styles.cardHeader}>
              <NoxText variant="titleSecondary" style={styles.cardTitle}>
                Mes profils
              </NoxText>
              <NoxButton
                label="+ Ajouter"
                variant="ghost"
                onPress={() => navigate('switchProfile')}
                fullWidth={false}
                style={styles.profileEditBtn}
              />
            </View>
            {loadingProfiles ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : profiles ? (
              <View>
                <NoxText style={styles.profileActiveLabel}>
                  Profil actif : {profiles.activeProfileType || 'Aucun'}
                </NoxText>
                {[
                  { key: 'COMMUNITY', title: 'Communauté', list: profiles.profiles?.community, label: (p) => p.pseudo || `${p.prenom} ${p.nom}`, edit: () => navigate('communityProfileEdit') },
                  { key: 'DJ', title: 'DJ', list: profiles.profiles?.dj, label: (p) => p.artistName, edit: () => navigate('djDashboard', { openSection: 'profil' }) },
                  { key: 'BOOKER', title: 'Organisateur', list: profiles.profiles?.booker, label: (p) => p.pseudo || `${p.prenom} ${p.nom}`, edit: () => navigate('bookerDashboard', { openSection: 'profil' }) },
                  { key: 'VENUE', title: 'Lieu', list: profiles.profiles?.venue, label: (p) => p.venueName, edit: () => navigate('venueProfileEdit') },
                  { key: 'PRESTATAIRE', title: 'Prestataire', list: profiles.profiles?.prestataire, label: (p) => p.businessName, edit: () => navigate('prestataireDashboard') },
                ].map(({ key, title, list, label, edit }) =>
                  list?.length ? (
                    <View key={key} style={styles.profileSection}>
                      <NoxText style={styles.profileSectionTitle}>{title}</NoxText>
                      {list.map((profile) => (
                        <View key={profile.id} style={styles.profileItemRow}>
                          <TouchableOpacity
                            style={[styles.profileItem, profiles.activeProfileType === key && styles.profileItemActive]}
                            onPress={() => handleSwitchProfile(key)}
                            disabled={switchingProfile || profiles.activeProfileType === key}
                          >
                            <NoxText variant="form" style={styles.profileItemText} numberOfLines={2}>
                              {label(profile)}
                            </NoxText>
                            {profiles.activeProfileType === key ? (
                              <NoxText style={styles.profileItemActiveBadge}>Actif</NoxText>
                            ) : switchingProfile ? (
                              <ActivityIndicator size="small" color={Colors.primary} />
                            ) : null}
                          </TouchableOpacity>
                          <NoxButton label="Modifier" variant="ghost" onPress={edit} fullWidth={false} style={styles.profileEditBtn} />
                        </View>
                      ))}
                    </View>
                  ) : null,
                )}
                {!profiles.profiles?.community?.length &&
                !profiles.profiles?.dj?.length &&
                !profiles.profiles?.booker?.length &&
                !profiles.profiles?.venue?.length &&
                !profiles.profiles?.prestataire?.length ? (
                  <View style={styles.noProfilesBox}>
                    <NoxText variant="secondary">Aucun profil créé.</NoxText>
                    <NoxButton label="Créer un profil" onPress={() => navigate('switchProfile')} fullWidth={false} />
                  </View>
                ) : null}
              </View>
            ) : (
              <NoxText variant="secondary">Chargement des profils…</NoxText>
            )}
          </NoxCard>
        )}

        <NoxCard style={styles.card}>
          <NoxText variant="titleSecondary" style={styles.cardTitle}>
            Statistiques
          </NoxText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <NoxText style={styles.statValue}>{ticketsCount}</NoxText>
              <NoxText variant="secondary" style={styles.statLabel}>Tickets</NoxText>
            </View>
            <View style={styles.statItem}>
              <NoxText style={styles.statValue}>{eventsParticipated}</NoxText>
              <NoxText variant="secondary" style={styles.statLabel}>Événements</NoxText>
            </View>
            <View style={styles.statItem}>
              <NoxText style={styles.statValue}>3</NoxText>
              <NoxText variant="secondary" style={styles.statLabel}>Badges</NoxText>
            </View>
          </View>
        </NoxCard>

      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </SafeAreaView>
  );
}

