import React, { useState, useEffect } from 'react';
import {
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { NoxScreenHeader, NoxButton, NoxInput, NoxText } from '../../components/nox';
import { api } from '../../api/config';
import { styles } from './CreateFeedPostPage.styles';

/**
 * Page pour créer un nouveau post dans le feed (DJ, Organisateur, Lieu).
 */
export default function CreateFeedPostPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { goBack } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fr = language === 'fr';

  /**
   * Seuls les DJ, Organisateur et Lieu peuvent créer des posts.
   */
  useEffect(() => {
    const activeType = user?.activeProfileType;
    if (user && activeType && !['DJ', 'BOOKER', 'VENUE'].includes(activeType)) {
      showError(
        fr
          ? 'Seuls les profils DJ, Organisateur et Lieu peuvent créer des posts. Les profils Community peuvent commenter.'
          : 'Only DJ, Organizer and Venue profiles can create posts. Community profiles can comment.'
      );
      goBack();
    }
  }, [user?.id, user?.activeProfileType]);

  /**
   * Sélectionner une image depuis la galerie
   */
  const handlePickImage = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError(
          fr
            ? 'Nous avons besoin de l\'accès à votre galerie pour sélectionner une image.'
            : 'We need access to your gallery to select an image.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImageUri(asset.uri);
        setImageUrl('');
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      showError(
        fr
          ? 'Une erreur est survenue lors de la sélection de l\'image.'
          : 'An error occurred while selecting the image.'
      );
    }
  };

  /**
   * Uploader l'image sélectionnée vers le serveur
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
        setSelectedImageUri(null);
      } else {
        throw new Error(response?.message || 'Erreur upload image');
      }
    } catch (error) {
      console.error('Erreur upload image:', error);
      showError(
        error.message || (fr
          ? 'Une erreur est survenue lors de l\'upload de l\'image.'
          : 'An error occurred while uploading the image.')
      );
    } finally {
      setUploadingImage(false);
    }
  };

  /**
   * Créer le post et le publier dans le feed
   */
  const handleCreatePost = async () => {
    if (!content.trim()) {
      showError(
        fr
          ? 'Le contenu du post est requis'
          : 'Post content is required'
      );
      return;
    }

    if (!user?.token) {
      showError(
        fr
          ? 'Vous devez être connecté pour créer un post'
          : 'You must be logged in to create a post'
      );
      return;
    }

    const activeType = user?.activeProfileType;
    if (!['DJ', 'BOOKER', 'VENUE'].includes(activeType)) {
      showError(
        fr
          ? 'Seuls les profils DJ, Organisateur et Lieu peuvent poster. Passe sur le bon profil via le menu.'
          : 'Only DJ, Organizer and Venue profiles can post. Switch profile via the menu.'
      );
      return;
    }

    let finalImageUrl = imageUrl;
    if (selectedImageUri && !imageUrl) {
      setLoading(true);
      try {
        const uploadResponse = await api.uploadFeedPostImage(user.token, selectedImageUri);
        if (uploadResponse && uploadResponse.success) {
          finalImageUrl = uploadResponse.imageUrl;
          setImageUrl(uploadResponse.imageUrl);
        } else {
          throw new Error(uploadResponse?.message || 'Erreur upload image');
        }
      } catch (error) {
        console.error('Erreur upload image:', error);
        showError(
          error.message || (fr
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
          fr
            ? 'Votre post a été publié avec succès!'
            : 'Your post has been published successfully!'
        );
        setTimeout(() => {
          goBack();
        }, 1000);
      } else {
        throw new Error('Erreur lors de la création du post');
      }
    } catch (error) {
      console.error('Erreur création post:', error);
      const msg = error?.message || error?.payload?.message;
      showError(
        msg ||
          (fr
            ? 'Une erreur est survenue lors de la création du post'
            : 'An error occurred while creating the post')
      );
    } finally {
      setLoading(false);
    }
  };

  if (user && !user.token) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.errorGuard}>
          <NoxText variant="secondary" style={styles.errorGuardText}>
            {fr ? 'Vous devez être connecté pour poster.' : 'You must be logged in to post.'}
          </NoxText>
          <NoxButton
            label={fr ? 'Retour' : 'Back'}
            onPress={goBack}
            fullWidth={false}
            style={styles.errorGuardButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      {toast?.visible && (
        <Toast
          message={toast.message}
          type={toast.type || 'info'}
          visible={true}
          onHide={hideToast}
        />
      )}

      <NoxScreenHeader
        title={fr ? 'Nouveau post' : 'New post'}
        onBack={goBack}
      />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputContainer}>
            <NoxInput
              label={fr ? 'Contenu' : 'Content'}
              placeholder={
                fr
                  ? 'Quoi de neuf ? Partagez vos dernières actualités...'
                  : 'What\'s new? Share your latest updates...'
              }
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={1000}
              inputStyle={styles.contentInput}
            />
            <NoxText variant="secondary" style={styles.charCount}>
              {content.length}/1000
            </NoxText>
          </View>

          <View style={styles.imageSection}>
            <NoxText variant="form" style={styles.sectionTitle}>
              {fr ? 'Image (optionnel)' : 'Image (optional)'}
            </NoxText>

            <NoxButton
              label={fr ? 'Sélectionner depuis la galerie' : 'Select from gallery'}
              variant="ghost"
              onPress={handlePickImage}
              disabled={uploadingImage || loading}
              iconLeft={
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
              }
              style={styles.selectImageButton}
            />

            <NoxInput
              label={fr ? 'URL d\'image' : 'Image URL'}
              placeholder={
                fr
                  ? 'Ou entrer une URL d\'image'
                  : 'Or enter an image URL'
              }
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              keyboardType="url"
              editable={!selectedImageUri}
              containerStyle={[
                styles.imageUrlInput,
                selectedImageUri ? styles.disabledFieldHint : null,
              ]}
            />

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
                  accessibilityRole="button"
                  accessibilityLabel={fr ? 'Retirer l\'image' : 'Remove image'}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.primary} />
                </TouchableOpacity>
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <NoxText variant="secondary" style={styles.uploadingText}>
                      {fr ? 'Upload en cours...' : 'Uploading...'}
                    </NoxText>
                  </View>
                )}
              </View>
            )}

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
                  accessibilityRole="button"
                  accessibilityLabel={fr ? 'Retirer l\'image' : 'Remove image'}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <NoxButton
            label={fr ? 'Publier' : 'Publish'}
            onPress={handleCreatePost}
            loading={loading}
            disabled={loading}
            style={styles.publishButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
