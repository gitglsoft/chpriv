import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { initFirebase } from "./firebase.js";

await initFirebase(); // Avviamo la sessione

// Elementi DOM (Assicurati che gli ID esistano in index.html)
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");

// FUNZIONE INVIO MESSAGGIO (Oscurato)
window.sendMessage = async (roomId, nickname, text) => {
  await addDoc(collection(window.chpriv.db, "rooms", roomId, "messages"), {
    text,
    sender: nickname,
    createdAt: serverTimestamp(),
    read: false
  });
};

// ASCOLTO MESSAGGI E LOGICA AUTODISTRUZIONE
window.initChat = (roomId, myNickname) => {
  const q = query(collection(window.chpriv.db, "rooms", roomId, "messages"), orderBy("createdAt"));
  
  onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const div = document.createElement("div");
      div.className = `message ${msg.sender === myNickname ? 'mine' : 'other'}`;
      
      // Filtro blur
      div.style.filter = msg.read ? "blur(0px)" : "blur(8px)";
      div.innerHTML = msg.text + (msg.read ? "" : " <button class='readBtn'>Leggi</button>");
      
      // Bottone per sbloccare e avviare timer 3 secondi
      div.querySelector('.readBtn')?.addEventListener('click', async () => {
        await updateDoc(doc(window.chpriv.db, "rooms", roomId, "messages", docSnap.id), { read: true });
        
        setTimeout(async () => {
          try { await deleteDoc(doc(window.chpriv.db, "rooms", roomId, "messages", docSnap.id)); } catch(e) {}
        }, 3000);
      });
      messagesDiv.appendChild(div);
    });
  });
};
