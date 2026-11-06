import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';

export function useBookerProfile({ user, language, showError, showSuccess }) {
    const [bookerProfile, setBookerProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
      pseudo: '',
      nom: '',
      prenom: '',
      phonePro: '',
      bookerType: 'INDEPENDENT',
      companyName: '',
      address: '',
      postalCode: '',
      city: '',
      country: '',
      siret: '',
    });
    const [profileImage, setProfileImage] = useState(null);
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  
    const loadBookerProfile = async () => {
      if (!user?.token) return;
      setLoadingProfile(true);
      try {
        const response = await api.getBookerProfile(user.token);
        if (response?.success && response?.profile) {
          setBookerProfile(response.profile);
          setProfileForm({
            pseudo: response.profile.pseudo || '',
            nom: response.profile.nom || '',
            prenom: response.profile.prenom || '',
            phonePro: response.profile.phonePro || '',
            bookerType: response.profile.bookerType || 'INDEPENDENT',
            companyName: response.profile.companyName || '',
            address: response.profile.address || '',
            postalCode: response.profile.postalCode || '',
            city: response.profile.city || '',
            country: response.profile.country || '',
            siret: response.profile.siret || '',
          });
          setProfileImage(response.profile.profileImage || null);
        }
      } catch (error) {
        console.error('Erreur chargement profil booker:', error);
        showError(language === 'fr' ? 'Impossible de charger le profil.' : 'Unable to load profile.');
      } finally {
        setLoadingProfile(false);
      }
    };
  
    // ✅ AJOUT: Sauvegarder le profil booker
    const saveBookerProfile = async () => {
      if (!user?.token || savingProfile) return;
      if (!profileForm.nom || !profileForm.prenom || !profileForm.phonePro || !profileForm.bookerType) {
        showError(language === 'fr' ? 'Tous les champs sont requis.' : 'All fields are required.');
        return;
      }
      setSavingProfile(true);
      try {
        const legalFields = {};
        const legalEditable = !(bookerProfile?.companyName || bookerProfile?.address || bookerProfile?.postalCode || bookerProfile?.city || bookerProfile?.country || bookerProfile?.siret);
        if (legalEditable) {
          legalFields.companyName = profileForm.companyName?.trim() || null;
          legalFields.address = profileForm.address?.trim() || null;
          legalFields.postalCode = profileForm.postalCode?.trim() || null;
          legalFields.city = profileForm.city?.trim() || null;
          legalFields.country = profileForm.country?.trim() || null;
          legalFields.siret = profileForm.siret?.trim() || null;
        }
        const response = await api.updateBookerProfile(
          user.token,
          profileForm.nom,
          profileForm.prenom,
          profileForm.phonePro,
          profileForm.bookerType,
          profileForm.pseudo || null,
          legalFields
        );
        if (response?.success) {
          showSuccess(language === 'fr' ? 'Profil mis à jour avec succès.' : 'Profile updated successfully.');
          await loadBookerProfile();
        } else {
          showError(response?.message || (language === 'fr' ? 'Erreur lors de la mise à jour.' : 'Update failed.'));
        }
      } catch (error) {
        console.error('Erreur sauvegarde profil booker:', error);
        showError(language === 'fr' ? 'Erreur lors de la sauvegarde.' : 'Save failed.');
      } finally {
        setSavingProfile(false);
      }
    };
  
    // ✅ AJOUT: Uploader la photo de profil
    const pickProfileImage = async () => {
      if (!user?.token) return;
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required');
        return;
      }
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
  
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setUploadingProfileImage(true);
        try {
          const response = await api.uploadBookerProfileImage(user.token, uri);
          if (response?.success) {
            setProfileImage(response.profileImage);
            showSuccess(language === 'fr' ? 'Photo de profil mise à jour' : 'Profile picture updated');
          } else {
            showError(response?.message || (language === 'fr' ? 'Erreur lors de l\'upload.' : 'Upload failed.'));
          }
        } catch (error) {
          console.error('Erreur upload photo de profil:', error);
          showError(language === 'fr' ? 'Erreur lors de l\'upload.' : 'Upload failed.');
        } finally {
          setUploadingProfileImage(false);
        }
      }
    };

  useEffect(() => {
    if (!user?.token) return;
    loadBookerProfile();
  }, [user?.token]);

  return {
    bookerProfile,
    loadingProfile,
    savingProfile,
    profileForm,
    setProfileForm,
    profileImage,
    uploadingProfileImage,
    pickProfileImage,
    saveBookerProfile,
    loadBookerProfile,
  };
}
