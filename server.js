const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { Server } = require("socket.io");
const archiver = require("archiver");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads dir exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const session = req.body.session;
    const folder = path.join("uploads", session);
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });

// Upload route
app.post("/upload", upload.array("files"), (req, res) => {
  const session = req.body.session;
  req.files.forEach((file) => {
    io.to(session).emit("newFile", {
      session,
      filename: file.filename,
      type: file.mimetype,
    });
  });
  res.send("ok");
});

// Download All (ZIP)
app.get("/download-all/:session", (req, res) => {
  const session = req.params.session;
  const folder = path.join("uploads", session);

  if (!fs.existsSync(folder)) return res.status(404).send("No files found");

  res.setHeader("Content-Disposition", `attachment; filename="${session}.zip"`);

  const archive = archiver("zip");
  archive.pipe(res);
  archive.directory(folder, false);
  archive.finalize();
});

// WebSocket
io.on("connection", (socket) => {
  socket.on("joinSession", (session) => {
    socket.join(session);
  });
});

// Start
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
