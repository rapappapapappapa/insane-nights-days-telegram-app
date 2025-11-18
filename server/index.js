require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 5000;

// Clé secrète pour signer les JWT (en production, utiliser une variable d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'insane-nights-days-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // 7 jours

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

let users = [];
let events = [];
let tickets = [];
let djs = [];

const normalizeEmail = (email = '') => email.trim().toLowerCase();
const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    score: user.score ?? 0,
    level: user.level ?? 1,
    createdAt: user.createdAt,
  };
};

// Middleware pour vérifier le token JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token d\'authentification requis.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que l'utilisateur existe toujours
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    // Ajouter les infos utilisateur à la requête
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expiré.' });
    }
    return res.status(403).json({ success: false, message: 'Token invalide.' });
  }
};

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

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body ?? {};

    // Permettre d'utiliser soit email soit pseudo
    let finalEmail = email;
    let finalUsername = username;

    // Si pas d'email mais un username, utiliser le username comme identifiant
    if (!email && username) {
      finalUsername = username.trim();
      // Générer un email fictif basé sur le pseudo
      finalEmail = `${finalUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}@insane-nights.local`;
    } else if (email && !username) {
      // Si email fourni mais pas de username, utiliser l'email comme username
      finalUsername = email.split('@')[0];
      finalEmail = email;
    } else if (email && username) {
      // Les deux fournis, utiliser tels quels
      finalEmail = email;
      finalUsername = username.trim();
    } else {
      return res
        .status(400)
        .json({ success: false, message: 'Email ou pseudo et mot de passe sont requis.' });
    }

    if (!password) {
      return res
        .status(400)
        .json({ success: false, message: 'Le mot de passe est requis.' });
    }

    // Si c'est un email (contient @), valider le format
    if (finalEmail.includes('@')) {
      if (!isValidEmail(finalEmail)) {
        return res.status(400).json({ success: false, message: 'Email invalide.' });
      }
      finalEmail = normalizeEmail(finalEmail);
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérifier si l'email existe déjà
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: finalEmail },
    });

    if (existingUserByEmail) {
      return res.status(409).json({ success: false, message: 'Cet email ou pseudo est déjà utilisé.' });
    }

    // Vérifier si le pseudo existe déjà (chercher par username)
    const existingUserByUsername = await prisma.user.findFirst({
      where: { username: finalUsername },
    });

    if (existingUserByUsername) {
      return res.status(409).json({ success: false, message: 'Ce pseudo est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        email: finalEmail,
        username: finalUsername,
        password: hashedPassword,
        score: 100,
        level: 1,
      },
    });

    // Générer un JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      user: sanitizeUser(newUser),
      token: token,
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ success: false, message: "Erreur lors de l'inscription." });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email/pseudo et mot de passe sont requis.' });
    }

    let user = null;

    // Si c'est un email (contient @), chercher par email
    if (email.includes('@')) {
      const normalizedEmail = normalizeEmail(email);
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } else {
      // Sinon, chercher par pseudo (username)
      const usernameSearch = email.trim();
      console.log('[LOGIN] Recherche par pseudo:', usernameSearch);
      
      // Chercher d'abord avec la casse exacte
      user = await prisma.user.findFirst({
        where: { username: usernameSearch },
      });
      
      // Si pas trouvé, essayer avec une recherche insensible à la casse via requête brute SQLite
      if (!user) {
        try {
          const users = await prisma.$queryRaw`
            SELECT * FROM User WHERE LOWER(username) = LOWER(${usernameSearch})
          `;
          console.log('[LOGIN] Résultat requête brute:', users.length, 'utilisateur(s)');
          if (users && users.length > 0) {
            user = users[0];
            console.log('[LOGIN] Utilisateur trouvé:', user.username);
          }
        } catch (queryError) {
          console.error('[LOGIN] Erreur requête brute:', queryError);
        }
      } else {
        console.log('[LOGIN] Utilisateur trouvé avec casse exacte:', user.username);
      }
    }
    
    if (!user) {
      console.log('[LOGIN] Aucun utilisateur trouvé pour:', email);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Identifiants invalides.' });
    }

    // Générer un JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Connexion réussie.',
      user: sanitizeUser(user),
      token: token,
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la connexion.' });
  }
});

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

