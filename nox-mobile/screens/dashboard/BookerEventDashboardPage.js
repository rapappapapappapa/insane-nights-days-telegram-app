import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useBookerEventWizard } from '../../hooks/useBookerEventWizard';
import {
  wizardContinueHint,
  isBookerEventDateTooSoon,
  hasBookerEventTitle,
  hasBookerEventPrice,
} from '../../utils/bookerEventWizardUtils';
import Colors from '../../constants/colors';
import { styles } from './BookerEventDashboardPage.styles';
import BookerEventStep1Date from '../../components/bookerEventWizard/sections/BookerEventStep1Date';
import BookerEventStep2Venue from '../../components/bookerEventWizard/sections/BookerEventStep2Venue';
import BookerEventStep3Djs from '../../components/bookerEventWizard/sections/BookerEventStep3Djs';
import BookerEventStep4Details from '../../components/bookerEventWizard/sections/BookerEventStep4Details';
import BookerEventStep5Summary from '../../components/bookerEventWizard/sections/BookerEventStep5Summary';
import BookerEventPickersModals from '../../components/bookerEventWizard/BookerEventPickersModals';
import BookerEventPostCreateModal from '../../components/bookerEventWizard/BookerEventPostCreateModal';
import { NoxProDashboardHeader, NoxText, NoxButton } from '../../components/nox';

export default function BookerEventDashboardPage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const {
    formData,
    setFormData,
    eventDateTime,
    setEventDateTime,
    resetForm,
    addDj,
    removeDj,
    setVenue,
    coverImageUri,
    setCoverImageUri,
    bookerEventWizardStep,
    setBookerEventWizardStep,
    djSlots,
    setDjSlots,
  } = useEventForm();

  const wizard = useBookerEventWizard({
    user,
    language,
    routeParams,
    navigate,
    goBack,
    showError,
    showSuccess,
    formData,
    setFormData,
    eventDateTime,
    setEventDateTime,
    resetForm,
    addDj,
    removeDj,
    setVenue,
    coverImageUri,
    setCoverImageUri,
    bookerEventWizardStep,
    setBookerEventWizardStep,
    djSlots,
    setDjSlots,
  });

  const {
    currentStep,
    setCurrentStep,
    creating,
    clearDraftAndRestartWizard,
    handleCreateEvent,
    draftGate,
    postCreateModal,
    setPostCreateModal,
    ...stepProps
  } = wizard;

  const shared = {
    language,
    styles,
    ...stepProps,
    formData,
    currentStep,
    setCurrentStep,
    navigate,
    creating,
    showError,
    showSuccess,
  };

  const stepLabels = [
    language === 'fr' ? 'Date' : 'Date',
    language === 'fr' ? 'Lieu' : 'Venue',
    'DJs',
    language === 'fr' ? 'Détails' : 'Details',
    language === 'fr' ? 'Récap' : 'Review',
  ];

  const filledDjCount = (djSlots || []).filter((slot) => slot?.djId).length;
  const continueHint = wizardContinueHint({
    step: currentStep,
    language,
    formData,
    selectedVenue: stepProps.selectedVenue,
    filledDjCount,
    eventDateTime,
  });
  const canContinue =
    currentStep === 1
      ? !!(formData.date && formData.time && formData.durationHours) &&
        !isBookerEventDateTooSoon(formData, eventDateTime)
      : currentStep === 2
        ? !!stepProps.selectedVenue && !continueHint
        : currentStep === 3
          ? filledDjCount > 0 && !continueHint
          : hasBookerEventTitle(formData) && hasBookerEventPrice(formData);

  const onContinue = () => {
    if (!canContinue || creating) return;
    if (currentStep < 5) setCurrentStep(currentStep + 1);
    else handleCreateEvent();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <StatusBar style="light" />
      <NoxProDashboardHeader
        title={language === 'fr' ? 'Créer un événement' : 'Create event'}
        subtitle={`${language === 'fr' ? 'Étape' : 'Step'} ${currentStep}/5 · ${stepLabels[currentStep - 1]}`}
        showBack
        onBack={() => {
          if (creating) return;
          if (currentStep > 1) setCurrentStep(currentStep - 1);
          else goBack();
        }}
      />

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(currentStep / 5) * 100}%` }]} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.draftRow}>
          <TouchableOpacity
            onPress={clearDraftAndRestartWizard}
            disabled={creating}
            style={styles.draftChip}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={14} color={Colors.textSecondary} />
            <NoxText variant="secondary" style={styles.draftChipText}>
              {language === 'fr' ? 'Effacer' : 'Clear'}
            </NoxText>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {currentStep === 1 && <BookerEventStep1Date {...shared} />}
          {currentStep === 2 && <BookerEventStep2Venue {...shared} />}
          {currentStep === 3 && <BookerEventStep3Djs {...shared} />}
          {currentStep === 4 && <BookerEventStep4Details {...shared} />}
          {currentStep === 5 && (
            <BookerEventStep5Summary {...shared} handleCreateEvent={handleCreateEvent} />
          )}
        </View>
      </ScrollView>

      <View style={[styles.wizardFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <NoxButton
          label={
            currentStep === 5
              ? language === 'fr'
                ? "Créer l'événement"
                : 'Create event'
              : language === 'fr'
                ? 'Continuer'
                : 'Continue'
          }
          onPress={onContinue}
          disabled={!canContinue || creating}
          loading={currentStep === 5 && creating}
          style={styles.wizardContinue}
        />
        {continueHint ? (
          <NoxText variant="secondary" style={styles.wizardContinueHint}>
            {continueHint}
          </NoxText>
        ) : null}
      </View>

      <BookerEventPickersModals
        language={language}
        styles={styles}
        showDatePicker={wizard.showDatePicker}
        setShowDatePicker={wizard.setShowDatePicker}
        showTimePicker={wizard.showTimePicker}
        setShowTimePicker={wizard.setShowTimePicker}
        tempDate={wizard.tempDate}
        setTempDate={wizard.setTempDate}
        tempTime={wizard.tempTime}
        setTempTime={wizard.setTempTime}
        setEventDateTime={setEventDateTime}
        handleChange={wizard.handleChange}
        slotTimePicker={wizard.slotTimePicker}
        setSlotTimePicker={wizard.setSlotTimePicker}
        tempSlotTime={wizard.tempSlotTime}
        setTempSlotTime={wizard.setTempSlotTime}
        updateSlotTimeFromPicker={wizard.updateSlotTimeFromPicker}
      />

      <BookerEventPostCreateModal
        language={language}
        styles={styles}
        postCreateModal={postCreateModal}
        setPostCreateModal={setPostCreateModal}
        navigate={navigate}
        goBack={goBack}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </KeyboardAvoidingView>
  );
}
