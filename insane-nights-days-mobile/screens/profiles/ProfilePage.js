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
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Alert,
  Modal,
  Share,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, normalizeMediaUrl } from '../../api/config';
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
  const { navigate } = useNavigation();
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('welcome')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 56 },
        ]}
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
              return <Text style={styles.avatarText}>{initial}</Text>;
            })()}
          </View>
          <Text style={styles.title}>👤 Mes Profils</Text>
          <Text style={styles.subtitle}>Gère tes profils et bascule entre eux</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Informations</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>✏️ Modifier</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditing ? (
            <View>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                value={form.username}
                onChangeText={text => setForm({ username: text })}
                placeholder="Nom d'utilisateur"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.info}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nom d'utilisateur</Text>
                <Text style={styles.infoValue}>{username}</Text>
              </View>
              {isAuthenticated ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{email}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Statut</Text>
                    <Text style={[styles.infoValue, emailVerified ? styles.success : styles.warning]}>
                      {emailVerified ? 'Vérifié' : 'Non vérifié'}
                    </Text>
                  </View>

                  {!emailVerified ? (
                    <View style={styles.emailVerifyBox}>
                      <TouchableOpacity
                        style={[styles.smallButton, (sendingEmailCode || emailCodeCooldown > 0) && styles.smallButtonDisabled]}
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
                        disabled={sendingEmailCode}
                      >
                        <Text style={styles.smallButtonText}>
                          {sendingEmailCode ? '...' : 'Envoyer un code'}
                        </Text>
                      </TouchableOpacity>

                      <TextInput
                        value={emailCode}
                        onChangeText={setEmailCode}
                        placeholder="Code (6 chiffres)"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="number-pad"
                        maxLength={6}
                        style={[styles.input, styles.codeInput]}
                      />

                      <TouchableOpacity
                        style={[styles.smallPrimaryButton, verifyingEmailCode && styles.smallButtonDisabled]}
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
                        disabled={verifyingEmailCode}
                      >
                        <Text style={styles.smallPrimaryButtonText}>
                          {verifyingEmailCode ? '...' : 'Vérifier'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Niveau</Text>
                <Text style={styles.infoValue}>{level}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Score</Text>
                <Text style={[styles.infoValue, styles.infoValueHighlight]}>{score}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SBT</Text>
                <Text style={[styles.infoValue, sbtActive ? styles.success : styles.warning]}>
                  {sbtActive ? '✅ Actif' : '❌ Inactif'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section Changer le mot de passe */}
        {isAuthenticated && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🔒 Sécurité</Text>
              {!isChangingPassword ? (
                <TouchableOpacity onPress={() => setIsChangingPassword(true)}>
                  <Text style={styles.editButton}>Modifier</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {isChangingPassword ? (
              <View>
                <Text style={styles.label}>Ancien mot de passe</Text>
                <TextInput
                  value={passwordForm.oldPassword}
                  onChangeText={text => setPasswordForm({ ...passwordForm, oldPassword: text })}
                  placeholder="Ancien mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.input}
                  secureTextEntry
                />

                <Text style={styles.label}>Nouveau mot de passe</Text>
                <TextInput
                  value={passwordForm.newPassword}
                  onChangeText={text => setPasswordForm({ ...passwordForm, newPassword: text })}
                  placeholder="Nouveau mot de passe (min. 6 caractères)"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.input}
                  secureTextEntry
                />

                <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
                <TextInput
                  value={passwordForm.confirmPassword}
                  onChangeText={text => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                  placeholder="Confirmer le nouveau mot de passe"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.input}
                  secureTextEntry
                />

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsChangingPassword(false);
                      setPasswordForm({
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                    }}
                    disabled={changingPassword}
                  >
                    <Text style={styles.cancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? (
                      <ActivityIndicator color={Colors.background} />
                    ) : (
                      <Text style={styles.saveText}>Enregistrer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.info}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Mot de passe</Text>
                  <Text style={styles.infoValue}>••••••••</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Section Données et confidentialité (RGPD) */}
        {isAuthenticated && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Données et confidentialité</Text>
            <Text style={styles.rgpdDescription}>
              Exportez vos données ou supprimez votre compte (RGPD).
            </Text>
            <View style={styles.rgpdButtons}>
              <TouchableOpacity
                style={[styles.rgpdButton, exportingData && styles.rgpdButtonDisabled]}
                onPress={async () => {
                  if (!authUser?.token || exportingData) return;
                  setExportingData(true);
                  try {
                    const data = await api.exportUserData(authUser.token);
                    const jsonStr = JSON.stringify(data, null, 2);
                    await Share.share({
                      message: jsonStr,
                      title: 'Mes données Insane Nights & Days',
                    });
                    showSuccess('Données exportées. Partagez ou enregistrez-les.');
                  } catch (e) {
                    showError(e?.message || 'Erreur lors de l\'export.');
                  } finally {
                    setExportingData(false);
                  }
                }}
                disabled={exportingData}
              >
                {exportingData ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Text style={styles.rgpdButtonText}>Exporter mes données</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rgpdButtonDanger]}
                onPress={() => setDeleteModalVisible(true)}
              >
                <Text style={styles.rgpdButtonDangerText}>Supprimer mon compte</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modal suppression compte */}
        <Modal visible={deleteModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Supprimer mon compte</Text>
              <Text style={styles.modalText}>
                Cette action est irréversible. Toutes vos données seront effacées. Entrez votre mot de passe pour confirmer.
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Mot de passe"
                placeholderTextColor="rgba(255,255,255,0.4)"
                secureTextEntry
                value={deletePassword}
                onChangeText={setDeletePassword}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    setDeletePassword('');
                  }}
                  disabled={deletingAccount}
                >
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalDeleteButton, (!deletePassword || deletingAccount) && styles.modalButtonDisabled]}
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
                  disabled={!deletePassword || deletingAccount}
                >
                  {deletingAccount ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalDeleteText}>Supprimer définitivement</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Section Profils */}
        {isAuthenticated && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Mes Profils</Text>
              <TouchableOpacity
                style={styles.addProfileButton}
                onPress={() => navigate('switchProfile')}
              >
                <Text style={styles.addProfileButtonText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>
            {loadingProfiles ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : profiles ? (
              <View>
                <Text style={styles.profileActiveLabel}>
                  Profil actif : {profiles.activeProfileType || 'Aucun'}
                </Text>
                
                {/* Profils Community */}
                {profiles.profiles?.community && profiles.profiles.community.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>👥 Communauté</Text>
                    {profiles.profiles.community.map((profile) => (
                      <View key={profile.id} style={styles.profileItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.profileItem,
                            styles.profileItemFlex,
                            profiles.activeProfileType === 'COMMUNITY' && styles.profileItemActive,
                          ]}
                          onPress={() => handleSwitchProfile('COMMUNITY')}
                          disabled={switchingProfile || profiles.activeProfileType === 'COMMUNITY'}
                        >
                          <Text style={styles.profileItemText}>
                            {profile.pseudo || `${profile.prenom} ${profile.nom}`}
                          </Text>
                          {profiles.activeProfileType === 'COMMUNITY' && (
                            <Text style={styles.profileItemActiveBadge}>✓ Actif</Text>
                          )}
                          {switchingProfile && profiles.activeProfileType !== 'COMMUNITY' && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.profileEditButton}
                          onPress={() => navigate('communityProfileEdit')}
                        >
                          <Text style={styles.profileEditButtonText}>Modifier</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Profils DJ */}
                {profiles.profiles?.dj && profiles.profiles.dj.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>🎧 DJ</Text>
                    {profiles.profiles.dj.map((profile) => (
                      <View key={profile.id} style={styles.profileItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.profileItem,
                            styles.profileItemFlex,
                            profiles.activeProfileType === 'DJ' && styles.profileItemActive,
                          ]}
                          onPress={() => handleSwitchProfile('DJ')}
                          disabled={switchingProfile || profiles.activeProfileType === 'DJ'}
                        >
                          <Text style={styles.profileItemText}>{profile.artistName}</Text>
                          {profiles.activeProfileType === 'DJ' && (
                            <Text style={styles.profileItemActiveBadge}>✓ Actif</Text>
                          )}
                          {switchingProfile && profiles.activeProfileType !== 'DJ' && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.profileEditButton}
                          onPress={() => navigate('djDashboard', { openSection: 'profil' })}
                        >
                          <Text style={styles.profileEditButtonText}>Modifier</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Profils Organisateur */}
                {profiles.profiles?.booker && profiles.profiles.booker.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>📅 Organisateur</Text>
                    {profiles.profiles.booker.map((profile) => (
                      <View key={profile.id} style={styles.profileItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.profileItem,
                            styles.profileItemFlex,
                            profiles.activeProfileType === 'BOOKER' && styles.profileItemActive,
                          ]}
                          onPress={() => handleSwitchProfile('BOOKER')}
                          disabled={switchingProfile || profiles.activeProfileType === 'BOOKER'}
                        >
                          <Text style={styles.profileItemText}>
                            {profile.pseudo || `${profile.prenom} ${profile.nom}`}
                          </Text>
                          {profiles.activeProfileType === 'BOOKER' && (
                            <Text style={styles.profileItemActiveBadge}>✓ Actif</Text>
                          )}
                          {switchingProfile && profiles.activeProfileType !== 'BOOKER' && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.profileEditButton}
                          onPress={() => navigate('bookerDashboard', { openSection: 'profil' })}
                        >
                          <Text style={styles.profileEditButtonText}>Modifier</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Profils Venue */}
                {profiles.profiles?.venue && profiles.profiles.venue.length > 0 && (
                  <View style={styles.profileSection}>
                    <Text style={styles.profileSectionTitle}>🏢 Lieu</Text>
                    {profiles.profiles.venue.map((profile) => (
                      <View key={profile.id} style={styles.profileItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.profileItem,
                            styles.profileItemFlex,
                            profiles.activeProfileType === 'VENUE' && styles.profileItemActive,
                          ]}
                          onPress={() => handleSwitchProfile('VENUE')}
                          disabled={switchingProfile || profiles.activeProfileType === 'VENUE'}
                        >
                          <Text style={styles.profileItemText}>{profile.venueName}</Text>
                          {profiles.activeProfileType === 'VENUE' && (
                            <Text style={styles.profileItemActiveBadge}>✓ Actif</Text>
                          )}
                          {switchingProfile && profiles.activeProfileType !== 'VENUE' && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.profileEditButton}
                          onPress={() => navigate('venueProfileEdit')}
                        >
                          <Text style={styles.profileEditButtonText}>Modifier</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Profils Prestataire */}
                {profiles.profiles?.prestataire && profiles.profiles.prestataire.length > 0 && (
                  <View style={[styles.profileSection, styles.profileSectionLast]}>
                    <Text style={styles.profileSectionTitle}>🛠️ Prestataire</Text>
                    {profiles.profiles.prestataire.map((profile) => (
                      <View key={profile.id} style={styles.profileItemRow}>
                        <TouchableOpacity
                          style={[
                            styles.profileItem,
                            styles.profileItemFlex,
                            profiles.activeProfileType === 'PRESTATAIRE' && styles.profileItemActive,
                          ]}
                          onPress={() => handleSwitchProfile('PRESTATAIRE')}
                          disabled={switchingProfile || profiles.activeProfileType === 'PRESTATAIRE'}
                        >
                          <Text style={styles.profileItemText} numberOfLines={2}>
                            {profile.businessName}
                            {Array.isArray(profile.prestationGenres) && profile.prestationGenres.length > 0
                              ? ` · ${profile.prestationGenres.join(', ')}`
                              : ''}
                          </Text>
                          {profiles.activeProfileType === 'PRESTATAIRE' && (
                            <Text style={styles.profileItemActiveBadge}>✓ Actif</Text>
                          )}
                          {switchingProfile && profiles.activeProfileType !== 'PRESTATAIRE' && (
                            <ActivityIndicator size="small" color={Colors.primary} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.profileEditButton}
                          onPress={() => navigate('prestataireDashboard')}
                        >
                          <Text style={styles.profileEditButtonText}>Modifier</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {(!profiles.profiles?.community || profiles.profiles.community.length === 0) &&
                 (!profiles.profiles?.dj || profiles.profiles.dj.length === 0) &&
                 (!profiles.profiles?.booker || profiles.profiles.booker.length === 0) &&
                 (!profiles.profiles?.venue || profiles.profiles.venue.length === 0) &&
                 (!profiles.profiles?.prestataire || profiles.profiles.prestataire.length === 0) && (
                  <View style={styles.noProfilesBox}>
                    <Text style={styles.noProfilesText}>
                      Aucun profil créé. Créez-en un !
                    </Text>
                    <TouchableOpacity style={styles.createProfileBtn} onPress={() => navigate('switchProfile')}>
                      <Text style={styles.createProfileBtnText}>Créer un profil</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noProfilesText}>Chargement des profils...</Text>
            )}
          </View>
        )}

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{ticketsCount}</Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{eventsParticipated}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </View>
  );
}

