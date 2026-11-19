import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';

/**
 * Mode scroll plein écran (maquette 18) : une entrée par écran, défilement page par page.
 * `renderPage(item, { height, bottomInset })` rend une page ; `children` (ex. feuille de commentaires)
 * est rendu dans la modale pour pouvoir s’afficher par-dessus.
 */
export default function FeedScrollMode({ visible, items, startId, renderPage, onClose, fr, children }) {
  const insets = useSafeAreaInsets();
  const [pageHeight, setPageHeight] = useState(0);
  if (!visible) return null;

  const startIndex = Math.max(0, items.findIndex((entry) => entry.id === startId));
  const page = { height: pageHeight, bottomInset: insets.bottom };

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style="light" />
      <View style={styles.container} onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}>
        {pageHeight > 0 ? (
          <FlatList
            data={items}
            keyExtractor={(entry) => `${entry.type || 'post'}-${entry.id}`}
            renderItem={({ item }) => renderPage(item, page)}
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={pageHeight}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={Math.min(startIndex, Math.max(0, items.length - 1))}
            getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
            windowSize={3}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
          />
        ) : null}
        <TouchableOpacity
          style={[styles.close, { top: insets.top + Spacing.md }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel={fr ? 'Quitter le mode scroll' : 'Exit scroll mode'}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  close: {
    position: 'absolute',
    left: Spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,10,9,0.5)',
  },
});
