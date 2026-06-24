import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

await initFirebase();

const startupDiv = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");
const roomInfo = document.getElementById("roomInfo");
const nicknameInput = document.getElementById("nickname");
const btnCreateRoom = document.getElementById("btnCreateRoom");
const btnJoinRoom = document.getElementById("btnJoinRoom");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const messagesDiv = document.getElementById("messages");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const exitBtn = document.getElementById("exitBtn");

function showChat(roomId) {
    startupDiv.classList.add("hidden");
    chatContainer.classList.remove("hidden");
    window.location.hash = `#room=${roomId}`;
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
    watchPresence(roomId);
    startMessageListener(roomId);
    roomInfo.innerHTML = `Link: ${window.location.origin}${window.location.pathname}#room=${roomId}`;
    showChat(roomId);
});

btnJoinRoom.addEventListener("click", async () => {
    const nickname = nicknameInput.value.trim();
    const hash = window.location.hash;
    if (!hash.includes("#room=")) return alert("Link non valido!");
    const roomId = hash.split("#room=")[1];
    
    const snapshot = await window.chpriv.get(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`));
    const data = snapshot.exists() ? snapshot.val() : {};
    
    if (Object.keys(data).length >= 2) return alert("ERRORE: La stanza è piena.");
    
    await window.chpriv.set(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/user2`), { nickname });
    watchPresence(roomId);
    startMessageListener(roomId);
    showChat(roomId);
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

copyLinkBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copiato!");
});

exitBtn.addEventListener("click", () => {
    window.location.hash = "";
    window.location.reload();
});
