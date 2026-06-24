import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getDatabase, ref, set, get, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCg-Q8z5ihQxuDtQpTnaq9zYmUwI5on6lg",
  authDomain: "chpriv-8a3da.firebaseapp.com",
  projectId: "chpriv-8a3da",
  storageBucket: "chpriv-8a3da.firebasestorage.app",
  messagingSenderId: "223253663510",
  appId: "1:223253663510:web:937363ccd29bed772dca37"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app, "https://chpriv-8a3da-default-rtdb.europe-west1.firebasedatabase.app");

export async function initFirebase() {
  await signInAnonymously(auth);
  console.log("Firebase inizializzato correttamente");
}

// Esponiamo le funzioni necessarie per app.js
window.chpriv = { db, rtdb, ref, set, get, onValue, onDisconnect };
