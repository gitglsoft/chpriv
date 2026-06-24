import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

if (!window.appInitialized) {
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

    function generateCustomId() {
        const numbers = Math.floor(100 + Math.random() * 900);
        const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
        return `${numbers}${letter}`;
    }

    function getRoomId() {
        let roomId = window.location.hash.split("#room=")[1];
        if (!roomId) {
            roomId = localStorage.getItem("myRoomId") || generateCustomId();
            localStorage.setItem("myRoomId", roomId);
        }
        return roomId;
    }

    // NUOVA FUNZIONE: Registra la presenza con auto-disconnessione
    async function joinRoom(roomId, role, nickname) {
        const ref = window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);
        // Imposta la rimozione automatica se l'utente chiude la pagina
        window.chpriv.onDisconnect(ref).remove(); 
        await window.chpriv.set(ref, { nickname });
        startMessageListener(roomId);
        showChat(roomId);
    }

    function showChat(roomId) { startupDiv.classList.add("hidden"); chatContainer.classList.remove("hidden"); window.location.hash = `#room=${roomId}`; }

    async function startMessageListener(roomId) {
        window.chpriv.onValue(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`), (snapshot) => {
            const presenceData = snapshot.val() || {};
            window.isChatPrivate = (Object.keys(presenceData).length < 2); 
        });

        onSnapshot(query(collection(window.chpriv.db, "messages", roomId, "list"), orderBy("createdAt")), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data(), msgEl = document.createElement("div"); 
                    msgEl.className = "message";
                    const isMyMessage = (data.sender === nicknameInput.value.trim());

                    if (!window.isChatPrivate) {
                        msgEl.innerHTML = `<span><b>${data.sender}:</b> ${data.text}</span>`;
                        messagesDiv.appendChild(msgEl);
                    } else if (isMyMessage) {
                        msgEl.innerHTML = `<span><b>Tu:</b> ${data.text}</span>`;
                        messagesDiv.appendChild(msgEl);
                    } else {
                        msgEl.innerHTML = `<span><b>${data.sender}:</b> </span><span class="blur-text">[Messaggio Criptato]</span>`;
                        const readBtn = document.createElement("button"); 
                        readBtn.textContent = "Leggi";
                        readBtn.style.marginLeft = "10px";
                        readBtn.onclick = () => {
                            msgEl.querySelector(".blur-text").textContent = data.text;
                            msgEl.querySelector(".blur-text").style.filter = "none";
                            readBtn.style.display = "none";
                            setTimeout(async () => {
                                msgEl.remove();
                                try { await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", change.doc.id)); } catch (e) {}
                            }, 3000);
                        };
                        msgEl.appendChild(readBtn);
                        messagesDiv.appendChild(msgEl);
                    }
                }
            });
        });
    }

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
        const snapshot = await window.chpriv.get(window.chpriv.ref(window.chpriv.rtdb, `presence/${roomId}`));
        const data = snapshot.exists() ? snapshot.val() : {};
        
        // Se la stanza risulta piena, aggiungiamo un tasto di emergenza per forzare l'ingresso
        let role = !data.user1 ? "user1" : !data.user2 ? "user2" : null;
        if (!role) {
            const force = confirm("Stanza sembra piena (forse un vecchio utente è rimasto connesso). Vuoi forzare l'ingresso?");
            if (force) role = "user1"; else return;
        }
        await joinRoom(roomId, role, nickname);
    });

    clearBtn.addEventListener("click", async () => {
        const roomId = getRoomId();
        const snapshot = await getDocs(query(collection(window.chpriv.db, "messages", roomId, "list")));
        snapshot.forEach(async (d) => await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", d.id)));
        messagesDiv.innerHTML = "";
    });

    sendBtn.addEventListener("click", sendMessage);
    messageInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });
    copyLinkBtn.addEventListener("click", () => { navigator.clipboard.writeText(window.location.href); alert("Link copiato!"); });
    exitBtn.addEventListener("click", async () => { window.location.hash = ""; window.location.reload(); });

    async function sendMessage() {
        const text = messageInput.value.trim(), roomId = getRoomId();
        if (text && roomId) { 
            await addDoc(collection(window.chpriv.db, "messages", roomId, "list"), { 
                text, sender: nicknameInput.value.trim(), createdAt: serverTimestamp() 
            }); 
            messageInput.value = ""; 
        }
    }
}
