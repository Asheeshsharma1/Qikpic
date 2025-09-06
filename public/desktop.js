const socket = io();
let sessionId = null;

// Generate QR
document.getElementById("genQR").addEventListener("click", async () => {
  const res = await fetch("/new");
  const data = await res.json();
  sessionId = data.sessionId;

  document.getElementById("qr").innerHTML =
    `<img src="${data.qr}" alt="QR Code">`;

  socket.emit("joinSession", sessionId);
  document.getElementById("downloadAll").onclick = () => {
    window.location.href = `/download/${sessionId}`;
  };
});

// Live new photo
socket.on("newPhoto", (data) => {
  const gallery = document.getElementById("gallery");
  const img = document.createElement("img");
  img.src = data.url;
  img.classList.add("gallery-img");
  gallery.appendChild(img);
});
