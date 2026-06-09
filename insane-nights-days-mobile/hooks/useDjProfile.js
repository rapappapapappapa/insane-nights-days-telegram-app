import { useState, useEffect } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { api, normalizeMediaUrl } from '../api/config';
import { resolveStreamingEmbed } from '../utils/streamingEmbedUrl';

/**
 * Profil DJ, médias, avis (dashboard DJ).
 */
export function useDjProfile({ user, language, showError, showSuccess, showConfirm, activeSection }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [djProfile, setDjProfile] = useState(null);
  
    // Avis & notes (DJ)
    const [ratingsData, setRatingsData] = useState(null); // { dj, ratings, media }
    const [loadingRatings, setLoadingRatings] = useState(false);
    
  
    // Formulaire
    const [artistName, setArtistName] = useState('');
    const [pseudo, setPseudo] = useState('');
    const [realName, setRealName] = useState('');
    const [city, setCity] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [bio, setBio] = useState('');
    const [genre, setGenre] = useState('Techno');
    const [mainCity, setMainCity] = useState('');
    const [languages, setLanguages] = useState('Français, Anglais');
    
    // Réseaux sociaux
    const [soundcloudUrl, setSoundcloudUrl] = useState('');
    const [spotifyUrl, setSpotifyUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [instagramUrl, setInstagramUrl] = useState('');
    const [tiktokUrl, setTiktokUrl] = useState('');
    
    // Matériel
    const [equipment, setEquipment] = useState('');
    
    // Infos légales (contrats)
    const [legalName, setLegalName] = useState('');
    const [address, setAddress] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [country, setCountry] = useState('');
    const [siret, setSiret] = useState('');
    const [vatNumber, setVatNumber] = useState('');
    
    // Tarifs retirés: prix fixé via contrat Booker ↔ DJ
    
    // Disponibilités
    const [availableDays, setAvailableDays] = useState({
      M: true, Ma: true, Me: true, J: true, V: true, S: false, D: false
    });
    const [availableStatus, setAvailableStatus] = useState(true);
    
    // Médias
    const [photos, setPhotos] = useState([]); // Array of { id, url }
    const [videos, setVideos] = useState([]); // Array of { id, url }
    const [bannerImage, setBannerImage] = useState(null);
    const [profileImage, setProfileImage] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
    
    // Édition de titre
    const [editingTitle, setEditingTitle] = useState(null); // { type: 'video', id, currentTitle }
    const [editTitleValue, setEditTitleValue] = useState('');
    const [streamPreviewPlayer, setStreamPreviewPlayer] = useState({
      visible: false,
      uri: null,
      title: '',
    });
    
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [uploadingBannerImage, setUploadingBannerImage] = useState(false);
  
  
    const fetchRatings = async () => {
      if (!user?.token || !user?.id) return;
      setLoadingRatings(true);
      try {
        // Endpoint public, mais on l'utilise pour afficher les avis du DJ connecté
        const res = await api.getDjRatings(user.id);
        if (res?.success) {
          setRatingsData(res);
        } else {
          setRatingsData(null);
        }
      } catch (e) {
        console.error('Erreur récupération avis DJ:', e);
        setRatingsData(null);
      } finally {
        setLoadingRatings(false);
      }
    };
  
  
    const fetchDjProfile = async () => {
      if (!user?.token) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const response = await api.getDjProfile(user.token);
        
        if (response && response.success && response.dj) {
          setDjProfile(response.dj);
          setArtistName(response.dj.artistName || '');
          setCity(response.dj.city || '');
          setMainCity(response.dj.mainCity || response.dj.city || ''); // mainCity est éditable, city ne l'est pas
          setPhone(response.dj.phone || '');
          setBirthDate(response.dj.birthDate || '');
          // Champs éditables
          setBio(response.dj.bio || '');
          setGenre(response.dj.genre || '');
          setLanguages(response.dj.languages || '');
          // Réseaux sociaux
          setSoundcloudUrl(response.dj.soundcloudUrl || '');
          setSpotifyUrl(response.dj.spotifyUrl || '');
          setYoutubeUrl(response.dj.youtubeUrl || '');
          setInstagramUrl(response.dj.instagramUrl || '');
          setTiktokUrl(response.dj.tiktokUrl || '');
          // Matériel
          setEquipment(response.dj.equipment || '');
          // Infos légales
          setLegalName(response.dj.legalName || '');
          setAddress(response.dj.address || '');
          setPostalCode(response.dj.postalCode || '');
          setCountry(response.dj.country || '');
          setSiret(response.dj.siret || '');
          setVatNumber(response.dj.vatNumber || '');
          // Disponibilités
          if (response.dj.availableDays) {
            try {
              const days = typeof response.dj.availableDays === 'string' 
                ? JSON.parse(response.dj.availableDays) 
                : response.dj.availableDays;
              setAvailableDays(days);
            } catch (e) {
              console.error('Erreur parsing availableDays:', e);
            }
          }
          setAvailableStatus(response.dj.availableStatus !== undefined ? response.dj.availableStatus : true);
          
          // Charger les médias
          if (response.dj.id) {
            const mediaResponse = await api.getDjMedia(response.dj.id);
            if (mediaResponse && mediaResponse.success) {
              const media = mediaResponse.media || [];
              // Stocker avec ID et titre pour pouvoir supprimer et éditer
              setPhotos(media.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner').map(m => ({ id: m.id, url: m.url })));
              setVideos(media.filter(m => m.type === 'video').map(m => ({ id: m.id, url: m.url, title: m.title })));
              const profileImg = media.find(m => m.type === 'photo' && m.title === 'profile');
              const bannerImg = media.find(m => m.type === 'photo' && m.title === 'banner');
              if (profileImg) setProfileImage(normalizeMediaUrl(profileImg.url));
              if (bannerImg) setBannerImage(normalizeMediaUrl(bannerImg.url));
            }
          }
        }
      } catch (error) {
        console.error('Erreur récupération profil DJ:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const handleSave = async () => {
      // Les champs artistName, city, phone, birthDate ne sont plus modifiables
      // On ne vérifie que les champs éditables
  
      if (!user?.token) {
        showError(language === 'fr' ? 'Non authentifié' : 'Not authenticated');
        return;
      }
  
      setSaving(true);
      try {
        // Préparer les données éditables
        const additionalData = {
          // Champs éditables - toujours envoyer même si vides
          bio: bio && bio.trim() ? bio.trim() : null,
          genre: genre && genre.trim() ? genre.trim() : null,
          mainCity: mainCity && mainCity.trim() ? mainCity.trim() : null,
          languages: languages && languages.trim() ? languages.trim() : null,
          // Réseaux sociaux
          soundcloudUrl: soundcloudUrl && soundcloudUrl.trim() ? soundcloudUrl.trim() : null,
          spotifyUrl: spotifyUrl && spotifyUrl.trim() ? spotifyUrl.trim() : null,
          youtubeUrl: youtubeUrl && youtubeUrl.trim() ? youtubeUrl.trim() : null,
          instagramUrl: instagramUrl && instagramUrl.trim() ? instagramUrl.trim() : null,
          tiktokUrl: tiktokUrl && tiktokUrl.trim() ? tiktokUrl.trim() : null,
          // Matériel
          equipment: equipment && equipment.trim() ? equipment.trim() : null,
          // Disponibilités
          availableDays: JSON.stringify(availableDays),
          availableStatus: availableStatus,
        };
        const legalEditable = !(djProfile?.legalName || djProfile?.address || djProfile?.postalCode || djProfile?.country || djProfile?.siret || djProfile?.vatNumber);
        if (legalEditable) {
          additionalData.legalName = legalName?.trim() || null;
          additionalData.address = address?.trim() || null;
          additionalData.postalCode = postalCode?.trim() || null;
          additionalData.country = country?.trim() || null;
          additionalData.siret = siret?.trim() || null;
          additionalData.vatNumber = vatNumber?.trim() || null;
        }
  
        console.log('[handleSave] Données à envoyer:', {
          bio: additionalData.bio?.substring(0, 50),
          genre: additionalData.genre,
          mainCity: additionalData.mainCity,
          languages: additionalData.languages,
          allKeys: Object.keys(additionalData),
        });
  
        // On envoie les valeurs originales pour les champs non-éditables (requis pour validation)
        // et les valeurs modifiées pour les champs éditables
        const response = await api.updateDjProfile(
          user.token,
          artistName.trim(), // Non modifiable mais requis par l'API
          city.trim(), // Non modifiable mais requis par l'API
          phone.trim(), // Non modifiable mais requis par l'API
          birthDate.trim(), // Non modifiable mais requis par l'API
          additionalData
        );
  
        console.log('[handleSave] Réponse du serveur:', response);
  
        if (response && response.success) {
          // Ne pas mettre à jour les champs locaux - garder ce que l'utilisateur a tapé
          // Les données sont sauvegardées dans la DB, pas besoin de recharger depuis le serveur
          showSuccess(language === 'fr' 
            ? 'Profil DJ mis à jour avec succès' 
            : 'DJ profile updated successfully');
        } else {
          showError(language === 'fr' 
            ? 'Erreur lors de la mise à jour du profil' 
            : 'Error updating profile');
        }
      } catch (error) {
        console.error('Erreur mise à jour profil DJ:', error);
        showError(language === 'fr' 
          ? 'Erreur lors de la mise à jour du profil' 
          : 'Error updating profile');
      } finally {
        setSaving(false);
      }
    };
  
    const openDjStreamPreview = (rawUrl, provider) => {
      const trimmed = (rawUrl || '').trim();
      if (!trimmed) return;
      const resolved = resolveStreamingEmbed(trimmed, provider);
      if (!resolved) {
        Alert.alert(
          language === 'fr' ? 'Lecture intégrée impossible' : 'In-app playback unavailable',
          language === 'fr'
            ? 'Ce lien ne peut pas être chargé dans le lecteur intégré (lien court, page compte, etc.). Colle une URL complète du type open.spotify.com (piste, album, playlist, artiste, podcast) ou une URL SoundCloud https://soundcloud.com/…'
            : 'This link cannot load in the in-app player (short link, profile-only URL, etc.). Use a full open.spotify.com URL (track, album, playlist, artist, show) or an https://soundcloud.com/… URL.',
          [
            { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
            {
              text: language === 'fr' ? 'Ouvrir dans le navigateur / app' : 'Open in browser / app',
              onPress: () => Linking.openURL(trimmed).catch(() => {}),
            },
          ]
        );
        return;
      }
      setStreamPreviewPlayer({
        visible: true,
        uri: resolved.uri,
        title: resolved.title,
      });
    };
  
    // Sauvegarder un média
    const saveMedia = async (type, url, title = null) => {
      if (!user?.token) {
        console.error('[saveMedia] Pas de token utilisateur');
        return;
      }
      
      // Récupérer le djId si pas encore chargé
      let djId = djProfile?.id;
      if (!djId) {
        try {
          const response = await api.getDjProfile(user.token);
          if (response && response.success && response.dj && response.dj.id) {
            djId = response.dj.id;
            setDjProfile(response.dj);
          } else {
            console.error('[saveMedia] Impossible de récupérer le profil DJ');
            showError(language === 'fr' 
              ? 'Impossible de sauvegarder le média. Assurez-vous d\'avoir un profil DJ actif.' 
              : 'Unable to save media. Make sure you have an active DJ profile.');
            return;
          }
        } catch (error) {
          console.error('[saveMedia] Erreur récupération profil DJ:', error);
          showError(language === 'fr' 
            ? 'Erreur lors de la sauvegarde du média.' 
            : 'Error saving media.');
          return;
        }
      }
      
      try {
        console.log('[saveMedia] Upload média:', { djId, type, title, url: url.substring(0, 50) + '...' });
        
        // Vérifier si c'est une URL locale (file:// ou content://) ou une URL HTTP
        const isLocalFile = url.startsWith('file://') || url.startsWith('content://') || (!url.startsWith('http://') && !url.startsWith('https://'));
        
        let response;
        if (isLocalFile) {
          // Uploader le fichier sur le serveur
          console.log('[saveMedia] Upload fichier local vers serveur...');
          try {
            response = await api.uploadDjMediaFile(user.token, djId, url, type, title);
          } catch (uploadError) {
            console.error('[saveMedia] Erreur upload fichier:', uploadError);
            // Si l'upload échoue, afficher un message d'erreur détaillé
            const errorMessage = uploadError.message || 'Erreur inconnue lors de l\'upload';
            showError(
              language === 'fr' 
                ? `Impossible d'uploader le fichier: ${errorMessage}\n\nVérifiez:\n- Votre connexion internet\n- La taille du fichier (max 100MB)\n- Réessayez dans quelques instants` 
                : `Unable to upload file: ${errorMessage}\n\nCheck:\n- Your internet connection\n- File size (max 100MB)\n- Try again in a few moments`
            );
            throw uploadError;
          }
        } else {
          // C'est déjà une URL HTTP, utiliser l'ancienne méthode
          console.log('[saveMedia] Utilisation URL HTTP existante...');
          response = await api.uploadDjMedia(user.token, djId, type, url, title);
        }
        
        if (response && response.success) {
          console.log('[saveMedia] Média sauvegardé avec succès:', response.media?.url);
          // Recharger les médias après l'upload réussi
          if (djId) {
            try {
              const mediaResponse = await api.getDjMedia(djId);
              if (mediaResponse && mediaResponse.success) {
                const media = mediaResponse.media || [];
                // Mettre à jour les états avec les médias rechargés
                setPhotos(media.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner').map(m => ({ id: m.id, url: m.url })));
                setVideos(media.filter(m => m.type === 'video').map(m => ({ id: m.id, url: m.url, title: m.title })));
                const profileImg = media.find(m => m.type === 'photo' && m.title === 'profile');
                const bannerImg = media.find(m => m.type === 'photo' && m.title === 'banner');
                if (profileImg) setProfileImage(normalizeMediaUrl(profileImg.url));
                if (bannerImg) setBannerImage(normalizeMediaUrl(bannerImg.url));
              }
            } catch (reloadError) {
              console.error('[saveMedia] Erreur rechargement médias:', reloadError);
              // Ne pas bloquer si le rechargement échoue
            }
          }
          return response; // Retourner la réponse pour récupérer l'ID et l'URL
        } else {
          console.error('[saveMedia] Réponse invalide:', response);
          return null;
        }
      } catch (error) {
        console.error('[saveMedia] Erreur sauvegarde média:', error);
        showError(language === 'fr' 
          ? `Erreur lors de la sauvegarde: ${error.message || 'Erreur inconnue'}` 
          : `Error saving: ${error.message || 'Unknown error'}`);
        throw error;
      }
    };
  
    // Mettre à jour le titre d'un média
    const updateMediaTitle = async (mediaId, type, newTitle) => {
      if (!user?.token || !mediaId) {
        showError(language === 'fr' ? 'Impossible de mettre à jour le titre' : 'Unable to update title');
        return;
      }
  
      try {
        const response = await api.updateDjMediaTitle(user.token, mediaId, newTitle);
        if (response && response.success) {
          // Mettre à jour l'état local
          if (type === 'video') {
            setVideos(videos.map(v => 
              v.id === mediaId ? { ...v, title: newTitle } : v
            ));
          }
          showSuccess(language === 'fr' ? 'Titre mis à jour avec succès' : 'Title updated successfully');
          setEditingTitle(null);
          setEditTitleValue('');
        } else {
          throw new Error(response?.message || 'Erreur lors de la mise à jour');
        }
      } catch (error) {
        console.error('[updateMediaTitle] Erreur mise à jour titre:', error);
        showError(language === 'fr' 
          ? `Erreur lors de la mise à jour: ${error.message || 'Erreur inconnue'}` 
          : `Error updating: ${error.message || 'Unknown error'}`);
      }
    };
  
    // Supprimer un média
    const deleteMedia = async (mediaId, type) => {
      if (!user?.token || !mediaId) {
        showError(language === 'fr' ? 'Impossible de supprimer le média' : 'Unable to delete media');
        return;
      }
  
      try {
        const response = await api.deleteDjMedia(user.token, mediaId);
        if (response && response.success) {
          // Mettre à jour l'état local
          if (type === 'photo') {
            setPhotos(photos.filter(p => p.id !== mediaId));
          } else if (type === 'video') {
            setVideos(videos.filter(v => v.id !== mediaId));
          }
          showSuccess(
            language === 'fr' ? 'Média supprimé avec succès' : 'Media deleted successfully'
          );
        } else {
          throw new Error(response?.message || 'Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('[deleteMedia] Erreur suppression média:', error);
        showError(
          language === 'fr' 
            ? `Erreur lors de la suppression: ${error.message || 'Erreur inconnue'}` 
            : `Error deleting: ${error.message || 'Unknown error'}`
        );
      }
    };
  
    // Upload de photos
    const pickImage = async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showError(
            language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required'
          );
          return;
        }
  
        // Utiliser MediaType (nouvelle API recommandée)
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
        });
  
        if (!result.canceled && result.assets && result.assets.length > 0) {
          // Sauvegarder chaque photo et récupérer l'ID
          for (const asset of result.assets) {
            try {
              const response = await saveMedia('photo', asset.uri);
              if (response && response.success && response.media) {
                // Utiliser l'URL retournée par le serveur (URL publique)
                setPhotos([...photos, { id: response.media.id, url: response.media.url }]);
              } else {
                // Si pas d'ID, ajouter temporairement sans ID
                setPhotos([...photos, { id: null, url: asset.uri }]);
              }
            } catch (error) {
              console.error('[pickImage] Erreur sauvegarde photo:', error);
            }
          }
        }
      } catch (error) {
        console.error('[pickImage] Erreur lors de la sélection de photos:', error);
        showError(
          language === 'fr' 
            ? `Erreur lors de la sélection des photos: ${error.message || 'Erreur inconnue'}` 
            : `Error selecting photos: ${error.message || 'Unknown error'}`
        );
      }
    };
  
    // Upload de vidéos
    const pickVideo = async () => {
      try {
        // Sur iOS, vérifier et demander les permissions spécifiquement pour les vidéos
        if (Platform.OS === 'ios') {
          // Vérifier d'abord l'état actuel
          const { status: existingStatus, canAskAgain, accessPrivileges } = await ImagePicker.getMediaLibraryPermissionsAsync();
          console.log('[pickVideo] État permissions iOS:', { existingStatus, canAskAgain, accessPrivileges });
          
          let finalStatus = existingStatus;
          let finalAccessPrivileges = accessPrivileges;
  
          // Si les permissions ne sont pas accordées et qu'on peut encore demander
          if (existingStatus !== 'granted' && canAskAgain) {
            const response = await ImagePicker.requestMediaLibraryPermissionsAsync();
            finalStatus = response.status;
            finalAccessPrivileges = response.accessPrivileges;
            console.log('[pickVideo] Nouveau statut après demande:', { status: finalStatus, accessPrivileges: finalAccessPrivileges });
          }
  
          // Vérifier si l'accès est limité (seulement photos sélectionnées)
          // Même si l'utilisateur pense avoir donné l'accès complet, iOS peut toujours retourner 'limited'
          if (finalStatus === 'granted' && finalAccessPrivileges === 'limited') {
            showConfirm(
              language === 'fr' ? 'Accès limité détecté' : 'Limited Access Detected',
              language === 'fr' 
                ? 'L\'accès à la galerie semble limité. Pour sélectionner des vidéos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres iOS de l\'app (Réglages > [Nom de l\'app] > Photos > Toutes les photos).' 
                : 'Gallery access appears limited. To select videos, you must grant full access to all photos in iOS app settings (Settings > [App Name] > Photos > All Photos).',
              [
                { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
              ]
            );
            return;
          }
          
          // Log pour déboguer
          console.log('[pickVideo] Permissions finales:', { 
            status: finalStatus, 
            accessPrivileges: finalAccessPrivileges,
            canAskAgain 
          });
  
          if (finalStatus !== 'granted') {
            showConfirm(
              language === 'fr' ? 'Permission requise' : 'Permission required',
              language === 'fr' 
                ? 'L\'accès à la galerie Photos est nécessaire pour sélectionner des vidéos. Veuillez l\'autoriser dans les paramètres de l\'app.' 
                : 'Photo library access is required to select videos. Please enable it in app settings.',
              [
                { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
              ]
            );
            return;
          }
        } else {
          // Sur Android, demander directement
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            showError(language === 'fr' ? 'Permission d\'accès à la galerie requise' : 'Gallery access permission required');
            return;
          }
        }
  
        console.log('[pickVideo] Permissions OK, ouverture de la galerie Photos...');
        
        // Utiliser ImagePicker en priorité pour accéder à la galerie Photos (comportement natif iOS)
        let result;
        try {
          // Options minimales pour iOS - éviter l'erreur 3164
          // Utiliser MediaType (nouvelle API recommandée)
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: false,
            allowsEditing: false,
            // Ne pas spécifier videoMaxDuration ou quality sur iOS pour éviter les erreurs
          });
        } catch (pickerError) {
          console.error('[pickVideo] Erreur ImagePicker (galerie Photos):', pickerError);
          
          // Si erreur 3164, c'est un problème de permissions iOS
          const errorMessage = pickerError.message || pickerError.toString() || '';
          if (errorMessage.includes('3164')) {
            showConfirm(
              language === 'fr' ? 'Accès à la galerie requis' : 'Gallery Access Required',
              language === 'fr' 
                ? 'Pour sélectionner des vidéos depuis la galerie Photos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres de l\'app (pas seulement les photos sélectionnées).' 
                : 'To select videos from Photo Library, you must grant full access to all photos in app settings (not just selected photos).',
              [
                { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
                { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
                {
                  text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
                  onPress: async () => {
                    try {
                      const docResult = await DocumentPicker.getDocumentAsync({
                        type: 'video/*',
                        copyToCacheDirectory: true,
                        multiple: false,
                      });
                      if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                        const videoUri = docResult.assets[0].uri;
                        try {
                          const response = await saveMedia('video', videoUri);
                          if (response && response.success && response.media) {
                            setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                            showSuccess(language === 'fr' ? 'Vidéo ajoutée avec succès' : 'Video added successfully');
                          } else {
                            setVideos([...videos, { id: null, url: videoUri }]);
                          }
                        } catch (error) {
                          console.error('[pickVideo] Erreur sauvegarde vidéo:', error);
                        }
                      }
                    } catch (docError) {
                      console.error('[pickVideo] Erreur DocumentPicker:', docError);
                      showError(language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video');
                    }
                  },
                },
              ]
            );
            return;
          }
          
          // Autre erreur iOS, essayer DocumentPicker comme fallback silencieux
          if (Platform.OS === 'ios') {
            console.warn('[pickVideo] Fallback vers DocumentPicker...');
            try {
              const docResult = await DocumentPicker.getDocumentAsync({
                type: 'video/*',
                copyToCacheDirectory: true,
                multiple: false,
              });
  
              if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                const videoUri = docResult.assets[0].uri;
                console.log('[pickVideo] Vidéo sélectionnée via DocumentPicker:', videoUri.substring(0, 50) + '...');
                
                try {
                  const response = await saveMedia('video', videoUri);
                  if (response && response.success && response.media) {
                    // Utiliser l'URL retournée par le serveur (URL publique)
                    setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                    showSuccess(language === 'fr' ? 'Vidéo ajoutée avec succès' : 'Video added successfully');
                  } else {
                    setVideos([...videos, { id: null, url: videoUri }]);
        }
      } catch (error) {
                  console.error('[pickVideo] Erreur sauvegarde vidéo:', error);
                }
              }
              return;
            } catch (docError) {
              console.error('[pickVideo] Erreur DocumentPicker aussi:', docError);
              throw pickerError; // Lancer l'erreur originale
            }
          } else {
            throw pickerError;
          }
        }
        
        // Traiter le résultat ImagePicker (galerie Photos)
        if (!result || result.canceled) {
          console.log('[pickVideo] Sélection annulée');
          return;
        }
        
        console.log('[pickVideo] Résultat galerie Photos:', result.canceled ? 'Annulé' : 'Sélectionné');
  
        if (!result.canceled && result.assets && result.assets.length > 0) {
          console.log('[pickVideo] Vidéos sélectionnées depuis la galerie:', result.assets.length);
          
          // Sauvegarder chaque vidéo et récupérer l'ID
          for (const asset of result.assets) {
            try {
              console.log('[pickVideo] Sauvegarde vidéo:', asset.uri.substring(0, 50) + '...');
              const response = await saveMedia('video', asset.uri);
              if (response && response.success && response.media) {
                // Utiliser l'URL retournée par le serveur (URL publique)
                setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                console.log('[pickVideo] Vidéo sauvegardée avec succès');
              } else {
                setVideos([...videos, { id: null, url: asset.uri }]);
              }
            } catch (error) {
              console.error('[pickVideo] Erreur sauvegarde vidéo:', error);
              // L'erreur est déjà gérée dans saveMedia avec Alert
            }
          }
          
          if (result.assets.length > 0) {
            showSuccess(
              language === 'fr' 
                ? `${result.assets.length} vidéo(s) ajoutée(s)` 
                : `${result.assets.length} video(s) added`
            );
          }
        }
      } catch (error) {
        console.error('[pickVideo] Erreur lors de la sélection vidéo:', error);
        
        // Gérer spécifiquement l'erreur 3164 iOS
        const errorMessage = error.message || error.toString() || '';
        if (errorMessage.includes('3164') || errorMessage.includes('PHPhotosErrorDomain')) {
          showConfirm(
            language === 'fr' ? 'Accès à la galerie requis' : 'Gallery Access Required',
            language === 'fr' 
              ? 'Pour sélectionner des vidéos depuis la galerie Photos, vous devez autoriser l\'accès complet à toutes les photos dans les paramètres de l\'app (pas seulement les photos sélectionnées).' 
              : 'To select videos from Photo Library, you must grant full access to all photos in app settings (not just selected photos).',
            [
              { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
              { text: language === 'fr' ? 'Paramètres' : 'Settings', onPress: () => Linking.openURL('app-settings:') },
              {
                text: language === 'fr' ? 'Utiliser Documents' : 'Use Documents',
                onPress: async () => {
                  try {
                    const docResult = await DocumentPicker.getDocumentAsync({
                      type: 'video/*',
                      copyToCacheDirectory: true,
                      multiple: false,
                    });
                    if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                      const videoUri = docResult.assets[0].uri;
                      try {
                        const response = await saveMedia('video', videoUri);
                        if (response && response.success && response.media) {
                          setVideos([...videos, { id: response.media.id, url: response.media.url, title: response.media.title }]);
                          showSuccess(language === 'fr' ? 'Vidéo ajoutée avec succès' : 'Video added successfully');
                        } else {
                          setVideos([...videos, { id: null, url: videoUri }]);
                        }
                      } catch (saveError) {
                        console.error('[pickVideo] Erreur sauvegarde vidéo:', saveError);
                        showError(
                          language === 'fr' ? 'Impossible d\'ajouter la vidéo' : 'Unable to add video'
                        );
                      }
                    }
                  } catch (docError) {
                    console.error('[pickVideo] Erreur DocumentPicker:', docError);
                    showError(
                      language === 'fr' ? 'Impossible de sélectionner la vidéo' : 'Unable to select video'
                    );
                  }
                }
              }
            ]
          );
        } else {
          showError(
            language === 'fr' 
              ? `Erreur lors de la sélection de la vidéo: ${error.message || 'Erreur inconnue'}` 
              : `Error selecting video: ${error.message || 'Unknown error'}`
          );
        }
      }
    };
  
    /** Même flux que CommunityProfileEditPage / VenueProfileEditPage : galerie, recadrage 1:1 ou 3:1, qualité 0,8. */
    const pickDjProfileImage = async (type) => {
      if (!user?.token) return;
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(language === 'fr' ? 'Permission refusée' : 'Permission denied');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'banner' ? [3, 1] : [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = result.assets[0].uri;
  
      if (type === 'banner') {
        setUploadingBannerImage(true);
        try {
          const response = await saveMedia('photo', uri, 'banner');
          if (response?.success && response.media?.url) {
            setBannerImage(normalizeMediaUrl(response.media.url));
            showSuccess(language === 'fr' ? 'Bannière mise à jour' : 'Banner updated');
          } else {
            showError(language === 'fr' ? "Impossible d'enregistrer la bannière." : 'Could not save banner.');
          }
        } catch (e) {
          console.error('[pickDjProfileImage] bannière:', e);
        } finally {
          setUploadingBannerImage(false);
        }
      } else {
        setUploadingProfileImage(true);
        try {
          const response = await saveMedia('photo', uri, 'profile');
          if (response?.success && response.media?.url) {
            setProfileImage(normalizeMediaUrl(response.media.url));
            showSuccess(language === 'fr' ? 'Photo mise à jour' : 'Photo updated');
          } else {
            showError(
              language === 'fr' ? "Impossible d'enregistrer la photo de profil." : 'Could not save profile photo.'
            );
          }
        } catch (e) {
          console.error('[pickDjProfileImage] profil:', e);
        } finally {
          setUploadingProfileImage(false);
        }
      }
    };
  
    const toggleDay = (day) => {
      setAvailableDays({ ...availableDays, [day]: !availableDays[day] });
    };
  

  useEffect(() => {
    if (user?.token) {
      fetchDjProfile();
    }
  }, [user?.token]);

  useEffect(() => {
    if (activeSection === 'avis' && user?.token && user?.id && !loadingRatings) {
      fetchRatings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, user?.token, user?.id]);

  return {
    loading,
    saving,
    djProfile,
    ratingsData,
    loadingRatings,
    fetchRatings,
    artistName,
    pseudo,
    setPseudo,
    realName,
    city,
    phone,
    birthDate,
    bio,
    setBio,
    genre,
    setGenre,
    mainCity,
    setMainCity,
    languages,
    setLanguages,
    soundcloudUrl,
    setSoundcloudUrl,
    spotifyUrl,
    setSpotifyUrl,
    youtubeUrl,
    setYoutubeUrl,
    instagramUrl,
    setInstagramUrl,
    tiktokUrl,
    setTiktokUrl,
    equipment,
    setEquipment,
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
    availableDays,
    toggleDay,
    availableStatus,
    setAvailableStatus,
    photos,
    setPhotos,
    videos,
    setVideos,
    bannerImage,
    profileImage,
    selectedVideo,
    setSelectedVideo,
    videoPlayerVisible,
    setVideoPlayerVisible,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    streamPreviewPlayer,
    setStreamPreviewPlayer,
    uploadingProfileImage,
    uploadingBannerImage,
    fetchDjProfile,
    handleSave,
    openDjStreamPreview,
    saveMedia,
    updateMediaTitle,
    deleteMedia,
    pickImage,
    pickVideo,
    pickDjProfileImage,
  };
}
