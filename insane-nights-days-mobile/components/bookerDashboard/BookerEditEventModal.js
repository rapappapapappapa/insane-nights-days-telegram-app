import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '../../../constants/colors';
import { normalizeMediaUrl } from '../../../api/config';

/** Modal édition événement (dashboard organisateur). */
export default function BookerEditEventModal(props) {
  const {
    language,
    styles,
    editEventVisible,
    setEditEventVisible,
    editEventDraft,
    setEditEventDraft,
    editEventSaving,
    editEventUploading,
    pickEditEventImage,
    saveEditEvent,
  } = props;

  return (
          {/* ✅ Modal édition événement */}
          <Modal
            visible={editEventVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setEditEventVisible(false)}
          >
            <View style={styles.editEventOverlay}>
              <KeyboardAvoidingView
                style={styles.editEventCard}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <ScrollView
                  contentContainerStyle={styles.editEventContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                >
                  <Text style={styles.editEventTitle}>
                    {language === 'fr' ? 'Modifier l’événement' : 'Edit event'}
                  </Text>
    
                  <Text style={styles.editEventLabel}>{language === 'fr' ? 'Titre' : 'Title'}</Text>
                  <TextInput
                    style={styles.editEventInput}
                    value={editEventDraft.title}
                    onChangeText={(v) => setEditEventDraft((p) => ({ ...p, title: v }))}
                    placeholder={language === 'fr' ? 'Nom de l’événement' : 'Event name'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
    
                  <Text style={styles.editEventLabel}>{language === 'fr' ? 'Description' : 'Description'}</Text>
                  <TextInput
                    style={[styles.editEventInput, { height: 90 }]}
                    value={editEventDraft.description}
                    onChangeText={(v) => setEditEventDraft((p) => ({ ...p, description: v }))}
                    placeholder={language === 'fr' ? 'Description (optionnel)' : 'Description (optional)'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    multiline
                  />
    
                  <View style={styles.editEventRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editEventLabel}>{language === 'fr' ? 'Genre' : 'Genre'}</Text>
                      <TextInput
                        style={styles.editEventInput}
                        value={editEventDraft.genre}
                        onChangeText={(v) => setEditEventDraft((p) => ({ ...p, genre: v }))}
                        placeholder="Techno"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editEventLabel}>{language === 'fr' ? 'Heure' : 'Time'}</Text>
                      <TextInput
                        style={styles.editEventInput}
                        value={editEventDraft.time}
                        onChangeText={(v) => setEditEventDraft((p) => ({ ...p, time: v }))}
                        placeholder="21:00"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                      />
                    </View>
                  </View>
    
                  <Text style={styles.editEventLabel}>{language === 'fr' ? 'Adresse (affichage)' : 'Display address'}</Text>
                  <TextInput
                    style={styles.editEventInput}
                    value={editEventDraft.location}
                    onChangeText={(v) => setEditEventDraft((p) => ({ ...p, location: v }))}
                    placeholder={language === 'fr' ? 'Adresse affichée' : 'Displayed address'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                  />
    
                  <Text style={styles.editEventLabel}>{language === 'fr' ? 'Photo' : 'Photo'}</Text>
                  {editEventDraft.image ? (
                    <Image
                      source={{ uri: normalizeMediaUrl(editEventDraft.image) }}
                      style={styles.editEventImage}
                    />
                  ) : (
                    <Text style={styles.editEventHint}>
                      {language === 'fr' ? 'Aucune photo' : 'No photo'}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.editEventImageButton, editEventUploading && styles.editEventImageButtonDisabled]}
                    onPress={pickEditEventImage}
                    disabled={editEventUploading}
                  >
                    {editEventUploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.editEventImageButtonText}>
                        {language === 'fr' ? '🖼️ Choisir une photo' : '🖼️ Pick a photo'}
                      </Text>
                    )}
                  </TouchableOpacity>
    
                  <View style={styles.editEventActions}>
                    <TouchableOpacity
                      style={[styles.editEventAction, styles.editEventCancel]}
                      onPress={() => setEditEventVisible(false)}
                      disabled={editEventSaving || editEventUploading}
                    >
                      <Text style={styles.editEventCancelText}>{language === 'fr' ? 'Annuler' : 'Cancel'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editEventAction, styles.editEventSave, (editEventSaving || editEventUploading) && styles.editEventSaveDisabled]}
                      onPress={saveEditEvent}
                      disabled={editEventSaving || editEventUploading}
                    >
                      {editEventSaving ? (
                        <ActivityIndicator size="small" color={Colors.background} />
                      ) : (
                        <Text style={styles.editEventSaveText}>{language === 'fr' ? 'Enregistrer' : 'Save'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </View>
          </Modal>
  );
}
