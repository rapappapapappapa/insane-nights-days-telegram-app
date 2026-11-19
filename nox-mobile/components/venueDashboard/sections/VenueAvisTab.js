import React from 'react';
import { Text, View } from 'react-native';
import StarRating from '../../StarRating';

export default function VenueAvisTab({ language, styles, ratings }) {
      if (!ratings) {
        return (
          <Text style={styles.comingSoon}>
            {language === 'fr' ? 'Aucune note pour le moment.' : 'No ratings yet.'}
          </Text>
        );
      }
  
      return (
        <View style={styles.ratingCard}>
          <Text style={styles.sectionSubtitle}>{language === 'fr' ? 'Moyennes' : 'Averages'}</Text>
          <View style={styles.ratingRow}>
            <StarRating rating={ratings.averageRatingGlobal ?? 0} size={20} showStars={false} />
            <Text style={styles.ratingValue}>{(ratings.averageRatingGlobal ?? 0).toFixed(1)} / 5</Text>
          </View>
          <Text style={styles.ratingDetail}>
            {language === 'fr' ? 'Communauté' : 'Community'}: {(ratings.averageRatingCommunity ?? 0).toFixed(1)} · {language === 'fr' ? 'Organisateurs' : 'Organizers'}: {(ratings.averageRatingBooker ?? 0).toFixed(1)} · DJs: {(ratings.averageRatingDj ?? 0).toFixed(1)}
          </Text>
  
          {ratings.allRatings?.length ? (
            <View style={styles.reviewsList}>
              {ratings.allRatings.map((r) => (
                <View key={r.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewRating}>★ {r.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewMeta}>
                      {r.eventTitle ? `${r.eventTitle} · ` : ''}{new Date(r.eventDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                    </Text>
                  </View>
                  {r.comment ? <Text style={styles.reviewComment}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.comingSoon}>
              {language === 'fr' ? 'Pas encore d\'avis détaillés.' : 'No detailed reviews yet.'}
            </Text>
          )}
        </View>
      );
}
