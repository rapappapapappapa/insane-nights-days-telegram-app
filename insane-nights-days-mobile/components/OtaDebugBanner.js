import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import Colors from '../constants/colors';

/** Change ce libellé à chaque OTA test pour vérifier visuellement que la MAJ s’applique. */
export const OTA_VISIBLE_MARKER = 'MARQUEUR OTA · C · 7 juil. (auto-reload)';

function shortId(id) {
  if (!id || id === 'n/a') return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export default function OtaDebugBanner() {
  if (__DEV__ || !Updates.isEnabled) return null;

  const embedded = Updates.isEmbeddedLaunch ? 'EMBARQUÉ' : 'OTA';
  const channel = Updates.channel || '—';
  const updateId = shortId(Updates.updateId);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.marker}>{OTA_VISIBLE_MARKER}</Text>
      <Text style={styles.meta}>
        {embedded} · canal {channel} · update {updateId}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#fff',
  },
  marker: {
    color: '#000',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  meta: {
    color: '#000',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.85,
  },
});
