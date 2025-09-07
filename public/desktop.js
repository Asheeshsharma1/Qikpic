const socket = io();
let sessionId = null;
let photos = [];
let currentIndex = 0;

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
    "📱 Scan this QR on your phone to upload photos/files.";
});

// ✅ Add photo/file to gallery
socket.on("newPhoto", (data) => {
  photos.push(data);
  renderGallery();
});

// ✅ Delete photo event
socket.on("deletePhoto", (data) => {
  photos = photos.filter((p) => p.filename !== data.filename);
  renderGallery();

  if (photos.length > 0 && currentIndex >= photos.length) {
    currentIndex = photos.length - 1;
    openModalByIndex(currentIndex);
  } else if (photos.length === 0) {
    closeModal();
  }
});

// ✅ Render Gallery
function renderGallery() {
  const gallery = document.getElementById("galleryGrid");
  gallery.innerHTML = "";

  photos.forEach((p, idx) => {
    const fileExt = p.filename.split('.').pop().toLowerCase();
    let elem;

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
      elem = document.createElement("img");
      elem.src = p.url + "?t=" + Date.now();
      elem.classList.add("gallery-img");
      elem.addEventListener("click", () => openModalByIndex(idx));
    } else {
      elem = document.createElement("div");
      elem.classList.add("file-card");
      elem.innerHTML = `📄 <a href="${p.url}" target="_blank">${p.filename}</a>`;
    }

    gallery.appendChild(elem);
  });
}

// ✅ Open modal by index
function openModalByIndex(index) {
  currentIndex = index;
  const modal = document.getElementById("photoModal");
  const modalImg = document.getElementById("modalImg");

  const fileExt = photos[currentIndex].filename.split('.').pop().toLowerCase();

  if (["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt)) {
    modal.style.display = "flex";
    modalImg.src = photos[currentIndex].url;
  } else {
    window.open(photos[currentIndex].url, "_blank");
    return;
  }

  const deleteBtn = document.getElementById("deleteBtn");
  deleteBtn.onclick = async () => {
    if (!confirm("Delete this file?")) return;
    await fetch(`/delete/${sessionId}/${photos[currentIndex].filename}`, {
      method: "DELETE",
    });
    closeModal();
  };
}

// ✅ Navigation
document.getElementById("prevBtn").addEventListener("click", () => {
  if (currentIndex > 0) openModalByIndex(currentIndex - 1);
});
document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentIndex < photos.length - 1) openModalByIndex(currentIndex + 1);
});

// ✅ Download all
document.getElementById("downloadAll").addEventListener("click", () => {
  if (!sessionId) {
    alert("Generate a QR and upload files first!");
    return;
  }
  window.location.href = `/download/${sessionId}`;
});

// ✅ Close Modal
function closeModal() {
  document.getElementById("photoModal").style.display = "none";
}

// ✅ Background Close
function backgroundClose(event) {
  if (event.target.id === "photoModal") {
    closeModal();
  }
}

// ✅ Escape + Arrows
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft" && currentIndex > 0) openModalByIndex(currentIndex - 1);
  if (e.key === "ArrowRight" && currentIndex < photos.length - 1) openModalByIndex(currentIndex + 1);
});
