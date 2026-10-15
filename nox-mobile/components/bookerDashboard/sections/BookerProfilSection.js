import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/colors';
import { normalizeMediaUrl } from '../../../api/config';

/** Onglet profil — dashboard organisateur. */
export default function BookerProfilSection(props) {
  const {
    language,
    styles,
    loadingProfile,
    bookerProfile,
    profileImage,
    profileForm,
    setProfileForm,
    uploadingProfileImage,
    pickProfileImage,
    savingProfile,
    saveBookerProfile,
  } = props;

  return (
              <View style={styles.profileSection}>
                {loadingProfile ? (
                  <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
                ) : (
                  <>
                    <Text style={styles.sectionTitle}>
                      {language === 'fr' ? 'Mon Profil' : 'My Profile'}
                    </Text>
    
                    {/* Bannière infos légales vides */}
                    {!(bookerProfile?.companyName || bookerProfile?.address || bookerProfile?.postalCode || bookerProfile?.city || bookerProfile?.country || bookerProfile?.siret) && (
                      <View style={styles.legalBanner}>
                        <Text style={styles.legalBannerText}>
                          📋 {language === 'fr' ? 'Complétez vos infos légales (société, SIRET, adresse) pour les contrats. Faites défiler vers le bas.' : 'Complete your legal info (company, SIRET, address) for contracts. Scroll down.'}
                        </Text>
                      </View>
                    )}
                    
                    {/* Photo de profil */}
                    <View style={styles.profileImageContainer}>
                      {profileImage ? (
                        <Image
                          source={{ uri: normalizeMediaUrl(profileImage) }}
                          style={styles.profileImage}
                        />
                      ) : (
                        <View style={styles.profileImagePlaceholder}>
                          <Ionicons name="person" size={60} color="rgba(255,255,255,0.5)" />
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.changePhotoButton}
                        onPress={pickProfileImage}
                        disabled={uploadingProfileImage}
                      >
                        {uploadingProfileImage ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Ionicons name="camera" size={20} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
    
                    {/* Formulaire */}
                    <View style={styles.profileForm}>
                      <Text style={styles.inputLabel}>
                        {language === 'fr' ? 'Pseudo (affiché sur le feed)' : 'Nickname (displayed on feed)'}
                      </Text>
                      <TextInput
                        style={styles.input}
                        value={profileForm.pseudo}
                        onChangeText={(v) => setProfileForm((p) => ({ ...p, pseudo: v }))}
                        placeholder={language === 'fr' ? 'Ex: parano69100' : 'e.g. parano69100'}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                      />
    
                      <Text style={styles.inputLabel}>{language === 'fr' ? 'Nom' : 'Last Name'}</Text>
                      <TextInput
                        style={styles.input}
                        value={profileForm.nom}
                        onChangeText={(v) => setProfileForm((p) => ({ ...p, nom: v }))}
                        placeholder={language === 'fr' ? 'Nom' : 'Last Name'}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                      />
    
                      <Text style={styles.inputLabel}>{language === 'fr' ? 'Prénom' : 'First Name'}</Text>
                      <TextInput
                        style={styles.input}
                        value={profileForm.prenom}
                        onChangeText={(v) => setProfileForm((p) => ({ ...p, prenom: v }))}
                        placeholder={language === 'fr' ? 'Prénom' : 'First Name'}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                      />
    
                      <Text style={styles.inputLabel}>{language === 'fr' ? 'Téléphone professionnel' : 'Professional Phone'}</Text>
                      <TextInput
                        style={styles.input}
                        value={profileForm.phonePro}
                        onChangeText={(v) => setProfileForm((p) => ({ ...p, phonePro: v }))}
                        placeholder={language === 'fr' ? 'Téléphone professionnel' : 'Professional Phone'}
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="phone-pad"
                      />
    
                      {(() => {
                        const legalEditable = !(bookerProfile?.companyName || bookerProfile?.address || bookerProfile?.postalCode || bookerProfile?.city || bookerProfile?.country || bookerProfile?.siret);
                        return (
                          <>
                            <Text style={[styles.inputLabel, styles.legalSectionTitle]}>
                              {language === 'fr' ? 'Infos légales (pour les contrats)' : 'Legal info (for contracts)'}
                            </Text>
                            {legalEditable ? (
                              <>
                                <Text style={styles.legalHint}>
                                  {language === 'fr' ? 'Complétez une seule fois. Ces champs ne pourront plus être modifiés après enregistrement.' : 'Fill once. These fields cannot be edited after saving.'}
                                </Text>
                                <Text style={styles.inputLabel}>{language === 'fr' ? 'Société' : 'Company'}</Text>
                                <TextInput style={styles.input} value={profileForm.companyName} onChangeText={(v) => setProfileForm((p) => ({ ...p, companyName: v }))} placeholder={language === 'fr' ? 'Raison sociale' : 'Company name'} placeholderTextColor="rgba(255,255,255,0.4)" />
                                <Text style={styles.inputLabel}>{language === 'fr' ? 'Adresse' : 'Address'}</Text>
                                <TextInput style={styles.input} value={profileForm.address} onChangeText={(v) => setProfileForm((p) => ({ ...p, address: v }))} placeholder={language === 'fr' ? 'Adresse complète' : 'Full address'} placeholderTextColor="rgba(255,255,255,0.4)" />
                                <Text style={styles.inputLabel}>{language === 'fr' ? 'Code postal' : 'Postal code'}</Text>
                                <TextInput style={styles.input} value={profileForm.postalCode} onChangeText={(v) => setProfileForm((p) => ({ ...p, postalCode: v }))} placeholder="75001" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                                <Text style={styles.inputLabel}>{language === 'fr' ? 'Ville' : 'City'}</Text>
                                <TextInput style={styles.input} value={profileForm.city} onChangeText={(v) => setProfileForm((p) => ({ ...p, city: v }))} placeholder="Paris" placeholderTextColor="rgba(255,255,255,0.4)" />
                                <Text style={styles.inputLabel}>{language === 'fr' ? 'Pays' : 'Country'}</Text>
                                <TextInput style={styles.input} value={profileForm.country} onChangeText={(v) => setProfileForm((p) => ({ ...p, country: v }))} placeholder="France" placeholderTextColor="rgba(255,255,255,0.4)" />
                                <Text style={styles.inputLabel}>SIRET</Text>
                                <TextInput style={styles.input} value={profileForm.siret} onChangeText={(v) => setProfileForm((p) => ({ ...p, siret: v }))} placeholder="123 456 789 00012" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                              </>
                            ) : (
                              <View style={styles.readOnlyLegalWrap}>
                                {profileForm.companyName ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Société' : 'Company'}: {profileForm.companyName}</Text> : null}
                                {profileForm.address ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Adresse' : 'Address'}: {profileForm.address}</Text> : null}
                                {(profileForm.postalCode || profileForm.city) ? <Text style={styles.readOnlyLegalText}>{profileForm.postalCode} {profileForm.city}</Text> : null}
                                {profileForm.country ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Pays' : 'Country'}: {profileForm.country}</Text> : null}
                                {profileForm.siret ? <Text style={styles.readOnlyLegalText}>SIRET: {profileForm.siret}</Text> : null}
                                <Text style={styles.readOnlyLegalHint}>{language === 'fr' ? 'Ces informations ne peuvent plus être modifiées.' : 'These details cannot be modified.'}</Text>
                              </View>
                            )}
                          </>
                        );
                      })()}
    
                      <Text style={styles.inputLabel}>{language === 'fr' ? 'Type d\'organisateur' : 'Organizer Type'}</Text>
                      <View style={styles.bookerTypeContainer}>
                        {['INDEPENDENT', 'AGENCY', 'VENUE'].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.bookerTypeButton,
                              profileForm.bookerType === type && styles.bookerTypeButtonActive,
                            ]}
                            onPress={() => setProfileForm((p) => ({ ...p, bookerType: type }))}
                          >
                            <Text
                              style={[
                                styles.bookerTypeButtonText,
                                profileForm.bookerType === type && styles.bookerTypeButtonTextActive,
                              ]}
                            >
                              {type === 'INDEPENDENT'
                                ? language === 'fr'
                                  ? 'Indépendant'
                                  : 'Independent'
                                : type === 'AGENCY'
                                ? language === 'fr'
                                  ? 'Agence'
                                  : 'Agency'
                                : language === 'fr'
                                ? 'Lieu'
                                : 'Venue'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
    
                      <TouchableOpacity
                        style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
                        onPress={saveBookerProfile}
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <ActivityIndicator size="small" color={Colors.background} />
                        ) : (
                          <Text style={styles.saveButtonText}>
                            {language === 'fr' ? 'Enregistrer' : 'Save'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
  );
}
