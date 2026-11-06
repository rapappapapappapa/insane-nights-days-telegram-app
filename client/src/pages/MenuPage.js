import React from 'react';
import { Link } from 'react-router-dom';

const MenuPage = () => {
  const menuItems = [
    {
      title: '🎵 Événements',
      description: 'Découvrir les événements',
      link: '/events',
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: '🎟️ Mes Tickets',
      description: 'Gérer mes tickets',
      link: '/tickets',
      color: 'from-green-500 to-blue-500'
    },
    {
      title: '🏆 Mon Profil',
      description: 'Voir mon profil',
      link: '/profile',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      title: '🎤 Classement DJ',
      description: 'Top des DJs',
      link: '/ranking',
      color: 'from-red-500 to-purple-500'
    },
    {
      title: '💳 Wallet',
      description: 'Gérer mon wallet',
      link: '/wallet',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: '⚙️ Paramètres',
      description: 'Configurer l\'app',
      link: '/settings',
      color: 'from-gray-500 to-slate-500'
    }
  ];

  return (
    <div className="min-h-screen bg-nox-black py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-nox-primary rounded-xl mb-4">
          <span className="text-nox-black font-black text-2xl">I</span>
        </div>
        <h1 className="text-2xl font-bold text-nox-white mb-2">
          Menu Principal
        </h1>
        <p className="text-nox-white/60 text-sm">
          Que voulez-vous faire ?
        </p>
      </div>

      {/* Menu Grid - 2 colonnes sur mobile */}
      <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
        {menuItems.map((item, index) => (
          <Link
            key={index}
            to={item.link}
            className="block"
          >
            <div className="bg-nox-gray border border-nox-primary/30 rounded-xl p-4 text-center h-32 flex flex-col items-center justify-center hover:border-nox-primary hover:bg-nox-primary/10 transition-all duration-300 active:scale-95">
              {/* Icon avec gradient */}
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br ${item.color} rounded-xl mb-3`}>
                <span className="text-xl">{item.title.split(' ')[0]}</span>
              </div>
              
              <h3 className="text-sm font-bold text-nox-white mb-1">
                {item.title.split(' ').slice(1).join(' ')}
              </h3>
              
              <p className="text-xs text-nox-white/60 leading-tight">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Bouton Déconnecter */}
      <div className="text-center mt-8">
        <button className="bg-nox-gray border border-nox-primary/30 text-nox-primary px-6 py-3 rounded-xl hover:bg-nox-primary hover:text-nox-black transition-all duration-300">
          🔌 Déconnecter Wallet
        </button>
      </div>
    </div>
  );
};

export default MenuPage;
