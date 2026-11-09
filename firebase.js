// Importeer Firebase en Firestore via de officiële web-SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Jouw unieke configuratie-sleutels uit de Firebase console
const firebaseConfig = {
  apiKey: "JOUW_API_KEY",
  authDomain: "borgo-antico-website.firebaseapp.com",
  projectId: "borgo-antico-website",
  storageBucket: "borgo-antico-website.firebasestorage.app",
  messagingSenderId: "93359301533",
  appId: "1:93359301533:web:dddcec172594d5f89c574"
};

// Initialiseer Firebase en Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);