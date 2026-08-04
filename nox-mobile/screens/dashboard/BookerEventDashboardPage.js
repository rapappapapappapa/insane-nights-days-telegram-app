import React from 'react';
import {
  Text,
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{language === 'fr' ? 'Créer un événement' : 'Create Event'}</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'android' && { flexGrow: 1, paddingBottom: 140 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Indicateur d'étapes */}
        <View style={styles.stepsIndicator}>
          <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
            <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>
              {language === 'fr' ? 'Date' : 'Date'}
            </Text>
          </View>
          <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
            <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>
              {language === 'fr' ? 'Lieu' : 'Venue'}
            </Text>
          </View>
          <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 3 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
            <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>
              {language === 'fr' ? 'DJs' : 'DJs'}
            </Text>
          </View>
          <View style={[styles.stepLine, currentStep >= 4 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 4 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 4 && styles.stepNumberActive]}>4</Text>
            <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>
              {language === 'fr' ? 'Détails' : 'Details'}
            </Text>
          </View>
          <View style={[styles.stepLine, currentStep >= 5 && styles.stepLineActive]} />
          <View style={[styles.step, currentStep >= 5 && styles.stepActive]}>
            <Text style={[styles.stepNumber, currentStep >= 5 && styles.stepNumberActive]}>5</Text>
            <Text style={[styles.stepLabel, currentStep >= 5 && styles.stepLabelActive]}>
              {language === 'fr' ? 'Récap' : 'Review'}
            </Text>
          </View>
        </View>

        <Text style={styles.stepRequiredHint}>{stepRequirementsHint(currentStep, language)}</Text>

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
          <Text style={[styles.startFreshLinkText, creating && styles.startFreshLinkTextDisabled]}>
            {language === 'fr'
              ? 'Nouvel événement — effacer le brouillon'
              : 'New event — clear draft'}
          </Text>
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
