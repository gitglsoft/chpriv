import { collection, addDoc, serverTimestamp, query, onSnapshot, deleteDoc, doc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { ref, set, get, onValue, onDisconnect, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { initFirebase } from "./firebase.js";

/* ============================================================
   COSTANTI GLOBALI
   ============================================================ */
const TTL_MS = 12000;          // 12s senza heartbeat = offline
const HEARTBEAT_MS = 4000;     // rinfresca lastSeen ogni 4s
const PRESENCE_CHECK_MS = 3000; // rivaluta TTL ogni 3s

/* ============================================================
   UTILS
   ============================================================ */
function escapeHtml(text) {
    if (!text) return "";
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
}

async function startApp() {
    await initFirebase();

    const startupDiv = document.getElementById("startup"),
          chatContainer = document.getElementById("chatContainer"),
          nicknameInput = document.getElementById("nickname"),
          passwordInput = document.getElementById("password"),
          messageInput = document.getElementById("messageInput"),
          sendBtn = document.getElementById("sendBtn"),
          messagesDiv = document.getElementById("messages"),
          otherInfo = document.getElementById("otherInfo"),
          emojiBtn = document.getElementById("emojiBtn"),
          emojiPicker = document.getElementById("emojiPicker");

    const getRoomId = () => {
        let match = window.location.hash.match(/#room=([^&]+)/);
        if (match && match[1]) {
            return match[1];
        }
        let r = localStorage.getItem("myRoomId");
        if (!r) {
            r = Math.floor(100000 + Math.random() * 900000).toString();
            localStorage.setItem("myRoomId", r);
        }
        return r;
    };

    const emojiRegex = /^(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{200D}]|[\u{20E3}]|[\u{E0020}-\u{E007F}]|[\u{1F1E6}-\u{1F1FF}])+$/u;
    const isEmojiOnly = (text) => text ? emojiRegex.test(text.trim()) : false;

    window.addEventListener("focus", () => {
        window.hasNewMessage = false;
        if (window.myRole && window.otherNicknameOnline) {
            document.title = window.otherNicknameOnline;
        } else {
            document.title = "ChPriv";
        }
    });

    /* ============================================================
       INVIO MESSAGGI
       ============================================================ */
    async function sendMessage() {
        const text = messageInput.value.trim();
        const currentNickname = nicknameInput.value.trim();
        if (!text || !currentNickname) return;

        try {
            await addDoc(collection(window.chpriv.db, "messages", getRoomId(), "list"), {
                text,
                sender: currentNickname,
                createdAt: serverTimestamp()
            });
            messageInput.value = "";
            remove(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`));
        } catch (error) {
            console.error("Errore durante l'invio del messaggio:", error);
        }
    }

    messageInput.oninput = () => {
        if (!window.myRole) return;
        set(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`), true);
        clearTimeout(window.typingTimer);
        window.typingTimer = setTimeout(
            () => remove(ref(window.chpriv.rtdb, `typing/${getRoomId()}/${window.myRole}`)),
            1500
        );
    };

    /* ============================================================
       JOIN ROOM
       ============================================================ */
    async function joinRoom(role) {
        // Guard anti doppio-click
        if (window.joining) return;
        window.joining = true;

        try {
            const currentNickname = nicknameInput.value.trim();
            const password = passwordInput ? passwordInput.value.trim() : "";

            if (!currentNickname) {
                alert("Inserisci un nickname valido.");
                return;
            }

            const roomId = getRoomId();
            window.myRole = role;
            const otherRole = (role === "user1") ? "user2" : "user1";
            window.myNickname = currentNickname;

            // --- Verifica password stanza ---
            const roomMetaRef = ref(window.chpriv.rtdb, `rooms/${roomId}`);
            const snapMeta = await get(roomMetaRef);

            if (role === "user1") {
                if (!snapMeta.exists()) {
                    await set(roomMetaRef, { password: password });
                }
            } else {
                if (snapMeta.exists()) {
                    const roomData = snapMeta.val();
                    if (roomData.password && roomData.password !== password) {
                        alert("Password errata!");
                        return;
                    }
                }
            }

            startupDiv.classList.add("hidden");
            chatContainer.classList.remove("hidden");
            window.location.hash = `#room=${roomId}`;

            /* ============================================================
               PRESENZA CON HEARTBEAT + TTL
               ============================================================ */
            const uid = window.chpriv.auth.currentUser?.uid || Math.random().toString(36).slice(2);
            window.myUid = uid;

            const presenceRef = ref(window.chpriv.rtdb, `presence/${roomId}/${role}`);

            // 1. Scrittura iniziale
            await set(presenceRef, {
                nickname: currentNickname,
                online: true,
                uid: uid,
                lastSeen: Date.now()
            });

            // 2. onDisconnect: marca offline (NON remove)
            onDisconnect(presenceRef).set({
                nickname: currentNickname,
                online: false,
                uid: uid,
                lastSeen: Date.now()
            });
            onDisconnect(ref(window.chpriv.rtdb, `typing/${roomId}/${role}`)).remove();

            // 3. Heartbeat: rinfresca lastSeen ogni 4s
            if (window.heartbeatId) clearInterval(window.heartbeatId);
            window.heartbeatId = setInterval(() => {
                set(ref(window.chpriv.rtdb, `presence/${roomId}/${role}/lastSeen`), Date.now());
                set(ref(window.chpriv.rtdb, `presence/${roomId}/${role}/online`), true);
            }, HEARTBEAT_MS);

            // 4. Cleanup su chiusura pulita
            window.addEventListener("beforeunload", () => {
                clearInterval(window.heartbeatId);
                clearInterval(window.presenceWatchId);
                remove(presenceRef);
            });

            /* ============================================================
               STATO ALTRO UTENTE
               ============================================================ */
            let otherOnline = false;
            let otherTyping = false;
            let otherNickname = "";
            let otherSnapshotCache = null;

            function updateUI() {
                window.otherNicknameOnline = otherNickname;

                otherInfo.classList.remove("waiting", "connected", "typing");

                if (otherTyping && otherOnline) {
                    otherInfo.classList.add("typing");
                    otherInfo.textContent = `✍️ ${otherNickname} sta scrivendo...`;
                    document.title = `✍️ ${otherNickname} sta scrivendo... — ChPriv`;
                } else if (otherOnline) {
                    otherInfo.classList.add("connected");
                    otherInfo.textContent = `${otherNickname} connesso!`;
                    document.title = window.hasNewMessage
                        ? `💬 Nuovo messaggio — ChPriv`
                        : `🟢 ${otherNickname} online — ChPriv`;
                } else {
                    otherInfo.classList.add("waiting");
                    otherInfo.textContent = "In attesa...";
                    document.title = "ChPriv";
                }
            }

            /* ============================================================
               LISTENER TYPING
               ============================================================ */
            onValue(ref(window.chpriv.rtdb, `typing/${roomId}/${otherRole}`), (snap) => {
                otherTyping = !!snap.val();
                updateUI();
            });

            /* ============================================================
               LISTENER PRESENZA (con TTL)
               ============================================================ */
            onValue(ref(window.chpriv.rtdb, `presence/${roomId}/${otherRole}`), (snap) => {
                const other = snap.val();
                otherSnapshotCache = other;

                if (!other || !other.nickname) {
                    otherOnline = false;
                    otherNickname = "";
                } else {
                    const fresh = other.lastSeen && (Date.now() - other.lastSeen) < TTL_MS;
                    otherOnline = other.online === true && fresh;
                    otherNickname = other.nickname;
                }
                updateUI();
            });

            /* ============================================================
               WATCHDOG TTL (rivaluta presenza ogni 3s)
               ============================================================ */
            if (window.presenceWatchId) clearInterval(window.presenceWatchId);
            window.presenceWatchId = setInterval(() => {
                const other = otherSnapshotCache;
                if (!other) return;

                const fresh = other.lastSeen && (Date.now() - other.lastSeen) < TTL_MS;
                const newOnline = other.online === true && fresh;

                if (newOnline !== otherOnline) {
                    otherOnline = newOnline;
                    if (!otherNickname && other.nickname) otherNickname = other.nickname;
                    updateUI();
                }
            }, PRESENCE_CHECK_MS);

            /* ============================================================
               MESSAGGI (Firestore)
               ============================================================ */
            onSnapshot(collection(window.chpriv.db, "messages", roomId, "list"), (snapshot) => {
                messagesDiv.innerHTML = "";

                const docs = [];
                snapshot.forEach((docSnap) => {
                    docs.push({ id: docSnap.id, ...docSnap.data() });
                });

                docs.sort((a, b) => {
                    const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
                    const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
                    return timeA - timeB;
                });

                docs.forEach((data) => {
                    if (!data || !data.text) return;

                    const isMy = (data.sender && window.myNickname && data.sender.trim().toLowerCase() === window.myNickname.toLowerCase());
                    let time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                        time = data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    }

                    const msgEl = document.createElement("div");
                    msgEl.className = `message ${isMy ? 'sent' : 'received'}`;
                    const emojiClass = isEmojiOnly(data.text) ? ' emoji-large' : '';

                    if (!isMy) {
                        msgEl.innerHTML = `<span class="msg-sender">${escapeHtml(data.sender || "Anonimo")}</span><div class="msg-content"><span class="blur-text">Messaggio criptato</span><button class="read-btn">Leggi</button></div>`;
                        const readBtn = msgEl.querySelector(".read-btn");
                        if (readBtn) {
                            readBtn.onclick = (e) => {
                                const contentDiv = e.target.parentElement;
                                if (contentDiv) {
                                    contentDiv.innerHTML = `<span class="msg-text${emojiClass}">${escapeHtml(data.text)}</span><span class="msg-time">${time}</span>`;
                                    setTimeout(async () => {
                                        try {
                                            await deleteDoc(doc(window.chpriv.db, "messages", roomId, "list", data.id));
                                        } catch (err) {
                                            console.error("Errore cancellazione messaggio effimero:", err);
                                        }
                                    }, 10000);
                                }
                            };
                        }
                    } else {
                        msgEl.innerHTML = `<span class="msg-sender">Tu</span><div class="msg-content"><span class="msg-text${emojiClass}">${escapeHtml(data.text)}</span><span class="msg-time">${time}</span></div>`;
                    }
                    messagesDiv.appendChild(msgEl);
                });

                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });

        } finally {
            window.joining = false;
        }
    }

    /* ============================================================
       EVENT LISTENERS UI
       ============================================================ */
    document.getElementById("btnCreateRoom").onclick = () => joinRoom("user1");
    document.getElementById("btnJoinRoom").onclick = () => joinRoom("user2");

    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => { if (e.key === "Enter") sendMessage(); };

    emojiBtn.onclick = () => emojiPicker.classList.toggle("hidden");
    emojiPicker.querySelectorAll('span').forEach(e => e.onclick = () => {
        messageInput.value += e.textContent;
        emojiPicker.classList.add("hidden");
        messageInput.focus();
    });

    /* ============================================================
       SVUOTA CHAT
       ============================================================ */
    document.getElementById("clearBtn").onclick = async () => {
        const s = await getDocs(collection(window.chpriv.db, "messages", getRoomId(), "list"));
        s.forEach(d => deleteDoc(doc(window.chpriv.db, "messages", getRoomId(), "list", d.id)));
        messagesDiv.innerHTML = "";
    };

    /* ============================================================
       COPIA LINK
       ============================================================ */
    document.getElementById("copyLinkBtn").onclick = () => {
        const currentRoom = getRoomId();
        window.location.hash = `#room=${currentRoom}`;
        navigator.clipboard.writeText(window.location.href);
        alert("Link della stanza copiato!");
    };

    /* ============================================================
       ESCI (cleanup completo)
       ============================================================ */
    document.getElementById("exitBtn").onclick = async () => {
        clearInterval(window.heartbeatId);
        clearInterval(window.presenceWatchId);

        const roomId = getRoomId();
        if (window.myRole) {
            try {
                await remove(ref(window.chpriv.rtdb, `presence/${roomId}/${window.myRole}`));
                await remove(ref(window.chpriv.rtdb, `typing/${roomId}/${window.myRole}`));
            } catch (err) {
                console.error("Errore cleanup presenza:", err);
            }
        }

        window.location.hash = "";
        window.location.reload();
    };
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startApp); else startApp();
