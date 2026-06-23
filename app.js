import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

console.log("ChPriv v2 avviato");
setTimeout(() => {
  alert("CHPRIV=" + typeof window.chpriv);
}, 2000);

const createBtn = document.getElementById("btnCreateRoom");
const joinBtn = document.getElementById("btnJoinRoom");

const roomInfo = document.getElementById("roomInfo");

const meInfo = document.getElementById("meInfo");
const otherInfo = document.getElementById("otherInfo");

const copyLinkBtn = document.getElementById("copyLinkBtn");

let currentRoomId = null;
let currentNickname = null;

function getRoomFromUrl() {

  alert("HASH=" + window.location.hash);

  const hash = window.location.hash;

  if (!hash.startsWith("#room=")) {

    alert("HASH NON VALIDO");

    return null;
  }

  const roomId =
    hash.replace("#room=", "");

  alert("ROOM TROVATA=" + roomId);

  return roomId;
}

const roomFromUrl = getRoomFromUrl();

if (roomFromUrl) {

  roomInfo.innerHTML =
    `Stanza rilevata:<br>${roomFromUrl}`;

}

createBtn.addEventListener("click", async () => {

  const nickname =
    document.getElementById("nickname").value.trim();

  const password =
    document.getElementById("roomPassword").value.trim();

  if (!nickname) {
    alert("Inserisci un nickname");
    return;
  }

  if (!password) {
    alert("Inserisci una password stanza");
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
    currentNickname = nickname;

    const roomLink =
      `${window.location.origin}${window.location.pathname}#room=${roomId}`;

    roomInfo.innerHTML = `
      <b>Stanza creata</b><br><br>
      Room ID:<br>
      ${roomId}
      <br><br>
      Link:<br>
      <a href="${roomLink}" target="_blank">${roomLink}</a>
    `;

    const presenceRef =
      window.chpriv.ref(
        window.chpriv.rtdb,
        `presence/${roomId}/user1`
      );

    await window.chpriv.set(
      presenceRef,
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

joinBtn.addEventListener("click", async () => {

alert("Ingresso effettuato");

}
catch (err) {

  console.error(err);

  alert(
    "ERRORE:\n" +
    err.message
  );

}

});

copyLinkBtn.addEventListener("click", async () => {

  if (!currentRoomId) {

    alert("Nessuna stanza");

    return;
  }

  const roomLink =
    `${window.location.origin}${window.location.pathname}#room=${currentRoomId}`;

  await navigator.clipboard.writeText(
    roomLink
  );

  alert("Link copiato");
});
