import React, { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { NoxInput, NoxText } from '../../components/nox';
import { useToast } from '../../hooks/useToast';
import { formatBirthDateFr, getRegisterRoleCopy } from '../../utils/registerFlow';
import RegisterRoleFormShell from './RegisterRoleFormShell';
import { registerRoleStyles as styles } from './RegisterRoleForm.styles';

export default function RegisterCommunityPage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user, updateUser } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const roleCopy = getRegisterRoleCopy('registerCommunity', language);
  const fr = language === 'fr';
  const title = roleCopy?.profileTitle || (fr ? 'Profil Communauté' : 'Community profile');

  const accountPseudo = (user?.username || '').trim();
  const accountEmail = (user?.email || '').trim();
  const accountBirth = formatBirthDateFr(user?.birthDate);
  const pseudoLocked = !!accountPseudo;

  const [formData, setFormData] = useState({
    pseudo: accountPseudo,
    nom: '',
    prenom: '',
    email: accountEmail,
    pays: '',
    dateNaissance: accountBirth,
  });
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  const handleChange = (field, value) => {
    if (field === 'dateNaissance') {
      const cleaned = value.replace(/[^0-9]/g, '');
      let formatted = cleaned;
      if (cleaned.length > 2) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
      }
      if (cleaned.length > 4) {
        formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
      }
      const limited = formatted.length > 10 ? formatted.slice(0, 10) : formatted;
      setFormData((prev) => ({ ...prev, [field]: limited }));
      return;
    }
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateDate = (dateString) => {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateString)) return false;

    const [, day, month, year] = dateString.match(dateRegex);
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (yearNum < 1900 || yearNum > new Date().getFullYear()) return false;
    if (monthNum < 1 || monthNum > 12) return false;
    if (dayNum < 1 || dayNum > 31) return false;

    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return false;
    }

    const today = new Date();
    const age = today.getFullYear() - yearNum;
    if (age < 13) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (loading) return;

    const pseudo = (pseudoLocked ? accountPseudo : formData.pseudo).trim();

    if (!pseudo || !formData.nom || !formData.prenom || !formData.email || !formData.pays || !formData.dateNaissance) {
      showError(fr ? 'Merci de remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }

    if (!validateDate(formData.dateNaissance)) {
      showError(
        fr
          ? 'La date de naissance doit être au format jj/mm/aaaa et vous devez avoir au moins 13 ans.'
          : 'Date of birth must be in dd/mm/yyyy format and you must be at least 13 years old.'
      );
      return;
    }

    if (!user?.id || !user?.token) {
      showError(
        fr
          ? 'Vous devez être connecté pour créer un profil.'
          : 'You must be logged in to create a profile.'
      );
      return;
    }

    setLoading(true);
    try {
      const response = await api.createCommunityProfile({
        token: user.token,
        pseudo,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        pays: formData.pays,
        dateNaissance: formData.dateNaissance,
      });

      if (!response) {
        showError(
          fr
            ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
            : 'Unable to reach server. Check your connection.'
        );
        return;
      }

      if (!response.success) {
        showError(
          response.message || (fr ? 'Erreur lors de la création du profil.' : 'Error creating profile.')
        );
        return;
      }

      try {
        const switchResponse = await api.switchProfile(user.token, 'COMMUNITY');
        if (switchResponse?.success) {
          updateUser({ activeProfileType: 'COMMUNITY' });
        }
      } catch (switchError) {
        console.error('Erreur bascule profil:', switchError);
      }

      showSuccess(
        fr
          ? `Votre numéro ISN : ${response.profile?.isnNumber || 'N/A'}\n\nProfil Communauté créé avec succès !`
          : `Your ISN number: ${response.profile?.isnNumber || 'N/A'}\n\nCommunity profile created successfully!`
      );
      setTimeout(() => navigate('communityOnboarding'), 2000);
    } catch (error) {
      console.error('Erreur création profil Communauté:', error);
      showError(
        error.message || (fr ? 'Erreur lors de la création du profil.' : 'Error creating profile.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <RegisterRoleFormShell
      title={title}
      stepLabel={fr ? 'Étape 2 sur 2 — Profil' : 'Step 2 of 2 — Profile'}
      subtitle={
        fr
          ? 'Ton compte est prêt. Complète ton profil pour obtenir ton numéro ISN — ce n’est pas un second compte.'
          : 'Your account is ready. Complete your profile for your ISN number — not a second account.'
      }
      accountSummary={{
        title: fr ? 'Compte NOX (déjà créé)' : 'NOX account (already created)',
        lines: [
          accountPseudo ? `${fr ? 'Pseudo' : 'Username'} · ${accountPseudo}` : null,
          accountEmail ? `Email · ${accountEmail}` : null,
          accountBirth ? `${fr ? 'Naissance' : 'Birth'} · ${accountBirth}` : null,
        ].filter(Boolean),
      }}
      onBack={goBack}
      submitLabel={fr ? 'Activer mon profil Communauté' : 'Activate my Community profile'}
      onSubmit={handleSubmit}
      loading={loading}
      scrollRef={scrollViewRef}
      toast={toast}
      hideToast={hideToast}
    >
      {pseudoLocked ? (
        <View style={styles.legalBlock}>
          <NoxText variant="form" style={styles.legalTitle}>
            {fr ? 'Pseudo' : 'Username'}
          </NoxText>
          <NoxText variant="title" style={{ fontSize: 18 }}>
            {accountPseudo}
          </NoxText>
          <NoxText variant="secondary" style={styles.hint}>
            {fr
              ? 'Repris depuis ton compte — pas besoin de le resaisir.'
              : 'Taken from your account — no need to enter it again.'}
          </NoxText>
        </View>
      ) : (
        <NoxInput
          label={fr ? 'Pseudo' : 'Username'}
          placeholder={fr ? 'Ton pseudo' : 'Your username'}
          autoCapitalize="none"
          value={formData.pseudo}
          onChangeText={(value) => handleChange('pseudo', value)}
          icon={<Ionicons name="person-outline" size={20} color={Colors.textTertiary} />}
        />
      )}

      <NoxInput
        label={fr ? 'Nom' : 'Last name'}
        placeholder={fr ? 'Ton nom' : 'Your last name'}
        autoCapitalize="words"
        value={formData.nom}
        onChangeText={(value) => handleChange('nom', value)}
      />
      <NoxInput
        label={fr ? 'Prénom' : 'First name'}
        placeholder={fr ? 'Ton prénom' : 'Your first name'}
        autoCapitalize="words"
        value={formData.prenom}
        onChangeText={(value) => handleChange('prenom', value)}
      />
      <NoxInput
        label="Email"
        placeholder={fr ? 'ton.email@example.com' : 'your.email@example.com'}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={formData.email}
        onChangeText={(value) => handleChange('email', value)}
        icon={<Ionicons name="mail-outline" size={20} color={Colors.textTertiary} />}
      />
      <NoxInput
        label={fr ? 'Pays' : 'Country'}
        placeholder="France"
        value={formData.pays}
        onChangeText={(value) => handleChange('pays', value)}
        onFocus={() => {
          if (Platform.OS === 'android') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
      />
      <NoxInput
        label={fr ? 'Date de naissance' : 'Date of birth'}
        placeholder={fr ? 'jj/mm/aaaa' : 'dd/mm/yyyy'}
        keyboardType="numeric"
        maxLength={10}
        value={formData.dateNaissance}
        onChangeText={(value) => handleChange('dateNaissance', value)}
        icon={<Ionicons name="calendar-outline" size={20} color={Colors.textTertiary} />}
        onFocus={() => {
          if (Platform.OS === 'android') {
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
          }
        }}
      />
    </RegisterRoleFormShell>
  );
}
