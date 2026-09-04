import { useState, useMemo } from 'react';
import { api } from '../api/config';

/** Signalement d'un post feed. */
export function useFeedReport({ user, language, showError, showSuccess }) {
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState(null);

  const reportReasons = useMemo(
    () => [
      { id: 'SPAM', label: language === 'fr' ? 'Spam / pub' : 'Spam / ads' },
      { id: 'SCAM', label: language === 'fr' ? 'Arnaque' : 'Scam' },
      { id: 'HARASSMENT', label: language === 'fr' ? 'Harcèlement' : 'Harassment' },
      { id: 'ILLEGAL', label: language === 'fr' ? 'Illégal' : 'Illegal' },
      { id: 'OTHER', label: language === 'fr' ? 'Autre' : 'Other' },
    ],
    [language]
  );

  const reportPost = (postId) => {
    if (!user?.token) {
      showError(language === 'fr' ? 'Connecte-toi pour signaler.' : 'Log in to report.');
      return;
    }
    setPostToReport(postId);
    setReportModalVisible(true);
  };

  const handleReportReason = async (reason) => {
    if (!user?.token || !postToReport) return;
    setReportModalVisible(false);

    try {
      const res = await api.createReport(user.token, {
        targetType: 'FEED_POST',
        targetId: postToReport,
        reason: reason.id,
      });
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Signalement envoyé.' : 'Report sent.');
      } else {
        showError(res?.message || (language === 'fr' ? "Impossible d'envoyer." : 'Unable to send.'));
      }
    } catch (e) {
      console.error('Erreur signalement:', e);
      showError(language === 'fr' ? 'Signalement impossible.' : 'Reporting failed.');
    } finally {
      setPostToReport(null);
    }
  };

  const closeReportModal = () => {
    setReportModalVisible(false);
    setPostToReport(null);
  };

  return {
    reportModalVisible,
    reportReasons,
    reportPost,
    handleReportReason,
    closeReportModal,
  };
}
