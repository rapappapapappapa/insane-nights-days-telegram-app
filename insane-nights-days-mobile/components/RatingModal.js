import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Colors from '../constants/colors';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../hooks/useToast';
import StarRating from './StarRating';

export default function RatingModal({ visible, onClose, onSubmit, title, loading = false }) {
  const { language } = useLanguage();
  const { showError } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating === 0) {
      showError(language === 'fr' ? 'Veuillez sélectionner une note.' : 'Please select a rating.');
      return;
    }

    onSubmit({ rating, comment: comment.trim() || null });
    // Reset après soumission
    setRating(0);
    setComment('');
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.ratingSection}>
              <Text style={styles.label}>
                {language === 'fr' ? 'Votre note' : 'Your rating'}
              </Text>
              <StarRating
                rating={rating}
                editable
                onPress={setRating}
                size={32}
                showStars={false}
              />
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.label}>
                {language === 'fr' ? 'Commentaire (optionnel)' : 'Comment (optional)'}
              </Text>
              <TextInput
                style={styles.commentInput}
                placeholder={language === 'fr' ? 'Partagez votre expérience...' : 'Share your experience...'}
                placeholderTextColor="rgba(255,255,255,0.4)"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, (rating === 0 || loading) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={rating === 0 || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {language === 'fr' ? 'Envoyer' : 'Submit'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,23,68,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  ratingSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  label: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

