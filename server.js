const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Serve upload page with sessionId
app.get("/upload/:sessionId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload.html"));
});

// ✅ Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionPath = path.join(__dirname, "uploads", req.params.sessionId);
    fs.mkdirSync(sessionPath, { recursive: true });
    cb(null, sessionPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ Upload handler
app.post("/upload/:sessionId", upload.array("photos", 20), (req, res) => {
  const sessionId = req.params.sessionId;
  req.files.forEach((file) => {
    io.to(sessionId).emit("newPhoto", {
      url: `/uploads/${sessionId}/${file.filename}`,
    });
  });
  res.sendStatus(200);
});

// ✅ Download all as ZIP
app.get("/download/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const folderPath = path.join(__dirname, "uploads", sessionId);

  if (!fs.existsSync(folderPath)) {
    return res.status(404).send("No photos found for this session.");
  }

  res.setHeader("Content-Disposition", `attachment; filename=${sessionId}.zip`);
  res.setHeader("Content-Type", "application/zip");

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(folderPath, false);
  archive.finalize();
});

// ✅ WebSocket
io.on("connection", (socket) => {
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
