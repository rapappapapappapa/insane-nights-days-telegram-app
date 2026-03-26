import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { dealTypeLabel, cancellationPolicyLabel } from '../constants/contractPayload';

/**
 * Champs étendus du brouillon / contre-proposition (alignés PDF NOX).
 * mode: 'venue' | 'dj'
 */
export default function ContractDraftEditorFields({
  mode,
  draft,
  setDraft,
  language,
  styles,
  PAYMENT_TERMS_OPTIONS,
  setShowPaymentTermsModal,
  setShowDealTypeModal,
  setShowCancellationModal,
}) {
  const dt = draft.dealType || 'fixed_rent';
  const isVenue = mode === 'venue';

  const priceLabel =
    isVenue && dt === 'bar_only'
      ? language === 'fr'
        ? 'Montant (€) — optionnel si sans loyer'
        : 'Amount (€) — optional if no rent'
      : language === 'fr'
        ? 'Montant principal (€)'
        : 'Main amount (€)';

  return (
    <>
      {isVenue ? (
        <>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? "Type d'accord avec le lieu" : 'Deal type'}</Text>
          <TouchableOpacity
            style={[styles.contractModalInput, styles.contractModalDropdown]}
            onPress={() => setShowDealTypeModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.contractModalInputText, { flex: 1 }]}>
              {dealTypeLabel(dt, language)}
            </Text>
            <Text style={styles.contractModalChevron}>▼</Text>
          </TouchableOpacity>
        </>
      ) : null}

      <Text style={styles.contractModalLabel}>{priceLabel}</Text>
      <TextInput
        style={styles.contractModalInput}
        value={draft.priceEur}
        onChangeText={(v) => setDraft((p) => ({ ...p, priceEur: v }))}
        placeholder={isVenue && dt === 'fixed_rent' ? '800' : '500'}
        placeholderTextColor="rgba(255,255,255,0.4)"
        keyboardType="decimal-pad"
      />

      <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Acompte (%) (optionnel)' : 'Deposit (%) (optional)'}</Text>
      <TextInput
        style={styles.contractModalInput}
        value={draft.depositPercent}
        onChangeText={(v) => setDraft((p) => ({ ...p, depositPercent: v }))}
        placeholder="30"
        placeholderTextColor="rgba(255,255,255,0.4)"
        keyboardType="decimal-pad"
      />

      <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Modalités de paiement' : 'Payment terms'}</Text>
      <TouchableOpacity
        style={[styles.contractModalInput, styles.contractModalDropdown]}
        onPress={() => setShowPaymentTermsModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.contractModalInputText,
            !draft.paymentTerms && { color: 'rgba(255,255,255,0.4)' },
          ]}
        >
          {draft.paymentTerms
            ? PAYMENT_TERMS_OPTIONS.find((o) => o.value === draft.paymentTerms)?.[
                language === 'fr' ? 'labelFr' : 'labelEn'
              ] || draft.paymentTerms
            : language === 'fr'
              ? 'Sélectionner'
              : 'Select'}
        </Text>
        <Text style={styles.contractModalChevron}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Fin de prestation / fin événement (horaire)' : 'Event end time'}</Text>
      <TextInput
        style={styles.contractModalInput}
        value={draft.eventEnd}
        onChangeText={(v) => setDraft((p) => ({ ...p, eventEnd: v }))}
        placeholder={language === 'fr' ? 'ex: 06:00' : 'e.g. 6am'}
        placeholderTextColor="rgba(255,255,255,0.4)"
      />

      {isVenue ? (
        <>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Matériel fourni par le lieu' : 'Venue equipment'}</Text>
          <TextInput
            style={[styles.contractModalInput, localStyles.tall]}
            value={draft.equipmentVenue}
            onChangeText={(v) => setDraft((p) => ({ ...p, equipmentVenue: v }))}
            placeholder={language === 'fr' ? 'Sonorisation, lumières…' : 'PA, lights…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Matériel apporté par l’organisateur' : 'Organizer equipment'}</Text>
          <TextInput
            style={[styles.contractModalInput, localStyles.tall]}
            value={draft.equipmentOrganizer}
            onChangeText={(v) => setDraft((p) => ({ ...p, equipmentOrganizer: v }))}
            placeholder={language === 'fr' ? 'Décors, extras…' : 'Decor, extras…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Clause financière (libre, optionnel)' : 'Financial clause (optional)'}</Text>
          <TextInput
            style={[styles.contractModalInput, { height: 72 }]}
            value={draft.financialClause}
            onChangeText={(v) => setDraft((p) => ({ ...p, financialClause: v }))}
            placeholder={language === 'fr' ? 'Précisions sur les montants…' : 'Amount details…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
        </>
      ) : (
        <>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Matériel fourni par l’organisateur' : 'Equipment from organizer'}</Text>
          <TextInput
            style={[styles.contractModalInput, localStyles.tall]}
            value={draft.equipment}
            onChangeText={(v) => setDraft((p) => ({ ...p, equipment: v }))}
            placeholder={language === 'fr' ? 'Backline, micros…' : 'Backline, mics…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
        </>
      )}

      <Text style={[styles.contractModalLabel, { opacity: 0.9 }]}>
        {language === 'fr'
          ? 'Commission NOX : 10 % du montant principal (calcul automatique dans le contrat).'
          : 'NOX commission: 10% of the main amount (automatic in the contract).'}
      </Text>

      {isVenue && dt === 'bar_only' ? (
        <Text style={[styles.contractModalLabel, { opacity: 0.85, marginBottom: 8 }]}>
          {language === 'fr'
            ? 'Sans loyer : précisez dans les notes si besoin.'
            : 'No rent: add details in notes if needed.'}
        </Text>
      ) : null}

      {isVenue && (dt === 'revenue_split' || dt === 'rent_plus_split') ? (
        <View style={{ marginBottom: 8 }}>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Partage bar (%)' : 'Bar split (%)'}</Text>
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            <TextInput
              style={[styles.contractModalInput, { flex: 1, marginRight: 8 }]}
              value={draft.splitBarOrg}
              onChangeText={(v) => setDraft((p) => ({ ...p, splitBarOrg: v }))}
              placeholder="Org %"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.contractModalInput, { flex: 1 }]}
              value={draft.splitBarVenue}
              onChangeText={(v) => setDraft((p) => ({ ...p, splitBarVenue: v }))}
              placeholder="Lieu %"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="decimal-pad"
            />
          </View>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Partage billetterie (%)' : 'Ticket split (%)'}</Text>
          <View style={{ flexDirection: 'row' }}>
            <TextInput
              style={[styles.contractModalInput, { flex: 1, marginRight: 8 }]}
              value={draft.splitTicketOrg}
              onChangeText={(v) => setDraft((p) => ({ ...p, splitTicketOrg: v }))}
              placeholder="Org %"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.contractModalInput, { flex: 1 }]}
              value={draft.splitTicketVenue}
              onChangeText={(v) => setDraft((p) => ({ ...p, splitTicketVenue: v }))}
              placeholder="Lieu %"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      ) : null}

      {isVenue && dt === 'minimum_guarantee' ? (
        <>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Minimum garanti (€)' : 'Minimum guarantee (€)'}</Text>
          <TextInput
            style={styles.contractModalInput}
            value={draft.minimumGuarantee}
            onChangeText={(v) => setDraft((p) => ({ ...p, minimumGuarantee: v }))}
            placeholder="1000"
            placeholderTextColor="rgba(255,255,255,0.4)"
            keyboardType="decimal-pad"
          />
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Suite si dépassement' : 'If revenue exceeds'}</Text>
          <TextInput
            style={[styles.contractModalInput, { height: 60 }]}
            value={draft.splitTerms}
            onChangeText={(v) => setDraft((p) => ({ ...p, splitTerms: v }))}
            placeholder={language === 'fr' ? 'ex: répartition 50/50 au-delà' : 'e.g. 50/50 beyond'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
        </>
      ) : null}

      {isVenue && dt === 'custom' ? (
        <>
          <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Accord personnalisé' : 'Custom agreement'}</Text>
          <TextInput
            style={[styles.contractModalInput, { height: 100 }]}
            value={draft.customTerms}
            onChangeText={(v) => setDraft((p) => ({ ...p, customTerms: v }))}
            placeholder={language === 'fr' ? 'Décrivez l’accord…' : 'Describe the deal…'}
            placeholderTextColor="rgba(255,255,255,0.4)"
            multiline
          />
        </>
      ) : null}

      <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Conditions d’annulation' : 'Cancellation policy'}</Text>
      <TouchableOpacity
        style={[styles.contractModalInput, styles.contractModalDropdown]}
        onPress={() => setShowCancellationModal(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.contractModalInputText,
            !draft.cancellation && { color: 'rgba(255,255,255,0.4)' },
          ]}
        >
          {draft.cancellation
            ? cancellationPolicyLabel(draft.cancellation, language)
            : language === 'fr'
              ? 'Sélectionner'
              : 'Select'}
        </Text>
        <Text style={styles.contractModalChevron}>▼</Text>
      </TouchableOpacity>

      <Text style={styles.contractModalLabel}>{language === 'fr' ? 'Notes (optionnel)' : 'Notes (optional)'}</Text>
      <TextInput
        style={[styles.contractModalInput, { height: 60 }]}
        value={draft.notes}
        onChangeText={(v) => setDraft((p) => ({ ...p, notes: v }))}
        placeholder={language === 'fr' ? 'Ex: horaires, accès…' : 'Ex: times, access…'}
        placeholderTextColor="rgba(255,255,255,0.4)"
        multiline
      />

    </>
  );
}

const localStyles = StyleSheet.create({
  tall: { height: 64, textAlignVertical: 'top' },
});
