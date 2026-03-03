import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image, // ✅ AJOUT: Import Image pour l'aperçu
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
// Import dynamique pour éviter crash au chargement (expo-image-picker peut poser problème sur certains devices)
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useToast } from '../../hooks/useToast';
import { Toast } from '../../components/Toast';
import { api } from '../../api/config';

/**
 * ✅ MODIFICATION: Page pour créer un nouveau post dans le feed (DJ et Booker)
 */
export default function CreateFeedPostPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { navigate, goBack } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null); // URI locale de l'image sélectionnée
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  /**
   * ✅ Règle: Seuls les DJ et Booker peuvent créer des posts. Les Community peuvent commenter mais pas poster.
   */
  useEffect(() => {
    const activeType = user?.activeProfileType;
    if (user && activeType && activeType !== 'DJ' && activeType !== 'BOOKER') {
      showError(
        language === 'fr'
          ? 'Seuls les profils DJ et Booker peuvent créer des posts. Les profils Community peuvent commenter.'
          : 'Only DJ and Booker profiles can create posts. Community profiles can comment.'
      );
      goBack();
    }
  }, [user?.id, user?.activeProfileType]);

  /**
   * ✅ AJOUT: Sélectionner une image depuis la galerie
   */
  const handlePickImage = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      // Demander les permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(
          language === 'fr'
            ? 'Nous avons besoin de l\'accès à votre galerie pour sélectionner une image.'
            : 'We need access to your gallery to select an image.'
        );
        return;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setImageUrl(''); // Réinitialiser l'URL si une image locale est sélectionnée
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      showError(
        language === 'fr'
          ? 'Une erreur est survenue lors de la sélection de l\'image.'
          : 'An error occurred while selecting the image.'
      );
    }
  };

  /**
   * ✅ AJOUT: Uploader l'image sélectionnée vers le serveur
   */
  const handleUploadImage = async () => {
    if (!selectedImageUri || !user?.token) {
      return;
    }

    setUploadingImage(true);
    try {
      const response = await api.uploadFeedPostImage(user.token, selectedImageUri);
      if (response && response.success) {
        setImageUrl(response.imageUrl);
        setSelectedImageUri(null); // Réinitialiser après upload réussi
      } else {
        throw new Error(response?.message || 'Erreur upload image');
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      showError(
        error.message || (language === 'fr'
          ? 'Une erreur est survenue lors de l\'upload de l\'image.'
          : 'An error occurred while uploading the image.')
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * ✅ FONCTION: Créer le post et le publier dans le feed
   */
  const handleCreatePost = async () => {
    if (!content.trim()) {
      showError(
        language === 'fr'
          ? 'Le contenu du post est requis'
          : 'Post content is required'
      );
      return;
    }

    if (!user?.token) {
      showError(
        language === 'fr'
          ? 'Vous devez être connecté pour créer un post'
          : 'You must be logged in to create a post'
      );
      return;
    }

    // Vérifier que le profil actif est DJ ou Booker (backend refuse sinon)
    const activeType = user?.activeProfileType;
    if (activeType !== 'DJ' && activeType !== 'BOOKER') {
      showError(
        language === 'fr'
          ? 'Seuls les profils DJ et Booker peuvent poster. Passe sur ton profil Booker ou DJ via le menu.'
          : 'Only DJ and Booker profiles can post. Switch to your Booker or DJ profile via the menu.'
      );
      return;
    }

    // Si une image locale est sélectionnée mais pas encore uploadée, l'uploader d'abord
    let finalImageUrl = imageUrl; // Utiliser l'URL existante si elle existe
    if (selectedImageUri && !imageUrl) {
      setLoading(true);
      try {
        const uploadResponse = await api.uploadFeedPostImage(user.token, selectedImageUri);
        if (uploadResponse && uploadResponse.success) {
          finalImageUrl = uploadResponse.imageUrl; // ✅ CORRECTION: Utiliser directement l'URL retournée
          setImageUrl(uploadResponse.imageUrl); // Mettre à jour le state pour l'affichage
        } else {
          throw new Error(uploadResponse?.message || 'Erreur upload image');
        }
      } catch (error) {
        console.error('Erreur upload image:', error);
        showError(
          error.message || (language === 'fr'
            ? 'Une erreur est survenue lors de l\'upload de l\'image.'
            : 'An error occurred while uploading the image.')
        );
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.createFeedPost(user.token, content.trim(), finalImageUrl || null);
      
      if (response && response.success) {
        showSuccess(
          language === 'fr'
            ? 'Votre post a été publié avec succès!'
            : 'Your post has been published successfully!'
        );
        // Retourner après un court délai pour laisser voir le message de succès
        setTimeout(() => {
          goBack();
          // Rafraîchir le feed après création
          // Note: Le feed sera rafraîchi automatiquement au retour
        }, 1000);
      } else {
        throw new Error('Erreur lors de la création du post');
      }
    } catch (error) {
      console.error('Erreur création post:', error);
      const msg = error?.message || error?.payload?.message;
      showError(
        msg ||
          (language === 'fr'
            ? 'Une erreur est survenue lors de la création du post'
            : 'An error occurred while creating the post')
      );
    } finally {
      setLoading(false);
    }
  };

  // Garde : si connecté mais sans token, afficher un message
  if (user && !user.token) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorGuard}>
          <Text style={styles.errorGuardText}>
            {language === 'fr' ? 'Vous devez être connecté pour poster.' : 'You must be logged in to post.'}
          </Text>
          <TouchableOpacity style={styles.errorGuardButton} onPress={goBack}>
            <Text style={styles.errorGuardButtonText}>{language === 'fr' ? 'Retour' : 'Back'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {toast?.visible && (
        <Toast
          message={toast.message}
          type={toast.type || 'info'}
          visible={true}
          onHide={hideToast}
        />
      )}
      
      {/* ✅ HEADER: En-tête avec boutons annuler et publier */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Nouveau post' : 'New post'}
        </Text>
        <TouchableOpacity
          onPress={handleCreatePost}
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FF1744" />
          ) : (
            <Text style={styles.publishButtonText}>
              {language === 'fr' ? 'Publier' : 'Publish'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ✅ FORMULAIRE: Zone de saisie pour le contenu et l'image */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.contentInput}
            placeholder={
              language === 'fr'
                ? 'Quoi de neuf ? Partagez vos dernières actualités...'
                : 'What\'s new? Share your latest updates...'
            }
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>
            {content.length}/1000
          </Text>
        </View>

        {/* Option pour ajouter une image */}
        <View style={styles.imageSection}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Image (optionnel)' : 'Image (optional)'}
          </Text>
          
          {/* Bouton pour sélectionner une image depuis la galerie */}
          <TouchableOpacity
            style={styles.selectImageButton}
            onPress={handlePickImage}
            disabled={uploadingImage || loading}
          >
            <Ionicons name="image-outline" size={20} color="#FF1744" />
            <Text style={styles.selectImageButtonText}>
              {language === 'fr' ? 'Sélectionner depuis la galerie' : 'Select from gallery'}
            </Text>
          </TouchableOpacity>

          {/* Option pour entrer une URL manuellement */}
          <TextInput
            style={styles.imageInput}
            placeholder={
              language === 'fr'
                ? 'Ou entrer une URL d\'image'
                : 'Or enter an image URL'
            }
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={imageUrl}
            onChangeText={setImageUrl}
            autoCapitalize="none"
            keyboardType="url"
            editable={!selectedImageUri}
          />

          {/* Aperçu de l'image sélectionnée (locale) */}
          {selectedImageUri && !imageUrl && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: selectedImageUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setSelectedImageUri(null);
                  setImageUrl('');
                }}
              >
                <Ionicons name="close-circle" size={24} color="#FF1744" />
              </TouchableOpacity>
              {uploadingImage && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#FF1744" />
                  <Text style={styles.uploadingText}>
                    {language === 'fr' ? 'Upload en cours...' : 'Uploading...'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Aperçu de l'image uploadée (URL) */}
          {imageUrl && !selectedImageUri && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => {
                  setImageUrl('');
                  setSelectedImageUri(null);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#FF1744" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF1744',
  },
  publishButtonDisabled: {
    opacity: 0.5,
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  contentInput: {
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 200,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  charCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  imageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    marginBottom: 12,
    gap: 8,
  },
  selectImageButtonText: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
  },
  imageInput: {
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    marginBottom: 12,
  },
  imagePreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  uploadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  errorGuard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorGuardText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorGuardButton: {
    backgroundColor: '#FF1744',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorGuardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
