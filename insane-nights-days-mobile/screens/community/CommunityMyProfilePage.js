import React, { useCallback, useEffect, useState } from 'react';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../api/config';
import CommunityProfileShell from '../../components/community/CommunityProfileShell';

export default function CommunityMyProfilePage() {
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [followingCount, setFollowingCount] = useState(0);

  const initialTab = routeParams?.tab || 'overview';

  const load = useCallback(async () => {
    if (!user?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [profileRes, friendsRes, ticketsRes, followingRes] = await Promise.all([
        api.getCommunityProfile(user.token),
        api.getCommunityFriends(user.token).catch(() => null),
        api.getMyTickets(user.token).catch(() => null),
        api.getFeedFollowing(user.token, 100, 0).catch(() => null),
      ]);
      if (profileRes?.success && profileRes.profile) setProfile(profileRes.profile);
      if (friendsRes?.success && Array.isArray(friendsRes.friends)) setFriends(friendsRes.friends);
      if (ticketsRes?.success && Array.isArray(ticketsRes.tickets)) setTickets(ticketsRes.tickets);
      if (followingRes?.success && Array.isArray(followingRes.feed)) {
        const authors = new Set();
        followingRes.feed.forEach((item) => {
          if (item.authorId) authors.add(String(item.authorId));
          if (item.dj?.id) authors.add(`dj:${item.dj.id}`);
          if (item.booker?.id) authors.add(`booker:${item.booker.id}`);
        });
        setFollowingCount(authors.size || followingRes.total || followingRes.feed.length);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CommunityProfileShell
      profile={profile}
      loading={loading}
      isOwnProfile
      friends={friends}
      tickets={tickets}
      followingCount={followingCount}
      language={language}
      navigate={navigate}
      goBack={goBack}
      onEdit={() => navigate('communityProfileEdit')}
      initialTab={initialTab}
    />
  );
}
