import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/config';

/**
 * Groupes « aller avec des amis » sur la page détail événement.
 */
export function useEventDetailGroups({ user, eventId, userProfiles, language, showError, showSuccess }) {
  const [eventGroups, setEventGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitingGroupId, setInvitingGroupId] = useState(null);
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [inviting, setInviting] = useState(false);

  const hasActiveCommunityProfile = useCallback(() => {
    return (
      userProfiles?.activeProfileType === 'COMMUNITY' &&
      userProfiles?.profiles?.community &&
      userProfiles.profiles.community.length > 0
    );
  }, [userProfiles]);

  const normalizeGroup = (g) => ({
    id: g.id,
    name: g.name,
    creator: g.creator,
    members: (g.members || []).map((m) => ({
      id: m.id,
      communityId: m.communityId || m.community?.id,
      pseudo: m.pseudo ?? m.community?.pseudo ?? 'Anonyme',
      profileImage: m.profileImage ?? m.community?.profileImage,
      status: m.status,
    })),
  });

  const fetchEventGroups = useCallback(async () => {
    if (!user?.token || !eventId) return;
    setLoadingGroups(true);
    try {
      const res = await api.getEventGroups(user.token, eventId);
      if (res?.success && res.groups) setEventGroups(res.groups);
    } catch (e) {
      setEventGroups([]);
    } finally {
      setLoadingGroups(false);
    }
  }, [user?.token, eventId]);

  useEffect(() => {
    if (user?.token && eventId && hasActiveCommunityProfile()) {
      fetchEventGroups();
    }
  }, [user?.token, eventId, userProfiles?.activeProfileType, userProfiles?.profiles?.community, fetchEventGroups, hasActiveCommunityProfile]);

  const handleCreateOrOpenGroup = async () => {
    if (!user?.token || !hasActiveCommunityProfile()) {
      showError(language === 'fr' ? 'Profil Communauté requis.' : 'Community profile required.');
      return;
    }
    setCreatingGroup(true);
    try {
      const res = await api.createEventGroup(user.token, eventId);
      if (res?.success && res.group) {
        const normalized = normalizeGroup(res.group);
        setEventGroups((prev) => {
          const exists = prev.some((g) => g.id === normalized.id);
          if (exists) return prev;
          return [...prev, normalized];
        });
        setInvitingGroupId(normalized.id);
        setSelectedFriends([]);
        const friendsRes = await api.getCommunityFriends(user.token);
        if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
        setInviteModalVisible(true);
      } else {
        showError(res?.message || 'Erreur');
      }
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleInviteFriends = async () => {
    if (!invitingGroupId || selectedFriends.length === 0) return;
    setInviting(true);
    try {
      const res = await api.inviteToEventGroup(
        user.token,
        eventId,
        invitingGroupId,
        selectedFriends.map((f) => f.communityId)
      );
      if (res?.success) {
        showSuccess(language === 'fr' ? `${res.invited || 0} ami(s) invité(s)` : `${res.invited || 0} friend(s) invited`);
        setInviteModalVisible(false);
        setInvitingGroupId(null);
        setSelectedFriends([]);
        fetchEventGroups();
      } else {
        showError(res?.message || 'Erreur');
      }
    } catch (e) {
      showError(e?.message || 'Erreur');
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = (groupId) => {
    setInvitingGroupId(groupId);
    setSelectedFriends([]);
    api.getCommunityFriends(user.token).then((friendsRes) => {
      if (friendsRes?.success && friendsRes.friends) setFriends(friendsRes.friends);
    });
    setInviteModalVisible(true);
  };

  return {
    eventGroups,
    loadingGroups,
    creatingGroup,
    inviteModalVisible,
    setInviteModalVisible,
    invitingGroupId,
    friends,
    selectedFriends,
    setSelectedFriends,
    inviting,
    hasActiveCommunityProfile,
    handleCreateOrOpenGroup,
    handleInviteFriends,
    openInviteModal,
  };
}
