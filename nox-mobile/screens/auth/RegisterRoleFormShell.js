import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoxButton, NoxScreenHeader, NoxText } from '../../components/nox';
import Toast from '../../components/Toast';
import { registerRoleStyles as styles } from './RegisterRoleForm.styles';

/**
 * Shell commun des inscriptions de rôle (DJ / Booker / Lieu) — aligné Sign Up Figma.
 */
export default function RegisterRoleFormShell({
  title,
  subtitle,
  onBack,
  submitLabel,
  onSubmit,
  loading = false,
  scrollRef,
  children,
  toast,
  hideToast,
  extra = null,
  keyboardDismissMode = 'on-drag',
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <NoxScreenHeader onBack={onBack} />
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={keyboardDismissMode}
        >
          <View style={styles.header}>
            <NoxText variant="title" style={styles.title}>
              {title}
            </NoxText>
            {subtitle ? (
              <NoxText variant="secondary" style={styles.subtitle}>
                {subtitle}
              </NoxText>
            ) : null}
          </View>

          <View style={styles.form}>{children}</View>

          <NoxButton
            label={submitLabel}
            onPress={onSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      {extra}
      {toast ? (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onHide={hideToast}
        />
      ) : null}
    </SafeAreaView>
  );
}
