importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "REDACTED_API_KEY",
    authDomain: "aura-market-web-95.firebaseapp.com",
    projectId: "aura-market-web-95",
    storageBucket: "aura-market-web-95.firebasestorage.app",
    messagingSenderId: "837014027574",
    appId: "1:837014027574:web:b2cc4971fe1520212ac797",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    const { title, body } = payload.notification;
    self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
    });
});