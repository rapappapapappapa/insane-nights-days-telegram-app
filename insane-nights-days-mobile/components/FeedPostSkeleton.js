import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

/**
 * Composant Skeleton pour simuler un post du feed pendant le chargement
 */
export default function FeedPostSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header avec avatar et nom */}
      <View style={styles.header}>
        <SkeletonLoader width={48} height={48} circular={true} />
        <View style={styles.headerInfo}>
          <SkeletonLoader width={120} height={16} style={styles.nameSkeleton} />
          <SkeletonLoader width={80} height={12} style={styles.metaSkeleton} />
        </View>
      </View>

      {/* Contenu du post */}
      <View style={styles.content}>
        <SkeletonLoader width="100%" height={14} style={styles.textLine} />
        <SkeletonLoader width="90%" height={14} style={styles.textLine} />
        <SkeletonLoader width="75%" height={14} style={styles.textLine} />
      </View>

      {/* Image placeholder */}
      <SkeletonLoader width="100%" height={200} style={styles.imageSkeleton} />

      {/* Actions */}
      <View style={styles.actions}>
        <SkeletonLoader width={60} height={20} />
        <SkeletonLoader width={80} height={20} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  nameSkeleton: {
    marginBottom: 6,
  },
  metaSkeleton: {
    marginTop: 4,
  },
  content: {
    marginBottom: 12,
  },
  textLine: {
    marginBottom: 8,
  },
  imageSkeleton: {
    marginBottom: 12,
    borderRadius: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
});
