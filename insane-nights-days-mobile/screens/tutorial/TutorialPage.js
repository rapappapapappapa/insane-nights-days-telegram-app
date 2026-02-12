import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import BackgroundVideo from '../../components/BackgroundVideo';
import Logo from '../../components/Logo';

const { width } = Dimensions.get('window');

/**
 * ✅ AJOUT: Page de tutoriel optionnelle
 * Explique comment utiliser l'application INSANE
 */
export default function TutorialPage() {
  const { language } = useLanguage();
  const { goBack } = useNavigation();
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      icon: 'musical-notes',
      title: language === 'fr' ? 'Bienvenue sur NOX' : 'Welcome to NOX',
      description: language === 'fr' 
        ? 'NOX est la plateforme qui connecte les DJs, les bookers et les lieux pour créer des événements inoubliables.'
        : 'NOX is the platform that connects DJs, bookers and venues to create unforgettable events.',
    },
    {
      icon: 'person',
      title: language === 'fr' ? 'Créez votre profil' : 'Create your profile',
      description: language === 'fr'
        ? 'Choisissez votre type de compte : DJ, Booker ou Lieu. Complétez votre profil pour être découvert.'
        : 'Choose your account type: DJ, Booker or Venue. Complete your profile to be discovered.',
    },
    {
      icon: 'calendar',
      title: language === 'fr' ? 'Découvrez les événements' : 'Discover events',
      description: language === 'fr'
        ? 'Parcourez les événements à venir, réservez vos tickets et participez à la scène musicale.'
        : 'Browse upcoming events, book your tickets and join the music scene.',
    },
    {
      icon: 'chatbubbles',
      title: language === 'fr' ? 'Communiquez facilement' : 'Communicate easily',
      description: language === 'fr'
        ? 'Discutez avec les DJs, bookers et organisateurs directement dans l\'application.'
        : 'Chat with DJs, bookers and organizers directly in the app.',
    },
    {
      icon: 'newspaper',
      title: language === 'fr' ? 'Restez informé' : 'Stay informed',
      description: language === 'fr'
        ? 'Suivez le feed d\'actualité pour voir les dernières publications des DJs et les annonces d\'événements.'
        : 'Follow the news feed to see the latest posts from DJs and event announcements.',
    },
    {
      icon: 'star',
      title: language === 'fr' ? 'Notez et évaluez' : 'Rate and review',
      description: language === 'fr'
        ? 'Donnez votre avis sur les événements, les DJs et les lieux pour aider la communauté.'
        : 'Share your opinion on events, DJs and venues to help the community.',
    },
  ];

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      goBack();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    goBack();
  };

  return (
    <View style={styles.container}>
      <BackgroundVideo opacity={0.6} />
      
      <View style={styles.contentOverlay}>
        <StatusBar style="light" />
        
        {/* Header avec Logo et bouton fermer */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Logo size={60} />
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleSkip}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.stepContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name={tutorialSteps[currentStep].icon} size={80} color="#FF1744" />
          </View>
          
          <Text style={styles.stepTitle}>{tutorialSteps[currentStep].title}</Text>
          <Text style={styles.stepDescription}>{tutorialSteps[currentStep].description}</Text>
        </View>

        {/* Indicateurs de progression */}
        <View style={styles.indicatorsContainer}>
          {tutorialSteps.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentStep && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Boutons de navigation */}
        <View style={styles.navigationContainer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handlePrevious}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
              <Text style={styles.navButtonText}>
                {language === 'fr' ? 'Précédent' : 'Previous'}
              </Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.spacer} />
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={styles.skipButtonText}>
              {language === 'fr' ? 'Passer' : 'Skip'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={handleNext}
          >
            <Text style={styles.navButtonTextPrimary}>
              {currentStep === tutorialSteps.length - 1
                ? language === 'fr' ? 'Commencer' : 'Get Started'
                : language === 'fr' ? 'Suivant' : 'Next'}
            </Text>
            {currentStep < tutorialSteps.length - 1 && (
              <Ionicons name="chevron-forward" size={24} color="#0b0b0e" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  contentOverlay: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
  },
  stepContainer: {
    flex: 1,
    width: width - 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#FF1744',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  navButtonPrimary: {
    backgroundColor: '#FF1744',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextPrimary: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  spacer: {
    flex: 1,
  },
});
