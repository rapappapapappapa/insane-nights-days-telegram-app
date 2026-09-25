import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import Colors from '../../constants/colors';
import { publicProfileStyles as styles } from './publicProfileStyles';

/**
 * Bandeau citation / signature bas de page (maquettes profil public).
 */
export default function PublicProfileSignature({ quote, name, variant = 'artist' }) {
  if (!quote && !name) return null;
  return (
    <View style={styles.signatureBlock}>
      <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.primary} />
      <View style={styles.signatureTextWrap}>
        {quote ? (
          <NoxText variant="secondary" style={styles.signatureQuote}>
            “{quote}”
          </NoxText>
        ) : null}
        {name ? (
          <NoxText style={styles.signatureName}>
            {String(name).toUpperCase()}
          </NoxText>
        ) : null}
      </View>
      {variant === 'artist' ? (
        <Ionicons name="pulse-outline" size={28} color={Colors.textMuted} />
      ) : (
        <Ionicons name="business-outline" size={24} color={Colors.textMuted} />
      )}
    </View>
  );
}
