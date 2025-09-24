const socket = io();
let sessionId = null;
let files = [];
let currentIndex = 0;

// ----------------- QR Code Generate -----------------
document.getElementById("generateBtn")?.addEventListener("click", () => {
  sessionId = Math.random().toString(36).substring(2, 8);
  const url = `${window.location.origin}/upload.html?session=${sessionId}`;

  const qrCanvas = document.getElementById("qrCanvas");
  const qr = new QRious({
    element: qrCanvas,
    value: url,
    size: 200,
  });

  socket.emit("joinSession", sessionId);
  console.log("QR generated:", url);
});

// ----------------- Handle New File -----------------
socket.on("newFile", (data) => {
  if (!sessionId || data.session !== sessionId) return;
  files.push(data);
  renderGallery();

  // Auto scroll gallery to bottom for new file
  const gallery = document.getElementById("gallery");
  gallery.scrollTop = gallery.scrollHeight;
});

// ----------------- Handle Delete File -----------------
socket.on("deleteFile", (data) => {
  const deletedIndex = files.findIndex(f => f.filename === data.filename);
  files = files.filter(f => f.filename !== data.filename);
  renderGallery();

  // Auto-preview next file if current preview was deleted
  if (deletedIndex !== -1 && files.length > 0) {
    const nextIndex = deletedIndex < files.length ? deletedIndex : files.length - 1;
    closePreview();
    openPreview(nextIndex);
  } else {
    closePreview();
  }
});

// ----------------- Render Gallery -----------------
function renderGallery() {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  files.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "gallery-item";

    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = `/uploads/${sessionId}/${file.filename}`;
      img.alt = file.filename;
      img.addEventListener("click", () => openPreview(index));
      item.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.className = "file-icon";
      icon.textContent = "📄";
      icon.addEventListener("click", () => openPreview(index));
      item.appendChild(icon);
    }

    const caption = document.createElement("div");
    caption.className = "filename";
    caption.textContent = file.filename;
    item.appendChild(caption);

    gallery.appendChild(item);
  });
}

// ----------------- Preview Modal -----------------
function openPreview(index) {
  currentIndex = index;
  const file = files[index];

  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.id = "previewOverlay";

  const modal = document.createElement("div");
  modal.className = "preview-modal";

  let content;
  if (file.type.startsWith("image/")) {
    content = document.createElement("img");
    content.src = `/uploads/${sessionId}/${file.filename}`;
  } else {
    content = document.createElement("iframe");
    content.src = `/uploads/${sessionId}/${file.filename}`;
    content.width = "100%";
    content.height = "500px";
  }

  // Controls
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.className = "control-btn close";
  closeBtn.onclick = closePreview;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑 Delete";
  deleteBtn.className = "control-btn delete";
  deleteBtn.onclick = () => deleteFile(file.filename);

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "⬅ Prev";
  prevBtn.className = "control-btn prev";
  prevBtn.onclick = () => navigatePreview(-1);

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next ➡";
  nextBtn.className = "control-btn next";
  nextBtn.onclick = () => navigatePreview(1);

  modal.appendChild(closeBtn);
  modal.appendChild(deleteBtn);
  modal.appendChild(prevBtn);
  modal.appendChild(nextBtn);
  modal.appendChild(content);
  overlay.appendChild(modal);

  document.body.appendChild(overlay);
}

// Close preview
function closePreview() {
  document.getElementById("previewOverlay")?.remove();
}

// Navigate preview
function navigatePreview(direction) {
  if (files.length === 0) return;
  currentIndex = (currentIndex + direction + files.length) % files.length;
  closePreview();
  openPreview(currentIndex);
}

// Delete file
function deleteFile(filename) {
  fetch(`/delete?session=${sessionId}&filename=${filename}`, {
    method: "DELETE",
  }).then(res => {
    if (res.ok) {
      // socket.on("deleteFile") handles gallery update & auto next preview
    }
  });
}

// Download all
document.getElementById("downloadAll")?.addEventListener("click", () => {
  if (!sessionId) return alert("Generate QR first!");
  window.location.href = `/download-all?session=${sessionId}`;
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (!document.getElementById("previewOverlay")) return;
  if (e.key === "ArrowLeft") navigatePreview(-1);
  if (e.key === "ArrowRight") navigatePreview(1);
  if (e.key === "Escape") closePreview();
});
