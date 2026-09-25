import React from 'react';
import { Text, View, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import PrestataireGenreAndAvailabilityFields from '../PrestataireGenreAndAvailabilityFields';

export default function PrestataireProfilSection({
  language,
  styles,
  profLoading,
  profBusinessName,
  setProfBusinessName,
  profPhonePro,
  setProfPhonePro,
  profCity,
  setProfCity,
  profCountry,
  setProfCountry,
  profBio,
  setProfBio,
  profGenres,
  setProfGenres,
  profDays,
  setProfDays,
  profAvailableStatus,
  setProfAvailableStatus,
  profCustomGenre,
  setProfCustomGenre,
  addProfCustomGenre,
  profSaving,
  savePrestataireProfile,
}) {
  return (
    <View style={styles.profileSection}>
      <Text style={styles.profileSectionTitle}>
        {language === 'fr' ? 'Mon profil prestataire' : 'My provider profile'}
      </Text>
      {profLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
      ) : (
        <>
          <Text style={styles.fieldLabel}>{language === 'fr' ? 'Nom d’activité' : 'Business name'}</Text>
          <TextInput
            style={styles.profileInput}
            value={profBusinessName}
            onChangeText={setProfBusinessName}
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <Text style={styles.fieldLabel}>{language === 'fr' ? 'Téléphone pro' : 'Business phone'}</Text>
          <TextInput
            style={styles.profileInput}
            value={profPhonePro}
            onChangeText={setProfPhonePro}
            keyboardType="phone-pad"
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <Text style={styles.fieldLabel}>{language === 'fr' ? 'Ville' : 'City'}</Text>
          <TextInput
            style={styles.profileInput}
            value={profCity}
            onChangeText={setProfCity}
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <Text style={styles.fieldLabel}>{language === 'fr' ? 'Pays' : 'Country'}</Text>
          <TextInput
            style={styles.profileInput}
            value={profCountry}
            onChangeText={setProfCountry}
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <Text style={styles.fieldLabel}>{language === 'fr' ? 'Bio' : 'Bio'}</Text>
          <TextInput
            style={[styles.profileInput, styles.profileBio]}
            value={profBio}
            onChangeText={setProfBio}
            multiline
            placeholderTextColor="rgba(255,255,255,0.4)"
          />
          <PrestataireGenreAndAvailabilityFields
            language={language}
            prestationGenres={profGenres}
            onChangePrestationGenres={setProfGenres}
            availableDays={profDays}
            onChangeAvailableDays={setProfDays}
            availableStatus={profAvailableStatus}
            onChangeAvailableStatus={setProfAvailableStatus}
            customGenreInput={profCustomGenre}
            onChangeCustomGenreInput={setProfCustomGenre}
            onAddCustomGenre={addProfCustomGenre}
          />
          <TouchableOpacity
            style={[styles.saveProfileBtn, profSaving && styles.saveProfileBtnDisabled]}
            onPress={savePrestataireProfile}
            disabled={profSaving}
          >
            <Text style={styles.saveProfileBtnText}>
              {profSaving
                ? language === 'fr'
                  ? 'Enregistrement…'
                  : 'Saving…'
                : language === 'fr'
                  ? 'Enregistrer le profil'
                  : 'Save profile'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
