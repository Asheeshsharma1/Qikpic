// Desktop client logic
const generateBtn = document.getElementById('generateBtn');
const qrWrap = document.getElementById('qrWrap');
const gallery = document.getElementById('gallery');
const downloadAllBtn = document.getElementById('downloadAll');

let socket;
let currentSession = null;

function createSession() {
  fetch('/api/session', { method: 'POST' })
    .then((r) => r.json())
    .then((data) => {
      currentSession = data.sessionId;
      const uploadUrl = `${location.origin}/upload/${currentSession}`;
      // generate QR
      qrWrap.innerHTML = '';
      QRCode.toCanvas(uploadUrl, { width: 220 }, (err, canvas) => {
        if (err) return console.error(err);
        qrWrap.appendChild(canvas);
      });
      setupSocket(currentSession);
    })
    .catch((err) => console.error(err));
}

function setupSocket(sessionId) {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socket = io();
  socket.on('connect', () => {
    socket.emit('join', sessionId);
  });

  socket.on('existing', (files) => {
    // show existing
    gallery.innerHTML = '';
    for (const f of files) addImageToGallery(f.url, f.filename);
  });

  socket.on('file', (f) => {
    addImageToGallery(f.url, f.filename);
  });
}

function addImageToGallery(url, filename) {
  const item = document.createElement('div');
  item.className = 'photo-card';
  const img = document.createElement('img');
  img.src = url;
  img.alt = filename;
  img.loading = 'lazy';

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const del = document.createElement('button');
  del.textContent = 'Delete';
  del.className = 'btn small';
  del.onclick = () => {
    // local UI remove. (Server-side delete not implemented in prototype)
    item.remove();
  };
  overlay.appendChild(del);

  item.appendChild(img);
  item.appendChild(overlay);
  gallery.prepend(item);
}

generateBtn.onclick = createSession;

downloadAllBtn.onclick = () => {
  if (!currentSession) return alert('Generate a session first');
  window.location.href = `/download/${currentSession}`;
};
