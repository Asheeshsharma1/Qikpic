const socket = io();
let sessionId = null;

document.getElementById("generateQR").addEventListener("click", () => {
  sessionId = Math.random().toString(36).substr(2, 9);
  socket.emit("joinSession", sessionId);

  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";

  const url = `${window.location.origin}/upload/${sessionId}`;
  console.log("QR URL:", url);

  try {
    QRCode.toCanvas(url, { width: 220 }, (err, canvas) => {
      if (err) {
        console.error("QR Generation Error:", err);
        qrContainer.innerHTML = `<p style="color:red;">❌ QR code failed. Link: <a href="${url}">${url}</a></p>`;
        return;
      }
      qrContainer.appendChild(canvas);
    });
  } catch (e) {
    console.error("QRCode Error:", e);
    qrContainer.innerHTML = `<p style="color:red;">❌ QR code library not loaded. Link: <a href="${url}">${url}</a></p>`;
  }

  document.getElementById("qrNote").innerText =
    "📱 Scan this QR on your phone to upload photos.";
});

socket.on("newPhoto", (data) => {
  const gallery = document.getElementById("galleryGrid");
  const img = document.createElement("img");
  img.src = data.url + "?t=" + Date.now();
  img.classList.add("gallery-img");
  gallery.appendChild(img);
});

document.getElementById("downloadAll").addEventListener("click", () => {
  if (!sessionId) {
    alert("Generate a QR and upload photos first!");
    return;
  }
  window.location.href = `/download/${sessionId}`;
});
