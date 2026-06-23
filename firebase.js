import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

console.log("firebase.js caricato");

const firebaseConfig = {
  apiKey: "AIzaSyCg-Q8z5ihQxuDtQpTnaq9zYmUwI5on6lg",
  authDomain: "chpriv-8a3da.firebaseapp.com",
  projectId: "chpriv-8a3da",
  storageBucket: "chpriv-8a3da.firebasestorage.app",
  messagingSenderId: "223253663510",
  appId: "1:223253663510:web:937363ccd29bed772dca37"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);

try {

  await signInAnonymously(auth);

  console.log("Login anonimo riuscito");

} catch (error) {

  console.error("Errore login anonimo:", error);

}

window.chpriv = {
  app,
  auth,
  db,
  rtdb,
  ref,
  set,
  get,
  remove,
  onValue
};

console.log("window.chpriv creato");
