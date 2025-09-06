const socket = io();
let sessionId = null;

document.getElementById("generateQR").addEventListener("click", () => {
  // unique session id
  sessionId = Math.random().toString(36).substr(2, 9);

  // join socket room
  socket.emit("joinSession", sessionId);

  // generate QR
  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";
  const url = `${window.location.origin}/upload/${sessionId}`;
  QRCode.toCanvas(url, { width: 220 }, (err, canvas) => {
    if (err) console.error(err);
    qrContainer.appendChild(canvas);
  });

  document.getElementById("qrNote").innerText = "📱 Scan this QR on your phone to upload photos.";
});

// receive new photos
socket.on("newPhoto", (data) => {
  const gallery = document.getElementById("galleryGrid");
  const img = document.createElement("img");
  img.src = data.url;
  img.classList.add("gallery-img");
  gallery.appendChild(img);
});

// download all photos as ZIP
document.getElementById("downloadAll").addEventListener("click", () => {
  if (!sessionId) {
    alert("Generate a QR and upload photos first!");
    return;
  }
  window.location.href = `/download/${sessionId}`;
});
