import React from 'react';
import { Text, View, TouchableOpacity, TextInput, Modal } from 'react-native';
import VideoPlayer from '../VideoPlayer';
import BuiltInStreamPlayerModal from '../BuiltInStreamPlayerModal';

/** Lecteur vidéo, stream Spotify/SoundCloud, édition titre média. */
export default function DjMediaModals(props) {
  const {
    language,
    styles,
    selectedVideo,
    videoPlayerVisible,
    setVideoPlayerVisible,
    setSelectedVideo,
    streamPreviewPlayer,
    setStreamPreviewPlayer,
    editingTitle,
    setEditingTitle,
    editTitleValue,
    setEditTitleValue,
    updateMediaTitle,
  } = props;

  return (
    <>
            {selectedVideo && (
              <VideoPlayer
                videoUrl={selectedVideo.url}
                thumbnailUrl={selectedVideo.thumbnail}
                title={selectedVideo.title}
                isYouTube={selectedVideo.isYouTube || false}
                visible={videoPlayerVisible}
                onClose={() => {
                  setVideoPlayerVisible(false);
                  setSelectedVideo(null);
                }}
              />
            )}
      
            <BuiltInStreamPlayerModal
              visible={streamPreviewPlayer.visible}
              embedUri={streamPreviewPlayer.uri}
              title={streamPreviewPlayer.title}
              language={language}
              onClose={() =>
                setStreamPreviewPlayer({ visible: false, uri: null, title: '' })
              }
            />
      
            {/* Modal d'édition de titre */}
            <Modal
              visible={editingTitle !== null}
              transparent={true}
              animationType="fade"
              onRequestClose={() => {
                setEditingTitle(null);
                setEditTitleValue('');
              }}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>
                    {language === 'fr' ? 'Modifier le titre' : 'Edit Title'}
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editTitleValue}
                    onChangeText={setEditTitleValue}
                    placeholder={language === 'fr' ? 'Titre du média' : 'Media title'}
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    autoFocus={true}
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => {
                        setEditingTitle(null);
                        setEditTitleValue('');
                      }}
                    >
                      <Text style={styles.modalButtonCancelText}>
                        {language === 'fr' ? 'Annuler' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonSave]}
                      onPress={() => {
                        if (editingTitle && editingTitle.id) {
                          updateMediaTitle(editingTitle.id, editingTitle.type, editTitleValue);
                        }
                      }}
                    >
                      <Text style={styles.modalButtonSaveText}>
                        {language === 'fr' ? 'Enregistrer' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
    </>
  );
}
