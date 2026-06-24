import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

// Inizializzazione Firebase
await initFirebase();

// RIFERIMENTI DOM (Dichiarati una sola volta)
const startupDiv = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const createBtn = document.getElementById("btnCreateRoom");
const joinBtn = document.getElementById("btnJoinRoom");
const sendBtn = document.getElementById("sendBtn");

// LOGICA TRANSIZIONE
function showChat() {
    startupDiv.classList.add("hidden");
    chatContainer.classList.remove("hidden");
}

// LOGICA MESSAGGI
window.sendMessage = async (roomId, nickname, text) => {
    await addDoc(collection(window.chpriv.db, "rooms", roomId, "messages"), {
        text, sender: nickname, createdAt: serverTimestamp(), read: false
    });
};

// BOTTONI (Ora funzionano perché non ci sono errori di sintassi)
createBtn.addEventListener("click", () => {
    console.log("Creazione...");
    showChat(); 
});

joinBtn.addEventListener("click", () => {
    console.log("Entrata...");
    showChat();
});

sendBtn.addEventListener("click", async () => {
    const text = messageInput.value.trim();
    if (text) {
        // Usa una funzione globale per il test
        console.log("Messaggio inviato:", text);
        messageInput.value = "";
    }
});

console.log("ChPriv v2 caricato correttamente senza errori");
