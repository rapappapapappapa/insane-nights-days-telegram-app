import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      // Simulation d'une adresse wallet TON
      const walletAddress = `EQ${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const username = `User_${walletAddress.slice(-6)}`;
      console.log('Debug: walletAddress généré:', walletAddress); // TODO: Supprimer ce log en prod
      
      // Appel à l'API backend
      const response = await fetch('http://172.20.10.7:5000/api/wallet/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          username
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Stocker les données utilisateur
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('sessionToken', data.sessionToken);
        
        // Afficher le message de succès
        alert(data.message);
        
        // Rediriger vers le menu principal
        setTimeout(() => {
          navigate('/menu');
        }, 1000);
      } else {
        alert('Erreur de connexion: ' + data.message);
      }
      
    } catch (error) {
      console.error('Erreur connexion wallet:', error);
      alert('Erreur de connexion au serveur');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-insane-black flex items-center justify-center px-4">
      <div className="text-center max-w-sm mx-auto">
        {/* Logo Insane */}
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-insane-orange rounded-2xl mb-8 shadow-2xl">
            <span className="text-insane-black font-black text-3xl">I</span>
          </div>
        </div>
        
        {/* Titre */}
        <div className={`transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-3xl font-black text-insane-white mb-4">
            Insane
            <span className="text-insane-orange"> Nights</span>
            <br />
            <span className="text-insane-orange">& Days</span>
          </h1>
          
          <p className="text-insane-white/70 mb-12 text-sm leading-relaxed">
            Révolutionnez l'industrie des événements avec la blockchain
          </p>
        </div>

        {/* Bouton Connecter Wallet */}
        <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className={`w-full font-bold py-4 px-8 rounded-2xl shadow-2xl transition-all duration-300 transform active:scale-95 text-lg ${
              isConnecting 
                ? 'bg-insane-gray text-insane-white cursor-not-allowed' 
                : 'bg-insane-orange text-insane-black hover:shadow-insane-orange/50 hover:scale-105'
            }`}
          >
            {isConnecting ? '🔄 Connexion...' : '💳 Connecter Wallet TON'}
          </button>
          
          <p className="text-insane-white/50 text-xs mt-4">
            Paiements sécurisés avec TON et Stars
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
