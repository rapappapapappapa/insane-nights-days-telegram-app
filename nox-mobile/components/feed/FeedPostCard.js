import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { normalizeMediaUrl } from '../../api/config';
import ImageWithRetry from '../ImageWithRetry';
import Colors from '../../constants/colors';
import { formatFeedRelativeDate } from '../../utils/feedPageUtils';
import { styles } from '../../screens/feed/FeedPage.styles';

export default function FeedPostCard({
  item,
  language,
  user,
  feedAvatarBust,
  likedPosts,
  postLikesCount,
  postComments,
  expandedComments,
  commentInputs,
  brokenPostImages,
  onDjPress,
  onBookerPress,
  onReportPost,
  onDeletePost,
  onToggleLike,
  onToggleComments,
  onCreateComment,
  dispatchPostState,
}) {
  const isDj = item.profileType === 'DJ';
  const profileName = isDj
    ? item.dj?.artistName
    : item.booker?.name || item.author?.username;
  const profileImage = isDj ? item.dj?.profileImage : item.booker?.profileImage;
  const profileLocation = isDj ? item.dj?.city : null;
  const imageUri = normalizeMediaUrl(item.imageUrl || item.image);
  const isAuthor = user?.id && item.author?.id === user.id;
  const baseAvatar = normalizeMediaUrl(profileImage);
  const avatarUri =
    isAuthor && baseAvatar
      ? `${String(baseAvatar).split('?')[0]}?cb=${feedAvatarBust}`
      : baseAvatar;

  const formatDate = (dateString) => formatFeedRelativeDate(dateString, language);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <TouchableOpacity
          style={styles.postHeaderLeft}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="link"
          accessibilityLabel={
            language === 'fr'
              ? `Profil ${profileName || 'utilisateur'}, ${isDj ? 'DJ' : 'organisateur'}`
              : `Profile ${profileName || 'user'}, ${isDj ? 'DJ' : 'organizer'}`
          }
          onPress={() => {
            if (isDj && item.dj) {
              onDjPress(item.dj.id, item.dj.userId);
            } else if (!isDj && (item.booker?.id || item.bookerId)) {
              onBookerPress(item.booker?.id || item.bookerId);
            }
          }}
        >
          <View style={styles.postAvatar}>
            {avatarUri ? (
              <ImageWithRetry
                uri={avatarUri}
                style={styles.avatarImage}
                resizeMode="cover"
                maxRetries={2}
                showRetryButton={false}
                onError={() => {
                  dispatchPostState({ type: 'SET_BROKEN_IMAGE', postId: `avatar-${item.id}` });
                }}
              />
            ) : null}
            {(!avatarUri || brokenPostImages[`avatar-${item.id}`]) && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  styles.avatarPlaceholder,
                  isDj ? styles.avatarDj : styles.avatarBooker,
                ]}
              >
                <Text style={styles.avatarText}>
                  {profileName?.charAt(0)?.toUpperCase() || (isDj ? 'DJ' : 'O')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.postHeaderInfo}>
            <View style={styles.postHeaderNameRow}>
              <Text style={styles.postAuthorName} numberOfLines={1}>
                {profileName || 'Utilisateur'}
              </Text>
              <View style={[styles.profileBadge, isDj ? styles.badgeDj : styles.badgeBooker]}>
                <Ionicons name={isDj ? 'musical-notes' : 'calendar'} size={10} color="#fff" />
                <Text style={styles.profileBadgeText}>{isDj ? 'DJ' : 'Organisateur'}</Text>
              </View>
            </View>
            <View style={styles.postMetaRow}>
              {profileLocation && <Text style={styles.postMeta}>{profileLocation}</Text>}
              <Text style={styles.postMetaDot}>•</Text>
              <Text style={styles.postMeta}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isAuthor && onDeletePost && (
          <TouchableOpacity
            style={styles.reportIconBtn}
            onPress={() => onDeletePost(item.id)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Supprimer ce post' : 'Delete this post'}
          >
            <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        )}

        {!isAuthor && (
          <TouchableOpacity
            style={styles.reportIconBtn}
            onPress={() => onReportPost(item.id)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Signaler ce post' : 'Report this post'}
          >
            <Ionicons name="flag-outline" size={18} color="rgba(255,255,255,0.65)" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.postContent}>{item.content}</Text>

      {!!imageUri && (
        <View style={styles.postImageContainer}>
          <ImageWithRetry
            uri={imageUri}
            style={styles.postImage}
            resizeMode="cover"
            maxRetries={3}
            retryDelay={1000}
            showRetryButton={true}
          />
        </View>
      )}

      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.postActionButton}
          onPress={() => onToggleLike(item.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: !!likedPosts[item.id] }}
          accessibilityLabel={
            likedPosts[item.id]
              ? language === 'fr'
                ? "Retirer le j'aime"
                : 'Unlike'
              : language === 'fr'
                ? "J'aime"
                : 'Like'
          }
        >
          <Ionicons
            name={likedPosts[item.id] ? 'heart' : 'heart-outline'}
            size={18}
            color={likedPosts[item.id] ? Colors.primary : 'rgba(255,255,255,0.6)'}
            style={likedPosts[item.id] ? { color: Colors.primary } : undefined}
          />
          {(postLikesCount[item.id] || item.likes || 0) > 0 && (
            <Text style={[styles.postActionText, likedPosts[item.id] && styles.postActionTextLiked]}>
              {postLikesCount[item.id] !== undefined ? postLikesCount[item.id] : item.likes}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postActionButton}
          onPress={() => onToggleComments(item.id)}
          accessibilityRole="button"
          accessibilityLabel={
            expandedComments[item.id]
              ? language === 'fr'
                ? 'Masquer les commentaires'
                : 'Hide comments'
              : language === 'fr'
                ? 'Afficher les commentaires'
                : 'Show comments'
          }
        >
          <Ionicons
            name={expandedComments[item.id] ? 'chatbubble' : 'chatbubble-outline'}
            size={18}
            color={expandedComments[item.id] ? Colors.primary : 'rgba(255,255,255,0.6)'}
          />
          {(postComments[item.id] ? postComments[item.id].length : (item.commentsCount ?? 0)) > 0 && (
            <Text
              style={[styles.postActionText, expandedComments[item.id] && styles.postActionTextLiked]}
            >
              {postComments[item.id] ? postComments[item.id].length : (item.commentsCount ?? 0)}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postActionButton}
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          accessibilityLabel={
            language === 'fr' ? 'Partager, non disponible pour le moment' : 'Share not available yet'
          }
        >
          <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </View>

      {expandedComments[item.id] && (
        <View style={styles.commentsSection}>
          {postComments[item.id] && postComments[item.id].length > 0 && (
            <View style={styles.commentsList}>
              {postComments[item.id].map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>{comment.user.username}</Text>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                </View>
              ))}
            </View>
          )}

          {user?.token && (
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder={language === 'fr' ? 'Ajouter un commentaire...' : 'Add a comment...'}
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={commentInputs[item.id] || ''}
                onChangeText={(text) =>
                  dispatchPostState({ type: 'SET_COMMENT_INPUT', postId: item.id, text })
                }
                multiline
                accessibilityLabel={language === 'fr' ? 'Votre commentaire' : 'Your comment'}
              />
              <TouchableOpacity
                style={styles.commentSendButton}
                onPress={() => onCreateComment(item.id)}
                accessibilityRole="button"
                accessibilityLabel={language === 'fr' ? 'Envoyer le commentaire' : 'Send comment'}
              >
                <Ionicons name="send" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
