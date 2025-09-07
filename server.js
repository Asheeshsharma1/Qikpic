const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Multer Storage – Allow all file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads", req.params.sessionId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ Upload route
app.post("/upload/:sessionId", upload.single("file"), (req, res) => {
  const filePath = `/uploads/${req.params.sessionId}/${req.file.filename}`;
  io.to(req.params.sessionId).emit("newPhoto", {
    url: filePath,
    filename: req.file.filename
  });
  res.json({ success: true, file: req.file.filename });
});

// ✅ Delete route
app.delete("/delete/:sessionId/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.sessionId, req.params.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    io.to(req.params.sessionId).emit("deletePhoto", { filename: req.params.filename });
    return res.json({ success: true });
  }
  res.status(404).json({ error: "File not found" });
});

// ✅ Download All (Zip)
app.get("/download/:sessionId", (req, res) => {
  const dir = path.join(__dirname, "uploads", req.params.sessionId);
  if (!fs.existsSync(dir)) return res.status(404).send("No files found");

  res.setHeader("Content-Disposition", `attachment; filename=${req.params.sessionId}.zip`);
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(dir, false);
  archive.finalize();
});

// ✅ Upload Page
app.get("/upload/:sessionId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload.html"));
});

// ✅ Socket.IO
io.on("connection", (socket) => {
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
