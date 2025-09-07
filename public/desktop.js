const socket = io();
let sessionId = null;
let files = [];
let currentIndex = 0;

document.getElementById("generateQR").addEventListener("click", () => {
  sessionId = Math.random().toString(36).substring(2, 8);
  const url = `${window.location.origin}/upload.html?session=${sessionId}`;

  // ✅ QR generate as image
  QRCode.toDataURL(url, { width: 200 }, (err, dataUrl) => {
    if (err) return console.error(err);
    document.getElementById("qrImg").src = dataUrl;
  });

  socket.emit("joinSession", sessionId);
});

// ✅ Live updates
socket.on("newFile", (file) => {
  files.push(file);
  renderGallery();
});

socket.on("fileDeleted", (filename) => {
  files = files.filter((f) => !f.url.endsWith(filename));
  renderGallery();
});

// ✅ Render gallery
function renderGallery() {
  const gallery = document.getElementById("galleryGrid");
  gallery.innerHTML = "";

  files.forEach((f, idx) => {
    const ext = f.filename.split(".").pop().toLowerCase();
    let elem;

    if (["jpg","jpeg","png","gif","webp"].includes(ext)) {
      elem = document.createElement("img");
      elem.src = f.url + "?t=" + Date.now();
      elem.classList.add("gallery-img");
      elem.addEventListener("click", () => openModal(idx));
    } else {
      elem = document.createElement("div");
      elem.classList.add("file-card");
      elem.innerHTML = `📄 <a href="${f.url}" target="_blank">${f.filename}</a>`;
    }
    gallery.appendChild(elem);
  });
}

// ✅ Download All
document.getElementById("downloadAll").addEventListener("click", () => {
  if (!sessionId) return alert("Generate QR first!");
  window.location.href = `/download/${sessionId}`;
});

// ✅ Modal logic
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modalImg");
const closeModal = document.getElementById("closeModal");
const deleteBtn = document.getElementById("deleteBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function openModal(idx) {
  currentIndex = idx;
  modal.style.display = "flex";
  modalImg.src = files[idx].url;
}

closeModal.addEventListener("click", () => (modal.style.display = "none"));

deleteBtn.addEventListener("click", async () => {
  const file = files[currentIndex];
  const parts = file.url.split("/");
  const filename = parts[parts.length - 1];
  await fetch(`/delete/${sessionId}/${filename}`, { method: "DELETE" });
  modal.style.display = "none";
});

prevBtn.addEventListener("click", () => {
  if (currentIndex > 0) openModal(currentIndex - 1);
});

nextBtn.addEventListener("click", () => {
  if (currentIndex < files.length - 1) openModal(currentIndex + 1);
});
