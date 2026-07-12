import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ref, set, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { initFirebase } from "./firebase.js";

async function startApp() {
    await initFirebase();
    const startupDiv = document.getElementById("startup"), chatContainer = document.getElementById("chatContainer"), nicknameInput = document.getElementById("nickname"), messageInput = document.getElementById("messageInput"), sendBtn = document.getElementById("sendBtn"), messagesDiv = document.getElementById("messages"), otherInfo = document.getElementById("otherInfo"), emojiBtn = document.getElementById("emojiBtn"), emojiPicker = document.getElementById("emojiPicker");

    const getRoomId = () => { let r = window.location.hash.split("#room=")[1]; if (!r) { r = localStorage.getItem("myRoomId") || `${Math.floor(100+Math.random()*900)}`; localStorage.setItem("myRoomId", r); } return r; };

    window.addEventListener("focus", () => { document.title = "ChPriv"; });

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        await addDoc(collection(window.chpriv.db, "messages", getRoomId(), "list"), { text, sender: nicknameInput.value.trim(), createdAt: serverTimestamp() });
        messageInput.value = "";
        remove(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`));
    }

    messageInput.oninput = () => {
        set(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`), true);
        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(() => remove(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`)), 3000);
    };

    async function joinRoom(roomId, role, nickname) {
        window.myRole = role;
        const otherRole = (role === "user1") ? "user2" : "user1";
        
        startupDiv.classList.add("hidden");
        chatContainer.classList.remove("hidden");
        window.location.hash = `#room=${roomId}`;

        // Imposta la presence quando entri nella stanza
        const presenceRef = ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);
        await set(presenceRef, { nickname, online: true });

        // Rimuovi la presence quando chiudi la pagina o ti disconnetti
        onDisconnect(presenceRef).remove();

        // Listener separato per lo stato di "typing" dell'altro
        onValue(ref(window.chpriv.rtdb, `typing/${roomId}/${otherRole}`), (snap) => {
            if (snap.val()) {
                otherInfo.textContent = "Sta scrivendo...";
                document.title = "(Sta scrivendo...)";
            } else {
                // Resetta il titolo quando l'altro smette di scrivere
                document.title = "ChPriv";
            }
        });

        // Listener separato per la presence dell'altro
        onValue(ref(window.chpriv.rtdb, `presence/${roomId}/${otherRole}`), (snap) => {
            const other = snap.val();
            if (!other) {
                otherInfo.textContent = "In attesa...";
                document.title = "ChPriv";
            } else {
                otherInfo.textContent = other.nickname;
            }
        });

        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const isMy = (data.sender.trim().toLowerCase() === nickname.toLowerCase());
                    const time = data.createdAt ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    const msgEl = document.createElement("div");
                    msgEl.className = `message ${isMy ? 'sent' : 'received'}`;
                    
                    if (!isMy) {
                        msgEl.innerHTML = `<span class="msg-sender">${data.sender}</span><div class="msg-content"><span class="blur-text">Messaggio criptato</span><button class="read-btn">Leggi</button></div>`;
                        msgEl.querySelector(".read-btn").onclick = (e) => {
                            e.target.parentElement.innerHTML = `<span class="msg-text">${data.text}</span><span class="msg-time">${time}</span>`;
                            setTimeout(() => msgEl.remove(), 10000);
                        };
                        document.title = "(New)";
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
