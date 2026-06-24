import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

await initFirebase();

const startupDiv = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");
const roomInfo = document.getElementById("roomInfo");
const btnCreateRoom = document.getElementById("btnCreateRoom");
const btnJoinRoom = document.getElementById("btnJoinRoom");

// Funzione di utilità per cambiare schermata
function showChat() {
    startupDiv.classList.add("hidden");
    chatContainer.classList.remove("hidden");
}

// CREA STANZA
btnCreateRoom.addEventListener("click", async () => {
    const nickname = document.getElementById("nickname").value.trim();
    if (!nickname) return alert("Inserisci un nickname!");

    const roomId = crypto.randomUUID(); // Genera ID univoco
    
    // Scrive nel database che l'utente 1 è dentro
    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user1`), {
        nickname: nickname,
        joinedAt: Date.now()
    });

    // Mostra il link
    const roomLink = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    roomInfo.innerHTML = `Stanza creata! Copia questo link e invialo al tuo contatto:<br><br><b>${roomLink}</b>`;
    
    // Bottone per copiare
    navigator.clipboard.writeText(roomLink);
    alert("Link copiato negli appunti! Ora attendi l'altro utente.");
    showChat();
});

// ENTRA NELLA STANZA
btnJoinRoom.addEventListener("click", async () => {
    const nickname = document.getElementById("nickname").value.trim();
    const hash = window.location.hash;
    const roomId = hash.replace("#room=", "");

    if (!roomId) return alert("Devi usare un link valido per entrare!");
    
    const roomRef = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`);
    const snapshot = await window.chpriv.get(roomRef);
    const data = snapshot.exists() ? snapshot.val() : {};
    
    // Limite 2 persone
    if (Object.keys(data).length >= 2) {
        alert("ERRORE: Stanza piena o non autorizzata.");
        return;
    }

    // Aggiunge utente 2
    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user2`), {
        nickname: nickname,
        joinedAt: Date.now()
    });

    showChat();
});
