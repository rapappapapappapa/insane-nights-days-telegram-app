const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let users = [];
let events = [];
let tickets = [];
let djs = [];

const defaultEvents = [
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
    djs: ['DJ Neon', 'Mixmaster Nova'],
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
    djs: ['Bass Storm', 'DJ Cyber'],
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
    image: 'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=400&h=300&fit=crop',
    djs: ['Techno Master', 'DJ Neon'],
    description: 'Session techno underground dans un lieu unique',
  },
];

events = [...defaultEvents];

const defaultDjs = [
  {
    id: 'dj-1',
    name: 'DJ Neon',
    genre: 'Electro',
    currentRank: 1,
    score: 982,
    followers: 18420,
    lastEvent: 'Insane Night - Soirée Electro',
    wins: 8,
    losses: 1,
    trend: '+3',
  },
  {
    id: 'dj-2',
    name: 'Mixmaster Nova',
    genre: 'Techno',
    currentRank: 2,
    score: 951,
    followers: 16540,
    lastEvent: 'Techno Underground Session',
    wins: 6,
    losses: 2,
    trend: '+1',
  },
  {
    id: 'dj-3',
    name: 'Bass Storm',
    genre: 'Drum & Bass',
    currentRank: 3,
    score: 917,
    followers: 15210,
    lastEvent: 'Bass Revolution - Drum & Bass',
    wins: 7,
    losses: 3,
    trend: '-1',
  },
  {
    id: 'dj-4',
    name: 'DJ Cyber',
    genre: 'Drum & Bass',
    currentRank: 4,
    score: 884,
    followers: 14105,
    lastEvent: 'Bass Revolution - Drum & Bass',
    wins: 5,
    losses: 2,
    trend: '+2',
  },
  {
    id: 'dj-5',
    name: 'Techno Master',
    genre: 'Techno',
    currentRank: 5,
    score: 861,
    followers: 13200,
    lastEvent: 'Techno Underground Session',
    wins: 4,
    losses: 2,
    trend: '-3',
  },
];


djs = [...defaultDjs];

app.post('/api/wallet/connect', async (req, res) => {
  try {
    const { walletAddress, username } = req.body;
    let user = users.find((u) => u.walletAddress === walletAddress);
    if (!user) {
      user = {
        id: uuidv4(),
        walletAddress,
        username: username || `User_${walletAddress.slice(-6)}`,
        score: 100,
        level: 1,
        eventsParticipated: 0,
        djsLiked: 0,
        ticketsBought: 0,
        joinDate: new Date().toISOString(),
        sbtActive: true,
      };
      users.push(user);
    }
    const sessionToken = uuidv4();
    res.json({
      success: true,
      message: '🎉 Wallet TON connecté avec succès ! SBT actif',
      user: {
        id: user.id,
        username: user.username,
        score: user.score,
        level: user.level,
        sbtActive: user.sbtActive,
      },
      sessionToken,
    });
  } catch (error) {
    console.error('Erreur connexion wallet:', error);
    res.status(500).json({ success: false, message: 'Erreur de connexion' });
  }
});

app.get('/api/user/:userId', (req, res) => {
  try {
    const user = users.find((u) => u.id === req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/events', (req, res) => {
  try {
    res.json({ success: true, events });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/events/:eventId', (req, res) => {
  try {
    const event = events.find((e) => e.id === req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }
    res.json({ success: true, event });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/tickets/buy', async (req, res) => {
  try {
    const { userId, eventId, quantity = 1 } = req.body;
    const user = users.find((u) => u.id === userId);
    const event = events.find((u) => u.id === eventId);
    if (!user || !event) {
      return res.status(404).json({ success: false, message: 'Utilisateur ou événement non trouvé' });
    }
    if (event.sold + quantity > event.capacity) {
      return res.status(400).json({ success: false, message: 'Pas assez de places disponibles' });
    }
    const newTickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = {
        id: uuidv4(),
        userId,
        eventId,
        eventTitle: event.title,
        eventDate: event.date,
        price: event.price,
        status: 'valid',
        qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
        purchaseDate: new Date().toISOString(),
      };
      newTickets.push(ticket);
      tickets.push(ticket);
    }
    event.sold += quantity;
    user.ticketsBought += quantity;
    user.score += 50 * quantity;
    user.level = Math.floor(user.score / 200) + 1;
    res.json({
      success: true,
      message: `🎟️ ${quantity} ticket(s) acheté(s) avec succès`,
      tickets: newTickets,
      updatedUser: {
        score: user.score,
        level: user.level,
        ticketsBought: user.ticketsBought,
      },
    });
  } catch (error) {
    console.error('Erreur achat ticket:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/user/:userId/tickets', (req, res) => {
  try {
    const userTickets = tickets.filter((t) => t.userId === req.params.userId);
    res.json({ success: true, tickets: userTickets });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/tickets/:ticketId/qr', async (req, res) => {
  try {
    const ticket = tickets.find((t) => t.id === req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    }
    const qrCodeDataURL = await QRCode.toDataURL(ticket.qrCode);
    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      ticketInfo: {
        id: ticket.id,
        eventTitle: ticket.eventTitle,
        eventDate: ticket.eventDate,
        status: ticket.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur génération QR code' });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      totalUsers: users.length,
      totalEvents: events.length,
      totalTicketsSold: tickets.filter((t) => t.status === 'valid').length,
      totalRevenue: tickets.reduce((sum, t) => sum + t.price, 0),
      averageUserScore:
        users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.score, 0) / users.length) : 0,
    };
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/djs/ranking', (req, res) => {
  try {
    const sortedDjs = [...djs].sort((a, b) => a.currentRank - b.currentRank);
    res.json({ success: true, djs: sortedDjs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/test', (req, res) => {
  res.json({
    message: '🎉 Backend Insane Nights & Days fonctionne parfaitement',
    timestamp: new Date().toISOString(),
    usersCount: users.length,
    eventsCount: events.length,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Insane Nights & Days démarré sur le port ${PORT}`);
  console.log(`📊 ${users.length} utilisateurs, ${events.length} événements chargés`);
  console.log(`🔗 Test local: http://localhost:${PORT}/api/test`);
  console.log(`🔗 Test réseau: http://172.20.10.7:${PORT}/api/test`);
});
