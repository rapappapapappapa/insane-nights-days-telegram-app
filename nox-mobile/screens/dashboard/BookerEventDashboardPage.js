import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import { useBookerEventWizard } from '../../hooks/useBookerEventWizard';
import { stepRequirementsHint } from '../../utils/bookerEventWizardUtils';
import Colors from '../../constants/colors';
import { styles } from './BookerEventDashboardPage.styles';
import BookerEventStep1Date from '../../components/bookerEventWizard/sections/BookerEventStep1Date';
import BookerEventStep2Venue from '../../components/bookerEventWizard/sections/BookerEventStep2Venue';
import BookerEventStep3Djs from '../../components/bookerEventWizard/sections/BookerEventStep3Djs';
import BookerEventStep4Details from '../../components/bookerEventWizard/sections/BookerEventStep4Details';
import BookerEventStep5Summary from '../../components/bookerEventWizard/sections/BookerEventStep5Summary';
import BookerEventPickersModals from '../../components/bookerEventWizard/BookerEventPickersModals';
import BookerEventPostCreateModal from '../../components/bookerEventWizard/BookerEventPostCreateModal';
import { NoxProDashboardHeader, NoxText } from '../../components/nox';

export default function BookerEventDashboardPage() {
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
        onBack={goBack}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'android' && { flexGrow: 1, paddingBottom: 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.stepsIndicator}>
          {stepLabels.map((label, index) => {
            const stepNum = index + 1;
            const active = currentStep >= stepNum;
            return (
              <React.Fragment key={label}>
                {index > 0 ? (
                  <View style={[styles.stepLine, currentStep >= stepNum && styles.stepLineActive]} />
                ) : null}
                <View style={[styles.step, active && styles.stepActive]}>
                  <View style={[styles.stepNumber, active && styles.stepNumberActive]}>
                    <NoxText variant="form" style={active ? styles.stepNumberTextActive : styles.stepNumberText}>
                      {stepNum}
                    </NoxText>
                  </View>
                  <NoxText variant="secondary" style={[styles.stepLabel, active && styles.stepLabelActive]}>
                    {label}
                  </NoxText>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        <NoxText variant="secondary" style={styles.stepRequiredHint}>
          {stepRequirementsHint(currentStep, language)}
        </NoxText>

        <TouchableOpacity
          onPress={clearDraftAndRestartWizard}
          disabled={creating}
          style={[styles.startFreshLinkWrap, creating && styles.startFreshLinkWrapDisabled]}
          accessibilityRole="button"
          accessibilityLabel={
            language === 'fr'
              ? 'Nouvel événement, effacer le brouillon sauvegardé'
              : 'New event, clear saved draft'
          }
        >
          <NoxText
            variant="secondary"
            style={[styles.startFreshLinkText, creating && styles.startFreshLinkTextDisabled]}
          >
            {language === 'fr'
              ? 'Nouvel événement — effacer le brouillon'
              : 'New event — clear draft'}
          </NoxText>
        </TouchableOpacity>

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
