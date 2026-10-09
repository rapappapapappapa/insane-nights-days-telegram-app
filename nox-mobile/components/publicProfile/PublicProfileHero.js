import React, { useState } from 'react';
import { View, TouchableOpacity, Image, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';
import { normalizeMediaUrl } from '../../api/config';
import { publicProfileStyles as styles } from './publicProfileStyles';

function formatStat(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (Number.isFinite(n)) {
    if (n <= 0) return null;
    if (n >= 1000) {
      const k = n / 1000;
      return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}K`;
    }
    return String(Math.round(n));
  }
  return String(value);
}

/**
 * Hero profil public Figma — banner, avatar, Suivre, stats, bio.
 */
export default function PublicProfileHero({
  language = 'fr',
  onBack,
  bannerImage,
  profileImage,
  name,
  metaLine,
  locationLine,
  bio,
  verified = true,
  stats = [],
  showFollow = false,
  following = false,
  loadingFollow = false,
  onFollowPress,
  shareMessage,
  onMenuPress,
  extraActions = null,
  fallbackIcon = 'person',
}) {
  const fr = language === 'fr';
  const insets = useSafeAreaInsets();
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bannerBroken, setBannerBroken] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const bannerUri = bannerImage ? normalizeMediaUrl(bannerImage) : null;
  const avatarUri = profileImage ? normalizeMediaUrl(profileImage) : null;
  const visibleStats = (stats || []).filter((s) => formatStat(s.value) != null || s.force);

  const handleShare = async () => {
    const message =
      shareMessage ||
      (fr ? `Découvre ${name || 'ce profil'} sur NOX` : `Discover ${name || 'this profile'} on NOX`);
    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  };

  const bioText = (bio || '').trim();
  const bioLong = bioText.length > 140;
  const shownBio =
    !bioText
      ? null
      : bioExpanded || !bioLong
        ? bioText
        : `${bioText.slice(0, 140).trim()}…`;

  return (
    <View style={styles.heroWrap}>
      <View style={styles.banner}>
        {bannerUri && !bannerBroken ? (
          <Image
            source={{ uri: bannerUri }}
            style={styles.bannerImage}
            resizeMode="cover"
            onError={() => setBannerBroken(true)}
          />
        ) : (
          <Ionicons name={`${fallbackIcon}-outline`} size={36} color={Colors.primary} />
        )}
        <View style={styles.bannerOverlay} />
        <View style={[styles.topOverlay, { paddingTop: (insets?.top ?? 0) + Spacing.sm }]}>
          <TouchableOpacity style={styles.topBtn} onPress={onBack} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.topBtn}
            onPress={onMenuPress || handleShare}
            hitSlop={10}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}>
          {avatarUri && !avatarBroken ? (
            <Image
              source={{ uri: avatarUri }}
              style={styles.avatar}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <NoxText variant="title">{(name || '?').charAt(0).toUpperCase()}</NoxText>
            </View>
          )}
          {verified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            </View>
          ) : null}
        </View>

        <View style={styles.identityMain}>
          <View style={styles.nameRow}>
            <NoxText variant="title" style={styles.name} numberOfLines={1}>
              {name || (fr ? 'Profil' : 'Profile')}
            </NoxText>
          </View>
          <View style={styles.actionsRow}>
            {showFollow ? (
              <TouchableOpacity
                style={[styles.followBtn, following && styles.followBtnSecondary]}
                onPress={onFollowPress}
                disabled={loadingFollow}
                activeOpacity={0.85}
              >
                <NoxText style={styles.followBtnText}>
                  {loadingFollow
                    ? '…'
                    : following
                      ? fr
                        ? 'Abonné'
                        : 'Following'
                      : fr
                        ? 'Suivre'
                        : 'Follow'}
                </NoxText>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.iconAction} onPress={handleShare} hitSlop={8}>
              <Ionicons name="paper-plane-outline" size={18} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconAction}
              onPress={onMenuPress || handleShare}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {metaLine ? (
        <NoxText variant="secondary" style={styles.metaLine} numberOfLines={2}>
          {metaLine}
        </NoxText>
      ) : null}
      {locationLine ? (
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
          <NoxText variant="secondary" style={styles.locText} numberOfLines={1}>
            {locationLine}
          </NoxText>
        </View>
      ) : null}

      {shownBio ? (
        <View style={styles.bioBlock}>
          <NoxText variant="secondary" style={styles.bioText}>
            {shownBio}
          </NoxText>
          {bioLong ? (
            <TouchableOpacity onPress={() => setBioExpanded((v) => !v)} hitSlop={8}>
              <NoxText style={styles.seeMore}>
                {bioExpanded ? (fr ? 'Voir moins' : 'See less') : fr ? 'Voir plus' : 'See more'}
              </NoxText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {visibleStats.length > 0 ? (
        <View style={styles.statsRow}>
          {visibleStats.map((stat, index) => (
            <React.Fragment key={stat.label}>
              {index > 0 ? <View style={styles.statDivider} /> : null}
              <View style={styles.statItem}>
                <NoxText style={styles.statValue}>
                  {formatStat(stat.value) ?? (stat.force ? '—' : '—')}
                </NoxText>
                <NoxText variant="secondary" style={styles.statLabel}>
                  {stat.label}
                </NoxText>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}

      {extraActions ? <View style={styles.extraActions}>{extraActions}</View> : null}
    </View>
  );
}
