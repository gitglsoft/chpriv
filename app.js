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

// UTILITA'
function getRoomFromUrl() {
const hash = window.location.hash;

if (!hash.startsWith("#room=")) {
return null;
}

return hash.replace("#room=", "");
}

// MONITOR PRESENZA UTENTI
function watchPresence(roomId, myNickname) {

  const roomRef =
    window.chpriv.ref(
      window.chpriv.rtdb,
      `presence/${roomId}`
    );

  window.chpriv.onValue(
    roomRef,
    (snapshot) => {

      const data =
        snapshot.exists()
          ? snapshot.val()
          : {};

      const users =
        Object.values(data);

      const otherUser =
        users.find(
          user => user.nickname !== myNickname
        );

      if (otherUser) {

        otherInfo.textContent =
          otherUser.nickname + " (online)";

      } else {

        otherInfo.textContent =
          "In attesa dell'altro utente...";
      }

    }
  );

}
  }

}
```

);
}

// STANZA PRESENTE NELL'URL
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

```
alert("Inserisci nickname e password");
return;
```

}

try {

```
const roomId =
  crypto.randomUUID();

await addDoc(
  collection(window.chpriv.db, "rooms"),
  {
    roomId,
    password,
    createdBy: nickname,
    createdAt: serverTimestamp()
  }
);

const roomLink =
  `${window.location.origin}${window.location.pathname}#room=${roomId}`;

roomInfo.innerHTML = `
  <b>Stanza creata</b><br><br>
  Room ID:<br>${roomId}<br><br>
  Link:<br>
  <a href="${roomLink}" target="_blank">${roomLink}</a>
`;

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

watchPresence(roomId, nickname);

alert("Stanza creata correttamente");
```

}
catch (err) {

```
console.error(err);

alert(
  "Errore durante la creazione:\n" +
  err.message
);
```

}

});

// ENTRA IN STANZA
joinBtn.addEventListener("click", async () => {

const nickname =
document.getElementById("nickname").value.trim();

const roomId =
getRoomFromUrl();

if (!nickname || !roomId) {

```
alert(
  "Inserisci il nickname e assicurati che l'ID stanza sia presente nell'URL"
);

return;
```

}

try {

```
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
    "ERRORE: Stanza piena o accesso non autorizzato"
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

watchPresence(roomId, nickname);

alert("Ingresso effettuato");
```

}
catch (err) {

```
console.error(err);

alert(
  "Errore durante l'accesso:\n" +
  err.message
);
```

}

});

