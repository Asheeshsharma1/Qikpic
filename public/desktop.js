const socket = io();
let sessionId = null;
let files = [];
let currentIndex = 0;

document.getElementById("generateBtn")?.addEventListener("click", () => {
  sessionId = Math.random().toString(36).substring(2, 8);
  const url = `${window.location.origin}/upload.html?session=${sessionId}`;

  const qrCanvas = document.getElementById("qrCanvas");
  const qr = new QRious({ element: qrCanvas, value: url, size: 200 });

  socket.emit("joinSession", sessionId);
  console.log("QR generated:", url);
});

socket.on("newFile", (data) => {
  if (!sessionId || data.session !== sessionId) return;
  files.push(data);
  renderGallery();
});

socket.on("deleteFile", (data) => {
  files = files.filter((f) => f.filename !== data.filename);
  renderGallery();
});

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
      item.appendChild(icon);
    }

    const caption = document.createElement("div");
    caption.className = "filename";
    caption.textContent = file.filename;
    item.appendChild(caption);

    gallery.appendChild(item);
  });
}

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

  modal.append(closeBtn, deleteBtn, prevBtn, nextBtn, content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

function closePreview() { document.getElementById("previewOverlay")?.remove(); }
function navigatePreview(direction) {
  currentIndex = (currentIndex + direction + files.length) % files.length;
  closePreview();
  openPreview(currentIndex);
}
function deleteFile(filename) {
  fetch(`/delete?session=${sessionId}&filename=${filename}`, { method: "DELETE" })
    .then(res => { if(res.ok){ files = files.filter(f=>f.filename!==filename); renderGallery(); closePreview(); }});
}

document.getElementById("downloadAll")?.addEventListener("click", () => {
  if (!sessionId) return alert("Generate QR first!");
  window.location.href = `/download-all?session=${sessionId}`;
});
