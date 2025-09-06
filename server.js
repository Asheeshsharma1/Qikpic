const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const cors = require('cors');
const mime = require('mime-types');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const UPLOAD_ROOT = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT);

// Multer setup: store temporarily in memory then move to session folder
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
  fileFilter: (req, file, cb) => {
    // allow common image types
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  }
}).array('photos', 12);

// Create session endpoint
app.post('/api/session', (req, res) => {
  const sessionId = uuidv4();
  const sessionDir = path.join(UPLOAD_ROOT, sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });
  // respond with session id
  res.json({ sessionId, uploadUrl: `/upload/${sessionId}` });
});

// Serve the phone upload page (upload.html) - route is /upload/:sessionId
app.get('/upload/:sessionId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// API: handle uploads for a session
app.post('/api/upload/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionDir = path.join(UPLOAD_ROOT, sessionId);
  if (!fs.existsSync(sessionDir)) {
    return res.status(404).json({ error: 'Invalid session' });
  }

  upload(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ error: err.message || 'Upload error' });
    }
    const files = [];
    for (const f of req.files) {
      // safe filename: timestamp + original name
      const ts = Date.now();
      const safeName = `${ts}_${f.originalname.replace(/\s+/g, '_')}`;
      const outPath = path.join(sessionDir, safeName);
      fs.writeFileSync(outPath, f.buffer);
      files.push(safeName);
      // emit socket event to session room
      io.to(sessionId).emit('file', {
        filename: safeName,
        url: `/files/${sessionId}/${encodeURIComponent(safeName)}`
      });
    }
    return res.json({ ok: true, files });
  });
});

// Serve uploaded files statically (read only)
app.get('/files/:sessionId/:filename', (req, res) => {
  const sessionId = req.params.sessionId;
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_ROOT, sessionId, filename);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// Download all as zip
app.get('/download/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  const sessionDir = path.join(UPLOAD_ROOT, sessionId);
  if (!fs.existsSync(sessionDir)) return res.status(404).send('Session not found');

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename=qikpic-${sessionId}.zip`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);
  archive.directory(sessionDir, false);
  archive.finalize();
});

// Simple cleanup endpoint (optional) - deletes session folder (for testing)
app.post('/api/delete-session/:sessionId', (req, res) => {
  const sessionDir = path.join(UPLOAD_ROOT, req.params.sessionId);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
    return res.json({ ok: true });
  } else {
    return res.status(404).json({ error: 'Not found' });
  }
});

// Socket.IO: handle rooms by session
io.on('connection', (socket) => {
  // client should emit 'join' with sessionId
  socket.on('join', (sessionId) => {
    socket.join(sessionId);
    // optionally send existing files in session
    const sessionDir = path.join(UPLOAD_ROOT, sessionId);
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir).map((name) => ({
        filename: name,
        url: `/files/${sessionId}/${encodeURIComponent(name)}`
      }));
      socket.emit('existing', files);
    }
  });

  socket.on('leave', (sessionId) => {
    socket.leave(sessionId);
  });

  socket.on('disconnect', () => {});
});

// start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`QikPic prototype listening at http://localhost:${PORT}`);
});
