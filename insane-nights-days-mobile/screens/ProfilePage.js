import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const formatDateTime = (dateString) => {
  if (!dateString) {
    return '';
  }
  try {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export default function ProfilePage({ onNavigate, user, tickets = [], onUpdateUser }) {
  const username = user?.username ?? 'Utilisateur';
  const level = user?.level ?? 1;
  const score = user?.score ?? 0;
  const sbtActive = user?.sbtActive ?? false;
  const ticketsCount = user?.tickets ?? tickets.length ?? 0;
  const eventsParticipated = user?.eventsParticipated ?? 0;
  const email = user?.email ?? '';
  const isAuthenticated = user?.isAuthenticated ?? false;

  const lastTicket = useMemo(() => user?.lastTicket ?? tickets[0] ?? null, [tickets, user?.lastTicket]);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ username });

  useEffect(() => {
    setForm({ username });
  }, [username]);

  const handleSave = () => {
    const normalized = form.username.trim();
    if (normalized && onUpdateUser) {
      onUpdateUser({ username: normalized });
      Alert.alert('Succès', 'Profil mis à jour !');
    } else {
      Alert.alert('Info', 'Le nom ne peut pas être vide.');
      return;
    }

    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>I</Text>
          </View>
          <Text style={styles.title}>🏆 Mon Profil</Text>
        </View>

        {!isAuthenticated ? (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>Compte invité</Text>
            <Text style={styles.alertText}>
              Crée un compte pour sauvegarder ta progression et retrouver tes tickets sur tous tes
              appareils.
            </Text>
            <TouchableOpacity style={styles.alertButton} onPress={() => onNavigate('register')}>
              <Text style={styles.alertButtonText}>Créer mon compte ✨</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Informations</Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>✏️ Modifier</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditing ? (
            <View>
              <Text style={styles.label}>Nom d'utilisateur</Text>
              <TextInput
                value={form.username}
                onChangeText={text => setForm({ username: text })}
                placeholder="Nom d'utilisateur"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.input}
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.info}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nom d'utilisateur</Text>
                <Text style={styles.infoValue}>{username}</Text>
              </View>
              {isAuthenticated ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email}</Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Niveau</Text>
                <Text style={styles.infoValue}>{level}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Score</Text>
                <Text style={[styles.infoValue, styles.infoValueHighlight]}>{score}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>SBT</Text>
                <Text style={[styles.infoValue, sbtActive ? styles.success : styles.warning]}>
                  {sbtActive ? '✅ Actif' : '❌ Inactif'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistiques</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{ticketsCount}</Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{eventsParticipated}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Dernière réservation</Text>
          {lastTicket ? (
            <Text style={styles.noteText}>
              {`🎫 ${lastTicket.title}
Quantité : ${lastTicket.quantity ?? 1}
Réservé le ${formatDateTime(lastTicket.lastPurchasedAt)}
📍 ${lastTicket.location}`}
            </Text>
          ) : (
            <Text style={styles.noteText}>
              Vous n'avez pas encore réservé de ticket. Rendez-vous sur la page Événements pour commencer !
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0b0b0e',
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ff7a1a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#0b0b0e',
    fontSize: 54,
    fontWeight: '900',
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
  },
  alertCard: {
    backgroundColor: '#141419',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    gap: 12,
  },
  alertTitle: {
    color: '#facc15',
    fontSize: 18,
    fontWeight: '700',
  },
  alertText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: '#facc15',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#0b0b0e',
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  editButton: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  info: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.15)',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  infoValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoValueHighlight: {
    color: '#ff7a1a',
  },
  success: {
    color: '#10b981',
  },
  warning: {
    color: '#ef4444',
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: '#ff7a1a',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 16,
    padding: 12,
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    textAlign: 'center',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#ff7a1a',
  },
  saveText: {
    color: '#0b0b0e',
    fontSize: 15,
    fontWeight: '700',
  },
  statsCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0b0b0e',
    marginHorizontal: 6,
  },
  statValue: {
    color: '#ff7a1a',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  note: {
    backgroundColor: '#141419',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.2)',
    borderRadius: 16,
    padding: 18,
  },
  noteTitle: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  noteText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
});
