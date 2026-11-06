import { useState, useEffect } from 'react';
import { api } from '../api/config';
import { DEFAULT_AVAILABLE_DAYS } from '../components/PrestataireGenreAndAvailabilityFields';

/**
 * Profil prestataire (dashboard prestataire).
 */
export function usePrestataireProfile({ user, language, showError, showSuccess }) {
  const [profBusinessName, setProfBusinessName] = useState('');
  const [profPhonePro, setProfPhonePro] = useState('');
  const [profCity, setProfCity] = useState('');
  const [profCountry, setProfCountry] = useState('');
  const [profBio, setProfBio] = useState('');
  const [profGenres, setProfGenres] = useState([]);
  const [profDays, setProfDays] = useState(() => ({ ...DEFAULT_AVAILABLE_DAYS }));
  const [profAvailableStatus, setProfAvailableStatus] = useState(true);
  const [profCustomGenre, setProfCustomGenre] = useState('');
  const [profLoading, setProfLoading] = useState(true);
  const [profSaving, setProfSaving] = useState(false);

  useEffect(() => {
    if (!user?.token) return;
    let cancelled = false;
    (async () => {
      setProfLoading(true);
      try {
        const res = await api.getUserProfiles(user.token);
        const p = res?.profiles?.prestataire?.[0];
        if (!cancelled && p) {
          setProfBusinessName(p.businessName || '');
          setProfPhonePro(p.phonePro || '');
          setProfCity(p.city || '');
          setProfCountry(p.country || '');
          setProfBio(p.bio || '');
          setProfGenres(Array.isArray(p.prestationGenres) ? [...p.prestationGenres] : []);
          setProfAvailableStatus(p.availableStatus !== false);
          let days = { ...DEFAULT_AVAILABLE_DAYS };
          if (p.availableDays) {
            try {
              const parsed = typeof p.availableDays === 'string' ? JSON.parse(p.availableDays) : p.availableDays;
              days = { ...DEFAULT_AVAILABLE_DAYS, ...parsed };
            } catch (_) {
              /* ignore */
            }
          }
          setProfDays(days);
        }
      } catch (e) {
        console.error('[PrestataireDashboard] load profile', e);
      } finally {
        if (!cancelled) setProfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  const addProfCustomGenre = () => {
    const t = profCustomGenre.trim();
    if (!t) return;
    const low = t.toLowerCase();
    if (profGenres.some((g) => String(g).trim().toLowerCase() === low)) {
      setProfCustomGenre('');
      return;
    }
    setProfGenres([...profGenres, t]);
    setProfCustomGenre('');
  };

  const savePrestataireProfile = async () => {
    if (!user?.token) return;
    if (!profBusinessName.trim() || !profPhonePro.trim()) {
      showError(
        language === 'fr' ? 'Nom d’activité et téléphone pro sont obligatoires.' : 'Business name and phone are required.'
      );
      return;
    }
    if (profGenres.length === 0) {
      showError(
        language === 'fr' ? 'Ajoutez au moins un genre de prestation.' : 'Add at least one service type.'
      );
      return;
    }
    setProfSaving(true);
    try {
      const res = await api.updatePrestataireProfile(user.token, {
        businessName: profBusinessName.trim(),
        phonePro: profPhonePro.trim(),
        prestationGenres: profGenres,
        city: profCity.trim() || undefined,
        country: profCountry.trim() || undefined,
        bio: profBio.trim() || undefined,
        availableDays: profDays,
        availableStatus: profAvailableStatus,
      });
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Profil mis à jour.' : 'Profile updated.');
      } else {
        showError(res?.message || (language === 'fr' ? 'Erreur' : 'Error'));
      }
    } catch (e) {
      console.error('[PrestataireDashboard] save profile', e);
      showError(String(e?.message || e));
    } finally {
      setProfSaving(false);
    }
  };

  return {
    profBusinessName,
    setProfBusinessName,
    profPhonePro,
    setProfPhonePro,
    profCity,
    setProfCity,
    profCountry,
    setProfCountry,
    profBio,
    setProfBio,
    profGenres,
    setProfGenres,
    profDays,
    setProfDays,
    profAvailableStatus,
    setProfAvailableStatus,
    profCustomGenre,
    setProfCustomGenre,
    profLoading,
    profSaving,
    addProfCustomGenre,
    savePrestataireProfile,
  };
}
