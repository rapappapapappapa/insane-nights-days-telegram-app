import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';

const LEGAL_CONTENT = {
  cgu: {
    titleFr: 'Conditions Générales d\'Utilisation',
    titleEn: 'Terms of Use',
    contentFr: `# Conditions Générales d'Utilisation

**Dernière mise à jour :** [À compléter par l'éditeur]

## 1. Objet et acceptation

Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application Insane Nights & Days. En créant un compte, vous acceptez sans réserve ces CGU.

## 2. Description du service

Insane Nights & Days est une plateforme mettant en relation la communauté, les DJs, les organisateurs et les lieux pour la découverte et l'organisation d'événements musicaux.

## 3. Inscription et compte

- Vous devez avoir au moins 18 ans pour créer un compte.
- Vous êtes responsable de la confidentialité de vos identifiants.
- Vous vous engagez à fournir des informations exactes et à jour.

## 4. Utilisation acceptable

Vous vous engagez à ne pas :
- Utiliser le service à des fins illégales ou frauduleuses ;
- Porter atteinte aux droits de tiers ;
- Publier du contenu diffamatoire, haineux ou inapproprié ;
- Contourner les mesures de sécurité.

## 5. Propriété intellectuelle

Tous les contenus de l'application (logos, textes, design) sont protégés par le droit d'auteur. Toute reproduction non autorisée est interdite.

## 6. Limitation de responsabilité

L'éditeur ne peut être tenu responsable des dommages indirects résultant de l'utilisation du service. Le service est fourni "tel quel".

## 7. Modification des CGU

L'éditeur se réserve le droit de modifier ces CGU. Les utilisateurs seront informés des changements significatifs. La poursuite de l'utilisation vaut acceptation.

## 8. Droit applicable

Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents.

## 9. Contact

Pour toute question : [email à compléter]`,
    contentEn: `# Terms of Use

**Last updated:** [To be completed by the publisher]

## 1. Purpose and acceptance

These Terms of Use govern the use of the Insane Nights & Days application. By creating an account, you accept these terms without reservation.

## 2. Service description

Insane Nights & Days is a platform connecting the community, DJs, organizers and venues for discovering and organizing music events.

## 3. Registration and account

- You must be at least 18 years old to create an account.
- You are responsible for keeping your credentials confidential.
- You agree to provide accurate and up-to-date information.

## 4. Acceptable use

You agree not to:
- Use the service for illegal or fraudulent purposes;
- Infringe on third-party rights;
- Publish defamatory, hateful or inappropriate content;
- Bypass security measures.

## 5. Intellectual property

All application content (logos, texts, design) is protected by copyright. Any unauthorized reproduction is prohibited.

## 6. Limitation of liability

The publisher cannot be held liable for indirect damages resulting from the use of the service. The service is provided "as is".

## 7. Modification of terms

The publisher reserves the right to modify these terms. Users will be informed of significant changes. Continued use constitutes acceptance.

## 8. Governing law

These terms are governed by French law. Any dispute shall be submitted to the competent courts.

## 9. Contact

For any questions: [email to be completed]`,
  },
  cgv: {
    titleFr: 'Conditions Générales de Vente',
    titleEn: 'Terms of Sale',
    contentFr: `# Conditions Générales de Vente

**Dernière mise à jour :** [À compléter]

## 1. Objet

Les présentes CGV s'appliquent aux achats de tickets d'événements effectués via Insane Nights & Days. En cochant la case d'acceptation avant chaque achat, vous acceptez sans réserve ces CGV.

## 2. Prix et paiement

- Les prix sont indiqués en euros (€) TTC.
- Le paiement est sécurisé via Stripe.
- Les tickets sont envoyés par email après confirmation du paiement.

## 3. Remboursement

- En cas d'annulation d'un événement par l'organisateur, un remboursement sera effectué.
- Les conditions de remboursement peuvent varier selon l'événement.
- Contactez le support pour toute demande.

## 4. Utilisation des tickets

- Chaque ticket est nominatif et lié à votre compte.
- La présentation du QR code à l'entrée est requise.

## 5. Contact

[email à compléter]`,
    contentEn: `# Terms of Sale

**Last updated:** [To be completed]

## 1. Purpose

These Terms of Sale apply to event ticket purchases made through Insane Nights & Days. By checking the acceptance box before each purchase, you accept these terms without reservation.

## 2. Price and payment

- Prices are displayed in euros (€) including tax.
- Payment is secured via Stripe.
- Tickets are sent by email after payment confirmation.

## 3. Refunds

- In case of event cancellation by the organizer, a refund will be issued.
- Refund conditions may vary by event.
- Contact support for any request.

## 4. Ticket use

- Each ticket is nominative and linked to your account.
- QR code presentation at entry is required.

## 5. Contact

[email to be completed]`,
  },
  mentions: {
    titleFr: 'Mentions légales',
    titleEn: 'Legal notice',
    contentFr: `# Mentions légales

## Éditeur

**Raison sociale :** [À compléter]
**Siège social :** [Adresse à compléter]
**Email :** [À compléter]

## Hébergement

[Nom de l'hébergeur à compléter]
[Adresse à compléter]

## Directeur de la publication

[Nom à compléter]

## Données personnelles

Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et de portabilité de vos données. Consultez notre Politique de confidentialité.

## Cookies

L'application peut utiliser des cookies ou technologies similaires pour le bon fonctionnement du service.`,
    contentEn: `# Legal notice

## Publisher

**Company name:** [To be completed]
**Registered office:** [Address to be completed]
**Email:** [To be completed]

## Hosting

[Host name to be completed]
[Address to be completed]

## Publication director

[Name to be completed]

## Personal data

In accordance with the GDPR, you have the right to access, rectify, erase and port your data. See our Privacy Policy.

## Cookies

The application may use cookies or similar technologies for the proper functioning of the service.`,
  },
  privacy: {
    titleFr: 'Politique de confidentialité',
    titleEn: 'Privacy Policy',
    contentFr: `# Politique de confidentialité

**Dernière mise à jour :** [À compléter]

## 1. Responsable du traitement

[Identité du responsable à compléter]

## 2. Données collectées

Nous collectons :
- Données d'identification (email, pseudo, nom, prénom)
- Données de profil (selon le type : DJ, Organisateur, Lieu, Communauté)
- Données de paiement (traitées par Stripe, nous ne stockons pas les numéros de carte)
- Données d'utilisation (connexions, interactions)

## 3. Finalités

- Gestion des comptes et profils
- Traitement des réservations et paiements
- Communication (notifications, support)
- Amélioration du service

## 4. Base légale

- Exécution du contrat (compte, tickets)
- Consentement (newsletters, cookies)
- Intérêt légitime (sécurité, analytics)

## 5. Destinataires

Vos données peuvent être partagées avec :
- Les prestataires techniques (hébergement, paiement)
- Les organisateurs d'événements (pour les tickets)

## 6. Durée de conservation

- Compte actif : durée de l'utilisation
- Après suppression : données anonymisées ou supprimées sous 30 jours
- Obligations légales : conservation selon la loi

## 7. Vos droits (RGPD)

- **Accès** : obtenir une copie de vos données
- **Rectification** : corriger vos données
- **Effacement** : demander la suppression de votre compte
- **Portabilité** : recevoir vos données dans un format structuré
- **Opposition** : vous opposer à certains traitements
- **Réclamation** : saisir la CNIL (www.cnil.fr)

Pour exercer vos droits : [email à compléter]

## 8. Sécurité

Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données (chiffrement, accès restreint).

## 9. Modifications

Cette politique peut être mise à jour. Vous serez informé des changements significatifs.`,
    contentEn: `# Privacy Policy

**Last updated:** [To be completed]

## 1. Data controller

[Controller identity to be completed]

## 2. Data collected

We collect:
- Identification data (email, username, name)
- Profile data (depending on type: DJ, Organisateur, Venue, Community)
- Payment data (processed by Stripe, we do not store card numbers)
- Usage data (logins, interactions)

## 3. Purposes

- Account and profile management
- Booking and payment processing
- Communication (notifications, support)
- Service improvement

## 4. Legal basis

- Contract performance (account, tickets)
- Consent (newsletters, cookies)
- Legitimate interest (security, analytics)

## 5. Recipients

Your data may be shared with:
- Technical providers (hosting, payment)
- Event organizers (for tickets)

## 6. Retention period

- Active account: duration of use
- After deletion: data anonymized or deleted within 30 days
- Legal obligations: retention as required by law

## 7. Your rights (GDPR)

- **Access**: obtain a copy of your data
- **Rectification**: correct your data
- **Erasure**: request account deletion
- **Portability**: receive your data in a structured format
- **Objection**: object to certain processing
- **Complaint**: lodge a complaint with the supervisory authority

To exercise your rights: [email to be completed]

## 8. Security

We implement technical and organizational measures to protect your data (encryption, restricted access).

## 9. Modifications

This policy may be updated. You will be informed of significant changes.`,
  },
};

