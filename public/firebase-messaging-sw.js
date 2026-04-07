importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyALWNC3HLTRcp6YEVlQNKS1mKftgV0iSFA",
  authDomain: "aura-market-web-95.firebaseapp.com",
  projectId: "aura-market-web-95",
  storageBucket: "aura-market-web-95.firebasestorage.app",
  messagingSenderId: "837014027574",
  appId: "1:837014027574:web:b2cc4971fe1520212ac797",
});

const messaging = firebase.messaging();

// Built-in FCM handling will automatically display push notifications in the background 
// since we include the 'notification' key in our API payload.
