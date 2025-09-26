import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Intégration Telegram
import { initTelegramApp } from './telegram-web-app';
// TODO: Vérifier si l'import est correct

// Pages
import HomePage from './pages/HomePage';
import MenuPage from './pages/MenuPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ProfilePage from './pages/ProfilePage';
import TicketsPage from './pages/TicketsPage';
import AdminPage from './pages/AdminPage';

// Components
import Navigation from './components/Navigation';

function App() {
  useEffect(() => {
    // Initialiser Telegram Web App
    try {
      initTelegramApp();
      console.log('Telegram Web App initialized'); // Debug log
    } catch (error) {
      console.log('Pas dans Telegram, mode développement');
      // FIXME: Gérer mieux les erreurs d'initialisation
    }
  }, []);

  return (
    <Router>
      <div className="App min-h-screen bg-insane-black text-insane-white">
        <Navigation />
        
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/event/:id" element={<EventDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
