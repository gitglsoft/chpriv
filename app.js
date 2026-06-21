console.log("ChPriv avviato");

const startup = document.getElementById("startup");
const chatContainer = document.getElementById("chatContainer");

const createBtn = document.getElementById("btnCreateRoom");
const joinBtn = document.getElementById("btnJoinRoom");

createBtn.addEventListener("click", () => {

  const nickname =
    document.getElementById("nickname").value.trim();

  const password =
    document.getElementById("roomPassword").value.trim();

  if(!nickname){
    alert("Inserisci un nickname");
    return;
  }

  if(!password){
    alert("Inserisci una password stanza");
    return;
  }

  alert(
    "Firebase collegato correttamente.\n\n" +
    "Nickname: " + nickname +
    "\nPassword: " + password
  );

});

joinBtn.addEventListener("click", () => {
  alert("Funzione ENTRA in costruzione");
});