app.get('/api/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const walletUser = users.find((u) => u.id === userId);

    if (walletUser) {
      return res.json({ success: true, user: walletUser });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        community: true,
        dj: true,
        booker: true,
        venue: true,
      },
    });

    if (!dbUser) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, user: sanitizeUser(dbUser) });
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Générer un numéro ISN unique séquentiel (format: ISN suivi de chiffres)
const generateISN = async () => {
  // Compter le nombre de profils Communauté existants
  const count = await prisma.userCommunity.count();
  // Générer le prochain numéro séquentiel (8 chiffres avec zéros devant)
  const nextNumber = (count + 1).toString().padStart(8, '0');
  return `ISN${nextNumber}`;
};

// Endpoint pour créer un profil Communauté
app.post('/api/profile/community', authenticateToken, async (req, res) => {
  try {
    const { pseudo, nom, prenom, email, password, pays, dateNaissance } = req.body ?? {};
    const userId = req.user.id; // Récupéré depuis le token JWT

    if (!nom || !prenom || !pays || !dateNaissance) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (nom, prenom, pays, dateNaissance).',
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { community: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    // Vérifier qu'il n'a pas déjà un profil Communauté
    if (user.community) {
      return res.status(409).json({
        success: false,
        message: 'Un profil Communauté existe déjà pour cet utilisateur.',
      });
    }

    // Générer un numéro ISN séquentiel
    const isnNumber = await generateISN();

    // Créer le profil Communauté
    const communityProfile = await prisma.userCommunity.create({
      data: {
        userId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        pays: pays.trim(),
        dateNaissance: dateNaissance.trim(),
        isnNumber,
      },
    });

    // Mettre à jour le type de compte de l'utilisateur
    await prisma.user.update({
      where: { id: userId },
      data: { accountType: 'COMMUNITY' },
    });

    res.status(201).json({
      success: true,
      message: 'Profil Communauté créé avec succès.',
      profile: {
        id: communityProfile.id,
        nom: communityProfile.nom,
        prenom: communityProfile.prenom,
        pays: communityProfile.pays,
        dateNaissance: communityProfile.dateNaissance,
        isnNumber: communityProfile.isnNumber,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Communauté:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Communauté.',
    });
  }
});

// Endpoint pour créer un profil DJ
app.post('/api/profile/dj', authenticateToken, async (req, res) => {
  try {
    const { artistName, city, phone, birthDate } = req.body ?? {};
    const userId = req.user.id;

    if (!artistName || !city || !phone || !birthDate) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (artistName, city, phone, birthDate).',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { dj: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    if (user.dj) {
      return res.status(409).json({
        success: false,
        message: 'Un profil DJ existe déjà pour cet utilisateur.',
      });
    }

    const djProfile = await prisma.userDj.create({
      data: {
        userId,
        artistName: artistName.trim(),
        city: city.trim(),
        phone: phone.trim(),
        birthDate: birthDate.trim(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { accountType: 'DJ' },
    });

    res.status(201).json({
      success: true,
      message: 'Profil DJ créé avec succès.',
      profile: {
        id: djProfile.id,
        artistName: djProfile.artistName,
        city: djProfile.city,
        phone: djProfile.phone,
        birthDate: djProfile.birthDate,
      },
    });
  } catch (error) {
    console.error('Erreur création profil DJ:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil DJ.',
    });
  }
});

// Endpoint pour créer un profil Booker
app.post('/api/profile/booker', authenticateToken, async (req, res) => {
  try {
    const { nom, prenom, phonePro, bookerType } = req.body ?? {};
    const userId = req.user.id;

    if (!nom || !prenom || !phonePro || !bookerType) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (nom, prenom, phonePro, bookerType).',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { booker: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    if (user.booker) {
      return res.status(409).json({
        success: false,
        message: 'Un profil Booker existe déjà pour cet utilisateur.',
      });
    }

    const bookerProfile = await prisma.userBooker.create({
      data: {
        userId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        phonePro: phonePro.trim(),
        bookerType: bookerType.trim(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { accountType: 'BOOKER' },
    });

    res.status(201).json({
      success: true,
      message: 'Profil Booker créé avec succès.',
      profile: {
        id: bookerProfile.id,
        nom: bookerProfile.nom,
        prenom: bookerProfile.prenom,
        phonePro: bookerProfile.phonePro,
        bookerType: bookerProfile.bookerType,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Booker:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Booker.',
    });
  }
});

// Endpoint pour créer un profil Venue (Lieu)
app.post('/api/profile/venue', authenticateToken, async (req, res) => {
  try {
    const { venueName, address } = req.body ?? {};
    const userId = req.user.id;

    if (!venueName || !address) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (venueName, address).',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { venue: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    if (user.venue) {
      return res.status(409).json({
        success: false,
        message: 'Un profil Lieu existe déjà pour cet utilisateur.',
      });
    }

    const venueProfile = await prisma.userVenue.create({
      data: {
        userId,
        venueName: venueName.trim(),
        address: address.trim(),
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { accountType: 'VENUE' },
    });

    res.status(201).json({
      success: true,
      message: 'Profil Lieu créé avec succès.',
      profile: {
        id: venueProfile.id,
        venueName: venueProfile.venueName,
        address: venueProfile.address,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Lieu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Lieu.',
    });
  }
});

// Fonction pour mettre à jour automatiquement les statuts des événements
async function updateEventStatuses() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Mettre à jour les événements terminés
    await prisma.event.updateMany({
      where: {
        date: { lt: oneHourAgo },
        status: { not: 'FINISHED' },
      },
      data: { status: 'FINISHED' },
    });

    // Mettre à jour les événements en cours
    await prisma.event.updateMany({
      where: {
        date: { gte: oneHourAgo, lte: oneHourLater },
        status: { not: 'ONGOING' },
      },
      data: { status: 'ONGOING' },
    });

    // Mettre à jour les événements à venir
    await prisma.event.updateMany({
      where: {
        date: { gt: oneHourLater },
        status: { not: 'UPCOMING' },
      },
      data: { status: 'UPCOMING' },
    });
  } catch (error) {
    console.error('Erreur mise à jour statuts événements:', error);
  }
}

app.get('/api/events', async (req, res) => {
  try {
    const dbEvents = await prisma.event.findMany({
      include: {
        venue: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        eventDjs: {
          include: {
            // djId pointe vers User.id, donc on inclut le User
            // et on récupérera le UserDj séparément
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Récupérer tous les UserDj pour les DJs des événements
    const allDjIds = [...new Set(dbEvents.flatMap(e => e.eventDjs.map(ed => ed.djId)))];
    const userDjs = await prisma.userDj.findMany({
      where: { userId: { in: allDjIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    const djMap = new Map(userDjs.map(udj => [udj.userId, udj]));

    // Formater les événements pour correspondre au format attendu par le frontend
    const formattedEvents = dbEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      location: event.location,
      price: event.price,
      capacity: event.capacity,
      sold: event.sold,
      genre: event.genre,
      image: event.image,
      description: event.description,
      status: event.status || 'UPCOMING', // Statut de l'événement (UPCOMING, ONGOING, FINISHED)
      djs: event.eventDjs.map((ed) => {
        // Récupérer le nom du DJ depuis UserDj
        const userDj = djMap.get(ed.djId);
        const djName = userDj?.artistName || userDj?.user?.username || `DJ ${ed.djId.slice(0, 8)}`;
        return djName;
      }),
      djIds: event.eventDjs.map((ed) => ed.djId), // IDs des DJs (User.id) pour la notation
      venueId: event.venueId,
      venueName: event.venue?.venueName,
    }));

    res.json({ success: true, events: formattedEvents });
  } catch (error) {
    console.error('Erreur récupération événements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/events/:eventId', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        venue: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        eventDjs: {
          // djId pointe vers User.id
        },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Récupérer les UserDj pour les DJs de cet événement
    const djIds = event.eventDjs.map(ed => ed.djId);
    const userDjs = await prisma.userDj.findMany({
      where: { userId: { in: djIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    const djMap = new Map(userDjs.map(udj => [udj.userId, udj]));

    const formattedEvent = {
      id: event.id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      location: event.location,
      price: event.price,
      capacity: event.capacity,
      sold: event.sold,
      genre: event.genre,
      image: event.image,
      description: event.description,
      status: event.status || 'UPCOMING', // Statut de l'événement (UPCOMING, ONGOING, FINISHED)
      djs: event.eventDjs.map((ed) => {
        // Récupérer le nom du DJ depuis UserDj
        const userDj = djMap.get(ed.djId);
        const djName = userDj?.artistName || userDj?.user?.username || `DJ ${ed.djId.slice(0, 8)}`;
        return djName;
      }),
      djIds: event.eventDjs.map((ed) => ed.djId), // IDs des DJs (User.id) pour la notation
      venueId: event.venueId,
      venueName: event.venue?.venueName,
    };

    res.json({ success: true, event: formattedEvent });
  } catch (error) {
    console.error('Erreur récupération événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/tickets/buy', authenticateToken, async (req, res) => {
  try {
    const { eventId, quantity = 1 } = req.body;
    const userId = req.user.id;

    if (!eventId || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'eventId et quantity sont requis.',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Vérifier que l'événement est à venir (on ne peut acheter que pour les événements à venir)
    if (event.status !== 'UPCOMING') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez acheter un ticket que pour un événement à venir.',
      });
    }

    if (event.sold + quantity > event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Pas assez de places disponibles',
      });
    }

    const newTickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.ticket.create({
        data: {
          userId,
          eventId,
          price: event.price,
          status: 'valid',
          qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
        },
      });
      newTickets.push({
        id: ticket.id,
        userId: ticket.userId,
        eventId: ticket.eventId,
        price: ticket.price,
        status: ticket.status,
        qrCode: ticket.qrCode,
        purchaseDate: ticket.purchaseDate.toISOString(),
      });
    }

    // Mettre à jour le nombre de tickets vendus
    await prisma.event.update({
      where: { id: eventId },
      data: { sold: event.sold + quantity },
    });

    // Mettre à jour le score de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const newScore = (user.score || 0) + 50 * quantity;
    const newLevel = Math.floor(newScore / 200) + 1;

    await prisma.user.update({
      where: { id: userId },
      data: {
        score: newScore,
        level: newLevel,
      },
    });

    res.json({
      success: true,
      message: `🎟️ ${quantity} ticket(s) acheté(s) avec succès`,
      tickets: newTickets,
      updatedUser: {
        score: newScore,
        level: newLevel,
      },
    });
  } catch (error) {
    console.error('Erreur achat ticket:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/user/:userId/tickets', async (req, res) => {
  try {
    const userTickets = await prisma.ticket.findMany({
      where: { userId: req.params.userId },
      include: {
        event: {
          include: {
            eventDjs: true,
            venue: {
              select: {
                id: true,
                venueName: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    const formattedTickets = userTickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      eventId: ticket.eventId,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.date.toISOString().split('T')[0],
      eventTime: ticket.event.time,
      eventLocation: ticket.event.location,
      eventGenre: ticket.event.genre,
      eventStatus: ticket.event.status || 'UPCOMING', // Statut de l'événement
      djIds: ticket.event.eventDjs.map((ed) => ed.djId), // IDs des DJs (User.id) pour la notation
      venueId: ticket.event.venueId,
      venueName: ticket.event.venue?.venueName,
      price: ticket.price,
      status: ticket.status,
      qrCode: ticket.qrCode,
      purchaseDate: ticket.purchaseDate.toISOString(),
    }));

    res.json({ success: true, tickets: formattedTickets });
  } catch (error) {
    console.error('Erreur récupération tickets:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Fonction helper pour calculer les moyennes d'un DJ
const calculateDjRatings = async (djId) => {
  const ratings = await prisma.djRating.findMany({
    where: { djId },
  });

  const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
  const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
  const venueRatings = ratings.filter((r) => r.raterType === 'VENUE');

  const avgCommunity =
    communityRatings.length > 0
      ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
      : 0;
  const avgBooker =
    bookerRatings.length > 0
      ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
      : 0;
  const avgVenue =
    venueRatings.length > 0
      ? venueRatings.reduce((sum, r) => sum + r.rating, 0) / venueRatings.length
      : 0;

  const avgGlobal =
    ratings.length > 0 ? (avgCommunity + avgBooker + avgVenue) / 3 : 0;

  await prisma.userDj.update({
    where: { id: djId },
    data: {
      averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
      averageRatingBooker: Math.round(avgBooker * 10) / 10,
      averageRatingVenue: Math.round(avgVenue * 10) / 10,
      averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
      totalRatingsCommunity: communityRatings.length,
      totalRatingsBooker: bookerRatings.length,
      totalRatingsVenue: venueRatings.length,
    },
  });
};

// Fonction helper pour calculer les moyennes d'un lieu
const calculateVenueRatings = async (venueId) => {
  const ratings = await prisma.venueRating.findMany({
    where: { venueId },
  });

  const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
  const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
  const djRatings = ratings.filter((r) => r.raterType === 'DJ');

  const avgCommunity =
    communityRatings.length > 0
      ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
      : 0;
  const avgBooker =
    bookerRatings.length > 0
      ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
      : 0;
  const avgDj =
    djRatings.length > 0
      ? djRatings.reduce((sum, r) => sum + r.rating, 0) / djRatings.length
      : 0;

  const avgGlobal =
    ratings.length > 0 ? (avgCommunity + avgBooker + avgDj) / 3 : 0;

  await prisma.userVenue.update({
    where: { id: venueId },
    data: {
      averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
      averageRatingBooker: Math.round(avgBooker * 10) / 10,
      averageRatingDj: Math.round(avgDj * 10) / 10,
      averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
      totalRatingsCommunity: communityRatings.length,
      totalRatingsBooker: bookerRatings.length,
      totalRatingsDj: djRatings.length,
    },
  });
};

// Endpoint pour noter un DJ
app.post('/api/ratings/dj', authenticateToken, async (req, res) => {
  try {
    const { djUserId, eventId, rating, comment } = req.body ?? {};
    const raterId = req.user.id;

    // Validation
    if (!djUserId || !eventId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'djUserId, eventId et rating sont requis.',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5.',
      });
    }

    // Vérifier que le DJ existe (djUserId est le User.id)
    console.log('[RATING DJ] Recherche UserDj avec userId:', djUserId);
    const dj = await prisma.userDj.findUnique({
      where: { userId: djUserId },
      include: { user: true },
    });

    if (!dj) {
      console.log('[RATING DJ] UserDj non trouvé pour userId:', djUserId);
      // Essayer de trouver tous les UserDj pour debug
      const allDjs = await prisma.userDj.findMany({
        select: { userId: true, artistName: true },
        take: 5,
      });
      console.log('[RATING DJ] UserDjs disponibles (échantillon):', allDjs);
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }
    
    console.log('[RATING DJ] UserDj trouvé:', dj.id, dj.artistName);

    const djId = dj.id; // UserDj.id pour la suite

    // Vérifier que l'événement existe et est passé
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventDjs: true,
        venue: true,
        booker: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }

    // Vérifier que l'événement est terminé (on ne peut noter que les événements terminés)
    if (event.status !== 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez noter qu\'un événement terminé.',
      });
    }

    // Vérifier que le DJ a joué à cet événement
    const djPlayed = event.eventDjs.some((ed) => ed.djId === dj.userId);
    if (!djPlayed) {
      return res.status(400).json({
        success: false,
        message: 'Ce DJ n\'a pas joué à cet événement.',
      });
    }

    // Récupérer le type de compte de l'utilisateur qui note
    const rater = await prisma.user.findUnique({
      where: { id: raterId },
      include: {
        community: true,
        booker: true,
        venue: true,
        dj: true,
      },
    });

    if (!rater) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    let raterType = null;
    let ticketId = null;

    // Validation selon le type de compte
    if (rater.accountType === 'COMMUNITY' && rater.community) {
      raterType = 'COMMUNITY';
      // Vérifier qu'il a un ticket pour cet événement ET que le ticket a été acheté AVANT la date de l'événement
      const ticket = await prisma.ticket.findFirst({
        where: {
          userId: raterId,
          eventId: eventId,
          status: 'valid',
        },
      });

      if (!ticket) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir un ticket valide pour cet événement pour noter.',
        });
      }

      // Vérifier que le ticket a été acheté AVANT la date de l'événement
      if (ticket.purchaseDate > event.date) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir acheté le ticket avant la date de l\'événement pour noter.',
        });
      }

      ticketId = ticket.id;
    } else if (rater.accountType === 'BOOKER' && rater.booker) {
      raterType = 'BOOKER';
      // Vérifier qu'il a organisé cet événement (bookerId pointe vers UserBooker.id)
      if (event.bookerId !== rater.booker.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir organisé cet événement pour noter.',
        });
      }
    } else if (rater.accountType === 'VENUE' && rater.venue) {
      raterType = 'VENUE';
      // Vérifier qu'il a hébergé cet événement
      if (event.venueId !== rater.venue.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir hébergé cet événement pour noter.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Type de compte non autorisé à noter.',
      });
    }

    // Vérifier s'il a déjà noté ce DJ pour cet événement
    const existingRating = await prisma.djRating.findUnique({
      where: {
        djId_raterId_eventId: {
          djId,
          raterId,
          eventId,
        },
      },
    });

    if (existingRating) {
      // Mettre à jour la note existante
      await prisma.djRating.update({
        where: { id: existingRating.id },
        data: {
          rating: rating,
          comment: comment || null,
        },
      });
    } else {
      // Créer une nouvelle note
      await prisma.djRating.create({
        data: {
          djId,
          raterId,
          raterType,
          rating: rating,
          comment: comment || null,
          eventId,
          ticketId: ticketId || null,
        },
      });
    }

    // Recalculer les moyennes
    await calculateDjRatings(djId);

    res.json({
      success: true,
      message: 'Note enregistrée avec succès.',
    });
  } catch (error) {
    console.error('Erreur notation DJ:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la note.',
    });
  }
});

// Endpoint pour noter un lieu
app.post('/api/ratings/venue', authenticateToken, async (req, res) => {
  try {
    const { venueId, eventId, rating, comment } = req.body ?? {};
    const raterId = req.user.id;

    // Validation
    if (!venueId || !eventId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'venueId, eventId et rating sont requis.',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5.',
      });
    }

    // Vérifier que le lieu existe
    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    // Vérifier que l'événement existe et est passé
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        booker: true,
        eventDjs: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }

    if (event.venueId !== venueId) {
      return res.status(400).json({
        success: false,
        message: 'Cet événement n\'a pas eu lieu dans ce lieu.',
      });
    }

    // Vérifier que l'événement est terminé (on ne peut noter que les événements terminés)
    if (event.status !== 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez noter qu\'un événement terminé.',
      });
    }

    // Récupérer le type de compte de l'utilisateur qui note
    const rater = await prisma.user.findUnique({
      where: { id: raterId },
      include: {
        community: true,
        booker: true,
        dj: true,
      },
    });

    if (!rater) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    let raterType = null;
    let ticketId = null;

    // Validation selon le type de compte
    if (rater.accountType === 'COMMUNITY' && rater.community) {
      raterType = 'COMMUNITY';
      // Vérifier qu'il a un ticket pour cet événement ET que le ticket a été acheté AVANT la date de l'événement
      const ticket = await prisma.ticket.findFirst({
        where: {
          userId: raterId,
          eventId: eventId,
          status: 'valid',
        },
      });

      if (!ticket) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir un ticket valide pour cet événement pour noter.',
        });
      }

      // Vérifier que le ticket a été acheté AVANT la date de l'événement
      if (ticket.purchaseDate > event.date) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir acheté le ticket avant la date de l\'événement pour noter.',
        });
      }

      ticketId = ticket.id;
    } else if (rater.accountType === 'BOOKER' && rater.booker) {
      raterType = 'BOOKER';
      // Vérifier qu'il a organisé cet événement (bookerId pointe vers UserBooker.id)
      if (event.bookerId !== rater.booker.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir organisé cet événement pour noter.',
        });
      }
    } else if (rater.accountType === 'DJ' && rater.dj) {
      raterType = 'DJ';
      // Vérifier qu'il a joué à cet événement
      const djPlayed = event.eventDjs.some((ed) => ed.djId === raterId);
      if (!djPlayed) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir joué à cet événement pour noter.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Type de compte non autorisé à noter.',
      });
    }

    // Vérifier s'il a déjà noté ce lieu pour cet événement
    const existingRating = await prisma.venueRating.findUnique({
      where: {
        venueId_raterId_eventId: {
          venueId,
          raterId,
          eventId,
        },
      },
    });

    if (existingRating) {
      // Mettre à jour la note existante
      await prisma.venueRating.update({
        where: { id: existingRating.id },
        data: {
          rating: rating,
          comment: comment || null,
        },
      });
    } else {
      // Créer une nouvelle note
      await prisma.venueRating.create({
        data: {
          venueId,
          raterId,
          raterType,
          rating: rating,
          comment: comment || null,
          eventId,
          ticketId: ticketId || null,
        },
      });
    }

    // Recalculer les moyennes
    await calculateVenueRatings(venueId);

    res.json({
      success: true,
      message: 'Note enregistrée avec succès.',
    });
  } catch (error) {
    console.error('Erreur notation Lieu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la note.',
    });
  }
});

