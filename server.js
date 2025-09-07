const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// ✅ Storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const dir = path.join(__dirname, "uploads", sessionId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ✅ File upload route
app.post("/upload/:sessionId", upload.array("files"), (req, res) => {
  const sessionId = req.params.sessionId;
  const files = req.files.map((f) => ({
    filename: f.filename,
    url: `/uploads/${sessionId}/${f.filename}`,
  }));

  io.to(sessionId).emit("newFile", files[0]); // emit one by one
  res.sendStatus(200);
});

// ✅ Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Download all as zip
app.get("/download/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const folder = path.join(__dirname, "uploads", sessionId);

  if (!fs.existsSync(folder)) return res.sendStatus(404);

  res.attachment(`${sessionId}-files.zip`);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(folder, false);
  archive.finalize();
});

// ✅ Delete file
app.delete("/delete/:sessionId/:filename", (req, res) => {
  const { sessionId, filename } = req.params;
  const filePath = path.join(__dirname, "uploads", sessionId, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    io.to(sessionId).emit("fileDeleted", filename);
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ✅ WebSocket join
io.on("connection", (socket) => {
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
