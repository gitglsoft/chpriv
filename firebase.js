import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

console.log("ChPriv avviato");

const createBtn = document.getElementById("btnCreateRoom");
const joinBtn = document.getElementById("btnJoinRoom");

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

    const docRef = await addDoc(
      collection(window.chpriv.db, "rooms"),
      {
        roomId,
        password,
        createdBy: nickname,
        createdAt: serverTimestamp()
      }
    );

    alert(
      "Stanza creata!\n\n" +
      "Room ID:\n" +
      roomId +
      "\n\nDoc:\n" +
      docRef.id
    );

    console.log("Room creata", roomId);

  }
  catch (err) {

    console.error(err);

    alert(
      "Errore Firestore:\n" +
      err.message
    );

  }

});

joinBtn.addEventListener("click", () => {

  alert("ENTRA sarà implementato dopo");

});