// Endpoint pour récupérer la liste de tous les DJs
app.get('/api/djs', async (req, res) => {
  try {
    const djs = await prisma.userDj.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
      orderBy: {
        averageRatingGlobal: 'desc',
      },
    });

    const formattedDjs = djs.map((dj) => ({
      id: dj.id,
      userId: dj.userId,
      artistName: dj.artistName,
      city: dj.city,
      averageRatingGlobal: dj.averageRatingGlobal,
      totalRatingsGlobal: dj.totalRatingsCommunity + dj.totalRatingsBooker + dj.totalRatingsVenue,
      averageRatingCommunity: dj.averageRatingCommunity,
      averageRatingBooker: dj.averageRatingBooker,
      averageRatingVenue: dj.averageRatingVenue,
    }));

    res.json({ success: true, djs: formattedDjs });
  } catch (error) {
    console.error('Erreur récupération DJs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les notes d'un DJ (par UserDj.id ou User.id)
app.get('/api/dj/:identifier/ratings', async (req, res) => {
  try {
    // Essayer d'abord avec UserDj.id, puis avec User.id
    let dj = await prisma.userDj.findUnique({
      where: { id: req.params.identifier },
      include: {
        ratings: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Si pas trouvé, essayer avec User.id
    if (!dj) {
      dj = await prisma.userDj.findUnique({
        where: { userId: req.params.identifier },
        include: {
          ratings: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    }

    if (!dj) {
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }

    res.json({
      success: true,
      ratings: {
        averageRatingCommunity: dj.averageRatingCommunity,
        averageRatingBooker: dj.averageRatingBooker,
        averageRatingVenue: dj.averageRatingVenue,
        averageRatingGlobal: dj.averageRatingGlobal,
        totalRatingsCommunity: dj.totalRatingsCommunity,
        totalRatingsBooker: dj.totalRatingsBooker,
        totalRatingsVenue: dj.totalRatingsVenue,
        allRatings: dj.ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          raterType: r.raterType,
          eventTitle: r.event.title,
          eventDate: r.event.date,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur récupération notes DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les notes d'un lieu
app.get('/api/venue/:venueId/ratings', async (req, res) => {
  try {
    const venue = await prisma.userVenue.findUnique({
      where: { id: req.params.venueId },
      include: {
        ratings: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    res.json({
      success: true,
      ratings: {
        averageRatingCommunity: venue.averageRatingCommunity,
        averageRatingBooker: venue.averageRatingBooker,
        averageRatingDj: venue.averageRatingDj,
        averageRatingGlobal: venue.averageRatingGlobal,
        totalRatingsCommunity: venue.totalRatingsCommunity,
        totalRatingsBooker: venue.totalRatingsBooker,
        totalRatingsDj: venue.totalRatingsDj,
        allRatings: venue.ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          raterType: r.raterType,
          eventTitle: r.event.title,
          eventDate: r.event.date,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur récupération notes Lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint TEMPORAIRE pour supprimer un ticket (à supprimer en production)
app.delete('/api/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    // Vérifier que le ticket appartient à l'utilisateur
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé.',
      });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres tickets.',
      });
    }

    // Supprimer le ticket
    await prisma.ticket.delete({
      where: { id: ticketId },
    });

    res.json({
      success: true,
      message: 'Ticket supprimé avec succès.',
    });
  } catch (error) {
    console.error('Erreur suppression ticket:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/tickets/:ticketId/qr', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.ticketId },
      include: {
        event: {
          select: {
            title: true,
            date: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    }

    const qrCodeDataURL = await QRCode.toDataURL(ticket.qrCode);
    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      ticketInfo: {
        id: ticket.id,
        eventTitle: ticket.event.title,
        eventDate: ticket.event.date.toISOString().split('T')[0],
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error('Erreur génération QR code:', error);
    res.status(500).json({ success: false, message: 'Erreur génération QR code' });
  }
});

// Endpoint TEMPORAIRE pour changer le statut d'un événement (à supprimer en production)
app.post('/api/admin/event/:eventId/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['UPCOMING', 'ONGOING', 'FINISHED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Statut invalide. Doit être UPCOMING, ONGOING ou FINISHED',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé',
      });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: req.params.eventId },
      data: { status },
    });

    res.json({
      success: true,
      message: `Statut modifié avec succès: ${status}`,
      event: {
        id: updatedEvent.id,
        title: updatedEvent.title,
        status: updatedEvent.status,
      },
    });
  } catch (error) {
    console.error('Erreur modification statut:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint TEMPORAIRE pour modifier la date d'un événement (à supprimer en production)
app.post('/api/admin/event/:eventId/date', authenticateToken, async (req, res) => {
  try {
    const { year } = req.body;
    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'L\'année est requise',
      });
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Année invalide (doit être entre 2000 et 2100)',
      });
    }

    // Récupérer l'événement actuel
    const currentEvent = await prisma.event.findUnique({
      where: { id: req.params.eventId },
    });

    if (!currentEvent) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé',
      });
    }

    // Modifier seulement l'année en gardant le mois, jour et heure
    const currentDate = new Date(currentEvent.date);
    const newDate = new Date(currentDate);
    newDate.setFullYear(yearNum);

    const event = await prisma.event.update({
      where: { id: req.params.eventId },
      data: { date: newDate },
    });

    res.json({
      success: true,
      message: 'Année modifiée avec succès',
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
      },
    });
  } catch (error) {
    console.error('Erreur modification date:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const [registeredUsersCount, scoresAggregate] = await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({
        _avg: { score: true },
        _sum: { score: true },
      }),
    ]);

    const registeredAverageScore = Math.round(scoresAggregate._avg.score ?? 0);
    const walletAverage = users.length
      ? users.reduce((sum, u) => sum + u.score, 0) / users.length
      : 0;
    const totalUsers = users.length + registeredUsersCount;
    const combinedAverage =
      totalUsers > 0
        ? Math.round(
            (walletAverage * users.length + (scoresAggregate._sum.score ?? 0)) / totalUsers,
          )
        : 0;

    const stats = {
      totalUsers,
      registeredUsers: registeredUsersCount,
      walletUsers: users.length,
      totalEvents: events.length,
      totalTicketsSold: tickets.filter((t) => t.status === 'valid').length,
      totalRevenue: tickets.reduce((sum, t) => sum + t.price, 0),
      averageUserScore: combinedAverage || registeredAverageScore,
    };
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
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

app.get('/api/test', async (req, res) => {
  try {
    const registeredUsers = await prisma.user.count();
    res.json({
      message: '🎉 Backend Insane Nights & Days fonctionne parfaitement',
      timestamp: new Date().toISOString(),
      walletUsersCount: users.length,
      registeredUsersCount: registeredUsers,
      eventsCount: events.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors du test.' });
  }
});

// Mettre à jour les statuts au démarrage
updateEventStatuses();

// Mettre à jour les statuts toutes les 5 minutes
setInterval(updateEventStatuses, 5 * 60 * 1000);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Insane Nights & Days démarré sur le port ${PORT}`);
  console.log(`📊 ${users.length} utilisateurs wallet, ${events.length} événements chargés`);
  console.log(`🔗 Test local: http://localhost:${PORT}/api/test`);
  console.log(`⏰ Mise à jour automatique des statuts d'événements activée (toutes les 5 minutes)`);
});

const shutdown = async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);


