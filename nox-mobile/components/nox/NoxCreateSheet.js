import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from './NoxText';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

const OPTIONS = [
  {
    id: 'media',
    icon: 'images-outline',
    labelFr: 'Ajouter un média',
    labelEn: 'Add media',
    enabled: true,
  },
  {
    id: 'availability',
    icon: 'calendar-outline',
    labelFr: 'Disponibilités',
    labelEn: 'Availability',
    enabled: true,
  },
  {
    id: 'post',
    icon: 'create-outline',
    labelFr: 'Publier',
    labelEn: 'Post update',
    enabled: true,
  },
];

/**
 * Menu création Lieux — déclenché par le FAB de NoxBottomNav.
 */
export default function NoxCreateSheet({ visible, onClose, navigate, language = 'fr' }) {
  const fr = language === 'fr';

  const handleSelect = (option) => {
    if (!option.enabled) return;
    onClose();
    if (option.id === 'media') {
      navigate('lieuxMedia');
    } else if (option.id === 'availability') {
      navigate('lieuxAvailability');
    } else if (option.id === 'post') {
      navigate('createFeedPost');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.sheet} onStartShouldSetResponder={() => true}>
          <NoxText variant="titleSecondary" style={styles.title}>
            {fr ? 'Créer' : 'Create'}
          </NoxText>

          {OPTIONS.map((option) => {
            const label = fr ? option.labelFr : option.labelEn;
            const soon = fr ? option.soonFr : option.soonEn;

            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.row, !option.enabled && styles.rowDisabled]}
                activeOpacity={option.enabled ? 0.85 : 1}
                onPress={() => handleSelect(option)}
              >
                <View style={[styles.iconWrap, option.enabled && styles.iconWrapActive]}>
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={option.enabled ? Colors.primary : Colors.textTertiary}
                  />
                </View>
                <View style={styles.rowText}>
                  <NoxText variant="form" style={!option.enabled && styles.labelMuted}>
                    {label}
                  </NoxText>
                  {!option.enabled && soon ? (
                    <NoxText variant="secondary" style={styles.soon}>
                      {soon}
                    </NoxText>
                  ) : null}
                </View>
                {option.enabled ? (
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                ) : null}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.cancel} onPress={onClose} activeOpacity={0.85}>
            <NoxText variant="secondary">{fr ? 'Annuler' : 'Cancel'}</NoxText>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.backgroundElevated,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xxxl : Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Spacing.sm,
  },
  title: { marginBottom: Spacing.sm, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  rowDisabled: { opacity: 0.65 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.backgroundCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: primaryAlpha(0.12),
  },
  rowText: { flex: 1 },
  labelMuted: { color: Colors.textSecondary },
  soon: { fontSize: 11, marginTop: 2 },
  cancel: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
});
