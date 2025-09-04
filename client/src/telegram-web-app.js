// Intégration Telegram Web App
import WebApp from '@twa-dev/sdk';

export const initTelegramApp = () => {
  // Initialiser l'app Telegram
  WebApp.ready();
  
  // Configurer le thème
  WebApp.setHeaderColor('#000000'); // Couleur Insane
  WebApp.setBackgroundColor('#000000');
  
  // Activer le bouton principal
  WebApp.MainButton.setText('Connecter Wallet');
  WebApp.MainButton.show();
  
  // Configurer les couleurs du bouton
  WebApp.MainButton.setParams({
    color: '#FF6B35', // Couleur Insane orange
    text_color: '#000000'
  });
  
  console.log('Telegram Web App initialisée');
  
  return WebApp;
};

export const showTelegramMainButton = (text, callback) => {
  WebApp.MainButton.setText(text);
  WebApp.MainButton.onClick(callback);
  WebApp.MainButton.show();
};

export const hideTelegramMainButton = () => {
  WebApp.MainButton.hide();
};

export const getUserData = () => {
  return {
    id: WebApp.initDataUnsafe?.user?.id,
    firstName: WebApp.initDataUnsafe?.user?.first_name,
    lastName: WebApp.initDataUnsafe?.user?.last_name,
    username: WebApp.initDataUnsafe?.user?.username,
    languageCode: WebApp.initDataUnsafe?.user?.language_code
  };
};
