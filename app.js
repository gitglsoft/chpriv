import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

// Inizializza subito
await initFirebase();

const startupDiv = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");
const roomInfo = document.getElementById("roomInfo");
const nicknameInput = document.getElementById("nickname");
const btnCreateRoom = document.getElementById("btnCreateRoom");
const btnJoinRoom = document.getElementById("btnJoinRoom");

function showChat() {
    startupDiv.classList.add("hidden");
    chatContainer.classList.remove("hidden");
}

// CREA CHAT
btnCreateRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return alert("Inserisci un nickname!");

    try {
        const roomId = crypto.randomUUID();
        console.log("Creazione stanza:", roomId);

        // 1. Salva in RTDB
        await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user1`), {
            nickname: nickname,
            joinedAt: Date.now()
        });

        // 2. Genera Link
        const roomLink = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
        
        // 3. Mostra a video
        roomInfo.innerHTML = `Stanza creata! Copia il link:<br><br><b>${roomLink}</b>`;
        
        // Copia automatica
        await navigator.clipboard.writeText(roomLink);
        alert("Link copiato! La chat si aprirà ora.");
        
        // 4. Salva il link nel browser per evitare l'errore "Link non valido"
        window.location.hash = `#room=${roomId}`;
        
        showChat();
    } catch (e) {
        console.error("Errore creazione:", e);
        alert("Errore: " + e.message);
    }
});

// ENTRA
btnJoinRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    const hash = window.location.hash;
    
    if (!hash.includes("#room=")) {
        alert("Devi prima incollare un link valido nella barra del browser!");
        return;
    }

    const roomId = hash.split("#room=")[1];
    
    try {
        const roomRef = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`);
        const snapshot = await window.chpriv.get(roomRef);
        const data = snapshot.exists() ? snapshot.val() : {};
        
        if (Object.keys(data).length >= 2) {
            alert("ERRORE: Stanza piena o non autorizzata.");
            return;
        }

        await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user2`), {
            nickname: nickname,
            joinedAt: Date.now()
        });

        showChat();
    } catch (e) {
        alert("Errore accesso: " + e.message);
    }
});
