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

    const originalTitle = document.title;
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
            text, 
            sender: nicknameInput.value.trim(), 
            createdAt: serverTimestamp() 
        });
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
        window.chpriv.onValue(ref(window.chpriv.rtdb, `presence/${roomId}`), (snapshot) => {
            const presenceData = snapshot.val() || {};
            const users = Object.entries(presenceData);
            
            // "Filtro di ferro": prendiamo chiunque abbia un ruolo diverso dal nostro
            const otherUserEntry = users.find(([role, data]) => role !== window.myRole);
            
            window.isChatPrivate = (users.length < 2);
            
            if (otherUserEntry && otherUserEntry[1] && otherUserEntry[1].nickname) {
                const otherNickname = otherUserEntry[1].nickname;
                otherInfo.innerHTML = `<span class="status-connected">Connesso:</span> <span class="status-nickname">${otherNickname}</span>`;
            } else {
                otherInfo.innerHTML = `<span class="status-waiting">In attesa...</span>`;
            }
        });

        window.onfocus = () => { document.title = originalTitle; };

        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    const isMyMessage = (data.sender.trim().toLowerCase() === myNickname.trim().toLowerCase());
                    
                    if (!isMyMessage && document.hidden) {
                        document.title = "● Nuovo Messaggio!";
                    }

                    const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
                    const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    const msgEl = document.createElement("div");
                    msgEl.className = `message ${isMyMessage ? 'sent' : 'received'}`;
                    
                    if (window.isChatPrivate && !isMyMessage) {
                        msgEl.innerHTML = `
                            <span class="msg-sender">${data.sender}</span>
                            <span class="blur-text">[Criptato]</span>
                            <button class="read-btn">Leggi</button>
                            <span class="msg-time">${time}</span>
                        `;
                        const readBtn = msgEl.querySelector(".read-btn");
                        const blurSpan = msgEl.querySelector(".blur-text");
                        readBtn.onclick = () => {
                            blurSpan.textContent = data.text;
                            blurSpan.style.filter = "none";
                            readBtn.style.display = "none";
                            const deleteBtn = document.createElement("button");
                            deleteBtn.textContent = "Cancella subito";
                            deleteBtn.className = "delete-msg-btn";
                            msgEl.appendChild(deleteBtn);
                            const deleteAction = async () => {
                                msgEl.remove();
                                try { await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", change.doc.id)); } catch (e) {}
                            };
                            deleteBtn.onclick = deleteAction;
                            setTimeout(deleteAction, 10000);
                        };
                    } else {
                        msgEl.innerHTML = `
                            <span class="msg-sender">${isMyMessage ? "Tu" : data.sender}</span>
                            <span class="msg-text">${data.text}</span>
                            <span class="msg-time">${time}</span>
                        `;
                    }
                    messagesDiv.appendChild(msgEl);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            });
        });
    }

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
