import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NoxText } from './nox';
import Colors from '../constants/colors';
import { Radius, Spacing } from '../constants/theme';
import { dealTypeLabel, cancellationPolicyLabel } from '../constants/contractPayload';

/**
 * Champs étendus du brouillon / contre-proposition (alignés PDF NOX).
 * mode: 'venue' | 'dj'
 * `styles` reste accepté pour les appelants ; le gabarit est local.
 */
export default function ContractDraftEditorFields({
  mode,
  draft,
  setDraft,
  language,
  styles: _parentStyles,
  PAYMENT_TERMS_OPTIONS,
  setShowPaymentTermsModal,
  setShowDealTypeModal,
  setShowCancellationModal,
  eventEndOptions = [],
  eventWindowHint = '',
  setShowEventEndModal,
}) {
  const fr = language === 'fr';
  const dt = draft.dealType || 'fixed_rent';
  const isVenue = mode === 'venue';
  const hasPresetEndTimes = eventEndOptions.length > 0;

  const patch = (key) => (value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const paymentLabel = draft.paymentTerms
    ? PAYMENT_TERMS_OPTIONS.find((o) => o.value === draft.paymentTerms)?.[fr ? 'labelFr' : 'labelEn'] ||
      draft.paymentTerms
    : fr
      ? 'Choisir'
      : 'Choose';

  return (
    <View>
      {isVenue ? (
        <Card title={fr ? "L'accord" : 'The deal'}>
          <SelectRow
            icon="briefcase-outline"
            label={fr ? "Type d'accord" : 'Deal type'}
            value={dealTypeLabel(dt, language)}
            onPress={() => setShowDealTypeModal(true)}
          />
        </Card>
      ) : null}

      <Card title={fr ? 'Le montant' : 'The amount'}>
        <View style={local.pair}>
          <View style={local.pairCol}>
            <FieldLabel>{fr ? 'Montant (€)' : 'Amount (€)'}</FieldLabel>
            <TextInput
              style={local.input}
              value={draft.priceEur}
              onChangeText={patch('priceEur')}
              placeholder={isVenue && dt === 'fixed_rent' ? '800' : '500'}
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={local.pairCol}>
            <FieldLabel>{fr ? 'Acompte (%)' : 'Deposit (%)'}</FieldLabel>
            <TextInput
              style={local.input}
              value={draft.depositPercent}
              onChangeText={patch('depositPercent')}
              placeholder="30"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <NoxText variant="secondary" style={local.caption}>
          {fr ? 'Minimum 0,50 €. L’acompte est optionnel.' : 'Minimum €0.50. Deposit is optional.'}
        </NoxText>

        <SelectRow
          icon="card-outline"
          label={fr ? 'Paiement' : 'Payment'}
          value={paymentLabel}
          placeholder={!draft.paymentTerms}
          onPress={() => setShowPaymentTermsModal(true)}
        />

        <NoxText variant="secondary" style={local.caption}>
          {fr
            ? 'Commission NOX : 10 % du montant, calculée dans le contrat.'
            : 'NOX fee: 10% of the amount, calculated in the contract.'}
        </NoxText>

        {isVenue && dt === 'bar_only' ? (
          <NoxText variant="secondary" style={local.caption}>
            {fr
              ? 'Même sans loyer, un montant d’au moins 0,50 € est obligatoire (paiement Stripe).'
              : 'Even without rent, at least €0.50 is required (Stripe payment).'}
          </NoxText>
        ) : null}

        {isVenue && (dt === 'revenue_split' || dt === 'rent_plus_split') ? (
          <>
            <FieldLabel>{fr ? 'Partage bar (%)' : 'Bar split (%)'}</FieldLabel>
            <View style={local.pair}>
              <View style={local.pairCol}>
                <TextInput
                  style={local.input}
                  value={draft.splitBarOrg}
                  onChangeText={patch('splitBarOrg')}
                  placeholder={fr ? 'Organisateur' : 'Organizer'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={local.pairCol}>
                <TextInput
                  style={local.input}
                  value={draft.splitBarVenue}
                  onChangeText={patch('splitBarVenue')}
                  placeholder={fr ? 'Lieu' : 'Venue'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <FieldLabel>{fr ? 'Partage billetterie (%)' : 'Ticket split (%)'}</FieldLabel>
            <View style={local.pair}>
              <View style={local.pairCol}>
                <TextInput
                  style={local.input}
                  value={draft.splitTicketOrg}
                  onChangeText={patch('splitTicketOrg')}
                  placeholder={fr ? 'Organisateur' : 'Organizer'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={local.pairCol}>
                <TextInput
                  style={local.input}
                  value={draft.splitTicketVenue}
                  onChangeText={patch('splitTicketVenue')}
                  placeholder={fr ? 'Lieu' : 'Venue'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </>
        ) : null}

        {isVenue && dt === 'minimum_guarantee' ? (
          <>
            <FieldLabel>{fr ? 'Minimum garanti (€)' : 'Minimum guarantee (€)'}</FieldLabel>
            <TextInput
              style={local.input}
              value={draft.minimumGuarantee}
              onChangeText={patch('minimumGuarantee')}
              placeholder="1000"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
            <FieldLabel>{fr ? 'Suite si dépassement' : 'If revenue exceeds'}</FieldLabel>
            <TextInput
              style={[local.input, local.area]}
              value={draft.splitTerms}
              onChangeText={patch('splitTerms')}
              placeholder={fr ? 'ex : 50/50 au-delà' : 'e.g. 50/50 beyond'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </>
        ) : null}

        {isVenue && dt === 'custom' ? (
          <>
            <FieldLabel>{fr ? 'Accord personnalisé' : 'Custom agreement'}</FieldLabel>
            <TextInput
              style={[local.input, local.areaTall]}
              value={draft.customTerms}
              onChangeText={patch('customTerms')}
              placeholder={fr ? 'Décris l’accord…' : 'Describe the deal…'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </>
        ) : null}

        {isVenue ? (
          <>
            <FieldLabel>{fr ? 'Clause financière' : 'Financial clause'}</FieldLabel>
            <TextInput
              style={[local.input, local.area]}
              value={draft.financialClause}
              onChangeText={patch('financialClause')}
              placeholder={fr ? 'Précisions, optionnel' : 'Details, optional'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </>
        ) : null}
      </Card>

      <Card title={fr ? "L'horaire" : 'The time'}>
        {eventWindowHint ? <NoxText variant="secondary" style={local.caption}>{eventWindowHint}</NoxText> : null}
        {hasPresetEndTimes ? (
          <>
            <SelectRow
              icon="time-outline"
              label={fr ? 'Fin' : 'End'}
              value={
                draft.eventEnd
                  ? fr
                    ? `Fin à ${draft.eventEnd}`
                    : `End at ${draft.eventEnd}`
                  : fr
                    ? 'Choisir une heure'
                    : 'Pick a time'
              }
              placeholder={!draft.eventEnd}
              onPress={() => setShowEventEndModal(true)}
            />
            <NoxText variant="secondary" style={local.caption}>
              {fr
                ? 'Créneaux basés sur le début et la durée de l’événement.'
                : 'Slots follow the event start time and duration.'}
            </NoxText>
          </>
        ) : (
          <>
            <FieldLabel>{fr ? 'Fin de prestation' : 'End time'}</FieldLabel>
            <TextInput
              style={local.input}
              value={draft.eventEnd}
              onChangeText={patch('eventEnd')}
              placeholder="06:00"
              placeholderTextColor={Colors.textMuted}
            />
          </>
        )}
      </Card>

      <Card title={fr ? 'Le matériel' : 'Equipment'}>
        {isVenue ? (
          <>
            <FieldLabel>{fr ? 'Fourni par le lieu' : 'From the venue'}</FieldLabel>
            <TextInput
              style={[local.input, local.area]}
              value={draft.equipmentVenue}
              onChangeText={patch('equipmentVenue')}
              placeholder={fr ? 'Sonorisation, lumières…' : 'PA, lights…'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <FieldLabel>{fr ? 'Apporté par l’organisateur' : 'From the organizer'}</FieldLabel>
            <TextInput
              style={[local.input, local.area]}
              value={draft.equipmentOrganizer}
              onChangeText={patch('equipmentOrganizer')}
              placeholder={fr ? 'Décors, extras…' : 'Decor, extras…'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </>
        ) : (
          <>
            <FieldLabel>{fr ? 'Fourni par l’organisateur' : 'From the organizer'}</FieldLabel>
            <TextInput
              style={[local.input, local.area]}
              value={draft.equipment}
              onChangeText={patch('equipment')}
              placeholder={fr ? 'Backline, micros…' : 'Backline, mics…'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
          </>
        )}
      </Card>

      <Card title={fr ? 'Le cadre' : 'The terms'}>
        <SelectRow
          icon="shield-checkmark-outline"
          label={fr ? 'Annulation' : 'Cancellation'}
          value={
            draft.cancellation
              ? cancellationPolicyLabel(draft.cancellation, language)
              : fr
                ? 'Choisir'
                : 'Choose'
          }
          placeholder={!draft.cancellation}
          onPress={() => setShowCancellationModal(true)}
        />
        <FieldLabel>{fr ? 'Notes' : 'Notes'}</FieldLabel>
        <TextInput
          style={[local.input, local.area]}
          value={draft.notes}
          onChangeText={patch('notes')}
          placeholder={fr ? 'Horaires, accès…' : 'Times, access…'}
          placeholderTextColor={Colors.textMuted}
          multiline
        />
      </Card>
    </View>
  );
}

function Card({ title, children }) {
  return (
    <View style={local.card}>
      <NoxText style={local.cardTitle}>{title}</NoxText>
      {children}
    </View>
  );
}

function FieldLabel({ children }) {
  return <NoxText style={local.fieldLabel}>{children}</NoxText>;
}

function SelectRow({ icon, label, value, placeholder, onPress }) {
  return (
    <TouchableOpacity style={local.select} onPress={onPress} activeOpacity={0.85}>
      <View style={local.selectIcon}>
        <Ionicons name={icon} size={18} color={Colors.primaryLight} />
      </View>
      <View style={local.selectBody}>
        <NoxText style={local.fieldLabel}>{label}</NoxText>
        <NoxText style={[local.selectValue, placeholder && local.placeholder]} numberOfLines={2}>
          {value}
        </NoxText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
    </TouchableOpacity>
  );
}

const local = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.borderCard,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    marginBottom: Spacing.md,
  },
  area: {
    minHeight: 72,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  areaTall: {
    minHeight: 100,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  pair: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  pairCol: {
    flex: 1,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textTertiary,
    marginBottom: Spacing.md,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.borderSubtle,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  selectIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40,82,232,0.18)',
  },
  selectBody: {
    flex: 1,
  },
  selectValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