function renderContent(text) {
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  lines.forEach((line) => {
    if (line.startsWith('# ')) {
      elements.push(
        <Text key={key++} style={styles.h1}>
          {line.replace(/^# /, '')}
        </Text>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <Text key={key++} style={styles.h2}>
          {line.replace(/^## /, '')}
        </Text>
      );
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <Text key={key++} style={styles.bold}>
          {line.replace(/\*\*/g, '')}
        </Text>
      );
    } else if (line.startsWith('- ')) {
      elements.push(
        <Text key={key++} style={styles.bullet}>
          • {line.replace(/^- /, '')}
        </Text>
      );
    } else if (line.trim()) {
      elements.push(
        <Text key={key++} style={styles.paragraph}>
          {line}
        </Text>
      );
    } else {
      elements.push(<View key={key++} style={styles.spacer} />);
    }
  });

  return elements;
}

export default function LegalPage() {
  const { language } = useLanguage();
  const { goBack, routeParams } = useNavigation();
  const type = routeParams?.type || 'cgu';

  const content = LEGAL_CONTENT[type];
  if (!content) return null;

  const title = language === 'fr' ? content.titleFr : content.titleEn;
  const text = language === 'fr' ? content.contentFr : content.contentEn;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent(text)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  h1: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    marginTop: 8,
  },
  h2: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  bullet: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
    marginLeft: 8,
  },
  spacer: {
    height: 12,
  },
});
