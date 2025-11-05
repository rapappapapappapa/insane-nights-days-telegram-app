import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Pages simples sans navigation
function HomePage({ onNavigate }) {
  const [isConnecting, setIsConnecting] = useState(false);

  const connectWallet = () => {
    setIsConnecting(true);
    
    setTimeout(() => {
      Alert.alert('Succès', '🎉 Wallet TON connecté avec succès ! SBT actif', [
        {
          text: 'Continuer',
          onPress: () => {
            setIsConnecting(false);
            onNavigate('menu');
          },
        },
      ]);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>I</Text>
        </View>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>Insane</Text>
        <Text style={styles.titleOrange}>Nights</Text>
        <Text style={styles.titleOrange}>& Days</Text>
      </View>

      <Text style={styles.subtitle}>
        Révolutionnez l'industrie des événements avec la blockchain
      </Text>

      <TouchableOpacity
        style={[styles.button, isConnecting && styles.buttonDisabled]}
        onPress={connectWallet}
        disabled={!!isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator color="#111" />
        ) : (
          <Text style={styles.buttonText}>💳 Connecter Wallet TON</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Paiements sécurisés avec TON et Stars
      </Text>
    </View>
  );
}

function MenuPage({ onNavigate }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>I</Text>
        </View>
        <Text style={styles.title}>Menu Principal</Text>
        <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>
      </View>

      <TouchableOpacity style={styles.menuButton} onPress={() => onNavigate('events')}>
        <Text style={styles.menuButtonText}>🎵 Événements</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={() => onNavigate('profile')}>
        <Text style={styles.menuButtonText}>🏆 Mon Profil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuButton} onPress={() => onNavigate('tickets')}>
        <Text style={styles.menuButtonText}>🎟️ Mes Tickets</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
        <Text style={styles.backButtonText}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

// Données mock des événements
const mockEvents = [
  {
    id: '1',
    title: 'Insane Night - Soirée Electro',
    date: '15 Janvier 2024',
    time: '22:00',
    location: 'Club Insane, Paris',
    price: 25,
    capacity: 200,
    sold: 45,
    genre: 'Electro',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    djs: ['Kevin-Alexandre', 'DJ Luna'],
    description: 'Une soirée électro explosive avec les meilleurs DJs de la scène underground',
  },
  {
    id: '2',
    title: 'Bass Revolution - Drum & Bass',
    date: '20 Janvier 2024',
    time: '21:00',
    location: 'Warehouse Underground, Lyon',
    price: 30,
    capacity: 150,
    sold: 78,
    genre: 'Drum & Bass',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['DJ Phoenix', 'Kevin-Alexandre'],
    description: 'Une révolution sonore avec les meilleurs artistes drum & bass',
  },
  {
    id: '3',
    title: 'Techno Underground Session',
    date: '25 Janvier 2024',
    time: '23:00',
    location: 'Le Bunker, Marseille',
    price: 20,
    capacity: 300,
    sold: 120,
    genre: 'Techno',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['DJ Dark', 'Techno Master'],
    description: 'Session techno underground dans un lieu unique',
  },
];

function EventsPage({ onNavigate }) {
  const [events] = useState(mockEvents);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const genres = ['all', ...new Set(events.map(event => event.genre))];

  const filteredEvents = events.filter(event => {
    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const getAvailabilityColor = (sold, capacity) => {
    const percentage = (sold / capacity) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  return (
    <View style={styles.eventsContainer}>
      <StatusBar style="light" />
      <View style={styles.eventsTopBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.eventsScroll} contentContainerStyle={styles.eventsContent}>
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>📅 Événements</Text>
          <Text style={styles.eventsSubtitle}>Découvrez tous les événements</Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {genres.map(genre => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.filterButton,
                selectedGenre === genre && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedGenre(genre)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedGenre === genre && styles.filterTextActive,
                ]}
              >
                {genre === 'all' ? '🎵 Tous' : genre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredEvents.map(event => (
          <TouchableOpacity key={event.id} style={styles.eventCard}>
            <View style={styles.eventImageContainer}>
              <Image source={{ uri: event.image }} style={styles.eventImage} />
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{event.price}€</Text>
              </View>
              <View style={styles.genreBadge}>
                <Text style={styles.genreText}>{event.genre}</Text>
              </View>
            </View>

            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>

              <View style={styles.eventInfo}>
                <View style={styles.eventInfoRow}>
                  <Text style={styles.eventInfoIcon}>📅</Text>
                  <Text style={styles.eventInfoText}>{event.date} à {event.time}</Text>
                </View>
                <View style={styles.eventInfoRow}>
                  <Text style={styles.eventInfoIcon}>📍</Text>
                  <Text style={styles.eventInfoText}>{event.location}</Text>
                </View>
                <View style={styles.eventInfoRow}>
                  <Text style={styles.eventInfoIcon}>🎤</Text>
                  <Text style={styles.eventInfoText}>{event.djs.join(', ')}</Text>
                </View>
              </View>

              <View style={styles.availabilityContainer}>
                <View style={styles.availabilityHeader}>
                  <Text style={styles.availabilityLabel}>Places disponibles</Text>
                  <Text style={[styles.availabilityCount, { color: getAvailabilityColor(event.sold, event.capacity) }]}>
                    {event.capacity - event.sold} / {event.capacity}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${(event.sold / event.capacity) * 100}%`,
                        backgroundColor: getAvailabilityColor(event.sold, event.capacity),
                      },
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>🎟️ Voir les Détails</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>😔</Text>
            <Text style={styles.emptyTitle}>Aucun événement trouvé</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function ProfilePage({ onNavigate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState({
    username: 'User_insane',
    score: 100,
    level: 1,
    tickets: 0,
    eventsParticipated: 0,
    sbtActive: true,
  });
  const [editForm, setEditForm] = useState({
    username: user.username,
  });

  const handleSave = () => {
    setUser({ ...user, username: editForm.username });
    setIsEditing(false);
    Alert.alert('Succès', 'Profil mis à jour !');
  };

  return (
    <View style={styles.profileContainer}>
      <StatusBar style="light" />
      <View style={styles.eventsTopBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.profileScroll} contentContainerStyle={styles.profileContent}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>I</Text>
          </View>
          <Text style={styles.profileTitle}>🏆 Mon Profil</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileCardHeader}>
            <Text style={styles.profileCardTitle}>Informations</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>✏️ Modifier</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <Text style={styles.editLabel}>Nom d'utilisateur</Text>
              <TextInput
                style={styles.editInput}
                value={editForm.username}
                onChangeText={(text) => setEditForm({ ...editForm, username: text })}
                placeholder="Nom d'utilisateur"
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <View style={styles.editButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Nom d'utilisateur:</Text>
                <Text style={styles.profileInfoValue}>{user.username}</Text>
              </View>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Niveau:</Text>
                <Text style={styles.profileInfoValue}>{user.level}</Text>
              </View>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>Score:</Text>
                <Text style={[styles.profileInfoValue, styles.scoreValue]}>{user.score}</Text>
              </View>
              <View style={styles.profileInfoRow}>
                <Text style={styles.profileInfoLabel}>SBT Status:</Text>
                <Text style={[styles.profileInfoValue, styles.sbtActive]}>
                  {user.sbtActive ? '✅ Actif' : '❌ Inactif'}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Statistiques</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.tickets}</Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.eventsParticipated}</Text>
              <Text style={styles.statLabel}>Événements</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TicketsPage({ onNavigate }) {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.eventsTopBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>🎟️ Mes Tickets</Text>
        <Text style={styles.subtitle}>Page des tickets</Text>
      </View>
    </View>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const navigate = (page) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'menu':
        return <MenuPage onNavigate={navigate} />;
      case 'events':
        return <EventsPage onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} />;
      case 'tickets':
        return <TicketsPage onNavigate={navigate} />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return renderPage();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#ff7a1a',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#0b0b0e',
    fontSize: 36,
    fontWeight: '900',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  titleOrange: {
    color: '#ff7a1a',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 48,
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    minWidth: 280,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  menuButton: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    padding: 20,
    minWidth: 280,
    marginBottom: 16,
    alignItems: 'center',
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    marginTop: 32,
    padding: 12,
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  // Styles EventsPage
  eventsContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  eventsTopBar: {
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
  eventsScroll: {
    flex: 1,
  },
  eventsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  eventsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  eventsTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  eventsSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: '#ff7a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ff7a1a',
    borderColor: '#ff7a1a',
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0b0b0e',
  },
  eventCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  eventImageContainer: {
    position: 'relative',
    height: 200,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#ff7a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: '#0b0b0e',
    fontSize: 14,
    fontWeight: '800',
  },
  genreBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(11,11,14,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  eventDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  eventInfo: {
    marginBottom: 16,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  eventInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    flex: 1,
  },
  availabilityContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,122,26,0.3)',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  availabilityCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#0b0b0e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  detailsButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  detailsButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  // Styles ProfilePage
  profileContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  profileScroll: {
    flex: 1,
  },
  profileContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    backgroundColor: '#ff7a1a',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileAvatarText: {
    color: '#0b0b0e',
    fontSize: 48,
    fontWeight: '900',
  },
  profileTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  profileCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  editButton: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    marginTop: 16,
  },
  editLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: '#ff7a1a',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  editButtons: {
    flexDirection: 'row',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginRight: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#ff7a1a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  profileInfo: {
    marginTop: 16,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.1)',
  },
  profileInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  profileInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValue: {
    color: '#ff7a1a',
  },
  sbtActive: {
    color: '#10b981',
  },
  statsCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#0b0b0e',
    borderRadius: 12,
    marginRight: 6,
  },
  statValue: {
    color: '#ff7a1a',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 8,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
});
