const socket = io();
let currentSession = null;

// Generate QR
document.getElementById("generateQr").addEventListener("click", () => {
  currentSession = Math.random().toString(36).substring(2, 9);
  const url = `${window.location.origin}/upload.html?session=${currentSession}`;

  const qrBox = document.getElementById("qrCode");
  qrBox.innerHTML = "";
  QRCode.toCanvas(url, { width: 200 }, (err, canvas) => {
    if (!err) qrBox.appendChild(canvas);
  });

  socket.emit("joinSession", currentSession);
});

// Show uploaded files
socket.on("newFile", (file) => {
  if (file.session !== currentSession) return;

  const gallery = document.getElementById("galleryGrid");
  if (file.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = `/uploads/${file.session}/${file.filename}`;
    gallery.appendChild(img);
  } else {
    const link = document.createElement("a");
    link.href = `/uploads/${file.session}/${file.filename}`;
    link.textContent = file.filename;
    link.target = "_blank";
    gallery.appendChild(link);
  }
});

// Download All
document.getElementById("downloadAll").addEventListener("click", () => {
  if (!currentSession) return alert("Generate QR first!");
  window.location.href = `/download-all/${currentSession}`;
});
