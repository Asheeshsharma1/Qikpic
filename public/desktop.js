const socket = io();
let currentSession = null;
let galleryItems = [];
let currentIndex = 0;

// ✅ QR Code generate
document.getElementById("generateQr").addEventListener("click", () => {
  currentSession = Math.random().toString(36).substr(2, 9);
  const url = `${window.location.origin}/upload.html?session=${currentSession}`;

  // QR render
  const qrBox = document.getElementById("qrCode");
  qrBox.innerHTML = "";
  QRCode.toCanvas(url, { width: 180 }, (err, canvas) => {
    if (err) console.error(err);
    qrBox.appendChild(canvas);
  });

  socket.emit("joinSession", currentSession);
});

// ✅ New file receive
socket.on("newFile", (fileData) => {
  if (!currentSession || fileData.session !== currentSession) return;

  const gallery = document.getElementById("galleryGrid");
  let element;

  if (fileData.type.startsWith("image/")) {
    element = document.createElement("img");
    element.src = `/uploads/${fileData.session}/${fileData.filename}`;
    element.alt = fileData.filename;
    element.classList.add("gallery-item");
  } else {
    element = document.createElement("a");
    element.href = `/uploads/${fileData.session}/${fileData.filename}`;
    element.textContent = fileData.filename;
    element.target = "_blank";
    element.classList.add("file-link");
  }

  gallery.appendChild(element);
  galleryItems.push(element);

  // Click to open modal
  element.addEventListener("click", () => openModal(galleryItems.indexOf(element)));
});

// ✅ Download All
document.getElementById("downloadAll").addEventListener("click", () => {
  if (!currentSession) {
    alert("Please generate QR and upload files first.");
    return;
  }
  window.location.href = `/download-all/${currentSession}`;
});

// ====================
// Modal Logic
// ====================
const modal = document.getElementById("galleryModal");
const modalImg = document.getElementById("modalImage");
const modalFile = document.getElementById("modalFile");

function openModal(index) {
  currentIndex = index;
  showModalItem();
  modal.style.display = "flex";
}

function closeModal() {
  modal.style.display = "none";
}

function showModalItem() {
  const item = galleryItems[currentIndex];
  if (item.tagName === "IMG") {
    modalImg.src = item.src;
    modalImg.style.display = "block";
    modalFile.style.display = "none";
  } else {
    modalImg.style.display = "none";
    modalFile.style.display = "block";
    modalFile.innerHTML = `<a href="${item.href}" target="_blank">${item.textContent}</a>`;
  }
}

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("prevBtn").addEventListener("click", () => {
  if (galleryItems.length === 0) return;
  currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
  showModalItem();
});
document.getElementById("nextBtn").addEventListener("click", () => {
  if (galleryItems.length === 0) return;
  currentIndex = (currentIndex + 1) % galleryItems.length;
  showModalItem();
});
document.getElementById("deleteBtn").addEventListener("click", () => {
  const item = galleryItems[currentIndex];
  item.remove();
  galleryItems.splice(currentIndex, 1);
  closeModal();
});
