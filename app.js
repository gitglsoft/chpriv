import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ref, set, get, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { initFirebase } from "./firebase.js";

async function startApp() {
    await initFirebase();
    const startupDiv = document.getElementById("startup"), chatContainer = document.getElementById("chatContainer"), nicknameInput = document.getElementById("nickname"), btnCreateRoom = document.getElementById("btnCreateRoom"), btnJoinRoom = document.getElementById("btnJoinRoom"), messageInput = document.getElementById("messageInput"), sendBtn = document.getElementById("sendBtn"), messagesDiv = document.getElementById("messages"), copyLinkBtn = document.getElementById("copyLinkBtn"), exitBtn = document.getElementById("exitBtn"), clearBtn = document.getElementById("clearBtn"), otherInfo = document.getElementById("otherInfo"), emojiBtn = document.getElementById("emojiBtn"), emojiPicker = document.getElementById("emojiPicker");

    const isOnlyEmoji = (text) => {
        const cleanText = text.trim();
        if (cleanText === "") return false;
        const emojiRegex = /^\p{Emoji_Presentation}+$/u;
        return emojiRegex.test(cleanText);
    };

    const getRoomId = () => { let r = window.location.hash.split("#room=")[1]; if (!r) { r = localStorage.getItem("myRoomId") || `${Math.floor(100+Math.random()*900)}`; localStorage.setItem("myRoomId", r); } return r; };

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        await addDoc(collection(window.chpriv.db, "messages", getRoomId(), "list"), { text, sender: nicknameInput.value.trim(), createdAt: serverTimestamp() });
        messageInput.value = "";
    }

    async function joinRoom(roomId, role, nickname) {
        window.myRole = role;
        const roomRef = ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);
        window.chpriv.onDisconnect(roomRef).remove();
        await window.chpriv.set(roomRef, { nickname, joinedAt: Date.now() });
        startupDiv.classList.add("hidden");
        chatContainer.classList.remove("hidden");
        window.location.hash = `#room=${roomId}`;
        startMessageListener(roomId, nickname);
    }

    function startMessageListener(roomId, myNickname) {
        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const isMy = (data.sender.trim().toLowerCase() === myNickname.trim().toLowerCase());
                    
                    // Logica orario: se createdAt è null (messaggio appena inviato), usa l'orario locale
                    const time = data.createdAt ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const msgEl = document.createElement("div");
                    msgEl.className = `message ${isMy ? 'sent' : 'received'}`;
                    const emojiClass = isOnlyEmoji(data.text) ? ' emoji-only' : '';
                    
                    // Inserimento corretto nel DOM
                    msgEl.innerHTML = `<span class="msg-sender">${isMy ? "Tu" : data.sender}</span><span class="msg-text${emojiClass}">${data.text}</span><span class="msg-time">${time}</span>`;
                    
                    messagesDiv.appendChild(msgEl);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            });
        });
    }

    btnCreateRoom.onclick = async () => { await joinRoom(getRoomId(), "user1", nicknameInput.value.trim()); };
    btnJoinRoom.onclick = async () => { await joinRoom(getRoomId(), "user2", nicknameInput.value.trim()); };
    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(); };
    emojiBtn.onclick = () => emojiPicker.classList.toggle("hidden");
    emojiPicker.querySelectorAll('span').forEach(e => e.onclick = () => { messageInput.value += e.textContent; emojiPicker.classList.add("hidden"); });
    clearBtn.onclick = async () => { const s = await getDocs(collection(window.chpriv.db, "messages", getRoomId(), "list")); s.forEach(d => deleteDoc(doc(window.chpriv.db, "messages", getRoomId(), "list", d.id))); messagesDiv.innerHTML = ""; };
    copyLinkBtn.onclick = () => { navigator.clipboard.writeText(window.location.href); alert("Link copiato!"); };
    exitBtn.onclick = () => { window.location.hash = ""; window.location.reload(); };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp); else startApp();
