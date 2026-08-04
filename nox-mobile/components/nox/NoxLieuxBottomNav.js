import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import NoxBottomNav from './NoxBottomNav';
import NoxCreateSheet from './NoxCreateSheet';

/**
 * Bottom bar Lieux + menu FAB (média / création à venir).
 */
export default function NoxLieuxBottomNav({ active = 'home', navigate }) {
  const { language } = useLanguage();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <NoxBottomNav
        active={active}
        onHome={() => navigate('lieuxDashboard')}
        onProfile={() => navigate('lieuxProfil')}
        onCreate={() => setCreateOpen(true)}
      />
      <NoxCreateSheet
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        navigate={navigate}
        language={language}
      />
    </>
  );
}
