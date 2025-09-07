const socket = io();
let sessionId = null;

// ✅ Generate QR
document.getElementById("generateQR").addEventListener("click", () => {
  sessionId = Math.random().toString(36).substr(2, 9);
  socket.emit("joinSession", sessionId);

  const qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";

  const url = `${window.location.origin}/upload/${sessionId}`;

  QRCode.toCanvas(url, { width: 220 }, (err, canvas) => {
    if (err) {
      qrContainer.innerHTML = `<p style="color:red;">❌ QR failed. Link: <a href="${url}">${url}</a></p>`;
      return;
    }
    qrContainer.appendChild(canvas);
  });

  document.getElementById("qrNote").innerText =
    "📱 Scan this QR on your phone to upload photos.";
});

// ✅ Add photo to gallery
socket.on("newPhoto", (data) => {
  const gallery = document.getElementById("galleryGrid");
  const img = document.createElement("img");
  img.src = data.url + "?t=" + Date.now();
  img.dataset.filename = data.filename;
  img.classList.add("gallery-img");

  img.addEventListener("click", () =>
    openModal(img.src, img.dataset.filename)
  );

  gallery.appendChild(img);
});

// ✅ Delete photo event from server
socket.on("deletePhoto", (data) => {
  const gallery = document.getElementById("galleryGrid");
  const img = gallery.querySelector(`img[data-filename="${data.filename}"]`);
  if (img) img.remove();
});

// ✅ Download all as ZIP
document.getElementById("downloadAll").addEventListener("click", () => {
  if (!sessionId) {
    alert("Generate a QR and upload photos first!");
    return;
  }
  window.location.href = `/download/${sessionId}`;
});

// ✅ Modal Functions
function openModal(src, filename) {
  const modal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalImg");
  const deleteBtn = document.getElementById("deleteBtn");

  modal.style.display = "flex";
  modalImg.src = src;

  deleteBtn.onclick = async () => {
    if (!confirm("Delete this photo?")) return;
    await fetch(`/delete/${sessionId}/${filename}`, { method: "DELETE" });
    modal.style.display = "none";
  };
}

function closeModal() {
  document.getElementById("photoModal").style.display = "none";
}
