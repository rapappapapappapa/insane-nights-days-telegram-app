// Configuration Telegram Web App
window.Telegram = {
  WebApp: {
    ready: function() {
      console.log('Telegram Web App ready');
    },
    setHeaderColor: function(color) {
      console.log('Header color set to:', color);
    },
    setBackgroundColor: function(color) {
      console.log('Background color set to:', color);
    },
    MainButton: {
      text: 'Connecter Wallet',
      show: function() {
        console.log('Main button shown');
      },
      hide: function() {
        console.log('Main button hidden');
      },
      setText: function(text) {
        this.text = text;
        console.log('Main button text set to:', text);
      },
      setParams: function(params) {
        console.log('Main button params set:', params);
      },
      onClick: function(callback) {
        console.log('Main button click handler set');
      }
    },
    initDataUnsafe: {
      user: {
        id: 123456789,
        first_name: 'User',
        last_name: 'Demo',
        username: 'userdemo',
        language_code: 'fr'
      }
    }
  }
};
