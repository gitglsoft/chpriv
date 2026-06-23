import {
collection,
addDoc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

console.log("ChPriv v2 avviato");

// ELEMENTI DOM
const createBtn = document.getElementById("btnCreateRoom");
const joinBtn = document.getElementById("btnJoinRoom");

const roomInfo = document.getElementById("roomInfo");
const meInfo = document.getElementById("meInfo");
const otherInfo = document.getElementById("otherInfo");

let currentRoomId = null;

// UTILITA'
function getRoomFromUrl() {
const hash = window.location.hash;

if (!hash.startsWith("#room=")) {
return null;
}

return hash.replace("#room=", "");
}

// VISUALIZZA STANZA SE PRESENTE NELL'URL
const roomFromUrl = getRoomFromUrl();

if (roomFromUrl) {
roomInfo.innerHTML =
`Stanza rilevata:<br>${roomFromUrl}`;
}

// CREAZIONE STANZA
createBtn.addEventListener("click", async () => {

const nickname =
document.getElementById("nickname").value.trim();

const password =
document.getElementById("roomPassword").value.trim();

if (!nickname || !password) {
alert("Inserisci nickname e password");
return;
}

try {


const roomId = crypto.randomUUID();

await addDoc(
  collection(window.chpriv.db, "rooms"),
  {
    roomId,
    password,
    createdBy: nickname,
    createdAt: serverTimestamp()
  }
);

currentRoomId = roomId;

const roomLink =
  ${window.location.origin}${window.location.pathname}#room=${roomId}`;

roomInfo.innerHTML = `
  <b>Stanza creata</b><br><br>
  Room ID:<br>
  ${roomId}
  <br><br>
  Link:<br>
  <a href="${roomLink}" target="_blank">${roomLink}</a>
`;

// USER1

const user1Ref =
  window.chpriv.ref(
    window.chpriv.rtdb,
    `presence/${roomId}/user1`
  );

await window.chpriv.set(
  user1Ref,
  {
    nickname,
    connectedAt: Date.now()
  }
);

meInfo.textContent =
  `${nickname} (online)`;

alert("Stanza creata correttamente");


}
catch (err) {


console.error(err);

alert(
  "Errore:\n" +
  err.message
);


}

});

// ENTRA IN STANZA
joinBtn.addEventListener("click", async () => {

const nickname =
document.getElementById("nickname").value.trim();

const roomId =
getRoomFromUrl();

if (!nickname || !roomId) {

alert(
  "Inserisci nickname o manca ID stanza nel link"
);

return;


}

try {


const roomRef =
  window.chpriv.ref(
    window.chpriv.rtdb,
    `presence/${roomId}`
  );

const snap =
  await window.chpriv.get(roomRef);

const data =
  snap.exists()
    ? snap.val()
    : {};

const userCount =
  Object.keys(data).length;

if (userCount >= 2) {

  alert(
    "ERRORE DI ACCESSO\n\n" +
    "Accesso Negato\n\n" +
    "Tentativo di accesso non autorizzato"
  );

  return;
}

const user2Ref =
  window.chpriv.ref(
    window.chpriv.rtdb,
    `presence/${roomId}/user2`
  );

await window.chpriv.set(
  user2Ref,
  {
    nickname,
    connectedAt: Date.now()
  }
);

meInfo.textContent =
  `${nickname} (online)`;

otherInfo.textContent =
  "Connesso alla stanza";

alert("Ingresso effettuato");


}
catch (err) {


console.error(err);

alert(
  "Errore:\n" +
  err.message
);


}

});

