const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads", req.params.sessionId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ Upload route
app.post("/upload/:sessionId", upload.single("file"), (req, res) => {
  const filePath = `/uploads/${req.params.sessionId}/${req.file.filename}`;
  io.to(req.params.sessionId).emit("newFile", {
    filename: req.file.originalname,
    url: filePath,
  });
  res.sendStatus(200);
});

// ✅ Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Download all as ZIP
app.get("/download/:sessionId", (req, res) => {
  const dir = path.join(__dirname, "uploads", req.params.sessionId);
  if (!fs.existsSync(dir)) return res.status(404).send("No files");

  res.attachment("qikpic-files.zip");
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(dir, false);
  archive.finalize();
});

// ✅ Delete file
app.delete("/delete/:sessionId/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.sessionId, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    io.to(req.params.sessionId).emit("fileDeleted", req.params.filename);
    return res.sendStatus(200);
  }
  res.sendStatus(404);
});

// ✅ Socket.io session join
io.on("connection", (socket) => {
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
