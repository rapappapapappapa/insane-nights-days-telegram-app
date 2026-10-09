import { useState, useEffect } from 'react';
import { api } from '../api/config';

/**
 * Location matériel + paliers billetterie extra (wizard événement booker).
 */
export function useBookerEventWizardRental({
  user,
  language,
  showError,
  showSuccess,
  setFormData,
  draftGate,
}) {
  const [rentalPresets, setRentalPresets] = useState([]);
  const [rentalCatalogItems, setRentalCatalogItems] = useState([]);
  const [rentalCatalogLabel, setRentalCatalogLabel] = useState('');
  const [rentalCatalogQty, setRentalCatalogQty] = useState('1');
  const [eventRentalExtraLabel, setEventRentalExtraLabel] = useState('');
  const [eventRentalExtraQty, setEventRentalExtraQty] = useState('1');
  const [savingRentalCatalog, setSavingRentalCatalog] = useState(false);

  const toggleEquipmentPreset = (id) => {
    setFormData((prev) => {
      const cur = prev.equipmentRentalPresetIds || [];
      const has = cur.includes(id);
      return {
        ...prev,
        equipmentRentalPresetIds: has ? cur.filter((x) => x !== id) : [...cur, id],
      };
    });
  };

  const toggleOrganizerLineFromCatalog = (item) => {
    const label = item.label;
    const qty = item.qty || 1;
    setFormData((prev) => {
      const lines = [...(prev.equipmentRentalOrganizerLines || [])];
      const idx = lines.findIndex(
        (l) =>
          String(l.label).trim() === String(label).trim() &&
          Number(l.qty || 1) === Number(qty)
      );
      if (idx >= 0) lines.splice(idx, 1);
      else lines.push({ label: String(label).trim(), qty: Number(qty) || 1 });
      return { ...prev, equipmentRentalOrganizerLines: lines };
    });
  };

  const addEventOnlyEquipmentLine = () => {
    const label = eventRentalExtraLabel.trim();
    if (!label) return;
    let qty = parseInt(eventRentalExtraQty, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    setFormData((prev) => ({
      ...prev,
      equipmentRentalOrganizerLines: [...(prev.equipmentRentalOrganizerLines || []), { label, qty }],
    }));
    setEventRentalExtraLabel('');
    setEventRentalExtraQty('1');
  };

  const removeOrganizerLineAt = (index) => {
    setFormData((prev) => {
      const lines = [...(prev.equipmentRentalOrganizerLines || [])];
      lines.splice(index, 1);
      return { ...prev, equipmentRentalOrganizerLines: lines };
    });
  };

  const addCatalogRow = () => {
    const label = rentalCatalogLabel.trim();
    if (!label) return;
    let qty = parseInt(rentalCatalogQty, 10);
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    const id = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    setRentalCatalogItems((prev) => [...prev, { id, label, qty }]);
    setRentalCatalogLabel('');
    setRentalCatalogQty('1');
  };

  const removeCatalogRow = (rid) => {
    setRentalCatalogItems((prev) => prev.filter((x) => x.id !== rid));
  };

  const updateExtraTicketTier = (index, field, value) => {
    setFormData((prev) => {
      const rows = [...(prev.extraTicketTiers || [])];
      rows[index] = { ...(rows[index] || {}), [field]: value };
      return { ...prev, extraTicketTiers: rows };
    });
  };

  const addExtraTicketTier = () => {
    setFormData((prev) => ({
      ...prev,
      extraTicketTiers: [...(prev.extraTicketTiers || []), { label: '', price: '', maxSold: '' }],
    }));
  };

  const removeExtraTicketTier = (index) => {
    setFormData((prev) => ({
      ...prev,
      extraTicketTiers: (prev.extraTicketTiers || []).filter((_, i) => i !== index),
    }));
  };

  const saveRentalCatalogToProfile = async () => {
    if (!user?.token || savingRentalCatalog) return;
    setSavingRentalCatalog(true);
    try {
      const res = await api.saveBookerRentalInventory(user.token, rentalCatalogItems);
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Catalogue matériel enregistré.' : 'Equipment catalog saved.');
      } else {
        showError(res?.message || (language === 'fr' ? 'Erreur sauvegarde.' : 'Save failed.'));
      }
    } catch (e) {
      console.error(e);
      showError(language === 'fr' ? 'Erreur réseau.' : 'Network error.');
    } finally {
      setSavingRentalCatalog(false);
    }
  };

  useEffect(() => {
    if (!user?.token || draftGate) return;
    let cancelled = false;
    (async () => {
      try {
        const lang = language === 'fr' ? 'fr' : 'en';
        const [pres, prof] = await Promise.all([
          api.getRentalEquipmentPresets(user.token, lang),
          api.getUserProfiles(user.token),
        ]);
        if (cancelled) return;
        if (pres?.success && Array.isArray(pres.presets)) setRentalPresets(pres.presets);
        const b = prof?.profiles?.booker?.[0];
        if (b?.rentalEquipmentInventory && Array.isArray(b.rentalEquipmentInventory)) {
          setRentalCatalogItems(b.rentalEquipmentInventory);
        } else {
          setRentalCatalogItems([]);
        }
      } catch (e) {
        console.warn('[BookerEventDashboard] rental presets/catalog', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token, draftGate, language]);

  return {
    rentalPresets,
    rentalCatalogItems,
    rentalCatalogLabel,
    setRentalCatalogLabel,
    rentalCatalogQty,
    setRentalCatalogQty,
    eventRentalExtraLabel,
    setEventRentalExtraLabel,
    eventRentalExtraQty,
    setEventRentalExtraQty,
    savingRentalCatalog,
    toggleEquipmentPreset,
    toggleOrganizerLineFromCatalog,
    addEventOnlyEquipmentLine,
    removeOrganizerLineAt,
    addCatalogRow,
    removeCatalogRow,
    updateExtraTicketTier,
    addExtraTicketTier,
    removeExtraTicketTier,
    saveRentalCatalogToProfile,
  };
}
