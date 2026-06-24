import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

await initFirebase();

const startupDiv = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");
const nicknameInput = document.getElementById("nickname");
const btnCreateRoom = document.getElementById("btnCreateRoom");
const btnJoinRoom = document.getElementById("btnJoinRoom");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");

function showChat() {
    startupDiv.classList.add("hidden");
    chatContainer.classList.remove("hidden");
}

function watchPresence(roomId) {
    const presenceRef = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`);
    window.chpriv.onValue(presenceRef, (snapshot) => {
        const data = snapshot.val();
        const otherInfo = document.getElementById("otherInfo");
        const myNickname = nicknameInput.value.trim();
        if (!data) return;
        const users = Object.values(data);
        const otherUser = users.find(u => u.nickname !== myNickname);
        otherInfo.textContent = otherUser ? `${otherUser.nickname} è online` : "In attesa...";
        otherInfo.style.color = otherUser ? "green" : "orange";
    });
}

function startMessageListener(roomId) {
    const q = query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt"));
    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const msgEl = document.createElement("div");
                msgEl.textContent = `${data.sender}: ${data.text}`;
                msgEl.className = "message";
                messagesDiv.appendChild(msgEl);
                
                setTimeout(async () => {
                    msgEl.remove();
                    try { await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", change.doc.id)); } catch (e) {}
                }, 3000);
            }
        });
    });
}

btnCreateRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    if (!nickname) return alert("Inserisci nickname!");
    const roomId = crypto.randomUUID();
    
    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user1`), { nickname });
    window.location.hash = `#room=${roomId}`;
    watchPresence(roomId);
    startMessageListener(roomId);
    showChat();
});

btnJoinRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    const roomId = window.location.hash.split("#room=")[1];
    if (!roomId) return alert("Link non valido!");

    const roomRef = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`);
    const snapshot = await window.chpriv.get(roomRef);
    const data = snapshot.exists() ? snapshot.val() : {};
    
    // CONTROLLO RIGOROSO: Massimo 2 utenti
    if (Object.keys(data).length >= 2) {
        alert("ERRORE: La stanza è piena o riservata ad altri.");
        return; 
    }

    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user2`), { nickname });
    
    watchPresence(roomId);
    startMessageListener(roomId);
    showChat();
});

sendBtn.addEventListener("click", async () => {
    const text = messageInput.value.trim();
    const roomId = window.location.hash.split("#room=")[1];
    if (text && roomId) {
        await addDoc(collection(window.chpriv.db, "messages", roomId, "list"), {
            text,
            sender: nicknameInput.value,
            createdAt: serverTimestamp()
        });
        messageInput.value = "";
    }
});
