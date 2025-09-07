const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer storage with auto-rename
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const sessionPath = path.join(__dirname, "uploads", req.params.sessionId);
    fs.mkdirSync(sessionPath, { recursive: true });
    cb(null, sessionPath);
  },
  filename: function (req, file, cb) {
    const sessionPath = path.join(__dirname, "uploads", req.params.sessionId);
    let filename = file.originalname;
    const ext = path.extname(filename);
    const name = path.basename(filename, ext);
    let counter = 1;

    while (fs.existsSync(path.join(sessionPath, filename))) {
      filename = `${name}(${counter})${ext}`;
      counter++;
    }

    cb(null, filename);
  }
});
const upload = multer({ storage });

// Upload route
app.post("/upload/:sessionId", upload.array("files"), (req, res) => {
  const sessionId = req.params.sessionId;
  req.files.forEach(f => {
    io.to(sessionId).emit("newFile", {
      filename: f.filename,
      url: `/uploads/${sessionId}/${f.filename}`,
    });
  });
  res.json({ success: true, files: req.files.map(f => f.filename) });
});

// Socket.io
io.on("connection", (socket) => {
  socket.on("join", (sessionId) => {
    socket.join(sessionId);
  });
});

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
