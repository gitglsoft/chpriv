import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { initFirebase } from "./firebase.js";

async function startApp() {
    await initFirebase();
    const startupDiv = document.getElementById("startup"), chatContainer = document.getElementById("chatContainer"), nicknameInput = document.getElementById("nickname"), messageInput = document.getElementById("messageInput"), sendBtn = document.getElementById("sendBtn"), messagesDiv = document.getElementById("messages"), otherInfo = document.getElementById("otherInfo"), emojiBtn = document.getElementById("emojiBtn"), emojiPicker = document.getElementById("emojiPicker");

    const getRoomId = () => { let r = window.location.hash.split("#room=")[1]; if (!r) { r = localStorage.getItem("myRoomId") || `${Math.floor(100+Math.random()*900)}`; localStorage.setItem("myRoomId", r); } return r; };

    // Gestione Titolo Dinamico
    const resetTitle = () => { document.title = "ChPriv"; };
    window.addEventListener("focus", resetTitle); // Resetta quando torni sulla scheda

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        await addDoc(collection(window.chpriv.db, "messages", getRoomId(), "list"), { text, sender: nicknameInput.value.trim(), createdAt: serverTimestamp() });
        messageInput.value = "";
        remove(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`));
    }

    async function joinRoom(roomId, role, nickname) {
        window.myRole = role;
        otherInfo.textContent = nickname || "In attesa...";
        
        const roomRef = ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);
        onDisconnect(roomRef).remove();
        set(roomRef, { nickname, joinedAt: Date.now() });
        startupDiv.classList.add("hidden");
        chatContainer.classList.remove("hidden");
        window.location.hash = `#room=${roomId}`;
        
        // Listener per Digitazione
        onValue(ref(window.chpriv.rtdb, `typing/${roomId}`), (snap) => {
            const typing = snap.val() || {};
            const isTyping = Object.keys(typing).some(k => k !== window.myRole);
            otherInfo.textContent = isTyping ? "Sta scrivendo..." : (nickname || "In attesa...");
            document.title = isTyping ? "(Sta scrivendo...)" : "ChPriv";
        });

        // Listener per Messaggi
        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added" && !change.doc.metadata.hasPendingWrites) {
                    const data = change.doc.data();
                    const isMy = (data.sender.trim().toLowerCase() === nickname.trim().toLowerCase());
                    const time = data.createdAt ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const msgEl = document.createElement("div");
                    msgEl.className = `message ${isMy ? 'sent' : 'received'}`;
                    
                    if (!isMy) {
                        msgEl.innerHTML = `<span class="msg-sender">${data.sender}</span><div class="msg-content"><span class="blur-text">Messaggio criptato</span><button class="read-btn">Leggi</button></div>`;
                        msgEl.querySelector(".read-btn").onclick = (e) => {
                            e.target.parentElement.innerHTML = `<span class="msg-text">${data.text}</span><span class="msg-time">${time}</span>`;
                            setTimeout(() => msgEl.remove(), 10000);
                        };
                        document.title = "(New)"; // Alert Nuovo Messaggio
                    } else {
                        msgEl.innerHTML = `<span class="msg-sender">Tu</span><div class="msg-content"><span class="msg-text">${data.text}</span><span class="msg-time">${time}</span></div>`;
                    }
                    messagesDiv.appendChild(msgEl);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            });
        });
    }

    document.getElementById("btnCreateRoom").onclick = async () => { await joinRoom(getRoomId(), "user1", nicknameInput.value.trim()); };
    document.getElementById("btnJoinRoom").onclick = async () => { await joinRoom(getRoomId(), "user2", nicknameInput.value.trim()); };
    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(); };
    emojiBtn.onclick = () => emojiPicker.classList.toggle("hidden");
    emojiPicker.querySelectorAll('span').forEach(e => e.onclick = () => { messageInput.value += e.textContent; emojiPicker.classList.add("hidden"); });
    document.getElementById("clearBtn").onclick = async () => { const s = await getDocs(collection(window.chpriv.db, "messages", getRoomId(), "list")); s.forEach(d => deleteDoc(doc(window.chpriv.db, "messages", getRoomId(), "list", d.id))); messagesDiv.innerHTML = ""; };
    document.getElementById("copyLinkBtn").onclick = () => { navigator.clipboard.writeText(window.location.href); alert("Link copiato!"); };
    document.getElementById("exitBtn").onclick = () => { window.location.hash = ""; window.location.reload(); };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp); else startApp();
