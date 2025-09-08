// desktop.js — uses socket.io (served from server) and qrcode library
const socket = io();

// state
let sessionId = null;
let items = []; // { session, filename, type, url }
let currentIndex = -1;

// DOM
const generateBtn = document.getElementById('generateQr');
const qrImg = document.getElementById('qrImg');
const qrCanvas = document.getElementById('qrCanvas');
const qrNote = document.getElementById('qrNote');
const openUpload = document.getElementById('openUpload');
const regenBtn = document.getElementById('regenBtn');
const copyLinkBtn = document.getElementById('copyLink');
const downloadAllBtn = document.getElementById('downloadAll');
const galleryGrid = document.getElementById('galleryGrid');
const emptyHint = document.getElementById('emptyHint');
const sessionLabel = document.getElementById('sessionLabel');

// modal
const viewerModal = document.getElementById('viewerModal');
const viewerImg = document.getElementById('viewerImg');
const viewerFile = document.getElementById('viewerFile');
const viewerName = document.getElementById('viewerName');
const viewerClose = document.getElementById('viewerClose');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const deleteBtn = document.getElementById('deleteBtn');

// helper: build upload link
function buildUploadUrl(s) {
  return `${window.location.origin}/upload.html?session=${s}`;
}

// generate unique session id
function newSessionId() {
  return Math.random().toString(36).substring(2, 10);
}

// render QR (using toDataURL into <img> for reliability)
async function renderQrFor(session) {
  const url = buildUploadUrl(session);
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 220 });
    qrImg.src = dataUrl;
    qrImg.style.display = 'block';
    qrCanvas.style.display = 'none';
    qrNote.textContent = 'Scan this QR with your phone to open upload page.';
    openUpload.href = url;
    openUpload.style.display = 'inline-block';
    regenBtn.style.display = 'inline-block';
    copyLinkBtn.style.display = 'inline-block';
    sessionLabel.textContent = `Session: ${session}`;
  } catch (e) {
    console.error('QR render error', e);
    qrNote.textContent = 'QR generation failed — try again.';
  }
}

// Generate button handler
generateBtn.addEventListener('click', () => {
  sessionId = newSessionId();
  // join socket room
  socket.emit('joinSession', sessionId);

  // render qr
  renderQrFor(sessionId);

  // clear previous gallery items
  items = [];
  galleryGrid.innerHTML = '';
  emptyHint.style.display = 'block';
});

// regenerate (same as new generate)
regenBtn.addEventListener('click', () => {
  sessionId = newSessionId();
  socket.emit('joinSession', sessionId);
  renderQrFor(sessionId);
  items = [];
  galleryGrid.innerHTML = '';
  emptyHint.style.display = 'block';
});

// copy link
if (copyLinkBtn) {
  copyLinkBtn.addEventListener('click', async () => {
    if (!sessionId) return alert('Generate QR first');
    try {
      await navigator.clipboard.writeText(buildUploadUrl(sessionId));
      copyLinkBtn.textContent = 'Copied ✓';
      setTimeout(()=> copyLinkBtn.textContent='Copy Link', 1500);
    } catch (e) {
      alert('Copy failed, open upload page instead.');
    }
  });
}

// socket: newFile
socket.on('newFile', (file) => {
  // server should send { session, filename, type }
  if (!sessionId || file.session !== sessionId) return;

  const url = `/uploads/${file.session}/${file.filename}`;
  const item = {
    session: file.session,
    filename: file.filename,
    type: file.type,
    url
  };
  items.push(item);
  appendGalleryItem(item, items.length - 1);
});

// append to gallery
function appendGalleryItem(item, index) {
  emptyHint.style.display = 'none';

  const card = document.createElement('div');
  card.className = 'thumb';

  if (item.type && item.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = item.url + '?t=' + Date.now();
    img.alt = item.filename;
    img.loading = 'lazy';
    card.appendChild(img);
  } else {
    const icon = document.createElement('div');
    icon.className = 'file-icon';
    icon.textContent = '📄';
    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = item.filename;
    card.appendChild(icon);
    card.appendChild(name);
  }

  // click opens viewer
  card.addEventListener('click', () => openViewer(index));
  galleryGrid.prepend(card);
}

// open viewer modal
function openViewer(index) {
  currentIndex = index;
  const it = items[index];
  viewerName.textContent = it.filename;

  if (it.type && it.type.startsWith('image/')) {
    viewerImg.src = it.url + '?t=' + Date.now();
    viewerImg.style.display = 'block';
    viewerFile.style.display = 'none';
  } else {
    viewerImg.style.display = 'none';
    viewerFile.style.display = 'block';
    viewerFile.innerHTML = `<a href="${it.url}" target="_blank" class="viewer-download">Open / Download</a>`;
  }

  viewerModal.setAttribute('aria-hidden','false');
  viewerModal.style.display = 'flex';
}

// close viewer
function closeViewer() {
  viewerModal.style.display = 'none';
  viewerModal.setAttribute('aria-hidden','true');
  viewerImg.src = '';
}

// prev/next
prevBtn.addEventListener('click', () => {
  if (items.length === 0) return;
  currentIndex = (currentIndex - 1 + items.length) % items.length;
  openViewer(currentIndex);
});
nextBtn.addEventListener('click', () => {
  if (items.length === 0) return;
  currentIndex = (currentIndex + 1) % items.length;
  openViewer(currentIndex);
});

// delete
deleteBtn.addEventListener('click', async () => {
  if (!confirm('Delete this file?')) return;
  const it = items[currentIndex];
  const filename = it.filename;
  try {
    const res = await fetch(`/delete/${sessionId}/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
      // remove from items & gallery DOM
      items.splice(currentIndex, 1);
      // re-render gallery
      renderGalleryFromItems();
      closeViewer();
    } else {
      alert('Delete failed on server.');
    }
  } catch (e) {
    console.error(e);
    alert('Delete failed.');
  }
});

// helper: re-render gallery
function renderGalleryFromItems() {
  galleryGrid.innerHTML = '';
  if (items.length === 0) {
    emptyHint.style.display = 'block';
  } else {
    emptyHint.style.display = 'none';
    items.forEach((it, idx) => appendGalleryItem(it, idx));
  }
}

// download all
downloadAllBtn.addEventListener('click', () => {
  if (!sessionId) return alert('Generate QR first');
  window.location.href = `/download-all/${sessionId}`;
});

// modal close
viewerClose.addEventListener('click', closeViewer);
viewerModal.addEventListener('click', (e) => {
  if (e.target === viewerModal) closeViewer();
});

// keyboard nav
document.addEventListener('keydown', (e) => {
  if (viewerModal.style.display === 'flex') {
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
  }
});
