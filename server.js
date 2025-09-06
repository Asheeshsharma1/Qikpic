const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const archiver = require("archiver");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

const sessions = {};

// generate QR session
app.get("/new", async (req, res) => {
  const sessionId = uuidv4();
  sessions[sessionId] = true;

  const url = `${req.protocol}://${req.get("host")}/upload/${sessionId}`;
  const qr = await QRCode.toDataURL(url);

  res.json({ sessionId, url, qr });
});

// upload storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const dir = path.join(__dirname, "uploads", sessionId);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  }
});

// upload endpoint
app.post("/upload/:sessionId", upload.array("photos", 10), (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessions[sessionId]) return res.status(400).send("Invalid session");

  req.files.forEach(file => {
    io.to(sessionId).emit("newPhoto", {
      filename: file.filename,
      url: `/uploads/${sessionId}/${file.filename}`
    });
  });

  res.json({ success: true });
});

// zip download
app.get("/download/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const dir = path.join(__dirname, "uploads", sessionId);

  res.setHeader("Content-Disposition", `attachment; filename="qikpic-${sessionId}.zip"`);
  const archive = archiver("zip");
  archive.pipe(res);
  archive.directory(dir, false);
  archive.finalize();
});

// socket.io
io.on("connection", (socket) => {
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`QikPic running on port ${PORT}`));
