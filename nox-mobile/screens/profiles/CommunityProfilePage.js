/**
 * Page de visualisation du profil Communauté d'un ami (lecture seule, shell NOX).
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import CommunityProfileShell from '../../components/community/CommunityProfileShell';

export default function CommunityProfilePage() {
  const { language } = useLanguage();
  const { goBack, navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, hideToast } = useToast();

  const communityId = routeParams?.communityId;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const fr = language === 'fr';

  useEffect(() => {
    if (!user?.token || !communityId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.getCommunityProfileById(user.token, communityId);
        if (!cancelled && res?.success && res.profile) {
          setProfile(res.profile);
        } else if (!cancelled) {
          showError(fr ? 'Profil introuvable' : 'Profile not found');
        }
      } catch (e) {
        if (!cancelled) showError(e?.message || (fr ? 'Erreur chargement' : 'Load error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, communityId, fr, showError]);

  if (!communityId) {
    return (
      <>
        <CommunityProfileShell
          profile={null}
          loading={false}
          language={language}
          navigate={navigate}
          goBack={goBack}
        />
        <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
      </>
    );
  }

  return (
    <>
      <CommunityProfileShell
        profile={profile}
        loading={loading}
        isOwnProfile={false}
        friends={[]}
        tickets={[]}
        language={language}
        navigate={navigate}
        goBack={goBack}
        initialTab={routeParams?.tab || 'overview'}
      />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </>
  );
}
