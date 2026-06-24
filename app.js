import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

// 1. Avvio iniziale
await initFirebase();

const startupDiv = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");
const roomInfo = document.getElementById("roomInfo");
const nicknameInput = document.getElementById("nickname");
const btnCreateRoom = document.getElementById("btnCreateRoom");
const btnJoinRoom = document.getElementById("btnJoinRoom");

// 2. Funzione per monitorare chi entra e mostrare il nome
function watchPresence(roomId) {
    const presenceRef = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`);
    window.chpriv.onValue(presenceRef, (snapshot) => {
        const data = snapshot.val();
        const otherInfo = document.getElementById("otherInfo");
        const myNickname = nicknameInput.value.trim();
        
        if (!data) return;
        
        const users = Object.values(data);
        const otherUser = users.find(u => u.nickname !== myNickname);
        
        if (otherUser) {
            otherInfo.textContent = otherUser.nickname + " è online";
            otherInfo.style.color = "green";
        } else {
            otherInfo.textContent = "In attesa dell'altro utente...";
            otherInfo.style.color = "orange";
        }
    });
}

// 3. Funzione transizione grafica
function showChat() {
    startupDiv.classList.add("hidden");
    chatContainer.classList.remove("hidden");
}

// 4. Bottone CREA
btnCreateRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return alert("Inserisci un nickname!");
    btnCreateRoom.disabled = true;

    const roomId = crypto.randomUUID();
    
    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user1`), {
        nickname: nickname,
        joinedAt: Date.now()
    });

    const roomLink = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    roomInfo.innerHTML = `Stanza creata! Link:<br><b>${roomLink}</b>`;
    
    await navigator.clipboard.writeText(roomLink);
    window.location.hash = `#room=${roomId}`;
    
    watchPresence(roomId);
    showChat();
});

// 5. Bottone ENTRA
btnJoinRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    const hash = window.location.hash;
    if (!hash.includes("#room=")) return alert("Devi incollare un link valido!");

    const roomId = hash.split("#room=")[1];
    const roomRef = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`);
    const snapshot = await window.chpriv.get(roomRef);
    const data = snapshot.exists() ? snapshot.val() : {};
    
    if (Object.keys(data).length >= 2) return alert("ERRORE: Stanza piena.");

    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user2`), {
        nickname: nickname,
        joinedAt: Date.now()
    });

    watchPresence(roomId);
    showChat();
});
