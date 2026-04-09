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
  StyleSheet,
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
import { api, normalizeMediaUrl } from '../../api/config';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

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
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('welcome')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
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

                {(!profiles.profiles?.community || profiles.profiles.community.length === 0) &&
                 (!profiles.profiles?.dj || profiles.profiles.dj.length === 0) &&
                 (!profiles.profiles?.booker || profiles.profiles.booker.length === 0) &&
                 (!profiles.profiles?.venue || profiles.profiles.venue.length === 0) && (
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  backButtonTop: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  switchProfileButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 122, 26, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  switchProfileButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  avatarText: {
    color: Colors.background,
    fontSize: 54,
    fontWeight: '900',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  alertCard: {
    backgroundColor: '#141419',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  alertTitle: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '700',
  },
  alertText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: '#facc15',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertButtonText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  addProfileButton: {
    backgroundColor: 'rgba(255,23,68,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
  },
  addProfileButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  editButton: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.15)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValueHighlight: {
    color: Colors.primary,
  },
  success: {
    color: '#10b981',
  },
  warning: {
    color: '#ef4444',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 16,
    padding: 12,
    marginBottom: 16,
  },
  emailVerifyBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    gap: 10,
  },
  codeInput: {
    marginBottom: 0,
  },
  smallButton: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
  },
  smallPrimaryButton: {
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  smallButtonDisabled: {
    opacity: 0.6,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  smallPrimaryButtonText: {
    color: Colors.background,
    fontWeight: '800',
  },
  editActions: {
    flexDirection: 'row',
    textAlign: 'center',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  saveText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
    marginHorizontal: 6,
  },
  statValue: {
    color: Colors.primary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  note: {
    backgroundColor: '#141419',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
    borderRadius: 16,
    padding: 18,
  },
  noteTitle: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  noteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  profileActiveLabel: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  profileSection: {
    marginBottom: 20,
  },
  profileSectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  profileItem: {
    backgroundColor: '#141419',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileItemActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  profileItemText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  profileItemActiveBadge: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  profileItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  profileItemFlex: {
    flex: 1,
  },
  profileEditButton: {
    backgroundColor: 'rgba(255,23,68,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  profileEditButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  noProfilesText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  noProfilesBox: {
    backgroundColor: '#141419',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  createProfileBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  createProfileBtnText: {
    color: Colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  rgpdDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  rgpdButtons: {
    gap: 10,
  },
  rgpdButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.4)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rgpdButtonDisabled: {
    opacity: 0.6,
  },
  rgpdButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rgpdButtonDanger: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  rgpdButtonDangerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#1a1a1f',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.4)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  modalDeleteButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#ef4444',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalDeleteText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
