import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

export default function StarRating({ rating, maxRating = 5, size = 20, onPress, editable = false, showStars = false, showValue = true }) {
  // Si showStars est false, afficher juste "X/5"
  if (!showStars) {
    if (editable) {
      // Pour l'édition, on affiche des boutons numériques
      return (
        <View style={styles.container}>
          {Array.from({ length: maxRating }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.ratingButton,
                (i + 1) <= rating && styles.ratingButtonActive,
                { width: size * 1.5, height: size * 1.5 },
              ]}
              onPress={() => onPress && onPress(i + 1)}
              activeOpacity={0.7}
            >
              <Text style={[styles.ratingButtonText, { fontSize: size * 0.6 }]}>
                {i + 1}
              </Text>
            </TouchableOpacity>
          ))}
          {rating > 0 && (
            <Text style={[styles.ratingText, { fontSize: size * 0.8, marginLeft: 8 }]}>
              {rating.toFixed(1)}/{maxRating}
            </Text>
          )}
        </View>
      );
    }

    // Affichage simple "X/5"
    return (
      <View style={styles.container}>
        <Text style={[styles.ratingText, { fontSize: size }]}>
          {rating > 0 ? `${rating.toFixed(1)}/${maxRating}` : `0/${maxRating}`}
        </Text>
      </View>
    );
  }

  // Affichage avec étoiles (ancien comportement si showStars=true)
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  const renderStar = (type, index) => {
    const starStyle = [
      styles.star,
      { fontSize: size },
      editable && styles.starEditable,
    ];

    if (editable) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => onPress && onPress(index + 1)}
          activeOpacity={0.7}
        >
          <Text style={starStyle}>{type === 'full' ? '⭐' : type === 'half' ? '✨' : '☆'}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <Text key={index} style={starStyle}>
        {type === 'full' ? '⭐' : type === 'half' ? '✨' : '☆'}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: fullStars }).map((_, i) => renderStar('full', i))}
      {hasHalfStar && renderStar('half', fullStars)}
      {Array.from({ length: emptyStars }).map((_, i) => renderStar('empty', fullStars + (hasHalfStar ? 1 : 0) + i))}
      {showValue && rating > 0 && (
        <Text style={[styles.ratingText, { fontSize: size * 0.7 }]}>
          {' '}({rating.toFixed(1)})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    fontSize: 20,
    marginRight: 2,
  },
  starEditable: {
    opacity: 0.8,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  ratingButton: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  ratingButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ratingButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
});

