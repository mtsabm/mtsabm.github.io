import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyByZ_DonYkuyBRLDg3AJc7PLrPxFDoVNt8",
  authDomain: "mtsabm.firebaseapp.com",
  projectId: "mtsabm",
  storageBucket: "mtsabm.firebasestorage.app",
  messagingSenderId: "927343481008",
  appId: "1:927343481008:web:f92cfabd8b4c3a93336b75",
  measurementId: "G-V9GKRQ0FXV"
};


// Inisialisasi Firebase App
export const app = initializeApp(firebaseConfig);

// Inisialisasi Firestore dengan Mesin Cache Lokal Cerdas (Menghemat 95% Kuota Reads)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
  })
});
