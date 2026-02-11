export const environment = {
  production: false,
  firebase: {
    projectId: 'appnotesbg-app',
    appId: '1:415799897374:web:65eeae15fe899f18f0ed0f',
    storageBucket: 'appnotesbg-app.firebasestorage.app',
    apiKey: 'AIzaSyB2wvjmw4GE_ZKOuJ9-s0g2E5G4ZTS1fmA',
    authDomain: 'appnotesbg-app.firebaseapp.com',
    messagingSenderId: '415799897374',
  },
  algolia: {
    appId: '',        // TODO: completar con Algolia App ID
    searchApiKey: '', // TODO: completar con Algolia Search-Only API Key
    indexName: 'notes_dev',
  },
  api: {
    baseUrl: 'http://localhost:3000/api/v1',
  },
};
