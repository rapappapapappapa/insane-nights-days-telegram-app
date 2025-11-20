import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LanguageContext = createContext();

const translations = {
  fr: {
    // Page d'accueil
    createAccount: 'Créez votre compte Insane Nights Days',
    login: 'Connexion',
    register: 'Inscription',
    email: 'Email',
    password: 'Mot de passe',
    loginButton: 'Se connecter',
    forgotPassword: 'Mot de passe oublié ?',
    noAccount: "Pas encore de compte ?",
    hasAccount: 'Déjà un compte ?',
    community: 'Communauté',
    dj: 'DJ',
    booker: 'Booker',
    venue: 'Lieu',
    cgu: 'CGU',
    cgv: 'CGV',
    language: 'Langue',
  },
  en: {
    // Home page
    createAccount: 'Create your Insane Nights Days account',
    login: 'Login',
    register: 'Sign up',
    email: 'Email',
    password: 'Password',
    loginButton: 'Sign in',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    community: 'Community',
    dj: 'DJ',
    booker: 'Booker',
    venue: 'Venue',
    cgu: 'Terms',
    cgv: 'Conditions',
    language: 'Language',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('fr');

  useEffect(() => {
    // Charger la langue sauvegardée
    AsyncStorage.getItem('app_language').then((savedLang) => {
      if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
        setLanguage(savedLang);
      }
    });
  }, []);

  const changeLanguage = async (lang) => {
    if (lang === 'fr' || lang === 'en') {
      setLanguage(lang);
      await AsyncStorage.setItem('app_language', lang);
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}


