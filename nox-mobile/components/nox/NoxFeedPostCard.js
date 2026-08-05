import React from 'react';
import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { styles } from './NoxFeedPostCard.styles';

function getProfileMeta(block, isDjBlock) {
  if (!block) return { name: 'Utilisateur', location: null, image: null, isDj: isDjBlock };
  const isDj = isDjBlock ?? block.profileType === 'DJ';
  const name = isDj
    ? block.dj?.artistName
    : block.booker?.name || block.author?.username;
  const location = isDj ? block.dj?.city : null;
  const image = isDj ? block.dj?.profileImage : block.booker?.profileImage;
  return { name, location, image, isDj };
}

function PostBody({ content, imageUri, isBrokenImage, language, onImageError }) {
  return (
    <>
      {!!content?.trim() ? <Text style={styles.content}>{content}</Text> : null}
      {!!imageUri && !isBrokenImage ? (
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="cover"
            onError={onImageError}
          />
        </View>
      ) : null}
      {!!imageUri && isBrokenImage ? (
        <View style={[styles.imageWrap, styles.imageFallback]}>
          <Ionicons name="image-outline" size={22} color={Colors.textTertiary} />
          <Text style={styles.imageFallbackText}>
            {language === 'fr' ? 'Image indisponible' : 'Image unavailable'}
          </Text>
        </View>
      ) : null}
    </>
  );
}

export default function NoxFeedPostCard({
  item,
  language,
  profileName,
  profileLocation,
  profileImage,
  imageUri,
  isBrokenImage,
  isDj,
  isAuthor,
  liked,
  likesCount,
  commentsExpanded,
  comments,
  commentsCount,
  commentInput,
  canComment,
  canRepost,
  repostedByMe,
  onPressProfile,
  onPressOriginalProfile,
  onToggleLike,
  onToggleComments,
  onRepost,
  onReport,
  onDelete,
  onImageError,
  onCommentInputChange,
  onSendComment,
  formatDate,
}) {
  const fr = language === 'fr';
  const original = item.originalPost;
  const showEmbed = item.isRepost && original;

  const originalMeta = showEmbed ? getProfileMeta(original, original.profileType === 'DJ') : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
          activeOpacity={0.75}
          onPress={onPressProfile}
          accessibilityRole="link"
        >
          <View style={styles.avatar}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, isDj ? styles.avatarDj : styles.avatarBooker]}>
                <Text style={styles.avatarText}>
                  {profileName?.charAt(0)?.toUpperCase() || (isDj ? 'D' : 'O')}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {profileName || 'Utilisateur'}
              </Text>
              <View style={[styles.badge, isDj ? styles.badgeDj : styles.badgeBooker]}>
                <Ionicons name={isDj ? 'musical-notes' : 'calendar'} size={10} color={Colors.text} />
                <Text style={styles.badgeText}>{isDj ? 'DJ' : 'Org.'}</Text>
              </View>
            </View>
            <View style={styles.metaRow}>
              {showEmbed ? (
                <>
                  <Ionicons name="repeat" size={12} color={Colors.textTertiary} />
                  <Text style={styles.repostLabel}>{fr ? 'Repost' : 'Repost'}</Text>
                  <Text style={styles.metaDot}>•</Text>
                </>
              ) : null}
              {profileLocation ? <Text style={styles.meta}>{profileLocation}</Text> : null}
              {profileLocation ? <Text style={styles.metaDot}>•</Text> : null}
              <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          {isAuthor ? (
            <TouchableOpacity style={styles.iconBtn} onPress={onDelete} accessibilityLabel="Delete">
              <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.iconBtn} onPress={onReport} accessibilityLabel="Report">
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {showEmbed ? (
          <View style={styles.embeddedPost}>
            <TouchableOpacity
              style={styles.embeddedHeader}
              activeOpacity={0.75}
              onPress={onPressOriginalProfile}
              disabled={!onPressOriginalProfile}
            >
              <View style={[styles.embeddedAvatar, originalMeta?.isDj ? styles.avatarDj : styles.avatarBooker]}>
                {originalMeta?.image ? (
                  <Image source={{ uri: originalMeta.image }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.embeddedAvatarText}>
                    {originalMeta?.name?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                )}
              </View>
              <View style={styles.embeddedHeaderInfo}>
                <Text style={styles.embeddedAuthor} numberOfLines={1}>
                  {originalMeta?.name}
                </Text>
                <Text style={styles.meta}>{formatDate(original.createdAt)}</Text>
              </View>
            </TouchableOpacity>
            <PostBody
              content={original.content}
              imageUri={original.imageUrl}
              isBrokenImage={isBrokenImage}
              language={language}
              onImageError={onImageError}
            />
          </View>
        ) : (
          <PostBody
            content={item.content}
            imageUri={imageUri}
            isBrokenImage={isBrokenImage}
            language={language}
            onImageError={onImageError}
          />
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleLike}>
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? Colors.primary : Colors.textTertiary}
          />
          {likesCount > 0 ? (
            <Text style={[styles.actionText, liked && styles.actionTextActive]}>{likesCount}</Text>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={onToggleComments}>
          <Ionicons
            name={commentsExpanded ? 'chatbubble' : 'chatbubble-outline'}
            size={20}
            color={commentsExpanded ? Colors.primary : Colors.textTertiary}
          />
          {commentsCount > 0 ? (
            <Text style={[styles.actionText, commentsExpanded && styles.actionTextActive]}>
              {commentsCount}
            </Text>
          ) : null}
        </TouchableOpacity>
        {canRepost ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onRepost}
            accessibilityLabel={fr ? 'Reposter' : 'Repost'}
          >
            <Ionicons
              name="repeat"
              size={20}
              color={repostedByMe ? Colors.primary : Colors.textTertiary}
            />
          </TouchableOpacity>
        ) : null}
        <View style={styles.actionSpacer} />
      </View>

      {commentsExpanded ? (
        <View style={styles.commentsSection}>
          {comments?.length > 0 ? (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentAuthor}>{comment.user.username}</Text>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                  <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {canComment ? (
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder={fr ? 'Commenter…' : 'Comment…'}
                placeholderTextColor={Colors.textMuted}
                value={commentInput || ''}
                onChangeText={onCommentInputChange}
                multiline
              />
              <TouchableOpacity style={styles.commentSend} onPress={onSendComment}>
                <Ionicons name="send" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
