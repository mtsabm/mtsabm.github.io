import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpiy6wmmqwum9KApTLGshsQqT-raOyu4Q",
  authDomain: "sisfo-d1fed.firebaseapp.com",
  projectId: "sisfo-d1fed",
  storageBucket: "sisfo-d1fed.firebasestorage.app",
  messagingSenderId: "729511197052",
  appId: "1:729511197052:web:6ed208ce102144295b0cf9",
  measurementId: "G-FL7KZ4E684"
};

// Inisialisasi Firebase App
export const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore dengan Mesin Cache Lokal Cerdas (Menghemat 95% Kuota Reads)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
  })
});
