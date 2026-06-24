import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ref, set, get, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { initFirebase } from "./firebase.js";

async function initializeApp() {
    if (window.appInitialized) return;
    window.appInitialized = true;
    
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
          clearBtn = document.getElementById("clearBtn");

    const generateCustomId = () => `${Math.floor(100 + Math.random() * 900)}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;

    const getRoomId = () => {
        let roomId = window.location.hash.split("#room=")[1];
        if (!roomId) {
            roomId = localStorage.getItem("myRoomId") || generateCustomId();
            localStorage.setItem("myRoomId", roomId);
        }
        return roomId;
    };

    async function joinRoom(roomId, role, nickname) {
        const roomRef = ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);
        
        // Correzione: utilizzo della funzione importata direttamente
        onDisconnect(roomRef).remove(); 
        await set(roomRef, { nickname });
        
        startMessageListener(roomId);
        showChat(roomId);
    }

    function showChat(roomId) {
        startupDiv.classList.add("hidden");
        chatContainer.classList.remove("hidden");
        window.location.hash = `#room=${roomId}`;
    }

    function startMessageListener(roomId) {
        // Ascolto presenza
        onValue(ref(window.chpriv.rtdb, `presence/${roomId}`), (snapshot) => {
            const presenceData = snapshot.val() || {};
            window.isChatPrivate = (Object.keys(presenceData).length < 2);
        });

        // Ascolto messaggi
        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    renderMessage(data, change.doc.id, roomId);
                }
            });
        });
    }

    function renderMessage(data, docId, roomId) {
        const msgEl = document.createElement("div");
        msgEl.className = "message";
        const isMyMessage = (data.sender === nicknameInput.value.trim());

        if (!window.isChatPrivate || isMyMessage) {
            msgEl.innerHTML = `<span><b>${isMyMessage ? "Tu" : data.sender}:</b> ${data.text}</span>`;
        } else {
            msgEl.innerHTML = `<span><b>${data.sender}:</b> </span><span class="blur-text">[Messaggio Criptato]</span>`;
            const readBtn = document.createElement("button");
            readBtn.textContent = "Leggi";
            readBtn.onclick = () => {
                msgEl.querySelector(".blur-text").textContent = data.text;
                msgEl.querySelector(".blur-text").style.filter = "none";
                readBtn.style.display = "none";
                setTimeout(async () => {
                    msgEl.remove();
                    try { await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", docId)); } catch (e) {}
                }, 3000);
            };
            msgEl.appendChild(readBtn);
        }
        messagesDiv.appendChild(msgEl);
    }

    // Event Listeners
    btnCreateRoom.addEventListener("click", async () => {
        const nickname = nicknameInput.value.trim();
        if (!nickname) return alert("Inserisci nickname!");
        const newRoomId = generateCustomId();
        localStorage.setItem("myRoomId", newRoomId);
        await joinRoom(newRoomId, "user1", nickname);
    });

    btnJoinRoom.addEventListener("click", async () => {
        const nickname = nicknameInput.value.trim();
        const roomId = getRoomId();
        const snapshot = await get(ref(window.chpriv.rtdb, `presence/${roomId}`));
        const data = snapshot.exists() ? snapshot.val() : {};
        let role = !data.user1 ? "user1" : !data.user2 ? "user2" : null;
        
        if (!role && !confirm("Stanza piena. Vuoi forzare l'ingresso?")) return;
        await joinRoom(roomId, role || "user1", nickname);
    });

    async function sendMessage() {
        const text = messageInput.value.trim(), roomId = getRoomId();
        if (!text || !roomId) return;
        await addDoc(collection(window.chpriv.db, "messages", roomId, "list"), {
            text, sender: nicknameInput.value.trim(), createdAt: serverTimestamp()
        });
        messageInput.value = "";
    }

    sendBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
    copyLinkBtn.addEventListener("click", () => { navigator.clipboard.writeText(window.location.href); alert("Link copiato!"); });
    exitBtn.addEventListener("click", () => { window.location.hash = ""; window.location.reload(); });
}

initializeApp();
