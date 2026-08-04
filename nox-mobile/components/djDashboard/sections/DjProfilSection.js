import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../../constants/colors';
import StarRating from '../../StarRating';

/** Onglet dashboard DJ. */
export default function DjProfilSection(props) {
  const {
    language,
    styles,
    navigate,
    showConfirm,
    Colors,
    djProfile,
    bannerImage,
    profileImage,
    uploadingBannerImage,
    uploadingProfileImage,
    pickDjProfileImage,
    artistName,
    pseudo,
    setPseudo,
    realName,
    legalName,
    setLegalName,
    address,
    setAddress,
    postalCode,
    setPostalCode,
    country,
    setCountry,
    siret,
    setSiret,
    vatNumber,
    setVatNumber,
    bio,
    setBio,
    birthDate,
    genre,
    setGenre,
    city,
    mainCity,
    setMainCity,
    languages,
    setLanguages,
    soundcloudUrl,
    setSoundcloudUrl,
    spotifyUrl,
    setSpotifyUrl,
    openDjStreamPreview,
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    tiktokUrl,
    setTiktokUrl,
    handleSave,
    saving,
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    equipment,
    setEquipment,
    bookings,
    loadingBookings,
    processingInvitation,
    openChat,
    openGroupChat,
    handleAcceptInvitation,
    handleRejectInvitation,
    handleCancelBooking,
    ratingsData,
    loadingRatings,
    fetchRatings,
    photos,
    setPhotos,
    videos,
    setVideos,
    pickImage,
    pickVideo,
    deleteMedia,
    setSelectedVideo,
    setVideoPlayerVisible,
    setEditingTitle,
    setEditTitleValue,
    normalizeMediaUrl,
  } = props;

  return (
<KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          >
            <ScrollView 
              style={styles.contentScroll} 
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
            >
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'INFORMATIONS D\'ARTISTE' : 'ARTIST INFORMATION'}
        </Text>

            {!(djProfile?.legalName || djProfile?.address || djProfile?.postalCode || djProfile?.country || djProfile?.siret || djProfile?.vatNumber) && (
              <View style={styles.legalBanner}>
                <Text style={styles.legalBannerText}>
                  📋 {language === 'fr' ? 'Complétez vos infos légales (nom civil, SIRET, adresse) pour les contrats. Faites défiler vers le bas.' : 'Complete your legal info (legal name, SIRET, address) for contracts. Scroll down.'}
                </Text>
              </View>
            )}

            {/* Photo / bannière en premier (comme booker : galerie directe, sans passer par l’onglet Médias) */}
            <View style={styles.profileEditMediaHeader}>
              {bannerImage ? (
                <TouchableOpacity
                  style={styles.profileEditBannerWrap}
                  onPress={() => pickDjProfileImage('banner')}
                  disabled={uploadingBannerImage}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: normalizeMediaUrl(bannerImage) }} style={styles.profileEditBanner} />
                  {uploadingBannerImage ? (
                    <View style={styles.profileEditOverlayLoader}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  ) : null}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.profileEditBannerPlaceholder}
                  onPress={() => pickDjProfileImage('banner')}
                  disabled={uploadingBannerImage}
                  activeOpacity={0.9}
                >
                  <Ionicons name="image-outline" size={40} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.profileEditPlaceholderText}>
                    {language === 'fr' ? 'Ajouter une bannière' : 'Add banner'}
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.profileEditAvatarWrap}>
                {profileImage ? (
                  <TouchableOpacity
                    onPress={() => pickDjProfileImage('profile')}
                    disabled={uploadingProfileImage}
                    activeOpacity={0.9}
                    style={styles.profileEditAvatarTouch}
                  >
                    <Image source={{ uri: normalizeMediaUrl(profileImage) }} style={styles.profileEditAvatar} />
                    {uploadingProfileImage ? (
                      <View style={styles.profileEditAvatarLoader}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.profileEditAvatarPlaceholder}
                    onPress={() => pickDjProfileImage('profile')}
                    disabled={uploadingProfileImage}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="person" size={50} color="rgba(255,255,255,0.6)" />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.profileEditGalleryHint}>
                {language === 'fr'
                  ? 'Touchez la photo ou la bannière : la galerie s’ouvre et la photo choisie devient tout de suite votre image de profil ou bannière (comme pour un organisateur).'
                  : 'Tap the photo or banner: your gallery opens and the image you pick becomes your profile or banner right away (same as for a booker).'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Nom d\'artiste' : 'Artist Name'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{artistName || '-'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
      </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Pseudo' : 'Alias'}</Text>
              <TextInput
                style={styles.input}
                value={pseudo}
                onChangeText={setPseudo}
              />
                </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Nom réel' : 'Real Name'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{realName || '-'}</Text>
                </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
                </View>

            {(() => {
              const legalEditable = !(djProfile?.legalName || djProfile?.address || djProfile?.postalCode || djProfile?.country || djProfile?.siret || djProfile?.vatNumber);
              return (
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, styles.legalSectionTitle]}>{language === 'fr' ? 'Infos légales (pour les contrats)' : 'Legal info (for contracts)'}</Text>
                  {legalEditable ? (
                    <>
                      <Text style={styles.legalHint}>{language === 'fr' ? 'Complétez une seule fois. Ces champs ne pourront plus être modifiés après enregistrement.' : 'Fill once. These fields cannot be edited after saving.'}</Text>
                      <Text style={styles.label}>{language === 'fr' ? 'Nom légal' : 'Legal name'}</Text>
                      <TextInput style={styles.input} value={legalName} onChangeText={setLegalName} placeholder={language === 'fr' ? 'Nom civil complet' : 'Full legal name'} placeholderTextColor="rgba(255,255,255,0.4)" />
                      <Text style={styles.label}>{language === 'fr' ? 'Adresse' : 'Address'}</Text>
                      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={language === 'fr' ? 'Adresse complète' : 'Full address'} placeholderTextColor="rgba(255,255,255,0.4)" />
                      <Text style={styles.label}>{language === 'fr' ? 'Code postal' : 'Postal code'}</Text>
                      <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="75001" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                      <Text style={styles.label}>{language === 'fr' ? 'Pays' : 'Country'}</Text>
                      <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="France" placeholderTextColor="rgba(255,255,255,0.4)" />
                      <Text style={styles.label}>SIRET</Text>
                      <TextInput style={styles.input} value={siret} onChangeText={setSiret} placeholder="123 456 789 00012" placeholderTextColor="rgba(255,255,255,0.4)" keyboardType="numeric" />
                      <Text style={styles.label}>{language === 'fr' ? 'N° TVA' : 'VAT number'}</Text>
                      <TextInput style={styles.input} value={vatNumber} onChangeText={setVatNumber} placeholder="FR12345678901" placeholderTextColor="rgba(255,255,255,0.4)" />
                    </>
                  ) : (
                    <View style={styles.readOnlyLegalWrap}>
                      {legalName ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Nom légal' : 'Legal name'}: {legalName}</Text> : null}
                      {address ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'Adresse' : 'Address'}: {address}</Text> : null}
                      {(postalCode || country) ? <Text style={styles.readOnlyLegalText}>{postalCode} {country}</Text> : null}
                      {siret ? <Text style={styles.readOnlyLegalText}>SIRET: {siret}</Text> : null}
                      {vatNumber ? <Text style={styles.readOnlyLegalText}>{language === 'fr' ? 'N° TVA' : 'VAT'}: {vatNumber}</Text> : null}
                      <Text style={styles.readOnlyLegalHint}>{language === 'fr' ? 'Ces informations ne peuvent plus être modifiées.' : 'These details cannot be modified.'}</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Bio courte' : 'Short Bio'}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={language === 'fr' ? 'Votre biographie...' : 'Your biography...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={4}
              />
                </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Date de naissance' : 'Date of Birth'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{birthDate || '-'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Genre musical principal' : 'Main Music Genre'}</Text>
              <TextInput
                style={styles.input}
                value={genre}
                onChangeText={setGenre}
                placeholder="Techno"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
          </View>

            {/* Zones de déplacement */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Zones déplacées' : 'Travel Zones'}</Text>
              <View style={styles.daysContainer}>
                {Object.keys(availableDays).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      availableDays[day] && styles.dayButtonActive
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      availableDays[day] && styles.dayButtonTextActive
                    ]}>
                      {day}
            </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Ville (inscription)' : 'City (registration)'}</Text>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyText}>{city || '-'}</Text>
              </View>
              <Text style={styles.readOnlyHint}>{language === 'fr' ? 'Ce champ ne peut pas être modifié' : 'This field cannot be modified'}</Text>
          </View>
          
          <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Ville principale (optionnelle)' : 'Main City (optional)'}</Text>
              <TextInput
                style={styles.input}
                value={mainCity}
                onChangeText={setMainCity}
                placeholder={language === 'fr' ? 'Ville principale pour les déplacements' : 'Main city for travel'}
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
              </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{language === 'fr' ? 'Langues parlées' : 'Spoken Languages'}</Text>
              <TextInput
                style={styles.input}
                value={languages}
                onChangeText={setLanguages}
                placeholder="Français, Anglais"
                placeholderTextColor="rgba(255,255,255,0.4)"
                returnKeyType="done"
                blurOnSubmit={true}
              />
            </View>

            {/* Réseaux sociaux */}
            <Text style={[styles.sectionTitle, { marginTop: 30, marginBottom: 16 }]}>
              {language === 'fr' ? 'RÉSEAUX SOCIAUX' : 'SOCIAL NETWORKS'}
                </Text>
            <Text style={styles.socialStreamHint}>
              {language === 'fr'
                ? 'Spotify et SoundCloud : lecture dans l’app pour les visiteurs (embed officiel). Tu peux tester le lecteur avec les boutons sous chaque champ.'
                : 'Spotify and SoundCloud: visitors hear music in-app (official embed). Use the buttons under each field to preview.'}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎵 SoundCloud</Text>
              <TextInput
                style={styles.input}
                value={soundcloudUrl}
                onChangeText={setSoundcloudUrl}
                placeholder="https://soundcloud.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
              {soundcloudUrl.trim() ? (
                <TouchableOpacity
                  style={styles.streamPreviewLink}
                  onPress={() => openDjStreamPreview(soundcloudUrl, 'soundcloud')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.streamPreviewLinkText}>
                    ▶{' '}
                    {language === 'fr'
                      ? 'Tester la lecture intégrée (SoundCloud)'
                      : 'Preview in-app player (SoundCloud)'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>☁️ Spotify</Text>
              <TextInput
                style={styles.input}
                value={spotifyUrl}
                onChangeText={setSpotifyUrl}
                placeholder="https://open.spotify.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
              {spotifyUrl.trim() ? (
                <TouchableOpacity
                  style={styles.streamPreviewLink}
                  onPress={() => openDjStreamPreview(spotifyUrl, 'spotify')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.streamPreviewLinkText}>
                    ▶{' '}
                    {language === 'fr'
                      ? 'Tester la lecture intégrée (Spotify)'
                      : 'Preview in-app player (Spotify)'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>▶️ YouTube</Text>
              <TextInput
                style={styles.input}
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                placeholder="https://youtube.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
          </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>📷 Instagram</Text>
              <TextInput
                style={styles.input}
                value={instagramUrl}
                onChangeText={setInstagramUrl}
                placeholder="https://instagram.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>🎬 TikTok</Text>
              <TextInput
                style={styles.input}
                value={tiktokUrl}
                onChangeText={setTiktokUrl}
                placeholder="https://tiktok.com/..."
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {language === 'fr' ? 'Enregistrer' : 'Save'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          </KeyboardAvoidingView>

  );
}
