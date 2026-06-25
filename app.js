import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ref, set, get, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { initFirebase } from "./firebase.js";

async function startApp() {
    await initFirebase();

    const startupDiv = document.getElementById("startup"),
          chatContainer = document.getElementById("chatContainer"),
          nicknameInput = document.getElementById("nickname"),
          btnCreateRoom = document.getElementById("btnCreateRoom"),
          btnJoinRoom = document.getElementById("btnJoinRoom"),
          messageInput = document.getElementById("messageInput"),
          sendBtn = document.getElementById("sendBtn"),
          messagesDiv = document.getElementById("messages"),
          copyLinkBtn = document.getElementById("copyLinkBtn"),
          exitBtn = document.getElementById("exitBtn"),
          clearBtn = document.getElementById("clearBtn"),
          otherInfo = document.getElementById("otherInfo"),
          emojiBtn = document.getElementById("emojiBtn"),
          emojiPicker = document.getElementById("emojiPicker");

    const generateCustomId = () => `${Math.floor(100 + Math.random() * 900)}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;
    const getRoomId = () => {
        let roomId = window.location.hash.split("#room=")[1];
        if (!roomId) { roomId = localStorage.getItem("myRoomId") || generateCustomId(); localStorage.setItem("myRoomId", roomId); }
        return roomId;
    };

    async function sendMessage() {
        const text = messageInput.value.trim();
        if (!text) return;
        await addDoc(collection(window.chpriv.db, "messages", getRoomId(), "list"), { 
            text, sender: nicknameInput.value.trim(), createdAt: serverTimestamp() 
        });
        messageInput.value = "";
    }

    async function joinRoom(roomId, role, nickname) {
        const roomRef = ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);
        window.chpriv.onDisconnect(roomRef).remove(); 
        await window.chpriv.set(roomRef, { nickname, joinedAt: Date.now() });
        startupDiv.classList.add("hidden");
        chatContainer.classList.remove("hidden");
        window.location.hash = `#room=${roomId}`;
        startMessageListener(roomId, nickname);
    }

    function startMessageListener(roomId, myNickname) {
        window.chpriv.onValue(ref(window.chpriv.rtdb, `presence/${roomId}`), (snapshot) => {
            const presenceData = snapshot.val() || {};
            const users = Object.entries(presenceData);
            window.isChatPrivate = (users.length < 2);
            const otherUser = users.find(([role, data]) => data.nickname.trim().toLowerCase() !== myNickname.trim().toLowerCase());
            otherInfo.textContent = otherUser ? `Connesso: ${otherUser[1].nickname}` : "In attesa...";
        });

        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const isMyMessage = (data.sender.trim().toLowerCase() === myNickname.trim().toLowerCase());
                    const time = data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                    const msgEl = document.createElement("div");
                    msgEl.className = `message ${isMyMessage ? 'sent' : 'received'}`;
                    
                    if (!window.isChatPrivate || isMyMessage) {
                        msgEl.innerHTML = `<span class="msg-sender">${isMyMessage ? "Tu" : data.sender}</span><span class="msg-text">${data.text}</span><span class="msg-time">${time}</span>`;
                    } else {
                        msgEl.innerHTML = `<span class="msg-sender">${data.sender}</span><span class="blur-text">[Criptato]</span><button class="read-btn">Leggi</button><span class="msg-time">${time}</span>`;
                        msgEl.querySelector(".read-btn").onclick = (e) => {
                            e.target.parentElement.querySelector(".blur-text").textContent = data.text;
                            e.target.parentElement.querySelector(".blur-text").style.filter = "none";
                            e.target.style.display = "none";
                            setTimeout(async () => { try { await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", change.doc.id)); } catch (e) {} }, 3000);
                        };
                    }
                    messagesDiv.appendChild(msgEl);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            });
        });
    }

    // --- EVENT LISTENERS ---
    btnCreateRoom.onclick = async () => { if(!nicknameInput.value.trim()) return alert("Inserisci nickname!"); const id = generateCustomId(); localStorage.setItem("myRoomId", id); await joinRoom(id, "user1", nicknameInput.value.trim()); };
    btnJoinRoom.onclick = async () => { if(!nicknameInput.value.trim()) return alert("Inserisci nickname!"); const id = getRoomId(); const s = await window.chpriv.get(ref(window.chpriv.rtdb, `presence/${id}`)); const d = s.exists() ? s.val() : {}; await joinRoom(id, !d.user1 ? "user1" : "user2", nicknameInput.value.trim()); };
    
    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(); };
    
    emojiBtn.onclick = () => emojiPicker.classList.toggle("hidden");
    emojiPicker.querySelectorAll('span').forEach(emoji => {
        emoji.onclick = () => { messageInput.value += emoji.textContent; emojiPicker.classList.add("hidden"); };
    });

    clearBtn.onclick = async () => { const s = await getDocs(collection(window.chpriv.db, "messages", getRoomId(), "list")); s.forEach(async (d) => await deleteDoc(doc(window.chpriv.db, "messages", getRoomId(), "list", d.id))); messagesDiv.innerHTML = ""; alert("Chat svuotata!"); };
    copyLinkBtn.onclick = () => { navigator.clipboard.writeText(window.location.href); alert("Link copiato!"); };
    exitBtn.onclick = () => { window.location.hash = ""; window.location.reload(); };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp); else startApp();
